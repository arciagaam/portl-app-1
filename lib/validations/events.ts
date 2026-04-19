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
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  ticketPrice: z.number().int().nonnegative('Ticket price must be non-negative'),
  requirementType: z.enum(['MINIMUM_SPEND', 'BOTTLE_REQUIREMENT']).optional().nullable(),
  minSpend: z.number().int().nonnegative().optional().nullable(),
  bottleCount: z.number().int().positive().optional().nullable(),
  transferrable: z.boolean(),
  cancellable: z.boolean(),
  notes: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'HIDDEN']).optional(),
}).refine((data) => {
  if (data.requirementType === 'MINIMUM_SPEND') return !!data.minSpend;
  return true;
}, {
  message: 'Minimum spend is required',
  path: ['minSpend'],
}).refine((data) => {
  if (data.requirementType === 'BOTTLE_REQUIREMENT') return !!data.bottleCount;
  return true;
}, {
  message: 'Bottle count is required',
  path: ['bottleCount'],
});

export type TableFormData = z.infer<typeof tableSchema>;

// Bulk table creation
export const bulkTableSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  startNumber: z.number().int().positive('Start number must be positive'),
  endNumber: z.number().int().positive('End number must be positive'),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  ticketPrice: z.number().int().nonnegative('Ticket price must be non-negative'),
  requirementType: z.enum(['MINIMUM_SPEND', 'BOTTLE_REQUIREMENT']).optional().nullable(),
  minSpend: z.number().int().nonnegative().optional().nullable(),
  bottleCount: z.number().int().positive().optional().nullable(),
  transferrable: z.boolean(),
  cancellable: z.boolean(),
}).refine((data) => data.endNumber >= data.startNumber, {
  message: 'End number must be greater than or equal to start number',
  path: ['endNumber'],
}).refine((data) => {
  if (data.requirementType === 'MINIMUM_SPEND') return !!data.minSpend;
  return true;
}, {
  message: 'Minimum spend is required',
  path: ['minSpend'],
}).refine((data) => {
  if (data.requirementType === 'BOTTLE_REQUIREMENT') return !!data.bottleCount;
  return true;
}, {
  message: 'Bottle count is required',
  path: ['bottleCount'],
});

export type BulkTableFormData = z.infer<typeof bulkTableSchema>;

// Ticket Type validation
export const ticketTypeSchema = z.object({
  name: z.string().min(1, 'Ticket type name is required'),
  description: z.string().optional(),
  basePrice: z.number().int().nonnegative('Price must be non-negative'),
  quantityTotal: z.number().int().positive().optional(),
  transferrable: z.boolean(),
  cancellable: z.boolean(),
  imageUrl: z.string().url().optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED', 'HIDDEN']).optional(),
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

// Inline voucher code (for creating codes alongside a promotion)
export const inlineVoucherCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').regex(/^[A-Z0-9-_]+$/i, 'Letters, numbers, hyphens, underscores only'),
  maxRedemptions: z.number().int().positive().optional().nullable(),
});

export type InlineVoucherCodeFormData = z.infer<typeof inlineVoucherCodeSchema>;

// Inline promotion (used in ticket/table stepper and standalone form)
// Uses plain percentages (0-100) instead of basis points; server converts before DB write
export const inlinePromotionSchema = z.object({
  name: z.string().min(1, 'Promotion name is required'),
  description: z.string().optional(),
  requiresCode: z.boolean(),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.number().nonnegative('Discount value must be non-negative'),
  appliesTo: z.enum(['ORDER', 'ITEM']),
  validFrom: z.string().optional().or(z.literal('')),
  validUntil: z.string().optional().or(z.literal('')),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  maxPerUser: z.number().int().positive().optional().nullable(),
  ticketTypeIds: z.array(z.string()).optional(),
  codes: z.array(inlineVoucherCodeSchema).optional(),
}).refine((data) => {
  if (data.discountType === 'PERCENT') {
    return data.discountValue <= 100;
  }
  return true;
}, {
  message: 'Percent discount cannot exceed 100%',
  path: ['discountValue'],
}).refine((data) => {
  if (data.validFrom && data.validUntil) {
    return new Date(data.validFrom) < new Date(data.validUntil);
  }
  return true;
}, {
  message: 'Valid until date must be after valid from date',
  path: ['validUntil'],
});

export type InlinePromotionFormData = z.infer<typeof inlinePromotionSchema>;

// Legacy promotion schema (kept for backward compat with existing reads)
export const promotionSchema = inlinePromotionSchema;
export type PromotionFormData = InlinePromotionFormData;

// Combined ticket type + optional promotion
export const ticketTypeWithPromotionSchema = ticketTypeSchema.and(z.object({
  promotion: inlinePromotionSchema.optional(),
}));

export type TicketTypeWithPromotionFormData = z.infer<typeof ticketTypeWithPromotionSchema>;

// Combined table + optional promotion
export const tableWithPromotionSchema = tableSchema.and(z.object({
  promotion: inlinePromotionSchema.optional(),
}));

export type TableWithPromotionFormData = z.infer<typeof tableWithPromotionSchema>;

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
