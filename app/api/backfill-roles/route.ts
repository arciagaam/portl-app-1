import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLES } from '@/lib/default-roles';

/**
 * One-time backfill: creates default TenantRoles for existing tenants
 * and assigns the Owner role to each tenant's owner member.
 *
 * POST /api/backfill-roles
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    select: { id: true, subdomain: true, ownerId: true },
  });

  const results = [];

  for (const tenant of tenants) {
    // Check if roles already exist
    const existingRoles = await prisma.tenantRole.findMany({
      where: { tenantId: tenant.id },
    });

    let ownerRoleId: string | null = null;

    if (existingRoles.length === 0) {
      // Seed default roles
      for (const roleDef of DEFAULT_ROLES) {
        const role = await prisma.tenantRole.create({
          data: {
            tenantId: tenant.id,
            name: roleDef.name,
            color: roleDef.color,
            permissions: roleDef.permissions,
            position: roleDef.position,
            isDefault: roleDef.isDefault,
            isOwnerRole: roleDef.isOwnerRole,
          },
        });
        if (role.isOwnerRole) ownerRoleId = role.id;
      }
    } else {
      ownerRoleId = existingRoles.find((r) => r.isOwnerRole)?.id ?? null;
    }

    // Find the owner's membership
    if (ownerRoleId) {
      const ownerMember = await prisma.tenantMember.findUnique({
        where: {
          userId_tenantId: {
            userId: tenant.ownerId,
            tenantId: tenant.id,
          },
        },
      });

      if (ownerMember) {
        // Assign Owner role if not already assigned
        await prisma.memberRole.upsert({
          where: {
            tenantMemberId_tenantRoleId: {
              tenantMemberId: ownerMember.id,
              tenantRoleId: ownerRoleId,
            },
          },
          update: {},
          create: {
            tenantMemberId: ownerMember.id,
            tenantRoleId: ownerRoleId,
          },
        });
      }
    }

    results.push({
      subdomain: tenant.subdomain,
      rolesCreated: existingRoles.length === 0 ? DEFAULT_ROLES.length : 0,
      ownerAssigned: !!ownerRoleId,
    });
  }

  return NextResponse.json({ success: true, results });
}
