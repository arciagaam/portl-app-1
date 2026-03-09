import type { Order, OrderItem, Ticket, Event, TicketType, Tenant, Promotion, VoucherCode } from '@/prisma/generated/prisma/client';

// Shared across checkout and order modules
export type OrderItemWithRelations = OrderItem & {
  ticketType: TicketType;
  tickets: Ticket[];
};

// Checkout-specific: ticket with just its type
export type TicketWithTicketType = Ticket & {
  ticketType: TicketType;
};

// Account-specific: ticket with full relations for display
export type TicketWithRelations = Ticket & {
  event: Event & { tenant: Tenant };
  ticketType: TicketType;
  order: Order;
};

// Checkout flow order (tickets have ticketType only)
export type CheckoutOrderWithRelations = Order & {
  event: Event;
  tenant: Tenant;
  items: OrderItemWithRelations[];
  tickets: TicketWithTicketType[];
  promotion: Promotion | null;
  voucherCode: VoucherCode | null;
};

// Account order list item
export type OrderListItem = Order & {
  event: Event & { tenant: Tenant };
  _count: {
    items: number;
    tickets: number;
  };
};

// Account order detail (tickets have full relations)
export type AccountOrderWithRelations = Order & {
  event: Event;
  tenant: Tenant;
  items: OrderItemWithRelations[];
  tickets: TicketWithRelations[];
  promotion: Promotion | null;
  voucherCode: VoucherCode | null;
};
