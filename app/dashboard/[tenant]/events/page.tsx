import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { EventsList } from '@/components/dashboard/events/events-list';

async function getTenantEvents(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      application: true,
      events: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          venueName: true,
        },
        orderBy: { startDate: 'desc' },
      },
    },
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

export default async function EventsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/events`);
  }

  const tenant = await getTenantEvents(user.id, subdomain);

  if (!tenant) {
    redirect('/account');
  }

  const isApproved = tenant.application?.status === 'APPROVED';

  if (!isApproved) {
    redirect(`/dashboard/${subdomain}`);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <EventsList
        events={tenant.events}
        tenantSubdomain={subdomain}
        tenantName={tenant.name}
      />
    </div>
  );
}
