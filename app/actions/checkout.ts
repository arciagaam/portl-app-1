'use server';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  voucherCodeApplySchema,
  saveAttendeesSchema,
  createPaymentSessionSchema,
  cancelOrderSchema,
  completeCheckoutWithAttendeesSchema,
} from '@/lib/validations/checkout';
import type { SaveAttendeesData, VoucherCodeApplyData, CreatePaymentSessionData, CompleteCheckoutWithAttendeesData } from '@/lib/validations/checkout';
import type { Ticket, Prisma, Promotion } from '@/prisma/generated/prisma/client';
import { nanoid } from 'nanoid';
import { createCheckoutSession, retrieveCheckoutSession } from '@/lib/paymongo';
import { tenantUrl } from '@/lib/url';
import {
  generateTicketsForOrder,
  sendConfirmationEmailForOrder,
  cleanupExpiredOrders,
  confirmOrderFromPayment,
} from '@/lib/checkout-internal';
import type { CheckoutOrderWithRelations } from '@/lib/types/order';

type OrderWithRelations = CheckoutOrderWithRelations;

// Order lifecycle:
// 1. Order created → expiresAt = now + 15 min (ORDER_EXPIRATION_MINUTES)
// 2. Payment session created → expiresAt extended to now + 30 min (PAYMENT_SESSION_EXPIRATION_MINUTES)
// 3. Payment confirmed → expiresAt cleared (null)
// 4. Cron (every 5 min) and opportunistic cleanup cancel orders past expiresAt
const ORDER_EXPIRATION_MINUTES = 15;

const ORDER_WITH_RELATIONS_INCLUDE = {
  event: true,
  tenant: true,
  items: {
    include: {
      ticketType: true,
      tickets: {
        include: {
          ticketType: true,
        },
      },
    },
  },
  tickets: {
    include: {
      ticketType: true,
    },
  },
  promotion: true,
  voucherCode: true,
} as const satisfies Prisma.OrderInclude;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique order number
 */
function generateOrderNumber(): string {
  return `PORTL-${nanoid(8).toUpperCase()}`;
}

/**
 * Calculate discount for an order
 */
function calculateDiscount(
  subtotal: number,
  promotion: Promotion | null,
  itemCount: number
): number {
  if (!promotion) return 0;

  if (promotion.discountType === 'PERCENT') {
    // discountValue is in basis points (100 = 1%)
    return Math.floor((subtotal * promotion.discountValue) / 10000);
  } else {
    // FIXED discount
    if (promotion.appliesTo === 'ORDER') {
      return promotion.discountValue;
    } else {
      // ITEM - apply per item
      return promotion.discountValue * itemCount;
    }
  }
}

// ============================================================================
// CHECKOUT ACTIONS
// ============================================================================

/**
 * Initialize checkout - validate cart and create pending order
 */
