import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { TicketTypesDisplay } from './ticket-types-display';
import type { Event, EventImage, TicketType, TicketTypePriceTier } from '@/prisma/generated/prisma/client';

type EventWithTicketTypes = Event & {
  ticketTypes: (TicketType & {
    priceTiers: TicketTypePriceTier[];
  })[];
  images: EventImage[];
};

interface PublicEventDetailProps {
  event: EventWithTicketTypes;
  tenantSubdomain: string;
  tenantName: string;
}

export function PublicEventDetail({ event, tenantSubdomain, tenantName }: PublicEventDetailProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
      </div>

      {/* Hero image */}
      {(() => {
        const heroUrl = event.thumbnailUrl || event.images?.[0]?.url;
        return heroUrl ? (
          <div className="relative aspect-[2/1] overflow-hidden rounded-xl">
            <Image
              src={heroUrl}
              alt={event.name}
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          </div>
        ) : null;
      })()}

      {/* Event header */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">{tenantName}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{event.name}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>About this event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Gallery */}
          {event.images.length > 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {event.images.map((image) => (
                  <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-lg">
                    <Image
                      src={image.url}
                      alt={event.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Tickets</h2>
            <TicketTypesDisplay eventId={event.id} ticketTypes={event.ticketTypes} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  {isSameDay(event.startDate, event.endDate) ? (
                    <p className="font-medium">{formatDate(event.startDate)}</p>
                  ) : (
                    <>
                      <p className="font-medium">{formatDate(event.startDate)}</p>
                      <p className="text-sm text-muted-foreground">to {formatDate(event.endDate)}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{event.startTime} - {event.endTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{event.venueName}</p>
                  {event.venueAddress && (
                    <p className="text-sm text-muted-foreground mt-1">{event.venueAddress}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
