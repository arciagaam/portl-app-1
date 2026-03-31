import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { CreateEventWizard } from '@/components/dashboard/events/create-event-wizard';
import { createEventForTenantAction } from '@/app/actions/tenant-events';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getTenant(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: { application: true },
  });

  if (!tenant) {
    return null;
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: { userId, tenantId: tenant.id },
    },
  });

  if (!membership) {
    return null;
  }

  return tenant;
}

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events/new`);
  }

  const tenant = await getTenant(user.id, subdomain);

  if (!tenant) {
    redirect('/account');
  }

  const isApproved = tenant.application?.status === 'APPROVED';

  if (!isApproved) {
    redirect(`/dashboard/${subdomain}`);
  }

  async function handleSubmit(data: Parameters<typeof createEventForTenantAction>[1]) {
    'use server';
    return createEventForTenantAction(subdomain, data);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${subdomain}/events`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Events
        </Link>
      </div>

      <CreateEventWizard
        tenantSubdomain={subdomain}
        onCreateEvent={handleSubmit}
      />
    </div>
  );
}
