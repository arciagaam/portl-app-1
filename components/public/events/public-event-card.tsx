import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react';
import type { Event, TicketType } from '@/prisma/generated/prisma/client';

type EventWithTicketTypes = Event & {
  ticketTypes: Pick<TicketType, 'id' | 'basePrice'>[];
  images: { url: string }[];
};

interface PublicEventCardProps {
  event: EventWithTicketTypes;
  tenantSubdomain: string;
}

export function PublicEventCard({ event, tenantSubdomain }: PublicEventCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStartingPrice = () => {
    if (event.ticketTypes.length === 0) {
      return null;
    }
    const prices = event.ticketTypes.map((t) => t.basePrice);
    const minPrice = Math.min(...prices);
    return minPrice;
  };

  const startingPrice = getStartingPrice();
  const thumbnailUrl = event.thumbnailUrl || event.images?.[0]?.url;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden">
        {thumbnailUrl && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt={event.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
            {event.name}
          </CardTitle>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {event.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{event.startTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{event.venueName}</span>
          </div>
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Ticket className="h-4 w-4 shrink-0" />
              {startingPrice !== null ? (
                <span>From PHP {startingPrice.toLocaleString()}</span>
              ) : (
                <span className="text-muted-foreground">Tickets coming soon</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
