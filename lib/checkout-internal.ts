/**
 * Internal checkout functions — NOT server actions.
 *
 * These functions have no auth checks and must only be called from:
 * - Server actions that perform their own auth (e.g., verifyAndConfirmPaymentAction)
 * - API routes with their own auth (e.g., webhook signature verification, cron secret)
 * - Other internal modules
 *
 * DO NOT add 'use server' to this file.
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { formatPhp } from '@/lib/format';
import { mainUrl } from '@/lib/url';
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { Prisma, Ticket } from '@/prisma/generated/prisma/client';

/**
 * Generate a unique ticket code
 */
export function generateTicketCode(): string {
  return `TKT-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
}

/**
 * Generate tickets for all items in an order within a transaction.
 */
export async function generateTicketsForOrder(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    eventId: string;
    items: Array<{ id: string; ticketTypeId: string; seatId: string | null; quantity: number }>;
  },
  attendees: Array<{ firstName?: string; lastName?: string; email?: string; phone?: string | null }>,
  ownerId: string,
): Promise<Ticket[]> {
  const tickets: Ticket[] = [];
  let attendeeIndex = 0;

  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      const attendee = attendees?.[attendeeIndex];

      const ticket = await tx.ticket.create({
        data: {
          ticketCode: generateTicketCode(),
          orderId: order.id,
          orderItemId: item.id,
          eventId: order.eventId,
          ticketTypeId: item.ticketTypeId,
          seatId: item.seatId,
          ownerId,
          holderFirstName: attendee?.firstName || null,
          holderLastName: attendee?.lastName || null,
          holderEmail: attendee?.email || null,
          holderPhone: attendee?.phone || null,
          status: 'ACTIVE',
        },
      });

      tickets.push(ticket);
      attendeeIndex++;
    }
  }

  return tickets;
}

/**
 * Fire-and-forget order confirmation email
 */
export async function sendConfirmationEmailForOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        user: { select: { email: true } },
        tickets: true,
      },
    });

    if (!order) return;

    const email = order.contactEmail || order.user.email;
    if (!email) return;

    const eventDate = new Date(order.event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const total = formatPhp(order.total);

    await sendOrderConfirmationEmail({
      to: email,
      orderNumber: order.orderNumber,
      eventName: order.event.name,
      eventDate,
      venueName: order.event.venueName,
      ticketCount: order.tickets.length,
      total,
      ticketsUrl: mainUrl('/account/tickets'),
    });
  } catch (error) {
    // Fire-and-forget: don't fail the order if email fails
    console.error('Failed to send order confirmation email:', error);
  }
}

/**
 * Cancel an expired pending order and release inventory (internal, no auth check).
 * Used to clean up abandoned orders so tickets become available again.
 */
export async function cancelExpiredOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.status !== 'PENDING') return;

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { quantitySold: { decrement: item.quantity } },
      });

      if (item.priceTierId) {
        await tx.ticketTypePriceTier.update({
          where: { id: item.priceTierId },
          data: { allocationSold: { decrement: item.quantity } },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        expiresAt: null,
      },
    });

    // Defensive: tickets are normally created only after payment confirmation,
    // so this is a no-op for typical PENDING orders. Included as a safeguard.
    await tx.ticket.updateMany({
      where: { orderId },
      data: { status: 'CANCELLED' },
    });
  });
}

/**
 * Find and cancel all expired PENDING orders for a user+tenant to release inventory.
 */
export async function cleanupExpiredOrders(userId: string, tenantId: string): Promise<void> {
  const expiredOrders = await prisma.order.findMany({
    where: {
      userId,
      tenantId,
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
  });

  for (const order of expiredOrders) {
    try {
      await cancelExpiredOrder(order.id);
    } catch (error) {
      console.error(`Failed to cancel expired order ${order.id}:`, error);
    }
  }
}

/**
 * Clean up all expired PENDING orders globally.
 * Used by the cron job to release abandoned inventory.
 */
export async function cleanupAllExpiredOrders(): Promise<number> {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
  });

  let cancelled = 0;
  for (const order of expiredOrders) {
    try {
      await cancelExpiredOrder(order.id);
      cancelled++;
    } catch (error) {
      console.error(`Failed to cancel expired order ${order.id}:`, error);
    }
  }

  return cancelled;
}

/**
 * Clean up expired PENDING orders for a specific tenant.
 * Used for opportunistic cleanup on public pages.
 */
export async function cleanupExpiredOrdersForTenant(tenantId: string): Promise<number> {
  const expiredOrders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    select: { id: true },
  });

  let cancelled = 0;
  for (const order of expiredOrders) {
    try {
      await cancelExpiredOrder(order.id);
      cancelled++;
    } catch (error) {
      console.error(`Failed to cancel expired order ${order.id}:`, error);
    }
  }

  return cancelled;
}

/**
 * Confirm order after payment (called from webhook or success page fallback).
 * This is an internal function — NOT a server action.
 */
export async function confirmOrderFromPayment(
  orderId: string,
  paymentData: {
    paymentId: string;
    amount: number;
    status: string;
    paidAt?: number;
  }
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          ticketType: true,
        },
      },
      tenant: { select: { subdomain: true } },
      voucherCode: true,
    },
  });

  if (!order || order.status !== 'PENDING') {
    // Already confirmed or cancelled - idempotent
    return;
  }

  // Read attendees from order metadata
  const metadata = order.metadata as { attendees?: Array<{ firstName: string; lastName: string; email: string; phone?: string | null }> } | null;
  const attendees = metadata?.attendees || [];

  await prisma.$transaction(async (tx) => {
    // Update transaction record
    await tx.transaction.updateMany({
      where: {
        orderId,
        provider: 'paymongo',
        status: 'PENDING',
      },
      data: {
        status: 'COMPLETED',
        providerTxnId: paymentData.paymentId,
        providerStatus: paymentData.status,
        metadata: paymentData as unknown as Prisma.InputJsonValue,
        processedAt: paymentData.paidAt
          ? new Date(paymentData.paidAt * 1000)
          : new Date(),
      },
    });

    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        completedAt: new Date(),
        expiresAt: null,
      },
    });

    // Increment voucher redemption count if used
    if (order.voucherCodeId) {
      await tx.voucherCode.update({
        where: { id: order.voucherCodeId },
        data: {
          redeemedCount: { increment: 1 },
        },
      });
    }

    // Generate tickets
    await generateTicketsForOrder(tx, order, attendees, order.userId);
  });

  revalidatePath('/account/orders');
  revalidatePath('/account/tickets');
  revalidatePath(`/t/${order.tenant.subdomain}/checkout/success/${orderId}`);

  // Send confirmation email (fire-and-forget)
  sendConfirmationEmailForOrder(orderId);
}
