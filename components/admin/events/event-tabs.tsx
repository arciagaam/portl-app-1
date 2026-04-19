'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablesSection } from './tables-section';
import { TicketTypesSection } from './ticket-types-section';
import { PromotionsSection } from './promotions-section';
import { Event, Prisma } from '@/prisma/generated/prisma/client';

type EventWithRelations = Event & Prisma.EventGetPayload<{
  include: {
    tables: true;
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
    promotions: {
      include: {
        voucherCodes: true;
        ticketTypes: true;
      };
    };
  };
}>;

interface EventTabsProps {
  event: EventWithRelations;
}

export function EventTabs({ event }: EventTabsProps) {
  return (
    <Tabs defaultValue="tables" className="w-full">
      <TabsList>
        <TabsTrigger value="tables">
          Tables & Seats ({event.tables.length})
        </TabsTrigger>
        <TabsTrigger value="ticket-types">
          Ticket Types ({event.ticketTypes.length})
        </TabsTrigger>
        <TabsTrigger value="promotions">
          Promotions ({event.promotions.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tables">
        <TablesSection event={event} />
      </TabsContent>
      <TabsContent value="ticket-types">
        <TicketTypesSection event={event} />
      </TabsContent>
      <TabsContent value="promotions">
        <PromotionsSection event={event} />
      </TabsContent>
    </Tabs>
  );
}
