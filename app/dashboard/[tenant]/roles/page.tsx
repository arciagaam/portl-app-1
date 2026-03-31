import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { RolesList } from '@/components/dashboard/roles/roles-list';

async function getRolesData(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: { application: true },
  });

  if (!tenant) return null;

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: { userId, tenantId: tenant.id },
    },
    include: {
      memberRoles: {
        include: {
          role: { select: { permissions: true, isOwnerRole: true } },
        },
      },
    },
  });

  if (!membership) return null;

  const roles = membership.memberRoles.map((mr) => mr.role);
  const permissions = getEffectivePermissions(roles);

  if (!hasPermission(permissions, PERMISSIONS.MANAGE_ROLES)) {
    return null;
  }

  const tenantRoles = await prisma.tenantRole.findMany({
    where: { tenantId: tenant.id },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { position: 'asc' },
  });

  return { tenant, tenantRoles, permissions: Array.from(permissions) };
}

export default async function RolesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/roles`);
  }

  const data = await getRolesData(user.id, subdomain);

  if (!data) {
    redirect(`/dashboard/${subdomain}`);
  }

  const isApproved = data.tenant.application?.status === 'APPROVED';
  if (!isApproved) {
    redirect(`/dashboard/${subdomain}`);
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-1">
          Manage roles and permissions for {data.tenant.name}.
        </p>
      </div>

      <RolesList
        roles={data.tenantRoles}
        subdomain={subdomain}
        permissions={data.permissions}
      />
    </div>
  );
}
