'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

/**
 * Get tenants with owner and application details (paginated)
 */
export async function getAllTenantsAction(page = 1, pageSize = 50) {
  try {
    await requireAdmin()

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          application: {
            select: { id: true, status: true },
          },
          _count: {
            select: { events: true, orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tenant.count(),
    ])

    return { data: tenants, total, page, pageSize }
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return { error: 'Failed to fetch tenants' }
  }
}

/**
 * Get a single tenant by ID with full details
 */
export async function getTenantByIdAction(tenantId: string) {
  try {
    await requireAdmin()

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        application: {
          include: {
            notes: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
              orderBy: { createdAt: 'desc' as const },
            },
          },
        },
        events: {
          select: { id: true, name: true, status: true, startDate: true, venueName: true },
          orderBy: { startDate: 'desc' as const },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' as const },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            event: { select: { name: true } },
          },
        },
        _count: {
          select: { events: true, orders: true },
        },
      },
    })

    if (!tenant) {
      return { error: 'Tenant not found' }
    }

    return { data: tenant }
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return { error: 'Failed to fetch tenant' }
  }
}

/**
 * Update a tenant's status
 */
export async function updateTenantStatusAction(
  tenantId: string,
  status: 'INACTIVE' | 'ACTIVE' | 'SUSPENDED'
) {
  try {
    await requireAdmin()

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    })

    revalidatePath('/admin/tenants')
    revalidatePath(`/admin/tenants/${tenantId}`)
    return { data: updatedTenant }
  } catch (error) {
    console.error('Error updating tenant status:', error)
    return { error: 'Failed to update tenant status' }
  }
}
