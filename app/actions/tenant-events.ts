'use server';

import { requireTenantOwner, requireTenantAccess } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import type { EventFormData, TableFormData, BulkTableFormData, TicketTypeFormData, PriceTierFormData, PromotionFormData, VoucherCodeFormData } from '@/lib/validations/events';
import * as helpers from '@/lib/event-helpers';
import { handleActionError } from '@/lib/action-utils';

// Helper to verify event belongs to tenant
async function verifyEventBelongsToTenant(eventId: string, tenantId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tenantId: true },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.tenantId !== tenantId) {
    throw new Error('Event does not belong to this tenant');
  }

  return true;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Get all events for a tenant
 */
export async function getEventsForTenantAction(tenantSubdomain: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

    const events = await prisma.event.findMany({
      where: { tenantId: tenant.id },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: events };
  } catch (error) {
    return handleActionError(error, 'Failed to fetch events');
  }
}

/**
 * Get a single event by ID with all related data (tenant-scoped)
 */
export async function getEventByIdForTenantAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        images: {
          orderBy: { position: 'asc' },
        },
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

    if (event.tenantId !== tenant.id) {
      return { error: 'Event does not belong to this tenant' };
    }

    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to fetch event');
  }
}

/**
 * Create a new event for a tenant
 */
export async function createEventForTenantAction(tenantSubdomain: string, data: EventFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

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
        tenantId: tenant.id,
        name: data.name,
        description: data.description ?? null,
        venueName: data.venueName,
        venueAddress: data.venueAddress ?? null,
        startDate,
        startTime: data.startTime,
        endDate,
        endTime: data.endTime,
        status: data.status ?? 'DRAFT',
        thumbnailUrl: data.thumbnailUrl ?? null,
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events`);
    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to create event');
  }
}

/**
 * Update an event (tenant-scoped)
 */
export async function updateEventForTenantAction(tenantSubdomain: string, eventId: string, data: EventFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

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
      where: { id: eventId, tenantId: tenant.id },
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
        thumbnailUrl: data.thumbnailUrl ?? null,
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events/${eventId}`);
    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to update event');
  }
}

/**
 * Archive an event (tenant-scoped)
 */
export async function archiveEventForTenantAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

    const event = await prisma.event.update({
      where: { id: eventId, tenantId: tenant.id },
      data: {
        status: 'ARCHIVED',
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events/${eventId}`);
    revalidatePath(`/t/${tenantSubdomain}`);
    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to archive event');
  }
}

/**
 * Publish an event (tenant-scoped)
 */
export async function publishEventForTenantAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

    const event = await prisma.event.update({
      where: { id: eventId, tenantId: tenant.id },
      data: {
        status: 'PUBLISHED',
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events`);
    revalidatePath(`/t/${tenantSubdomain}/events/${eventId}`);
    revalidatePath(`/t/${tenantSubdomain}`);
    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to publish event');
  }
}

// ============================================================================
// TABLES
// ============================================================================

export async function createTableForTenantAction(tenantSubdomain: string, eventId: string, data: TableFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);
    const result = await helpers.createTable(eventId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to create table', {
      'Unique constraint': 'A table with this label already exists for this event',
    });
  }
}

export async function bulkCreateTablesForTenantAction(tenantSubdomain: string, eventId: string, data: BulkTableFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);
    const result = await helpers.bulkCreateTables(eventId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to bulk create tables');
  }
}

export async function updateTableCapacityForTenantAction(tenantSubdomain: string, tableId: string, newCapacity: number) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (!table) return { error: 'Table not found' };
    await verifyEventBelongsToTenant(table.eventId, tenant.id);
    const result = await helpers.updateTableCapacity(tableId, newCapacity);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${table.eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to update table capacity');
  }
}

export async function regenerateSeatsForTenantAction(tenantSubdomain: string, tableId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (!table) return { error: 'Table not found' };
    await verifyEventBelongsToTenant(table.eventId, tenant.id);
    const result = await helpers.regenerateSeats(tableId);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${table.eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to regenerate seats');
  }
}

