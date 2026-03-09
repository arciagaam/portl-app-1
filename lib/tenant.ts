import { cache } from 'react';
import { prisma } from './prisma';
import { getCurrentUser } from './auth';
import type { TenantMemberRole } from '@/prisma/generated/prisma/client';

const ROLE_HIERARCHY: Record<TenantMemberRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

/**
 * Check if a role meets the minimum required level
 */
export function hasMinimumRole(
  userRole: TenantMemberRole,
  minimumRole: TenantMemberRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

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
 * Require tenant access via TenantMember - verifies user has the minimum role
 * and tenant application is approved.
 *
 * Use in server actions for tenant-scoped operations.
 */
export async function requireTenantAccess(
  subdomain: string,
  minimumRole: TenantMemberRole = 'MEMBER'
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
  });

  if (!membership) {
    throw new Error('Unauthorized: You are not a member of this tenant');
  }

  if (!hasMinimumRole(membership.role, minimumRole)) {
    throw new Error(`Unauthorized: Requires at least ${minimumRole} role`);
  }

  if (tenant.application?.status !== 'APPROVED') {
    throw new Error('Tenant application not approved');
  }

  return { tenant, user, membership };
}

/**
 * Require tenant owner - verifies user is at least ADMIN of the tenant
 * and tenant application is approved.
 *
 * Delegates to requireTenantAccess with ADMIN minimum role.
 * Maintains return type compatibility for existing callers.
 */
export async function requireTenantOwner(subdomain: string) {
  const { tenant, user } = await requireTenantAccess(subdomain, 'ADMIN');
  return { tenant, user };
}
