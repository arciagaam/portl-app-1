import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getTenantPageSettingsAction } from '@/app/actions/tenant-page';
import { PageSettingsSection } from '@/components/dashboard/page-settings/page-settings-section';

async function verifyAccess(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: { application: true },
  });

  if (!tenant) return null;

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: { userId, tenantId: tenant.id },
    },
  });

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    return null;
  }

  return { tenant, memberRole: membership.role };
}

export default async function PageSettingsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/page-settings`);
  }

  const access = await verifyAccess(user.id, subdomain);

  if (!access) {
    redirect(`/dashboard/${subdomain}`);
  }

  const isApproved = access.tenant.application?.status === 'APPROVED';

  if (!isApproved) {
    redirect(`/dashboard/${subdomain}`);
  }

  const result = await getTenantPageSettingsAction(subdomain);

  if ('error' in result) {
    redirect(`/dashboard/${subdomain}`);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Page Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your public landing page for {access.tenant.name}.
        </p>
      </div>

      <PageSettingsSection
        tenant={result.data}
        tenantSubdomain={subdomain}
      />
    </div>
  );
}
