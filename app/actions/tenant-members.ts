'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireTenantAccess } from '@/lib/tenant';
import { getCurrentUser } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email';
import { mainUrl } from '@/lib/url';
import { inviteMemberSchema, updateMemberSchema } from '@/lib/validations/team';
import { PERMISSIONS, isOwner as checkIsOwner } from '@/lib/permissions';

/**
 * Get team members for a tenant
 */
export async function getTeamMembersAction(subdomain: string) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.VIEW_TEAM);

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

    return { data: members };
  } catch (error) {
    console.error('Error fetching team members:', error);
    return { error: 'Failed to fetch team members' };
  }
}

/**
 * Invite a new team member via email
 */
export async function inviteTeamMemberAction(
  subdomain: string,
  data: { email: string; roleIds: string[]; title?: string }
) {
  try {
    const { tenant, user } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const parsed = inviteMemberSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { email, roleIds, title } = parsed.data;

    // Verify all roleIds belong to this tenant and none are the owner role
    const roles = await prisma.tenantRole.findMany({
      where: { id: { in: roleIds }, tenantId: tenant.id },
    });

    if (roles.length !== roleIds.length) {
      return { error: 'One or more selected roles are invalid' };
    }

    if (roles.some((r) => r.isOwnerRole)) {
      return { error: 'Cannot invite with Owner role' };
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.tenantMember.findUnique({
        where: {
          userId_tenantId: {
            userId: existingUser.id,
            tenantId: tenant.id,
          },
        },
      });

      if (existingMember) {
        return { error: 'This user is already a team member' };
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.tenantInvitation.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === 'PENDING') {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create or update the invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.tenantInvitation.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
      update: {
        roleIds,
        title,
        status: 'PENDING',
        invitedBy: user.id,
        expiresAt,
        token: crypto.randomUUID(),
      },
      create: {
        tenantId: tenant.id,
        email,
        roleIds,
        title,
        invitedBy: user.id,
        expiresAt,
      },
    });

    // Fetch role names for email
    const roleNames = roles.map((r) => r.name).join(', ');

    // Fetch fresh user data for the inviter name
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });
    const inviterName = dbUser
      ? ([dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || dbUser.email || 'A team member')
      : (user.email || 'A team member');
    const inviteUrl = mainUrl(`/invite/${invitation.token}`);

    await sendInvitationEmail({
      to: email,
      inviterName,
      tenantName: tenant.name,
      role: roleNames,
      inviteUrl,
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { data: invitation };
  } catch (error) {
    console.error('Error inviting team member:', error);
    return { error: 'Failed to send invitation' };
  }
}

/**
 * Update a team member's title or visibility
 */
export async function updateTeamMemberAction(
  subdomain: string,
  memberId: string,
  data: { title?: string | null; tenantShowInProfile?: boolean }
) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const parsed = updateMemberSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const target = await prisma.tenantMember.findUnique({
      where: { id: memberId },
    });

    if (!target || target.tenantId !== tenant.id) {
      return { error: 'Member not found' };
    }

    const updateData: Partial<{ title: string | null; tenantShowInProfile: boolean }> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.tenantShowInProfile !== undefined) {
      updateData.tenantShowInProfile = parsed.data.tenantShowInProfile;
    }

    const updated = await prisma.tenantMember.update({
      where: { id: memberId },
      data: updateData,
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { data: updated };
  } catch (error) {
    console.error('Error updating team member:', error);
    return { error: 'Failed to update team member' };
  }
}

/**
 * Remove a team member
 */
export async function removeTeamMemberAction(
  subdomain: string,
  memberId: string
) {
  try {
    const { tenant, membership } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const target = await prisma.tenantMember.findUnique({
      where: { id: memberId },
      include: {
        memberRoles: {
          include: { role: { select: { permissions: true, isOwnerRole: true } } },
        },
      },
    });

    if (!target || target.tenantId !== tenant.id) {
      return { error: 'Member not found' };
    }

    // Cannot remove self
    if (target.userId === membership.userId) {
      return { error: 'Cannot remove yourself from the team' };
    }

    // Cannot remove member with Owner role
    const targetIsOwner = checkIsOwner(target.memberRoles.map((mr) => mr.role));
    if (targetIsOwner) {
      return { error: 'Cannot remove the owner' };
    }

    await prisma.tenantMember.delete({
      where: { id: memberId },
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return { error: 'Failed to remove team member' };
  }
}

/**
 * Toggle member's own profile visibility
 */
export async function toggleMemberProfileVisibilityAction(
  memberId: string,
  visible: boolean
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const member = await prisma.tenantMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.userId !== user.id) {
      return { error: 'Member not found' };
    }

    const updated = await prisma.tenantMember.update({
      where: { id: memberId },
      data: { userShowInProfile: visible },
    });

    revalidatePath('/account');
    return { data: updated };
  } catch (error) {
    console.error('Error toggling profile visibility:', error);
    return { error: 'Failed to update visibility' };
  }
}

/**
 * Get pending invitations for a tenant
 */
export async function getPendingInvitationsAction(subdomain: string) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const invitations = await prisma.tenantInvitation.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PENDING',
      },
      include: {
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch role names for each invitation
    const allRoleIds = invitations.flatMap((i) => i.roleIds);
    const roles = await prisma.tenantRole.findMany({
      where: { id: { in: allRoleIds } },
      select: { id: true, name: true, color: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r]));

    const enriched = invitations.map((inv) => ({
      ...inv,
      roles: inv.roleIds.map((id) => roleMap.get(id)).filter(Boolean),
    }));

    return { data: enriched };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return { error: 'Failed to fetch invitations' };
  }
}

/**
 * Revoke a pending invitation
 */
export async function revokeInvitationAction(
  subdomain: string,
  invitationId: string
) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, PERMISSIONS.MANAGE_TEAM);

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.tenantId !== tenant.id) {
      return { error: 'Invitation not found' };
    }

    if (invitation.status !== 'PENDING') {
      return { error: 'Can only revoke pending invitations' };
    }

    await prisma.tenantInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });

    revalidatePath(`/dashboard/${subdomain}/team`);
    return { success: true };
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return { error: 'Failed to revoke invitation' };
  }
}
