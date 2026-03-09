import * as z from 'zod';

// Add to cart validation
export const addToCartSchema = z.object({
  eventId: z.string().cuid('Invalid event ID'),
  ticketTypeId: z.string().cuid('Invalid ticket type ID'),
  quantity: z.number().int().positive('Quantity must be at least 1').max(10, 'Maximum 10 tickets per type'),
  seatId: z.string().cuid().optional().nullable(),
});

export type AddToCartData = z.infer<typeof addToCartSchema>;

// Update cart item validation
export const updateCartItemSchema = z.object({
  cartItemId: z.string().cuid('Invalid cart item ID'),
  quantity: z.number().int().min(0, 'Quantity must be 0 or more').max(10, 'Maximum 10 tickets'),
});

export type UpdateCartItemData = z.infer<typeof updateCartItemSchema>;

// Voucher code application validation
export const voucherCodeApplySchema = z.object({
  code: z.string()
    .min(1, 'Voucher code is required')
    .max(50, 'Code too long')
    .regex(/^[A-Z0-9-_]+$/i, 'Invalid code format'),
});

export type VoucherCodeApplyData = z.infer<typeof voucherCodeApplySchema>;

// Attendee/holder info validation
export const attendeeSchema = z.object({
  ticketIndex: z.number().int().min(0),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
});

export type AttendeeData = z.infer<typeof attendeeSchema>;

// Checkout initialization validation
export const initializeCheckoutSchema = z.object({
  tenantSubdomain: z.string().min(1, 'Tenant subdomain is required'),
});

export type InitializeCheckoutData = z.infer<typeof initializeCheckoutSchema>;

// Save attendees validation
export const saveAttendeesSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  attendees: z.array(attendeeSchema),
});

export type SaveAttendeesData = z.infer<typeof saveAttendeesSchema>;

// Complete checkout validation
export const completeCheckoutSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional().nullable(),
});

export type CompleteCheckoutData = z.infer<typeof completeCheckoutSchema>;

// Payment session attendee (simpler than the full attendeeSchema - no ticketIndex needed)
export const paymentAttendeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().nullable(),
});

// Create payment session validation
export const createPaymentSessionSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional().nullable(),
  attendees: z.array(paymentAttendeeSchema),
});

export type CreatePaymentSessionData = z.infer<typeof createPaymentSessionSchema>;

// Complete checkout with optional attendees (for placeholder payment flow)
export const completeCheckoutWithAttendeesSchema = completeCheckoutSchema.extend({
  attendees: z.array(paymentAttendeeSchema).optional(),
});

export type CompleteCheckoutWithAttendeesData = z.infer<typeof completeCheckoutWithAttendeesSchema>;

// Order cancellation validation
export const cancelOrderSchema = z.object({
  orderId: z.string().cuid('Invalid order ID'),
});

export type CancelOrderData = z.infer<typeof cancelOrderSchema>;