export async function initializeCheckoutAction(
  tenantSubdomain: string
): Promise<{ data: { orderId: string; order: OrderWithRelations } } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    // Clean up any expired pending orders to release inventory
    await cleanupExpiredOrders(userId, tenant.id);

    // Get cart items for this tenant
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: {
            event: {
              tenantId: tenant.id,
            },
          },
          include: {
            event: true,
            ticketType: {
              include: {
                priceTiers: true,
              },
            },
            priceTier: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return { error: 'No items in cart for this tenant' };
    }

    if (cart.expiresAt < new Date()) {
      return { error: 'Cart has expired. Please add items again.' };
    }

    // Validate all items are from the same event (for simplicity, one order per event)
    const eventIds = new Set(cart.items.map(item => item.eventId));
    if (eventIds.size > 1) {
      return { error: 'Please checkout items from one event at a time' };
    }

    const eventId = cart.items[0].eventId;
    const event = cart.items[0].event;

    // Verify event is still published
    if (event.status !== 'PUBLISHED') {
      return { error: 'Event is no longer available' };
    }

    // Validate availability for each item
    for (const item of cart.items) {
      const ticketType = item.ticketType;

      // Check overall quantity
      if (ticketType.quantityTotal !== null) {
        const available = ticketType.quantityTotal - ticketType.quantitySold;
        if (available < item.quantity) {
          return {
            error: `"${ticketType.name}" only has ${available} tickets remaining`,
          };
        }
      }

      // Check price tier allocation if applicable
      if (item.priceTierId) {
        const priceTier = ticketType.priceTiers.find(t => t.id === item.priceTierId);
        if (priceTier && priceTier.strategy === 'ALLOCATION' && priceTier.allocationTotal !== null) {
          const available = priceTier.allocationTotal - priceTier.allocationSold;
          if (available < item.quantity) {
            return {
              error: `"${ticketType.name}" at ${priceTier.name} price only has ${available} tickets remaining`,
            };
          }
        }
      }
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Get user email for contact
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          tenantId: tenant.id,
          eventId,
          status: 'PENDING',
          subtotal,
          discountAmount: 0,
          serviceFee: 0,
          total: subtotal,
          contactEmail: user?.email || '',
          expiresAt: new Date(Date.now() + ORDER_EXPIRATION_MINUTES * 60 * 1000),
        },
      });

      // Create order items
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            ticketTypeId: item.ticketTypeId,
            priceTierId: item.priceTierId,
            seatId: item.seatId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          },
        });

        // Increment quantitySold (soft reserve)
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantitySold: { increment: item.quantity },
          },
        });

        // Increment allocationSold if applicable
        if (item.priceTierId) {
          await tx.ticketTypePriceTier.update({
            where: { id: item.priceTierId },
            data: {
              allocationSold: { increment: item.quantity },
            },
          });
        }
      }

      // Clear cart items for this tenant
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          event: {
            tenantId: tenant.id,
          },
        },
      });

      return newOrder;
    });

    // Fetch complete order with relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    revalidatePath(`/t/${tenantSubdomain}/checkout`);

    return {
      data: {
        orderId: order.id,
        order: completeOrder as OrderWithRelations,
      },
    };
  } catch (error) {
    console.error('Error initializing checkout:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to checkout' };
    }
    return { error: 'Failed to initialize checkout' };
  }
}

/**
 * Apply voucher code to pending order
 */
export async function applyVoucherCodeAction(
  orderId: string,
  data: VoucherCodeApplyData
): Promise<{ data: OrderWithRelations } | { error: string }> {
  try {
    const parsedOrderId = cancelOrderSchema.safeParse({ orderId });
    if (!parsedOrderId.success) {
      return { error: parsedOrderId.error.issues[0]?.message || 'Invalid order ID' };
    }

    const parsed = voucherCodeApplySchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    // Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        items: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Cannot modify completed order' };
    }

    // Find voucher code
    const voucherCode = await prisma.voucherCode.findUnique({
      where: { code: data.code.toUpperCase() },
      include: {
        promotion: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });

    if (!voucherCode) {
      return { error: 'Invalid voucher code' };
    }

    const promotion = voucherCode.promotion;

    // Validate promotion
    const now = new Date();

    // Check if promotion is for this event
    if (promotion.eventId !== order.eventId) {
      return { error: 'Invalid voucher code' };
    }

    // Check validity dates
    if (now < promotion.validFrom || now > promotion.validUntil) {
      return { error: 'This code has expired' };
    }

    // Check redemption limits
    if (voucherCode.maxRedemptions !== null && voucherCode.redeemedCount >= voucherCode.maxRedemptions) {
      return { error: 'This code has reached its usage limit' };
    }

    if (promotion.maxRedemptions !== null) {
      const totalRedemptions = await prisma.order.count({
        where: {
          promotionId: promotion.id,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      });
      if (totalRedemptions >= promotion.maxRedemptions) {
        return { error: 'This promotion has reached its usage limit' };
      }
    }

    // Check per-user limit
    if (promotion.maxPerUser !== null) {
      const userRedemptions = await prisma.order.count({
        where: {
          userId,
          promotionId: promotion.id,
          status: 'CONFIRMED',
        },
      });
      if (userRedemptions >= promotion.maxPerUser) {
        return { error: 'You have already used this promotion' };
      }
    }

    // Check if promotion applies to ticket types in order
    if (promotion.ticketTypes.length > 0) {
      const applicableTicketTypeIds = new Set(promotion.ticketTypes.map(t => t.ticketTypeId));
      const orderTicketTypeIds = order.items.map(item => item.ticketTypeId);
      const hasApplicable = orderTicketTypeIds.some(id => applicableTicketTypeIds.has(id));
      if (!hasApplicable) {
        return { error: 'This code does not apply to items in your order' };
      }
    }

    // Calculate discount
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const discountAmount = calculateDiscount(order.subtotal, promotion, itemCount);

    // Update order with voucher and discount
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        voucherCodeId: voucherCode.id,
        promotionId: promotion.id,
        discountAmount,
        total: Math.max(0, order.subtotal - discountAmount + order.serviceFee),
      },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    return { data: updatedOrder as OrderWithRelations };
  } catch (error) {
    console.error('Error applying voucher code:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to apply voucher' };
    }
    return { error: 'Failed to apply voucher code' };
  }
}

