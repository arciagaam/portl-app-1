import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getEventByIdForTenantAction, updateEventForTenantAction } from '@/app/actions/tenant-events';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EventForm } from '@/components/dashboard/events/event-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ tenant: string; eventId: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain, eventId } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/${eventId}/edit`);
  }

  const result = await getEventByIdForTenantAction(subdomain, eventId);

  if ('error' in result) {
    notFound();
  }

  const event = result.data;

  // Format dates for the form
  const formatDateForInput = (date: Date) => {
    return new Date(date).toISOString().split('T')[0];
  };

  const defaultValues = {
    name: event.name,
    description: event.description || '',
    venueName: event.venueName,
    venueAddress: event.venueAddress || '',
    startDate: formatDateForInput(event.startDate),
    startTime: event.startTime,
    endDate: formatDateForInput(event.endDate),
    endTime: event.endTime,
    status: event.status,
    thumbnailUrl: event.thumbnailUrl || undefined,
  };

  async function handleSubmit(data: Parameters<typeof updateEventForTenantAction>[2]) {
    'use server';
    return updateEventForTenantAction(subdomain, eventId, data);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${subdomain}/events/${eventId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Event
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Event</CardTitle>
          <CardDescription>
            Update the details for {event.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm
            tenantSubdomain={subdomain}
            eventId={eventId}
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
