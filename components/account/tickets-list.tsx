import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ChevronRight, Ticket } from 'lucide-react';
import type { TicketWithRelations } from '@/lib/types/order';

interface TicketsListProps {
  tickets: TicketWithRelations[];
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CHECKED_IN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  TRANSFERRED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  CHECKED_IN: 'Checked In',
  TRANSFERRED: 'Transferred',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export function TicketsList({ tickets }: TicketsListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group tickets by event
  const ticketsByEvent = tickets.reduce((acc, ticket) => {
    const eventId = ticket.eventId;
    if (!acc[eventId]) {
      acc[eventId] = {
        event: ticket.event,
        tickets: [],
      };
    }
    acc[eventId].tickets.push(ticket);
    return acc;
  }, {} as Record<string, { event: typeof tickets[0]['event']; tickets: typeof tickets }>);

  return (
    <div className="space-y-8">
      {Object.values(ticketsByEvent).map(({ event, tickets: eventTickets }) => (
        <div key={event.id} className="space-y-4">
          {/* Event Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(event.startDate)} at {event.startTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.venueName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{event.tenant.name}</p>
          </div>

          {/* Tickets */}
          <div className="grid gap-4 sm:grid-cols-2">
            {eventTickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ticket.ticketType.name}</span>
                          <Badge className={statusColors[ticket.status]}>
                            {statusLabels[ticket.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ticket.holderFirstName
                            ? `${ticket.holderFirstName} ${ticket.holderLastName}`
                            : 'No attendee assigned'}
                        </p>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {ticket.ticketCode}
                        </code>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/account/tickets/${ticket.id}`}>
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
