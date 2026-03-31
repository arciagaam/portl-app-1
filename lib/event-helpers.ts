/**
 * Shared event management helpers — NOT server actions.
 *
 * These functions contain the DB logic for tables, ticket types, price tiers,
 * promotions, and voucher codes. They have no auth checks and must only be
 * called from server actions that perform their own auth.
 *
 * DO NOT add 'use server' to this file.
 */

import { prisma } from '@/lib/prisma';
import type {
  TableFormData,
  BulkTableFormData,
  TicketTypeFormData,
  PriceTierFormData,
  PromotionFormData,
  VoucherCodeFormData,
  EventPromoterFormData,
} from '@/lib/validations/events';

// ============================================================================
// TABLES
// ============================================================================

export async function createTable(eventId: string, data: TableFormData) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.create({
      data: {
        eventId,
        label: data.label,
        capacity: data.capacity,
        minSpend: data.minSpend,
        notes: data.notes,
        mode: data.mode,
      },
    });

    const seats = [];
    for (let i = 1; i <= data.capacity; i++) {
      seats.push({ tableId: table.id, seatIndex: i });
    }

    await tx.seat.createMany({ data: seats });

    return table;
  });
}

export async function bulkCreateTables(eventId: string, data: BulkTableFormData) {
  return prisma.$transaction(async (tx) => {
    const tables = [];
    const allSeats = [];

    for (let num = data.startNumber; num <= data.endNumber; num++) {
      const label = `${data.prefix}${num}`;

      const table = await tx.table.create({
        data: {
          eventId,
          label,
          capacity: data.capacity,
          minSpend: data.minSpend,
          mode: data.mode,
        },
      });

      tables.push(table);

      for (let i = 1; i <= data.capacity; i++) {
        allSeats.push({ tableId: table.id, seatIndex: i });
      }
    }

    if (allSeats.length > 0) {
      await tx.seat.createMany({ data: allSeats });
    }

    return tables;
  });
}

export async function updateTable(tableId: string, data: TableFormData) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.table.findUnique({ where: { id: tableId } });
    if (!existing) throw new Error('Table not found');

    const updatedTable = await tx.table.update({
      where: { id: tableId },
      data: {
        label: data.label,
        capacity: data.capacity,
        minSpend: data.minSpend,
        notes: data.notes,
        mode: data.mode,
      },
    });

    if (data.capacity !== existing.capacity) {
      await tx.seat.deleteMany({ where: { tableId } });
      const seats = [];
      for (let i = 1; i <= data.capacity; i++) {
        seats.push({ tableId, seatIndex: i });
      }
      await tx.seat.createMany({ data: seats });
    }

    return updatedTable;
  });
}

export async function updateTableCapacity(tableId: string, newCapacity: number) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({
      where: { id: tableId },
      include: { seats: true },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    await tx.seat.deleteMany({ where: { tableId } });

    const updatedTable = await tx.table.update({
      where: { id: tableId },
      data: { capacity: newCapacity },
    });

    const seats = [];
    for (let i = 1; i <= newCapacity; i++) {
      seats.push({ tableId, seatIndex: i });
    }

    await tx.seat.createMany({ data: seats });

    return updatedTable;
  });
}

export async function regenerateSeats(tableId: string) {
  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    await tx.seat.deleteMany({ where: { tableId } });

    const seats = [];
    for (let i = 1; i <= table.capacity; i++) {
      seats.push({ tableId, seatIndex: i });
    }

    await tx.seat.createMany({ data: seats });

    return table;
  });
}

export async function updateTableStatus(tableId: string, status: 'OPEN' | 'CLOSED' | 'HIDDEN') {
  return prisma.table.update({
    where: { id: tableId },
    data: { status },
  });
}

export async function updateTicketTypeStatus(ticketTypeId: string, status: 'OPEN' | 'CLOSED' | 'HIDDEN') {
  return prisma.ticketType.update({
    where: { id: ticketTypeId },
    data: { status },
  });
}

export async function deleteTable(tableId: string) {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: { event: true },
  });

  if (!table) {
    throw new Error('Table not found');
  }

  await prisma.table.delete({ where: { id: tableId } });

  return table;
}

// ============================================================================
// TICKET TYPES
// ============================================================================

export async function createTicketType(eventId: string, data: TicketTypeFormData) {
  if (data.kind === 'TABLE' || data.kind === 'SEAT') {
    if (!data.tableId) {
      throw new Error('Table is required for TABLE and SEAT ticket types');
    }

    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    if (data.kind === 'TABLE') {
      data.quantityTotal = 1;
    }

    if (data.kind === 'SEAT') {
      data.quantityTotal = table.capacity;
    }
  }

  return prisma.ticketType.create({
    data: {
      eventId,
      name: data.name,
      description: data.description,
      kind: data.kind,
      basePrice: data.basePrice,
      quantityTotal: data.quantityTotal,
      transferrable: data.transferrable,
      cancellable: data.cancellable,
      tableId: data.tableId || null,
      imageUrl: data.imageUrl ?? null,
    },
  });
}