export async function updateTableForTenantAction(tenantSubdomain: string, tableId: string, data: TableFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const table = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (!table) return { error: 'Table not found' };
    await verifyEventBelongsToTenant(table.eventId, tenant.id);
    const updatedTable = await helpers.updateTable(tableId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${table.eventId}`);
    return { data: updatedTable };
  } catch (error) {
    return handleActionError(error, 'Failed to update table');
  }
}

export async function deleteTableForTenantAction(tenantSubdomain: string, tableId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const existingTable = await prisma.table.findUnique({ where: { id: tableId }, include: { event: true } });
    if (!existingTable) return { error: 'Table not found' };
    await verifyEventBelongsToTenant(existingTable.eventId, tenant.id);
    await helpers.deleteTable(tableId);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${existingTable.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete table');
  }
}

// ============================================================================
// TICKET TYPES
// ============================================================================

export async function getTicketTypesByEventForTenantAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);
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
    return handleActionError(error, 'Failed to fetch ticket types');
  }
}

export async function createTicketTypeForTenantAction(tenantSubdomain: string, eventId: string, data: TicketTypeFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);
    const ticketType = await helpers.createTicketType(eventId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: ticketType };
  } catch (error) {
    return handleActionError(error, 'Failed to create ticket type');
  }
}

export async function updateTicketTypeForTenantAction(tenantSubdomain: string, ticketTypeId: string, data: TicketTypeFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const existingTicketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!existingTicketType) return { error: 'Ticket type not found' };
    await verifyEventBelongsToTenant(existingTicketType.eventId, tenant.id);
    const ticketType = await helpers.updateTicketType(ticketTypeId, data, { enforceSalesProtection: true });
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${existingTicketType.eventId}`);
    return { data: ticketType };
  } catch (error) {
    return handleActionError(error, 'Failed to update ticket type');
  }
}

export async function deleteTicketTypeForTenantAction(tenantSubdomain: string, ticketTypeId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const existing = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!existing) return { error: 'Ticket type not found' };
    await verifyEventBelongsToTenant(existing.eventId, tenant.id);
    await helpers.deleteTicketType(ticketTypeId, { enforceSalesProtection: true });
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${existing.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete ticket type');
  }
}

// ============================================================================
// PRICE TIERS
// ============================================================================

export async function createPriceTierForTenantAction(tenantSubdomain: string, ticketTypeId: string, data: PriceTierFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType) return { error: 'Ticket type not found' };
    await verifyEventBelongsToTenant(ticketType.eventId, tenant.id);
    const priceTier = await helpers.createPriceTier(ticketTypeId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${ticketType.eventId}`);
    return { data: priceTier };
  } catch (error) {
    return handleActionError(error, 'Failed to create price tier');
  }
}

export async function updatePriceTierForTenantAction(tenantSubdomain: string, priceTierId: string, data: PriceTierFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const priceTier = await prisma.ticketTypePriceTier.findUnique({
      where: { id: priceTierId },
      include: { ticketType: true },
    });
    if (!priceTier) return { error: 'Price tier not found' };
    await verifyEventBelongsToTenant(priceTier.ticketType.eventId, tenant.id);
    const updatedPriceTier = await helpers.updatePriceTier(priceTierId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${priceTier.ticketType.eventId}`);
    return { data: updatedPriceTier };
  } catch (error) {
    return handleActionError(error, 'Failed to update price tier');
  }
}

export async function deletePriceTierForTenantAction(tenantSubdomain: string, priceTierId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const priceTier = await prisma.ticketTypePriceTier.findUnique({
      where: { id: priceTierId },
      include: { ticketType: true },
    });
    if (!priceTier) return { error: 'Price tier not found' };
    await verifyEventBelongsToTenant(priceTier.ticketType.eventId, tenant.id);
    await helpers.deletePriceTier(priceTierId);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${priceTier.ticketType.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete price tier');
  }
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function createPromotionForTenantAction(tenantSubdomain: string, eventId: string, data: PromotionFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);
    const result = await helpers.createPromotion(eventId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to create promotion');
  }
}

export async function updatePromotionForTenantAction(tenantSubdomain: string, promotionId: string, data: PromotionFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const existingPromotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!existingPromotion) return { error: 'Promotion not found' };
    await verifyEventBelongsToTenant(existingPromotion.eventId, tenant.id);
    const { result } = await helpers.updatePromotion(promotionId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${existingPromotion.eventId}`);
    return { data: result };
  } catch (error) {
    return handleActionError(error, 'Failed to update promotion');
  }
}

export async function deletePromotionForTenantAction(tenantSubdomain: string, promotionId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!promotion) return { error: 'Promotion not found' };
    await verifyEventBelongsToTenant(promotion.eventId, tenant.id);
    await helpers.deletePromotion(promotionId);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${promotion.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete promotion');
  }
}

// ============================================================================
// VOUCHER CODES
// ============================================================================

export async function createVoucherCodeForTenantAction(tenantSubdomain: string, promotionId: string, data: VoucherCodeFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!promotion) return { error: 'Promotion not found' };
    await verifyEventBelongsToTenant(promotion.eventId, tenant.id);
    const voucherCode = await helpers.createVoucherCode(promotionId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${promotion.eventId}`);
    return { data: voucherCode };
  } catch (error) {
    return handleActionError(error, 'Failed to create voucher code', {
      'Unique constraint': 'A voucher code with this code already exists',
    });
  }
}

