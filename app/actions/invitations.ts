'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Get invitation details by token (for the accept page)
 */
export async function getInvitationByTokenAction(token: string) {
  try {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return { error: 'Invitation not found' };
    }

    if (invitation.status !== 'PENDING') {
      return { error: `This invitation has been ${invitation.status.toLowerCase()}` };
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return { error: 'This invitation has expired' };
    }

    const inviterName = invitation.inviter.firstName && invitation.inviter.lastName
      ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
      : invitation.inviter.email;

    return {
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        title: invitation.title,
        tenantName: invitation.tenant.name,
        tenantSubdomain: invitation.tenant.subdomain,
        inviterName,
      },
    };
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return { error: 'Failed to fetch invitation' };
  }
}

/**
 * Accept an invitation and create TenantMember
 */
export async function acceptInvitationAction(token: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Please sign in to accept this invitation' };
    }

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
      include: {
        tenant: { select: { id: true, subdomain: true } },
      },
    });

    if (!invitation) {
      return { error: 'Invitation not found' };
    }

    if (invitation.status !== 'PENDING') {
      return { error: `This invitation has been ${invitation.status.toLowerCase()}` };
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return { error: 'This invitation has expired' };
    }

    // Verify the accepting user's email matches the invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return { error: 'This invitation was sent to a different email address' };
    }

    // Check if user is already a member
    const existingMember = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: invitation.tenantId,
        },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted even if already a member
      await prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
      return { data: { subdomain: invitation.tenant.subdomain, alreadyMember: true } };
    }

    // Create membership and mark invitation as accepted in a transaction
    await prisma.$transaction([
      prisma.tenantMember.create({
        data: {
          userId: user.id,
          tenantId: invitation.tenantId,
          role: invitation.role,
          title: invitation.title,
        },
      }),
      prisma.tenantInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    revalidatePath('/account');
    return { data: { subdomain: invitation.tenant.subdomain } };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { error: 'Failed to accept invitation' };
  }
}
