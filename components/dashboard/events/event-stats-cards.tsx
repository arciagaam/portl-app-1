'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Types</CardTitle>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{event.ticketTypes.length}</div>
          <p className="text-xs text-muted-foreground">
            {totalTicketCapacity > 0 ? `${totalTicketCapacity} total capacity` : 'No capacity set'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTicketsSold}</div>
          <p className="text-xs text-muted-foreground">
            {totalTicketCapacity > 0
              ? `${Math.round((totalTicketsSold / totalTicketCapacity) * 100)}% of capacity`
              : 'No capacity limit'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tables</CardTitle>
          <TableIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{event.tables.length}</div>
          <p className="text-xs text-muted-foreground">
            {event.tables.reduce((acc, t) => acc + t.capacity, 0)} total seats
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPhp(currentRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {potentialRevenue > 0 ? `${formatPhp(potentialRevenue)} potential` : 'Set ticket prices'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
