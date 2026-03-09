import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getEventByIdForTenantAction, getOrdersForEventAction } from '@/app/actions/tenant-events';
import { EventHeader } from '@/components/dashboard/events/event-header';
import { EventSubNav } from '@/components/dashboard/events/event-sub-nav';
import { OrdersSection } from '@/components/dashboard/events/orders-section';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';


export default async function EventOrdersPage({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain, eventId } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/${eventId}/orders`);
  }

  const eventResult = await getEventByIdForTenantAction(subdomain, eventId);

  if ('error' in eventResult) {
    notFound();
  }

  const event = eventResult.data;

  const ordersResult = await getOrdersForEventAction(subdomain, eventId);

  const [orderCount, attendeeCount] = await Promise.all([
    prisma.order.count({
      where: { eventId, tenantId: event.tenantId, status: 'CONFIRMED' },
    }),
    prisma.ticket.count({
      where: { eventId, order: { status: 'CONFIRMED' } },
    }),
  ]);

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${subdomain}/events`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </Link>
      </div>

      <EventHeader event={event} tenantSubdomain={subdomain} />

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

      {'error' in ordersResult ? (
        <div className="text-center py-10 text-muted-foreground">
          <p>{ordersResult.error}</p>
        </div>
      ) : (
        <OrdersSection
          orders={ordersResult.data.orders}
          stats={ordersResult.data.stats}
        />
      )}
    </div>
  );
}
