'use client';

import { Ticket, Users, DollarSign, TableIcon } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import { formatPhp } from '@/lib/format';

type EventWithRelations = Event & Prisma.EventGetPayload<{
  include: {
    tables: true;
    ticketTypes: {
      include: {
        priceTiers: true;
      };
    };
    promotions: true;
  };
}>;

interface EventStatsCardsProps {
  event: EventWithRelations;
}

export function EventStatsCards({ event }: EventStatsCardsProps) {
  // Calculate total ticket capacity
  const totalTicketCapacity = event.ticketTypes.reduce((acc, tt) => {
    return acc + (tt.quantityTotal ?? 0);
  }, 0);

  // Calculate total tickets sold
  const totalTicketsSold = event.ticketTypes.reduce((acc, tt) => {
    return acc + tt.quantitySold;
  }, 0);

  // Calculate potential revenue (base prices * capacity)
  const potentialRevenue = event.ticketTypes.reduce((acc, tt) => {
    const qty = tt.quantityTotal ?? 0;
    return acc + (tt.basePrice * qty);
  }, 0);

  // Calculate current revenue (base prices * sold)
  const currentRevenue = event.ticketTypes.reduce((acc, tt) => {
    return acc + (tt.basePrice * tt.quantitySold);
  }, 0);

  return (
    <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4 border">
      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Ticket Types</span>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{event.ticketTypes.length}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {totalTicketCapacity > 0 ? `${totalTicketCapacity} total capacity` : 'No capacity set'}
        </p>
      </div>

      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tickets Sold</span>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{totalTicketsSold}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {totalTicketCapacity > 0
            ? `${Math.round((totalTicketsSold / totalTicketCapacity) * 100)}% of capacity`
            : 'No capacity limit'}
        </p>
      </div>

      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Tables</span>
          <TableIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{event.tables.length}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {event.tables.reduce((acc, t) => acc + t.capacity, 0)} total seats
        </p>
      </div>

      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Revenue</span>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{formatPhp(currentRevenue)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {potentialRevenue > 0 ? `${formatPhp(potentialRevenue)} potential` : 'Set ticket prices'}
        </p>
      </div>
    </div>
  );
}
