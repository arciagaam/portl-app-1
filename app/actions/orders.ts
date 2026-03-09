'use server';

import { requireAuth, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { AccountOrderWithRelations, TicketWithRelations, OrderListItem } from '@/lib/types/order';

type OrderWithRelations = AccountOrderWithRelations;

// ============================================================================
// ORDER ACTIONS
// ============================================================================

/**
 * Get all orders for current user
 */
export async function getMyOrdersAction(): Promise<{ data: OrderListItem[] } | { error: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { data: [] };
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        _count: {
          select: {
            items: true,
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: orders as OrderListItem[] };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { error: 'Failed to fetch orders' };
  }
}

/**
 * Get single order detail
 */
export async function getOrderByIdAction(
  orderId: string
): Promise<{ data: OrderWithRelations } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        tenant: true,
        items: {
          include: {
            ticketType: true,
            tickets: true,
          },
        },
        tickets: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            order: true,
          },
        },
        promotion: true,
        voucherCode: true,
      },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    return { data: order as OrderWithRelations };
  } catch (error) {
    console.error('Error fetching order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view order' };
    }
    return { error: 'Failed to fetch order' };
  }
}

// ============================================================================
// TICKET ACTIONS
// ============================================================================

/**
 * Get all tickets for current user (owned or held)
 */
export async function getMyTicketsAction(): Promise<{ data: TicketWithRelations[] } | { error: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { data: [] };
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { holderId: user.id },
        ],
        status: { in: ['ACTIVE', 'CHECKED_IN'] },
      },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        ticketType: true,
        order: true,
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
    });

    return { data: tickets as TicketWithRelations[] };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return { error: 'Failed to fetch tickets' };
  }
}

/**
 * Get single ticket detail
 */
export async function getTicketByIdAction(
  ticketId: string
): Promise<{ data: TicketWithRelations } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        ticketType: true,
        order: true,
      },
    });

    if (!ticket) {
      return { error: 'Ticket not found' };
    }

    // User must be owner or holder
    if (ticket.ownerId !== userId && ticket.holderId !== userId) {
      return { error: 'Unauthorized' };
    }

    return { data: ticket as TicketWithRelations };
  } catch (error) {
    console.error('Error fetching ticket:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view ticket' };
    }
    return { error: 'Failed to fetch ticket' };
  }
}

/**
 * Assign attendee to ticket (post-purchase)
 */
export async function assignTicketHolderAction(
  ticketId: string,
  holderInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  }
): Promise<{ data: TicketWithRelations } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find ticket and verify ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      return { error: 'Ticket not found' };
    }

    // Only owner can assign holder
    if (ticket.ownerId !== userId) {
      return { error: 'Only the ticket owner can assign attendees' };
    }

    if (ticket.status !== 'ACTIVE') {
      return { error: 'Ticket is not active' };
    }

    // Check if event has started
    const eventStart = new Date(`${ticket.event.startDate.toISOString().split('T')[0]}T${ticket.event.startTime}`);
    if (eventStart < new Date()) {
      return { error: 'Cannot modify ticket after event has started' };
    }

    // Update holder info
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        holderFirstName: holderInfo.firstName,
        holderLastName: holderInfo.lastName,
        holderEmail: holderInfo.email,
        holderPhone: holderInfo.phone,
      },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        ticketType: true,
        order: true,
      },
    });

    revalidatePath(`/account/tickets/${ticketId}`);

    return { data: updatedTicket as TicketWithRelations };
  } catch (error) {
    console.error('Error assigning ticket holder:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to assign ticket' };
    }
    return { error: 'Failed to assign ticket holder' };
  }
}

/**
 * Get tickets by order ID
 */
export async function getTicketsByOrderIdAction(
  orderId: string
): Promise<{ data: TicketWithRelations[] } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Verify order ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order) {
      return { error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    const tickets = await prisma.ticket.findMany({
      where: { orderId },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        ticketType: true,
        order: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return { data: tickets as TicketWithRelations[] };
  } catch (error) {
    console.error('Error fetching tickets for order:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view tickets' };
    }
    return { error: 'Failed to fetch tickets' };
  }
}

/**
 * Get upcoming tickets for current user (for dashboard)
 */
export async function getUpcomingTicketsAction(): Promise<{ data: TicketWithRelations[] } | { error: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { data: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { holderId: user.id },
        ],
        status: 'ACTIVE',
        event: {
          startDate: {
            gte: today,
          },
        },
      },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        ticketType: true,
        order: true,
      },
      orderBy: {
        event: {
          startDate: 'asc',
        },
      },
      take: 5, // Limit to 5 upcoming
    });

    return { data: tickets as TicketWithRelations[] };
  } catch (error) {
    console.error('Error fetching upcoming tickets:', error);
    return { error: 'Failed to fetch upcoming tickets' };
  }
}
