import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getEventByIdForTenantAction } from '@/app/actions/tenant-events';
import { EventHeader } from '@/components/dashboard/events/event-header';
import { EventSubNav } from '@/components/dashboard/events/event-sub-nav';
import { TablesSection } from '@/components/dashboard/events/tables-section';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function TablesPage({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain, eventId } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/${eventId}/tables`);
  }

  const result = await getEventByIdForTenantAction(subdomain, eventId);

  if ('error' in result) {
    notFound();
  }

  const event = result.data;

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
        }}
      />

      {/* Tables Section */}
      <TablesSection event={event} tenantSubdomain={subdomain} />
    </div>
  );
}
