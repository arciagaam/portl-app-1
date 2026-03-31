import { cache } from 'react';
import { prisma } from './prisma';
import { getCurrentUser } from './auth';
import {
  getEffectivePermissions,
  hasPermission,
  isOwner as checkIsOwner,
  type Permission,
} from './permissions';

/**
 * Validates if a tenant exists by subdomain.
 * Wrapped in React cache() to deduplicate within a single server request.
 */
export const getTenantBySubdomain = cache(async (subdomain: string) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        id: true,
        subdomain: true,
        name: true,
        ownerId: true,
        logoUrl: true,
        status: true,
      },
    });
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
});

/**
 * Get current tenant from subdomain in server components
 * Call this in your [tenant] layout or pages
 */
export async function getCurrentTenant(subdomain: string) {
  return await getTenantBySubdomain(subdomain);
}

/**
 * Get tenant by subdomain only if it is ACTIVE.
 * Returns null for non-existent, INACTIVE, or SUSPENDED tenants.
 * Use in public-facing pages and checkout routes.
 */
export async function getActiveTenantBySubdomain(subdomain: string) {
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant || tenant.status !== 'ACTIVE') {
    return null;
  }
  return tenant;
}

/**
 * Require tenant - throws error if not found
 * Use in server actions or API routes that require a valid tenant
 */
export async function requireTenant(subdomain: string) {
  const tenant = await getTenantBySubdomain(subdomain);
  if (!tenant) {
    throw new Error(`Tenant not found: ${subdomain}`);
  }
  return tenant;
}

/**
 * Require tenant access via permission-based role system.
 * Fetches membership with roles and checks effective permissions.
 *
 * Use in server actions for tenant-scoped operations.
 */
export async function requireTenantAccess(
  subdomain: string,
  requiredPermission?: Permission | Permission[]
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      application: true,
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    include: {
      memberRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
              isOwnerRole: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new Error('Unauthorized: You are not a member of this tenant');
  }

  const roles = membership.memberRoles.map((mr) => mr.role);
  const permissions = getEffectivePermissions(roles);

  if (requiredPermission && !hasPermission(permissions, requiredPermission)) {
    const required = Array.isArray(requiredPermission)
      ? requiredPermission.join(' or ')
      : requiredPermission;
    throw new Error(`Unauthorized: Requires ${required} permission`);
  }

  if (tenant.application?.status !== 'APPROVED') {
    throw new Error('Tenant application not approved');
  }

  return { tenant, user, membership, permissions, isOwner: checkIsOwner(roles) };
}

/**
 * Require tenant owner - verifies user has owner role.
 * Delegates to requireTenantAccess and checks isOwner flag.
 */
export async function requireTenantOwner(subdomain: string) {
  const result = await requireTenantAccess(subdomain);
  if (!result.isOwner) {
    throw new Error('Unauthorized: Owner role required');
  }
  return result;
}