export async function updateTicketType(
  ticketTypeId: string,
  data: TicketTypeFormData,
  options?: { enforceSalesProtection?: boolean },
) {
  const existingTicketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!existingTicketType) {
    throw new Error('Ticket type not found');
  }

  // Enforce restrictions when tickets have been sold
  if (options?.enforceSalesProtection && existingTicketType.quantitySold > 0) {
    if (data.kind !== existingTicketType.kind) {
      throw new Error('Cannot change ticket kind after tickets have been sold');
    }
    if (data.tableId !== existingTicketType.tableId) {
      throw new Error('Cannot change table assignment after tickets have been sold');
    }
    if (data.quantityTotal !== undefined && data.quantityTotal !== null && data.quantityTotal < existingTicketType.quantitySold) {
      throw new Error(`Total quantity cannot be less than ${existingTicketType.quantitySold} tickets already sold`);
    }
  }

  if (data.kind === 'TABLE' || data.kind === 'SEAT') {
    if (!data.tableId) {
      throw new Error('Table is required for TABLE and SEAT ticket types');
    }

    const table = await prisma.table.findUnique({
      where: { id: data.tableId },
    });

    if (!table) {
      throw new Error('Table not found');
    }

    if (data.kind === 'TABLE') {
      data.quantityTotal = 1;
    }

    if (data.kind === 'SEAT') {
      data.quantityTotal = table.capacity;
    }
  }

  return prisma.ticketType.update({
    where: { id: ticketTypeId },
    data: {
      name: data.name,
      description: data.description,
      kind: data.kind,
      basePrice: data.basePrice,
      quantityTotal: data.quantityTotal,
      transferrable: data.transferrable,
      cancellable: data.cancellable,
      tableId: data.tableId || null,
      imageUrl: data.imageUrl ?? null,
    },
  });
}

export async function deleteTicketType(
  ticketTypeId: string,
  options?: { enforceSalesProtection?: boolean },
) {
  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType) {
    throw new Error('Ticket type not found');
  }

  if (options?.enforceSalesProtection && ticketType.quantitySold > 0) {
    throw new Error(`Cannot delete ticket type with ${ticketType.quantitySold} tickets already sold`);
  }

  await prisma.ticketType.delete({ where: { id: ticketTypeId } });

  return ticketType;
}

// ============================================================================
// PRICE TIERS
// ============================================================================

export async function createPriceTier(ticketTypeId: string, data: PriceTierFormData) {
  return prisma.ticketTypePriceTier.create({
    data: {
      ticketTypeId,
      name: data.name,
      price: data.price,
      strategy: data.strategy,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      allocationTotal: data.allocationTotal,
      priority: data.priority,
    },
  });
}

export async function updatePriceTier(priceTierId: string, data: PriceTierFormData) {
  return prisma.ticketTypePriceTier.update({
    where: { id: priceTierId },
    data: {
      name: data.name,
      price: data.price,
      strategy: data.strategy,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      allocationTotal: data.allocationTotal,
      priority: data.priority,
    },
  });
}

export async function deletePriceTier(priceTierId: string) {
  const priceTier = await prisma.ticketTypePriceTier.findUnique({
    where: { id: priceTierId },
    include: { ticketType: true },
  });

  if (!priceTier) {
    throw new Error('Price tier not found');
  }

  await prisma.ticketTypePriceTier.delete({ where: { id: priceTierId } });

  return priceTier;
}

// ============================================================================
// PROMOTIONS
// ============================================================================

export async function createPromotion(eventId: string, data: PromotionFormData) {
  return prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        requiresCode: data.requiresCode,
        discountType: data.discountType,
        discountValue: data.discountValue,
        appliesTo: data.appliesTo,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        maxRedemptions: data.maxRedemptions,
        maxPerUser: data.maxPerUser,
      },
    });

    if (data.ticketTypeIds && data.ticketTypeIds.length > 0) {
      await tx.promotionTicketType.createMany({
        data: data.ticketTypeIds.map((ticketTypeId) => ({
          promotionId: promotion.id,
          ticketTypeId,
        })),
      });
    }

    return promotion;
  });
}

export async function updatePromotion(promotionId: string, data: PromotionFormData) {
  const existingPromotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
  });

  if (!existingPromotion) {
    throw new Error('Promotion not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.update({
      where: { id: promotionId },
      data: {
        name: data.name,
        description: data.description,
        requiresCode: data.requiresCode,
        discountType: data.discountType,
        discountValue: data.discountValue,
        appliesTo: data.appliesTo,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        maxRedemptions: data.maxRedemptions,
        maxPerUser: data.maxPerUser,
      },
    });

    await tx.promotionTicketType.deleteMany({ where: { promotionId } });

    if (data.ticketTypeIds && data.ticketTypeIds.length > 0) {
      await tx.promotionTicketType.createMany({
        data: data.ticketTypeIds.map((ticketTypeId) => ({
          promotionId: promotion.id,
          ticketTypeId,
        })),
      });
    }

    return promotion;
  });

  return { result, eventId: existingPromotion.eventId };
}

