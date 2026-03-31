import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getEventByIdForTenantAction, getEventPromotersAction } from '@/app/actions/tenant-events';
import { EventHeader } from '@/components/dashboard/events/event-header';
import { EventSubNav } from '@/components/dashboard/events/event-sub-nav';
import { PromotersSection } from '@/components/dashboard/events/promoters-section';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function PromotersPage({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain, eventId } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/${eventId}/promoters`);
  }

  const [eventResult, promotersResult] = await Promise.all([
    getEventByIdForTenantAction(subdomain, eventId),
    getEventPromotersAction(subdomain, eventId),
  ]);

  if ('error' in eventResult) {
    notFound();
  }

  const event = eventResult.data;
  const { promoters, stats } = 'error' in promotersResult
    ? { promoters: [], stats: [] }
    : promotersResult.data;

  // Extract promotions that require codes (for the promoter form dropdown)
  const codePromotions = event.promotions
    .filter((p) => p.requiresCode)
    .map((p) => ({
      id: p.id,
      name: p.name,
      discountType: p.discountType,
      discountValue: p.discountValue,
    }));

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
          promoters: promoters.length,
        }}
      />

      {/* Promoters Section */}
      <PromotersSection
        eventId={eventId}
        tenantSubdomain={subdomain}
        promoters={promoters}
        stats={stats}
        promotions={codePromotions}
      />
    </div>
  );
}
