'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';

/**
 * Get all organizer applications with tenant and owner details
 */
export async function getAllApplicationsAction() {
  try {
    const user = await requireAdmin();

    const applications = await prisma.organizerApplication.findMany({
      include: {
        tenant: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return { data: applications };
  } catch (error) {
    console.error('Error fetching applications:', error);
    return { error: 'Failed to fetch applications' };
  }
}

/**
 * Get a single application by ID with full details including notes
 */
export async function getApplicationByIdAction(applicationId: string) {
  try {
    const user = await requireAdmin();

    let application = await prisma.organizerApplication.findUnique({
      where: { id: applicationId },
      include: {
        tenant: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!application) {
      return { error: 'Application not found' };
    }

    // Set reviewStartedAt when admin first views a SUBMITTED application
    if (application.status === 'SUBMITTED' && !application.reviewStartedAt) {
      application = await prisma.organizerApplication.update({
        where: { id: applicationId },
        data: {
          reviewStartedAt: new Date(),
        },
        include: {
          tenant: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          notes: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    }

    return { data: application };
  } catch (error) {
    console.error('Error fetching application:', error);
    return { error: 'Failed to fetch application' };
  }
}

/**
 * Update application status
 */
export async function updateApplicationStatusAction(
  applicationId: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED',
  reviewNotes?: string
) {
  try {
    const user = await requireAdmin();

    const updateData: {
      status: typeof status;
      updatedAt: Date;
      reviewedAt?: Date;
      reviewedBy?: string;
      reviewNotes?: string;
    } = {
      status,
      updatedAt: new Date(),
    };

    // If approving or rejecting, add review metadata
    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.reviewedAt = new Date();
      updateData.reviewedBy = user.id;
      if (reviewNotes) {
        updateData.reviewNotes = reviewNotes;
      }
    }

    const application = await prisma.organizerApplication.update({
      where: { id: applicationId },
      data: updateData,
    });

    // If approved, activate the tenant and create OWNER membership
    if (status === 'APPROVED') {
      const tenant = await prisma.tenant.update({
        where: { id: application.tenantId },
        data: { status: 'ACTIVE' },
      });
      await prisma.tenantMember.upsert({
        where: {
          userId_tenantId: {
            userId: tenant.ownerId,
            tenantId: tenant.id,
          },
        },
        update: { role: 'OWNER' },
        create: {
          userId: tenant.ownerId,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });
    }

    // If rejected, set tenant to inactive
    if (status === 'REJECTED') {
      await prisma.tenant.update({
        where: { id: application.tenantId },
        data: { status: 'INACTIVE' },
      });
    }

    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath('/admin/applications');
    return { data: application };
  } catch (error) {
    console.error('Error updating application status:', error);
    return { error: 'Failed to update application status' };
  }
}

/**
 * Approve an application
 */
export async function approveApplicationAction(
  applicationId: string,
  reviewNotes?: string
) {
  return updateApplicationStatusAction(applicationId, 'APPROVED', reviewNotes);
}

/**
 * Reject an application
 */
export async function rejectApplicationAction(
  applicationId: string,
  reviewNotes?: string
) {
  return updateApplicationStatusAction(applicationId, 'REJECTED', reviewNotes);
}

/**
 * Delete an application (and its tenant)
 */
export async function deleteApplicationAction(applicationId: string) {
  try {
    const user = await requireAdmin();

    const application = await prisma.organizerApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return { error: 'Application not found' };
    }

    // Delete tenant (cascade will delete application)
    await prisma.tenant.delete({
      where: { id: application.tenantId },
    });

    revalidatePath('/admin/applications');
    return { success: true };
  } catch (error) {
    console.error('Error deleting application:', error);
    return { error: 'Failed to delete application' };
  }
}

/**
 * Add a note to an application
 */
export async function addApplicationNoteAction(
  applicationId: string,
  note: string
) {
  try {
    const user = await requireAdmin();

    if (!note || note.trim().length === 0) {
      return { error: 'Note cannot be empty' };
    }

    const applicationNote = await prisma.applicationNote.create({
      data: {
        applicationId,
        userId: user.id,
        note: note.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath('/admin/applications');
    return { data: applicationNote };
  } catch (error) {
    console.error('Error adding note:', error);
    return { error: 'Failed to add note' };
  }
}

/**
 * Update an application note
 */
export async function updateApplicationNoteAction(
  noteId: string,
  note: string
) {
  try {
    const user = await requireAdmin();

    if (!note || note.trim().length === 0) {
      return { error: 'Note cannot be empty' };
    }

    const existingNote = await prisma.applicationNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return { error: 'Note not found' };
    }

    const updatedNote = await prisma.applicationNote.update({
      where: { id: noteId },
      data: {
        note: note.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        application: {
          select: {
            id: true,
          },
        },
      },
    });

    revalidatePath(`/admin/applications/${updatedNote.applicationId}`);
    revalidatePath('/admin/applications');
    return { data: updatedNote };
  } catch (error) {
    console.error('Error updating note:', error);
    return { error: 'Failed to update note' };
  }
}

/**
 * Delete an application note
 */
export async function deleteApplicationNoteAction(noteId: string) {
  try {
    const user = await requireAdmin();

    const existingNote = await prisma.applicationNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return { error: 'Note not found' };
    }

    const applicationId = existingNote.applicationId;

    await prisma.applicationNote.delete({
      where: { id: noteId },
    });

    revalidatePath(`/admin/applications/${applicationId}`);
    revalidatePath('/admin/applications');
    return { success: true };
  } catch (error) {
    console.error('Error deleting note:', error);
    return { error: 'Failed to delete note' };
  }
}

/**
 * Get platform-wide statistics for the admin dashboard
 */
export async function getPlatformStatsAction() {
  try {
    const user = await requireAdmin();

    const [
      usersTotal,
      usersByRole,
      tenantsTotal,
      tenantsByStatus,
      applicationsTotal,
      applicationsByStatus,
      eventsTotal,
      eventsByStatus,
      ordersTotal,
      recentUsers,
      recentTenants,
      recentApplications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.tenant.count(),
      prisma.tenant.groupBy({ by: ['status'], _count: true }),
      prisma.organizerApplication.count(),
      prisma.organizerApplication.groupBy({ by: ['status'], _count: true }),
      prisma.event.count(),
      prisma.event.groupBy({ by: ['status'], _count: true }),
      prisma.order.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
      }),
      prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.organizerApplication.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      }),
    ]);

    return {
      data: {
        users: {
          total: usersTotal,
          byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
        },
        tenants: {
          total: tenantsTotal,
          byStatus: Object.fromEntries(tenantsByStatus.map((t) => [t.status, t._count])),
        },
        applications: {
          total: applicationsTotal,
          byStatus: Object.fromEntries(applicationsByStatus.map((a) => [a.status, a._count])),
        },
        events: {
          total: eventsTotal,
          byStatus: Object.fromEntries(eventsByStatus.map((e) => [e.status, e._count])),
        },
        orders: {
          total: ordersTotal,
        },
        recentUsers,
        recentTenants,
        recentApplications,
      },
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return { error: 'Failed to fetch platform stats' };
  }
}
