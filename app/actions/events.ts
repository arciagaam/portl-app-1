'use server';

import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { EventFormData, TableFormData, BulkTableFormData, TicketTypeFormData, PriceTierFormData, PromotionFormData, VoucherCodeFormData } from '@/lib/validations/events';
import * as helpers from '@/lib/event-helpers';

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Get all events
 */
export async function getAllEventsAction() {
  try {
    await requireAdmin();

    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        venueName: true,
        tenantId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: events };
  } catch (error) {
    console.error('Error fetching events:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to fetch events' };
  }
}

/**
 * Get a single event by ID with all related data
 */
export async function getEventByIdAction(eventId: string) {
  try {
    await requireAdmin();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tables: {
          include: {
            seats: true,
            _count: {
              select: {
                ticketTypes: true,
              },
            },
          },
          orderBy: {
            label: 'asc',
          },
        },
        ticketTypes: {
          include: {
            table: true,
            priceTiers: {
              orderBy: {
                priority: 'desc',
              },
            },
            _count: {
              select: {
                promotions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        promotions: {
          include: {
            voucherCodes: true,
            ticketTypes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!event) {
      return { error: 'Event not found' };
    }

    return { data: event };
  } catch (error) {
    console.error('Error fetching event:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to fetch event' };
  }
}

/**
 * Create a new event
 */
export async function createEventAction(data: EventFormData, tenantId: string) {
  try {
    await requireAdmin();

    // Validate tenantId
    if (!tenantId) {
      return { error: 'Tenant ID is required' };
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    // Convert date strings to Date objects for storage
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate dates are valid
    if (isNaN(startDate.getTime())) {
      return { error: 'Invalid start date' };
    }
    if (isNaN(endDate.getTime())) {
      return { error: 'Invalid end date' };
    }

    const event = await prisma.event.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        venueName: data.venueName,
        venueAddress: data.venueAddress ?? null,
        startDate,
        startTime: data.startTime,
        endDate,
        endTime: data.endTime,
        status: data.status ?? 'DRAFT',
      },
    });

    revalidatePath('/admin/events');
    return { data: event };
  } catch (error) {
    console.error('Error creating event:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to create event' };
  }
}

/**
 * Update an event
 */
export async function updateEventAction(eventId: string, data: EventFormData) {
  try {
    await requireAdmin();

    // Convert date strings to Date objects for storage
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    // Validate dates are valid
    if (isNaN(startDate.getTime())) {
      return { error: 'Invalid start date' };
    }
    if (isNaN(endDate.getTime())) {
      return { error: 'Invalid end date' };
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        name: data.name,
        description: data.description ?? null,
        venueName: data.venueName,
        venueAddress: data.venueAddress ?? null,
        startDate,
        startTime: data.startTime,
        endDate,
        endTime: data.endTime,
        status: data.status ?? 'DRAFT',
      },
    });

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');
    return { data: event };
  } catch (error) {
    console.error('Error updating event:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to update event' };
  }
}

/**
 * Archive an event
 */
export async function archiveEventAction(eventId: string) {
  try {
    await requireAdmin();

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'ARCHIVED',
      },
    });

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');
    return { data: event };
  } catch (error) {
    console.error('Error archiving event:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to archive event' };
  }
}

/**
 * Publish an event
 */
export async function publishEventAction(eventId: string) {
  try {
    await requireAdmin();

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
      },
    });

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin/events');
    return { data: event };
  } catch (error) {
    console.error('Error publishing event:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to publish event' };
  }
}

// ============================================================================
// TABLES
// ============================================================================