export async function updateVoucherCodeForTenantAction(tenantSubdomain: string, voucherCodeId: string, data: VoucherCodeFormData) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const voucherCode = await prisma.voucherCode.findUnique({
      where: { id: voucherCodeId },
      include: { promotion: true },
    });
    if (!voucherCode) return { error: 'Voucher code not found' };
    await verifyEventBelongsToTenant(voucherCode.promotion.eventId, tenant.id);
    const updatedVoucherCode = await helpers.updateVoucherCode(voucherCodeId, data);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${voucherCode.promotion.eventId}`);
    return { data: updatedVoucherCode };
  } catch (error) {
    return handleActionError(error, 'Failed to update voucher code', {
      'Unique constraint': 'A voucher code with this code already exists',
    });
  }
}

export async function deleteVoucherCodeForTenantAction(tenantSubdomain: string, voucherCodeId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    const voucherCode = await prisma.voucherCode.findUnique({
      where: { id: voucherCodeId },
      include: { promotion: true },
    });
    if (!voucherCode) return { error: 'Voucher code not found' };
    await verifyEventBelongsToTenant(voucherCode.promotion.eventId, tenant.id);
    await helpers.deleteVoucherCode(voucherCodeId);
    revalidatePath(`/dashboard/${tenantSubdomain}/events/${voucherCode.promotion.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete voucher code');
  }
}

// ============================================================================
// EVENT IMAGES (GALLERY)
// ============================================================================

const MAX_EVENT_IMAGES = 10;

/**
 * Add an image to an event's gallery (tenant-scoped)
 */
export async function addEventImageAction(tenantSubdomain: string, eventId: string, url: string) {
  try {
    if (!url.startsWith('https://')) {
      return { error: 'Invalid URL' };
    }

    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);

    const count = await prisma.eventImage.count({ where: { eventId } });
    if (count >= MAX_EVENT_IMAGES) {
      return { error: `Maximum of ${MAX_EVENT_IMAGES} images per event` };
    }

    const image = await prisma.eventImage.create({
      data: {
        eventId,
        url,
        position: count,
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: image };
  } catch (error) {
    return handleActionError(error, 'Failed to add image');
  }
}

/**
 * Delete an event image and clean up blob storage (tenant-scoped)
 */
export async function deleteEventImageAction(tenantSubdomain: string, imageId: string) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);

    const image = await prisma.eventImage.findUnique({
      where: { id: imageId },
      include: { event: true },
    });

    if (!image) {
      return { error: 'Image not found' };
    }

    await verifyEventBelongsToTenant(image.eventId, tenant.id);

    await prisma.$transaction(async (tx) => {
      await tx.eventImage.delete({ where: { id: imageId } });

      // Reorder remaining images to close the gap
      const remaining = await tx.eventImage.findMany({
        where: { eventId: image.eventId },
        orderBy: { position: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await tx.eventImage.update({
            where: { id: remaining[i].id },
            data: { position: i },
          });
        }
      }
    });

    // Clean up blob (fire-and-forget)
    if (image.url.includes('.public.blob.vercel-storage.com')) {
      del(image.url).catch(() => {});
    }

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${image.eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to delete image');
  }
}

/**
 * Reorder event images (tenant-scoped)
 */
export async function reorderEventImagesAction(tenantSubdomain: string, eventId: string, imageIds: string[]) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);

    // Verify all images belong to this event
    const images = await prisma.eventImage.findMany({
      where: { eventId },
      select: { id: true },
    });

    const existingIds = new Set(images.map((i) => i.id));
    for (const id of imageIds) {
      if (!existingIds.has(id)) {
        return { error: 'Invalid image ID in reorder list' };
      }
    }

    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.eventImage.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to reorder images');
  }
}

/**
 * Set or clear event thumbnail (tenant-scoped)
 */