/**
 * Remove voucher code from order
 */
export async function removeVoucherCodeAction(
  orderId: string
): Promise<{ data: OrderWithRelations } | { error: string }> {
  try {
    const parsed = cancelOrderSchema.safeParse({ orderId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid order ID' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    // Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Cannot modify completed order' };
    }

    // Update order to remove voucher
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        voucherCodeId: null,
        promotionId: null,
        discountAmount: 0,
        total: order.subtotal + order.serviceFee,
      },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    return { data: updatedOrder as OrderWithRelations };
  } catch (error) {
    console.error('Error removing voucher code:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to modify order' };
    }
    return { error: 'Failed to remove voucher code' };
  }
}

/**
 * Save attendee information for order
 */
export async function saveAttendeesAction(
  data: SaveAttendeesData
): Promise<{ data: OrderWithRelations } | { error: string }> {
  try {
    const parsed = saveAttendeesSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const { orderId, attendees } = parsed.data;

    // Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Cannot modify completed order' };
    }

    // Validate attendee count matches total tickets
    const totalTickets = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (attendees.length !== totalTickets) {
      return { error: `Expected ${totalTickets} attendees, got ${attendees.length}` };
    }

    // Store attendee info in order metadata
    // This will be transferred to tickets when order is completed
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        metadata: { attendees },
      },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    // Store attendee data in a way we can retrieve it
    // We'll pass it through to completeCheckoutAction
    // For now, return the order with a note that attendees are saved

    return { data: updatedOrder as OrderWithRelations };
  } catch (error) {
    console.error('Error saving attendees:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to save attendees' };
    }
    return { error: 'Failed to save attendee information' };
  }
}

/**
 * Complete checkout (placeholder payment) and generate tickets
 */
export async function completeCheckoutAction(
  data: CompleteCheckoutWithAttendeesData
): Promise<{ data: { order: OrderWithRelations; tickets: Ticket[] } } | { error: string }> {
  try {
    const parsed = completeCheckoutWithAttendeesSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const { orderId, contactEmail, contactPhone, attendees } = parsed.data;

    // Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: true,
          },
        },
        voucherCode: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Order is not pending' };
    }

    // Check if order has expired
    if (order.expiresAt && order.expiresAt < new Date()) {
      // Cancel the expired order
      await cancelOrderAction(orderId);
      return { error: 'Order has expired. Please start a new checkout.' };
    }

    // Complete order and generate tickets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction record (placeholder - no real payment)
      await tx.transaction.create({
        data: {
          orderId,
          type: 'PAYMENT',
          amount: order.total,
          status: 'COMPLETED',
          provider: 'placeholder',
          processedAt: new Date(),
        },
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          contactEmail,
          contactPhone,
          completedAt: new Date(),
          expiresAt: null, // Clear expiration
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
      const tickets = await generateTicketsForOrder(tx, order, attendees || [], userId);

      return { order: updatedOrder, tickets };
    });

    // Fetch complete order with all relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    revalidatePath('/account/orders');
    revalidatePath('/account/tickets');

    return {
      data: {
        order: completeOrder as OrderWithRelations,
        tickets: result.tickets,
      },
    };
  } catch (error) {
    console.error('Error completing checkout:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to complete checkout' };
    }
    return { error: 'Failed to complete checkout' };
  }
}

// Payment session expiration time - 30 minutes to account for PayMongo checkout
const PAYMENT_SESSION_EXPIRATION_MINUTES = 30;

/**
 * Confirm a free order (total = 0) without payment gateway
 */
