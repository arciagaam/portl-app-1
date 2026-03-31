import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TeamSection } from '@/components/dashboard/team/team-section';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

async function getTeamData(userId: string, subdomain: string) {
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
          role: {
            select: {
              permissions: true,
              isOwnerRole: true,
            },
          },
        },
      },
    },
  });

  if (!membership) return null;

  const roles = membership.memberRoles.map((mr) => mr.role);
  const permissions = getEffectivePermissions(roles);

  if (!hasPermission(permissions, [PERMISSIONS.VIEW_TEAM, PERMISSIONS.MANAGE_TEAM])) {
    return null;
  }

  const members = await prisma.tenantMember.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      memberRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              color: true,
              permissions: true,
              isOwnerRole: true,
              position: true,
            },
          },
        },
        orderBy: {
          role: { position: 'asc' },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const invitations = await prisma.tenantInvitation.findMany({
    where: {
      tenantId: tenant.id,
      status: 'PENDING',
    },
    include: {
      inviter: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch role info for invitations
  const allRoleIds = invitations.flatMap((i) => i.roleIds);
  const allRoles = allRoleIds.length > 0
    ? await prisma.tenantRole.findMany({
        where: { id: { in: allRoleIds } },
        select: { id: true, name: true, color: true },
      })
    : [];
  const roleMap = new Map(allRoles.map((r) => [r.id, r]));

  const enrichedInvitations = invitations.map((inv) => ({
    ...inv,
    roles: inv.roleIds.map((id) => roleMap.get(id)).filter(Boolean) as { id: string; name: string; color: string }[],
  }));

  // Fetch available roles for assignment
  const tenantRoles = await prisma.tenantRole.findMany({
    where: { tenantId: tenant.id, isOwnerRole: false },
    orderBy: { position: 'asc' },
    select: { id: true, name: true, color: true },
  });

  return {
    tenant,
    members,
    invitations: enrichedInvitations,
    permissions: Array.from(permissions),
    tenantRoles,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const user = await getCurrentUser();
  const { tenant: subdomain } = await params;

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/team`);
  }

  const data = await getTeamData(user.id, subdomain);

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
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground mt-1">
          Manage your team members and invitations for {data.tenant.name}.
        </p>
      </div>

      <TeamSection
        members={data.members}
        invitations={data.invitations}
        permissions={data.permissions}
        subdomain={subdomain}
        tenantRoles={data.tenantRoles}
      />
    </div>
  );
}