export async function setEventThumbnailAction(tenantSubdomain: string, eventId: string, thumbnailUrl: string | null) {
  try {
    const { tenant } = await requireTenantOwner(tenantSubdomain);
    await verifyEventBelongsToTenant(eventId, tenant.id);

    const event = await prisma.event.update({
      where: { id: eventId },
      data: { thumbnailUrl },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${eventId}`);
    return { data: event };
  } catch (error) {
    return handleActionError(error, 'Failed to set thumbnail');
  }
}

// ============================================================================
// ATTENDEES / CHECK-IN
// ============================================================================

/**
 * Get all attendees (tickets) for an event with stats
 */
export async function getAttendeesForEventAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'MANAGER');

    await verifyEventBelongsToTenant(eventId, tenant.id);

    const tickets = await prisma.ticket.findMany({
      where: {
        eventId,
        order: { status: 'CONFIRMED' },
      },
      include: {
        ticketType: { select: { id: true, name: true, kind: true } },
        order: {
          select: {
            orderNumber: true,
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total = tickets.length;
    const checkedIn = tickets.filter((t) => t.status === 'CHECKED_IN').length;

    return {
      data: {
        attendees: tickets,
        stats: { total, checkedIn, remaining: total - checkedIn },
      },
    };
  } catch (error) {
    return handleActionError(error, 'Failed to fetch attendees');
  }
}

/**
 * Check in a ticket by its ticket code
 */
export async function checkInTicketAction(tenantSubdomain: string, ticketCode: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'MANAGER');

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        event: { select: { id: true, tenantId: true, name: true } },
        ticketType: { select: { name: true, kind: true } },
      },
    });

    if (!ticket) {
      return { error: 'Ticket not found' };
    }

    if (ticket.event.tenantId !== tenant.id) {
      return { error: 'Ticket does not belong to this tenant' };
    }

    if (ticket.status === 'CHECKED_IN') {
      return { error: 'Ticket has already been checked in' };
    }

    if (ticket.status !== 'ACTIVE') {
      return { error: `Cannot check in ticket with status: ${ticket.status}` };
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });

    const attendeeName = [ticket.holderFirstName, ticket.holderLastName]
      .filter(Boolean)
      .join(' ') || 'Guest';

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${ticket.eventId}`);

    return {
      data: {
        ticketId: updated.id,
        ticketCode: updated.ticketCode,
        attendeeName,
        ticketType: ticket.ticketType.name,
        eventName: ticket.event.name,
      },
    };
  } catch (error) {
    return handleActionError(error, 'Failed to check in ticket');
  }
}

/**
 * Undo a ticket check-in (requires ADMIN role)
 */
export async function undoCheckInAction(tenantSubdomain: string, ticketId: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: { select: { id: true, tenantId: true } },
      },
    });

    if (!ticket) {
      return { error: 'Ticket not found' };
    }

    if (ticket.event.tenantId !== tenant.id) {
      return { error: 'Ticket does not belong to this tenant' };
    }

    if (ticket.status !== 'CHECKED_IN') {
      return { error: 'Ticket is not checked in' };
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'ACTIVE',
        checkedInAt: null,
      },
    });

    revalidatePath(`/dashboard/${tenantSubdomain}/events/${ticket.eventId}`);

    return { success: true };
  } catch (error) {
    return handleActionError(error, 'Failed to undo check-in');
  }
}

// ============================================================================
// ORDERS (Read-only for organizer dashboard)
// ============================================================================

/**
 * Get confirmed orders for an event (organizer view)
 */
export async function getOrdersForEventAction(tenantSubdomain: string, eventId: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'MANAGER');

    await verifyEventBelongsToTenant(eventId, tenant.id);

    const orders = await prisma.order.findMany({
      where: {
        eventId,
        tenantId: tenant.id,
        status: 'CONFIRMED',
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            ticketType: { select: { id: true, name: true, kind: true } },
          },
        },
        tickets: {
          select: {
            id: true,
            ticketCode: true,
            status: true,
            holderFirstName: true,
            holderLastName: true,
            holderEmail: true,
            ticketType: { select: { name: true } },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Summary stats
    const totalOrders = orders.length;
    const totalTickets = orders.reduce((sum, o) => sum + o.tickets.length, 0);
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

    return {
      data: {
        orders,
        stats: { totalOrders, totalTickets, totalRevenue },
      },
    };
  } catch (error) {
    return handleActionError(error, 'Failed to fetch orders');
  }
}