export async function confirmFreeOrderAction(
  data: CreatePaymentSessionData
): Promise<{ data: { orderId: string } } | { error: string }> {
  try {
    const parsed = createPaymentSessionSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const { orderId, contactEmail, contactPhone, attendees } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { ticketType: true },
        },
        voucherCode: true,
      },
    });

    if (!order) return { error: 'Order not found' };
    if (order.userId !== userId) return { error: 'Unauthorized' };
    if (order.status !== 'PENDING') return { error: 'Order is not pending' };
    if (order.total !== 0) return { error: 'Order is not free' };

    if (order.expiresAt && order.expiresAt < new Date()) {
      await cancelOrderAction(orderId);
      return { error: 'Order has expired. Please start a new checkout.' };
    }

    await prisma.$transaction(async (tx) => {
      // Create a zero-amount transaction record
      await tx.transaction.create({
        data: {
          orderId,
          type: 'PAYMENT',
          amount: 0,
          status: 'COMPLETED',
          provider: 'free',
          processedAt: new Date(),
        },
      });

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          contactEmail,
          contactPhone: contactPhone || null,
          metadata: { attendees },
          completedAt: new Date(),
          expiresAt: null,
        },
      });

      // Increment voucher redemption count if used
      if (order.voucherCodeId) {
        await tx.voucherCode.update({
          where: { id: order.voucherCodeId },
          data: { redeemedCount: { increment: 1 } },
        });
      }

      // Generate tickets
      await generateTicketsForOrder(tx, order, attendees || [], userId);
    });

    revalidatePath('/account/orders');
    revalidatePath('/account/tickets');

    // Send confirmation email (fire-and-forget)
    sendConfirmationEmailForOrder(orderId);

    return { data: { orderId } };
  } catch (error) {
    console.error('Error confirming free order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to complete checkout' };
    }
    return { error: 'Failed to confirm order' };
  }
}

/**
 * Create PayMongo checkout session for order payment
 */
export async function createPaymentSessionAction(
  data: CreatePaymentSessionData
): Promise<{ data: { checkoutUrl: string } } | { error: string }> {
  try {
    const parsed = createPaymentSessionSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid input' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const { orderId, contactEmail, contactPhone, attendees } = parsed.data;

    // Find order with relations
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        tenant: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        voucherCode: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Order is not pending' };
    }

    // Check if order has expired
    if (order.expiresAt && order.expiresAt < new Date()) {
      await cancelOrderAction(orderId);
      return { error: 'Order has expired. Please start a new checkout.' };
    }

    // Determine tenant URL for PayMongo redirect URLs
    const subdomain = order.tenant.subdomain;

    // Save attendees + contact info to order metadata and extend expiration
    await prisma.order.update({
      where: { id: orderId },
      data: {
        contactEmail,
        contactPhone: contactPhone || null,
        metadata: { attendees },
        expiresAt: new Date(Date.now() + PAYMENT_SESSION_EXPIRATION_MINUTES * 60 * 1000),
      },
    });

    // Create PayMongo checkout session
    // PayMongo expects amounts in centavos (100 centavos = 1 PHP)
    const lineItems = order.items.map((item) => ({
      amount: item.unitPrice * item.quantity * 100,
      currency: 'PHP',
      name: `${item.ticketType.name} x${item.quantity}`,
      quantity: 1,
      description: `${order.event.name} - ${item.ticketType.name}`,
    }));

    // If there's a discount, add it as a negative line item description
    // PayMongo doesn't support negative amounts, so we adjust the total
    // by using the order total directly if there's a discount
    const hasDiscount = order.discountAmount > 0;
    const finalLineItems = hasDiscount
      ? [
          {
            amount: order.total * 100,
            currency: 'PHP',
            name: `Order ${order.orderNumber}`,
            quantity: 1,
            description: `${order.event.name} (discount applied)`,
          },
        ]
      : lineItems;

    const checkoutResult = await createCheckoutSession({
      lineItems: finalLineItems,
      paymentMethodTypes: ['qrph'],
      description: `Order ${order.orderNumber} - ${order.event.name}`,
      referenceNumber: order.orderNumber,
      successUrl: tenantUrl(subdomain, `/checkout/success/${orderId}`),
      cancelUrl: tenantUrl(subdomain, '/checkout?resume=true&payment_cancelled=true'),
      sendEmailReceipt: true,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      billing: {
        email: contactEmail,
        phone: contactPhone || undefined,
      },
    });

    // Create a PENDING transaction record
    await prisma.transaction.create({
      data: {
        orderId,
        type: 'PAYMENT',
        amount: order.total,
        status: 'PENDING',
        provider: 'paymongo',
        providerTxnId: checkoutResult.checkoutSessionId,
      },
    });

    // Store checkout session ID on the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentSessionId: checkoutResult.checkoutSessionId,
      },
    });

    return { data: { checkoutUrl: checkoutResult.checkoutUrl } };
  } catch (error) {
    console.error('Error creating payment session:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to complete payment' };
    }
    return { error: 'Failed to create payment session. Please try again.' };
  }
}