export async function deletePromotion(promotionId: string) {
  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
  });

  if (!promotion) {
    throw new Error('Promotion not found');
  }

  await prisma.promotion.delete({ where: { id: promotionId } });

  return promotion;
}

// ============================================================================
// VOUCHER CODES
// ============================================================================

export async function createVoucherCode(promotionId: string, data: VoucherCodeFormData) {
  return prisma.voucherCode.create({
    data: {
      promotionId,
      code: data.code.toUpperCase(),
      maxRedemptions: data.maxRedemptions,
    },
  });
}

export async function updateVoucherCode(voucherCodeId: string, data: VoucherCodeFormData) {
  return prisma.voucherCode.update({
    where: { id: voucherCodeId },
    data: {
      code: data.code.toUpperCase(),
      maxRedemptions: data.maxRedemptions,
    },
  });
}

export async function deleteVoucherCode(voucherCodeId: string) {
  const voucherCode = await prisma.voucherCode.findUnique({
    where: { id: voucherCodeId },
    include: { promotion: true },
  });

  if (!voucherCode) {
    throw new Error('Voucher code not found');
  }

  await prisma.voucherCode.delete({ where: { id: voucherCodeId } });

  return voucherCode;
}

// ============================================================================
// EVENT PROMOTERS
// ============================================================================

export async function createEventPromoter(eventId: string, data: EventPromoterFormData) {
  return prisma.$transaction(async (tx) => {
    const voucherCode = await tx.voucherCode.create({
      data: {
        promotionId: data.promotionId,
        code: data.code.toUpperCase(),
        maxRedemptions: data.maxRedemptions,
      },
    });

    const promoter = await tx.eventPromoter.create({
      data: {
        eventId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        voucherCodeId: voucherCode.id,
        commissionRate: data.commissionRate,
        notes: data.notes || null,
      },
      include: {
        voucherCode: {
          include: { promotion: true },
        },
      },
    });

    return promoter;
  });
}

export async function updateEventPromoter(
  promoterId: string,
  data: { name?: string; email?: string; phone?: string; commissionRate?: number | null; notes?: string | null },
) {
  const promoter = await prisma.eventPromoter.findUnique({
    where: { id: promoterId },
  });

  if (!promoter) {
    throw new Error('Promoter not found');
  }

  return prisma.eventPromoter.update({
    where: { id: promoterId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      commissionRate: data.commissionRate,
      notes: data.notes,
    },
  });
}

export async function deleteEventPromoter(promoterId: string) {
  const promoter = await prisma.eventPromoter.findUnique({
    where: { id: promoterId },
    include: { voucherCode: true },
  });

  if (!promoter) {
    throw new Error('Promoter not found');
  }

  // Delete both in a transaction (VoucherCode cascade will handle orders link)
  await prisma.$transaction(async (tx) => {
    await tx.eventPromoter.delete({ where: { id: promoterId } });
    await tx.voucherCode.delete({ where: { id: promoter.voucherCodeId } });
  });

  return promoter;
}

export async function getPromoterPerformance(eventId: string) {
  const promoters = await prisma.eventPromoter.findMany({
    where: { eventId },
    include: {
      voucherCode: {
        include: {
          promotion: {
            select: { id: true, name: true, discountType: true, discountValue: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (promoters.length === 0) {
    return { promoters: [], stats: [] };
  }

  // Aggregate confirmed order stats for all promoter voucher codes in one query
  const voucherCodeIds = promoters.map((p) => p.voucherCodeId);

  const orderStats = await prisma.order.groupBy({
    by: ['voucherCodeId'],
    where: {
      voucherCodeId: { in: voucherCodeIds },
      status: 'CONFIRMED',
    },
    _count: { id: true },
    _sum: { total: true },
  });

  // Get ticket counts per voucher code
  const ticketCounts = await prisma.ticket.groupBy({
    by: ['orderId'],
    where: {
      order: {
        voucherCodeId: { in: voucherCodeIds },
        status: 'CONFIRMED',
      },
    },
    _count: { id: true },
  });

  // Map orderId to voucherCodeId for ticket aggregation
  const orders = await prisma.order.findMany({
    where: {
      voucherCodeId: { in: voucherCodeIds },
      status: 'CONFIRMED',
    },
    select: { id: true, voucherCodeId: true },
  });

  const orderToVoucher = new Map(orders.map((o) => [o.id, o.voucherCodeId]));
  const ticketsByVoucher = new Map<string, number>();
  for (const tc of ticketCounts) {
    const vcId = orderToVoucher.get(tc.orderId);
    if (vcId) {
      ticketsByVoucher.set(vcId, (ticketsByVoucher.get(vcId) || 0) + tc._count.id);
    }
  }

  const statsMap = new Map(
    orderStats.map((s) => [
      s.voucherCodeId,
      { orders: s._count.id, revenue: s._sum.total || 0 },
    ]),
  );

  const stats = promoters.map((p) => {
    const s = statsMap.get(p.voucherCodeId);
    return {
      promoterId: p.id,
      orders: s?.orders || 0,
      tickets: ticketsByVoucher.get(p.voucherCodeId) || 0,
      revenue: s?.revenue || 0,
    };
  });

  return { promoters, stats };
}
