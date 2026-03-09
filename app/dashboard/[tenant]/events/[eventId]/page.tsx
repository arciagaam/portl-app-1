import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getEventByIdForTenantAction } from '@/app/actions/tenant-events';
import { EventHeader } from '@/components/dashboard/events/event-header';
import { EventStatsCards } from '@/components/dashboard/events/event-stats-cards';
import { EventSubNav } from '@/components/dashboard/events/event-sub-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Clock, Info, ImageIcon, UserCheck } from 'lucide-react';
import { QuickCheckIn } from '@/components/dashboard/events/quick-check-in';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain, eventId } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/${eventId}`);
  }

  const result = await getEventByIdForTenantAction(subdomain, eventId);

  if ('error' in result) {
    notFound();
  }

  const event = result.data;

  // Get order and attendee counts for sub-nav
  const [orderCount, attendeeCount] = await Promise.all([
    prisma.order.count({
      where: { eventId, tenantId: event.tenantId, status: 'CONFIRMED' },
    }),
    prisma.ticket.count({
      where: { eventId, order: { status: 'CONFIRMED' } },
    }),
  ]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${subdomain}/events`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </Link>
      </div>

      {/* Header */}
      <EventHeader event={event} tenantSubdomain={subdomain} />

      {/* Sub Navigation */}
      <EventSubNav
        eventId={eventId}
        tenantSubdomain={subdomain}
        tableCounts={{
          tables: event.tables.length,
          ticketTypes: event.ticketTypes.length,
          promotions: event.promotions.length,
          images: event.images.length,
          orders: orderCount,
          attendees: attendeeCount,
        }}
      />

      {/* Stats Cards */}
      <EventStatsCards event={event} />

      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{event.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                <p className="text-sm capitalize">{event.status.toLowerCase()}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                <p className="text-sm">{formatDate(event.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Venue & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Venue</h4>
              <p className="text-sm font-medium">{event.venueName}</p>
              {event.venueAddress && (
                <p className="text-sm text-muted-foreground">{event.venueAddress}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Start
                </h4>
                <p className="text-sm">{formatDate(event.startDate)}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.startTime}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  End
                </h4>
                <p className="text-sm">{formatDate(event.endDate)}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.endTime}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Check-in */}
      <QuickCheckIn tenantSubdomain={subdomain} eventId={eventId} />

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your event configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href={`/dashboard/${subdomain}/events/${eventId}/gallery`}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Gallery</h4>
                <p className="text-sm text-muted-foreground">
                  {event.images.length} image{event.images.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>

            <Link
              href={`/dashboard/${subdomain}/events/${eventId}/tables`}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium">Tables & Seats</h4>
                <p className="text-sm text-muted-foreground">
                  {event.tables.length} table{event.tables.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </Link>

            <Link
              href={`/dashboard/${subdomain}/events/${eventId}/tickets`}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium">Ticket Types</h4>
                <p className="text-sm text-muted-foreground">
                  {event.ticketTypes.length} type{event.ticketTypes.length !== 1 ? 's' : ''} available
                </p>
              </div>
            </Link>

            <Link
              href={`/dashboard/${subdomain}/events/${eventId}/promotions`}
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium">Promotions</h4>
                <p className="text-sm text-muted-foreground">
                  {event.promotions.length} promotion{event.promotions.length !== 1 ? 's' : ''} active
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
