import type { Event, Prisma } from '@/prisma/generated/prisma/client';

export type EventWithTicketTypes = Event & Prisma.EventGetPayload<{
  include: {
    ticketTypes: {
      include: {
        priceTiers: true;
        _count: {
          select: {
            promotions: true;
          };
        };
      };
    };
  };
}>;

export interface TicketsSectionProps {
  event: EventWithTicketTypes;
  tenantSubdomain: string;
}

export type TicketType = EventWithTicketTypes['ticketTypes'][number];