/**
 * Verify payment and confirm order (called from success page as fallback)
 */
export async function verifyAndConfirmPaymentAction(
  orderId: string
): Promise<{ data: { status: 'confirmed' | 'pending' | 'failed' } } | { error: string }> {
  try {
    const parsed = cancelOrderSchema.safeParse({ orderId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid order ID' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    // Already confirmed
    if (order.status === 'CONFIRMED') {
      return { data: { status: 'confirmed' } };
    }

    if (order.status !== 'PENDING' || !order.paymentSessionId) {
      return { data: { status: 'failed' } };
    }

    // Retrieve checkout session from PayMongo to check payment status
    const checkoutSession = await retrieveCheckoutSession(order.paymentSessionId);

    const paidPayment = checkoutSession.payments.find(
      (p) => p.status === 'paid'
    );

    if (paidPayment) {
      // Payment is confirmed - process the order
      await confirmOrderFromPayment(orderId, {
        paymentId: paidPayment.id,
        amount: paidPayment.amount,
        status: paidPayment.status,
        paidAt: paidPayment.paidAt,
      });

      return { data: { status: 'confirmed' } };
    }

    // Payment not yet completed
    return { data: { status: 'pending' } };
  } catch (error) {
    console.error('Error verifying payment:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to verify payment' };
    }
    return { error: 'Failed to verify payment status' };
  }
}

/**
 * Cancel pending order and release inventory
 */
export async function cancelOrderAction(
  orderId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const parsed = cancelOrderSchema.safeParse({ orderId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid order ID' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    // Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (order.status !== 'PENDING') {
      return { error: 'Can only cancel pending orders' };
    }

    // Cancel order and release inventory in a transaction
    await prisma.$transaction(async (tx) => {
      // Release inventory
      for (const item of order.items) {
        // Decrement quantitySold
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            quantitySold: { decrement: item.quantity },
          },
        });

        // Decrement allocationSold if applicable
        if (item.priceTierId) {
          await tx.ticketTypePriceTier.update({
            where: { id: item.priceTierId },
            data: {
              allocationSold: { decrement: item.quantity },
            },
          });
        }
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          expiresAt: null,
        },
      });

      // Cancel any generated tickets (shouldn't exist for PENDING orders, but just in case)
      await tx.ticket.updateMany({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error cancelling order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to cancel order' };
    }
    return { error: 'Failed to cancel order' };
  }
}

/**
 * Get existing pending order for a tenant (to resume checkout)
 */
export async function getPendingOrderForTenantAction(
  tenantSubdomain: string
): Promise<{ data: OrderWithRelations | null } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    // Clean up any expired pending orders to release inventory
    await cleanupExpiredOrders(userId, tenant.id);

    // Find existing pending order for this user and tenant
    const order = await prisma.order.findFirst({
      where: {
        userId,
        tenantId: tenant.id,
        status: 'PENDING',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: ORDER_WITH_RELATIONS_INCLUDE,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: order as OrderWithRelations | null };
  } catch (error) {
    console.error('Error getting pending order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view order' };
    }
    return { error: 'Failed to get pending order' };
  }
}

/**
 * Get order by ID for checkout page
 */
export async function getOrderForCheckoutAction(
  orderId: string
): Promise<{ data: OrderWithRelations } | { error: string }> {
  try {
    const parsed = cancelOrderSchema.safeParse({ orderId });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid order ID' };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: ORDER_WITH_RELATIONS_INCLUDE,
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    return { data: order as OrderWithRelations };
  } catch (error) {
    console.error('Error getting order for checkout:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view order' };
    }
    return { error: 'Failed to get order' };
  }
}
