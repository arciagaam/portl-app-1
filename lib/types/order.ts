import type { Order, OrderItem, Ticket, Event, TicketType, Table, Tenant, Promotion, VoucherCode } from '@/prisma/generated/prisma/client';

// Shared across checkout and order modules
export type OrderItemWithRelations = OrderItem & {
  ticketType: TicketType | null;
  table: Table | null;
  tickets: (Ticket & { ticketType: TicketType | null; table: Table | null })[];
};

// Checkout-specific: ticket with just its type/table
export type TicketWithTicketType = Ticket & {
  ticketType: TicketType | null;
  table: Table | null;
};

// Account-specific: ticket with full relations for display
export type TicketWithRelations = Ticket & {
  event: Event & { tenant: Tenant };
  ticketType: TicketType | null;
  table: Table | null;
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
