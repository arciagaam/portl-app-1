import * as z from 'zod';

// Event validation
export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().min(1, 'End date is required'),
  endTime: z.string().min(1, 'End time is required'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  thumbnailUrl: z.string().url().optional().nullable(),
}).refine((data) => {
  const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
  const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
  return endDateTime > startDateTime;
}, {
  message: 'End date/time must be after start date/time',
  path: ['endDate'],
});

export type EventFormData = z.infer<typeof eventSchema>;

// Table validation
export const tableSchema = z.object({
  label: z.string().min(1, 'Table label is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  minSpend: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  mode: z.enum(['EXCLUSIVE', 'SHARED']),
  status: z.enum(['OPEN', 'CLOSED', 'HIDDEN']).optional(),
});

export type TableFormData = z.infer<typeof tableSchema>;

// Bulk table creation
export const bulkTableSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  startNumber: z.number().int().positive('Start number must be positive'),
  endNumber: z.number().int().positive('End number must be positive'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  minSpend: z.number().int().nonnegative().optional(),
  mode: z.enum(['EXCLUSIVE', 'SHARED']),
}).refine((data) => data.endNumber >= data.startNumber, {
  message: 'End number must be greater than or equal to start number',
  path: ['endNumber'],
});

export type BulkTableFormData = z.infer<typeof bulkTableSchema>;

// Ticket Type validation
export const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  kind: z.enum(['GENERAL', 'TABLE', 'SEAT']),
  basePrice: z.number().int().nonnegative('Price must be non-negative'),
  quantityTotal: z.number().int().positive().optional(),
  transferrable: z.boolean(),
  cancellable: z.boolean(),
  tableId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED', 'HIDDEN']).optional(),
}).refine((data) => {
  if (data.kind === 'TABLE' || data.kind === 'SEAT') {
    return !!data.tableId;
  }
  return true;
}, {
  message: 'Table is required for TABLE and SEAT ticket types',
  path: ['tableId'],
});

export type TicketTypeFormData = z.infer<typeof ticketTypeSchema>;

// Price Tier validation
export const priceTierSchema = z.object({
  name: z.string().min(1, 'Tier name is required'),
  price: z.number().int().nonnegative('Price must be non-negative'),
  strategy: z.enum(['TIME_WINDOW', 'ALLOCATION']),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  allocationTotal: z.number().int().positive().optional().nullable(),
  priority: z.number().int(),
}).refine((data) => {
  if (data.strategy === 'TIME_WINDOW') {
    return !!data.startsAt && !!data.endsAt;
  }
  return true;
}, {
  message: 'Start and end dates are required for TIME_WINDOW strategy',
  path: ['startsAt'],
}).refine((data) => {
  if (data.strategy === 'TIME_WINDOW' && data.startsAt && data.endsAt) {
    return new Date(data.startsAt) < new Date(data.endsAt);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endsAt'],
}).refine((data) => {
  if (data.strategy === 'ALLOCATION') {
    return !!data.allocationTotal;
  }
  return true;
}, {
  message: 'Allocation total is required for ALLOCATION strategy',
  path: ['allocationTotal'],
});

export type PriceTierFormData = z.infer<typeof priceTierSchema>;

// Promotion validation
export const promotionSchema = z.object({
  name: z.string().min(1, 'Promotion name is required'),
  description: z.string().optional(),
  requiresCode: z.boolean(),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().int().nonnegative('Discount value must be non-negative'),
  appliesTo: z.enum(['ORDER', 'ITEM']),
  validFrom: z.string().datetime({ message: 'Valid from date is required' }),
  validUntil: z.string().datetime({ message: 'Valid until date is required' }),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  maxPerUser: z.number().int().positive().optional().nullable(),
  ticketTypeIds: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.discountType === 'PERCENT') {
    return data.discountValue <= 10000; // Max 100% (10000 basis points)
  }
  return true;
}, {
  message: 'Percent discount cannot exceed 100%',
  path: ['discountValue'],
}).refine((data) => {
  return new Date(data.validFrom) < new Date(data.validUntil);
}, {
  message: 'Valid until date must be after valid from date',
  path: ['validUntil'],
});

export type PromotionFormData = z.infer<typeof promotionSchema>;

// Event Promoter validation
export const eventPromoterSchema = z.object({
  name: z.string().min(1, 'Promoter name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  code: z.string().min(1, 'Promo code is required').regex(/^[A-Z0-9-_]+$/i, 'Code can only contain letters, numbers, hyphens, and underscores'),
  promotionId: z.string().min(1, 'Promotion is required'),
  commissionRate: z.number().int().min(0).max(10000).optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  notes: z.string().optional(),
});

export type EventPromoterFormData = z.infer<typeof eventPromoterSchema>;

// Voucher Code validation
export const voucherCodeSchema = z.object({
  code: z.string().min(1, 'Voucher code is required').regex(/^[A-Z0-9-_]+$/i, 'Code can only contain letters, numbers, hyphens, and underscores'),
  maxRedemptions: z.number().int().positive().optional().nullable(),
});

export type VoucherCodeFormData = z.infer<typeof voucherCodeSchema>;