export async function createTableAction(eventId: string, data: TableFormData) {
  try {
    await requireAdmin();
    const result = await helpers.createTable(eventId, data);
    revalidatePath(`/admin/events/${eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error creating table:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A table with this label already exists for this event' };
    }
    return { error: 'Failed to create table' };
  }
}

export async function bulkCreateTablesAction(eventId: string, data: BulkTableFormData) {
  try {
    await requireAdmin();
    const result = await helpers.bulkCreateTables(eventId, data);
    revalidatePath(`/admin/events/${eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error bulk creating tables:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to bulk create tables' };
  }
}

export async function updateTableCapacityAction(tableId: string, newCapacity: number) {
  try {
    await requireAdmin();
    const result = await helpers.updateTableCapacity(tableId, newCapacity);
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (table) revalidatePath(`/admin/events/${table.eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error updating table capacity:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to update table capacity' };
  }
}

export async function regenerateSeatsAction(tableId: string) {
  try {
    await requireAdmin();
    const result = await helpers.regenerateSeats(tableId);
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (table) revalidatePath(`/admin/events/${table.eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error regenerating seats:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to regenerate seats' };
  }
}

export async function updateTableAction(tableId: string, data: TableFormData) {
  try {
    await requireAdmin();
    const result = await helpers.updateTable(tableId, data);
    const tableWithEvent = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (tableWithEvent) revalidatePath(`/admin/events/${tableWithEvent.eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error updating table:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to update table' };
  }
}

export async function deleteTableAction(tableId: string) {
  try {
    await requireAdmin();
    const table = await helpers.deleteTable(tableId);
    revalidatePath(`/admin/events/${table.eventId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting table:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to delete table' };
  }
}

// ============================================================================
// TICKET TYPES
// ============================================================================

export async function getTicketTypesByEventAction(eventId: string) {
  try {
    await requireAdmin();
    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      include: {
        table: true,
        priceTiers: { orderBy: { priority: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: ticketTypes };
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to fetch ticket types' };
  }
}

export async function createTicketTypeAction(eventId: string, data: TicketTypeFormData) {
  try {
    await requireAdmin();
    const ticketType = await helpers.createTicketType(eventId, data);
    revalidatePath(`/admin/events/${eventId}`);
    return { data: ticketType };
  } catch (error) {
    console.error('Error creating ticket type:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to create ticket type' };
  }
}

export async function updateTicketTypeAction(ticketTypeId: string, data: TicketTypeFormData) {
  try {
    await requireAdmin();
    const ticketType = await helpers.updateTicketType(ticketTypeId, data);
    revalidatePath(`/admin/events/${ticketType.eventId}`);
    return { data: ticketType };
  } catch (error) {
    console.error('Error updating ticket type:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to update ticket type' };
  }
}

export async function deleteTicketTypeAction(ticketTypeId: string) {
  try {
    await requireAdmin();
    const ticketType = await helpers.deleteTicketType(ticketTypeId);
    revalidatePath(`/admin/events/${ticketType.eventId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to delete ticket type' };
  }
}

// ============================================================================
// PRICE TIERS
// ============================================================================

export async function createPriceTierAction(ticketTypeId: string, data: PriceTierFormData) {
  try {
    await requireAdmin();
    const priceTier = await helpers.createPriceTier(ticketTypeId, data);
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (ticketType) revalidatePath(`/admin/events/${ticketType.eventId}`);
    return { data: priceTier };
  } catch (error) {
    console.error('Error creating price tier:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to create price tier' };
  }
}

export async function updatePriceTierAction(priceTierId: string, data: PriceTierFormData) {
  try {
    await requireAdmin();
    const priceTier = await helpers.updatePriceTier(priceTierId, data);
    const ticketType = await prisma.ticketType.findUnique({ where: { id: priceTier.ticketTypeId } });
    if (ticketType) revalidatePath(`/admin/events/${ticketType.eventId}`);
    return { data: priceTier };
  } catch (error) {
    console.error('Error updating price tier:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to update price tier' };
  }
}

export async function deletePriceTierAction(priceTierId: string) {
  try {
    await requireAdmin();
    const priceTier = await helpers.deletePriceTier(priceTierId);
    revalidatePath(`/admin/events/${priceTier.ticketType.eventId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting price tier:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to delete price tier' };
  }
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function createPromotionAction(eventId: string, data: PromotionFormData) {
  try {
    await requireAdmin();
    const result = await helpers.createPromotion(eventId, data);
    revalidatePath(`/admin/events/${eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error creating promotion:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: 'Failed to create promotion' };
  }
}

export async function updatePromotionAction(promotionId: string, data: PromotionFormData) {
  try {
    await requireAdmin();
    const { result, eventId } = await helpers.updatePromotion(promotionId, data);
    revalidatePath(`/admin/events/${eventId}`);
    return { data: result };
  } catch (error) {
    console.error('Error updating promotion:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to update promotion' };
  }
}

export async function deletePromotionAction(promotionId: string) {
  try {
    await requireAdmin();
    const promotion = await helpers.deletePromotion(promotionId);
    revalidatePath(`/admin/events/${promotion.eventId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting promotion:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to delete promotion' };
  }
}

// ============================================================================
// VOUCHER CODES
// ============================================================================

export async function createVoucherCodeAction(promotionId: string, data: VoucherCodeFormData) {
  try {
    await requireAdmin();
    const voucherCode = await helpers.createVoucherCode(promotionId, data);
    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (promotion) revalidatePath(`/admin/events/${promotion.eventId}`);
    return { data: voucherCode };
  } catch (error) {
    console.error('Error creating voucher code:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A voucher code with this code already exists' };
    }
    return { error: 'Failed to create voucher code' };
  }
}

export async function updateVoucherCodeAction(voucherCodeId: string, data: VoucherCodeFormData) {
  try {
    await requireAdmin();
    const voucherCode = await helpers.updateVoucherCode(voucherCodeId, data);
    const promotion = await prisma.promotion.findUnique({ where: { id: voucherCode.promotionId } });
    if (promotion) revalidatePath(`/admin/events/${promotion.eventId}`);
    return { data: voucherCode };
  } catch (error) {
    console.error('Error updating voucher code:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A voucher code with this code already exists' };
    }
    return { error: 'Failed to update voucher code' };
  }
}

export async function deleteVoucherCodeAction(voucherCodeId: string) {
  try {
    await requireAdmin();
    const voucherCode = await helpers.deleteVoucherCode(voucherCodeId);
    revalidatePath(`/admin/events/${voucherCode.promotion.eventId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting voucher code:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return { error: error.message };
    }
    return { error: error instanceof Error ? error.message : 'Failed to delete voucher code' };
  }
}
