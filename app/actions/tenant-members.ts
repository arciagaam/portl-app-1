'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireTenantAccess, hasMinimumRole } from '@/lib/tenant';
import { getCurrentUser } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email';
import { mainUrl } from '@/lib/url';
import { inviteMemberSchema, updateMemberSchema } from '@/lib/validations/team';
import type { TenantMemberRole } from '@/prisma/generated/prisma/client';

/**
 * Get team members for a tenant
 */
export async function getTeamMembersAction(subdomain: string) {
  try {
    const { tenant } = await requireTenantAccess(subdomain, 'MANAGER');

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
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
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
  data: { email: string; role: string; title?: string }
) {
  try {
    const { tenant, user } = await requireTenantAccess(subdomain, 'ADMIN');

    const parsed = inviteMemberSchema.safeParse(data);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { email, role, title } = parsed.data;

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
        role: role as TenantMemberRole,
        title,
        status: 'PENDING',
        invitedBy: user.id,
        expiresAt,
        token: crypto.randomUUID(),
      },
      create: {
        tenantId: tenant.id,
        email,
        role: role as TenantMemberRole,
        title,
        invitedBy: user.id,
        expiresAt,
      },
    });

    // Fetch fresh user data for the inviter name (JWT may have stale name)
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
      role,
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
 * Update a team member's role, title, or visibility
 */
export async function updateTeamMemberAction(
  subdomain: string,
  memberId: string,
  data: { role?: string; title?: string | null; tenantShowInProfile?: boolean }
) {
  try {
    const { tenant, membership } = await requireTenantAccess(subdomain, 'ADMIN');

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

    // Role changes require OWNER
    if (parsed.data.role && parsed.data.role !== target.role) {
      if (membership.role !== 'OWNER') {
        return { error: 'Only the owner can change roles' };
      }
      // Cannot demote self
      if (target.userId === membership.userId) {
        return { error: 'Cannot change your own role' };
      }
    }

    const updateData: Partial<{ role: TenantMemberRole; title: string | null; tenantShowInProfile: boolean }> = {};
    if (parsed.data.role) updateData.role = parsed.data.role;
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
    const { tenant, membership } = await requireTenantAccess(subdomain, 'ADMIN');

    const target = await prisma.tenantMember.findUnique({
      where: { id: memberId },
    });

    if (!target || target.tenantId !== tenant.id) {
      return { error: 'Member not found' };
    }

    // Cannot remove self
    if (target.userId === membership.userId) {
      return { error: 'Cannot remove yourself from the team' };
    }

    // Cannot remove OWNER
    if (target.role === 'OWNER') {
      return { error: 'Cannot remove the owner' };
    }

    // ADMIN can only remove MANAGER and MEMBER (not other ADMINs)
    if (membership.role === 'ADMIN' && hasMinimumRole(target.role, 'ADMIN')) {
      return { error: 'Insufficient permissions to remove this member' };
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
    const { tenant } = await requireTenantAccess(subdomain, 'ADMIN');

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

    return { data: invitations };
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
    const { tenant } = await requireTenantAccess(subdomain, 'ADMIN');

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
