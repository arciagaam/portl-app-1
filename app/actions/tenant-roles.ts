'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireTenantAccess } from '@/lib/tenant';
import { PERMISSIONS, hasPermission, type Permission } from '@/lib/permissions';
import { createTenantRoleSchema, updateTenantRoleSchema } from '@/lib/validations/team';

/**
 * Get all roles for a tenant
 */
export async function getTenantRolesAction(subdomain: string) {
  try {
    const { tenant, permissions } = await requireTenantAccess(
      subdomain,
      [PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_TEAM]
    );

    const roles = await prisma.tenantRole.findMany({
      where: { tenantId: tenant.id },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { position: 'asc' },
    });

    return { data: roles };
  } catch (error) {
    console.error('Error fetching tenant roles:', error);
    return { error: 'Failed to fetch roles' };
  }
}

/**
 * Create a new custom role
 */
export async function createTenantRoleAction(
  subdomain: string,
  data: { name: string; color: string; permissions: string[] }
) {
  try {
    const { tenant, permissions, isOwner } = await requireTenantAccess(
      subdomain,
      PERMISSIONS.MANAGE_ROLES
    );

    const parsed = createTenantRoleSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // Escalation check: cannot grant permissions you don't have (owner exempt)
    if (!isOwner) {
      for (const p of parsed.data.permissions) {
        if (!permissions.has(p as Permission)) {
          return { error: `Cannot grant permission "${p}" that you don't have` };
        }
      }
    }

    // Get the highest position to place new role at the end
    const maxPosition = await prisma.tenantRole.aggregate({
      where: { tenantId: tenant.id },
      _max: { position: true },
    });

    const role = await prisma.tenantRole.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        color: parsed.data.color,
        permissions: parsed.data.permissions,
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });

    revalidatePath(`/dashboard/${subdomain}/roles`);
    return { data: role };
  } catch (error) {
    console.error('Error creating role:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A role with this name already exists' };
    }
    return { error: 'Failed to create role' };
  }
}

/**
 * Update a custom role
 */
export async function updateTenantRoleAction(
  subdomain: string,
  roleId: string,
  data: { name?: string; color?: string; permissions?: string[] }
) {
  try {
    const { tenant, permissions, isOwner } = await requireTenantAccess(
      subdomain,
      PERMISSIONS.MANAGE_ROLES
    );

    const parsed = updateTenantRoleSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const existingRole = await prisma.tenantRole.findUnique({
      where: { id: roleId },
    });

    if (!existingRole || existingRole.tenantId !== tenant.id) {
      return { error: 'Role not found' };
    }

    if (existingRole.isOwnerRole) {
      return { error: 'Cannot edit the Owner role' };
    }

    // Escalation check on permissions
    if (parsed.data.permissions && !isOwner) {
      for (const p of parsed.data.permissions) {
        if (!permissions.has(p as Permission)) {
          return { error: `Cannot grant permission "${p}" that you don't have` };
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.permissions !== undefined) updateData.permissions = parsed.data.permissions;

    const role = await prisma.tenantRole.update({
      where: { id: roleId },
      data: updateData,
    });

    revalidatePath(`/dashboard/${subdomain}/roles`);
    revalidatePath(`/dashboard/${subdomain}/team`);
    return { data: role };
  } catch (error) {
    console.error('Error updating role:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'A role with this name already exists' };
    }
    return { error: 'Failed to update role' };
  }
}

/**
 * Delete a custom role (cannot delete default or owner roles)
 */
export async function deleteTenantRoleAction(subdomain: string, roleId: string) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_ROLES);

    const role = await prisma.tenantRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.tenantId !== tenant.id) {
      return { error: 'Role not found' };
    }

    if (role.isOwnerRole) {
      return { error: 'Cannot delete the Owner role' };
    }

    if (role.isDefault) {
      return { error: 'Cannot delete default roles' };
    }

    await prisma.tenantRole.delete({ where: { id: roleId } });

    revalidatePath(`/dashboard/${subdomain}/roles`);
    revalidatePath(`/dashboard/${subdomain}/team`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting role:', error);
    return { error: 'Failed to delete role' };
  }
}

/**
 * Reorder roles by providing an ordered array of role IDs
 */
export async function reorderTenantRolesAction(subdomain: string, orderedIds: string[]) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_ROLES);

    // Verify all roles belong to tenant and get the owner role
    const roles = await prisma.tenantRole.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, isOwnerRole: true },
    });

    const existingIds = new Set(roles.map((r) => r.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return { error: 'Invalid role ID in reorder list' };
      }
    }

    // Owner role always stays at position 0
    const ownerRole = roles.find((r) => r.isOwnerRole);

    await prisma.$transaction(
      orderedIds.map((id, index) => {
        // Skip reordering if it's the owner role — keep at 0
        const position = ownerRole && id === ownerRole.id ? 0 : index;
        return prisma.tenantRole.update({
          where: { id },
          data: { position },
        });
      })
    );

    revalidatePath(`/dashboard/${subdomain}/roles`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering roles:', error);
    return { error: 'Failed to reorder roles' };
  }
}

/**
 * Assign a role to a member
 */
export async function assignRoleToMemberAction(
  subdomain: string,
  memberId: string,
  roleId: string
) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    // Verify member and role belong to tenant
    const [member, role] = await Promise.all([
      prisma.tenantMember.findUnique({ where: { id: memberId } }),
      prisma.tenantRole.findUnique({ where: { id: roleId } }),
    ]);

    if (!member || member.tenantId !== tenant.id) {
      return { error: 'Member not found' };
    }

    if (!role || role.tenantId !== tenant.id) {
      return { error: 'Role not found' };
    }

    // Cannot assign owner role to non-owners
    if (role.isOwnerRole) {
      return { error: 'Cannot assign the Owner role' };
    }

    await prisma.memberRole.create({
      data: {
        tenantMemberId: memberId,
        tenantRoleId: roleId,
      },
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { success: true };
  } catch (error) {
    console.error('Error assigning role:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { error: 'Member already has this role' };
    }
    return { error: 'Failed to assign role' };
  }
}

/**
 * Remove a role from a member
 */
export async function removeRoleFromMemberAction(
  subdomain: string,
  memberId: string,
  roleId: string
) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const member = await prisma.tenantMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.tenantId !== tenant.id) {
      return { error: 'Member not found' };
    }

    const role = await prisma.tenantRole.findUnique({
      where: { id: roleId },
    });

    if (role?.isOwnerRole) {
      return { error: 'Cannot remove the Owner role' };
    }

    await prisma.memberRole.delete({
      where: {
        tenantMemberId_tenantRoleId: {
          tenantMemberId: memberId,
          tenantRoleId: roleId,
        },
      },
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { success: true };
  } catch (error) {
    console.error('Error removing role:', error);
    return { error: 'Failed to remove role' };
  }
}
