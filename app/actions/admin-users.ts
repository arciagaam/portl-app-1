'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

/**
 * Get users with tenant counts and order counts (paginated)
 */
export async function getAllUsersAction(page = 1, pageSize = 50) {
  try {
    await requireAdmin()

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: {
          tenants: {
            select: { id: true, subdomain: true, name: true, status: true },
          },
          _count: {
            select: { orders: true, ownedTickets: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count(),
    ])

    return { data: users, total, page, pageSize }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { error: 'Failed to fetch users' }
  }
}

/**
 * Get a single user by ID with full details
 */
export async function getUserByIdAction(userId: string) {
  try {
    await requireAdmin()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: {
            application: { select: { id: true, status: true } },
            _count: { select: { events: true } },
          },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            event: { select: { name: true } },
            tenant: { select: { name: true } },
          },
        },
        _count: {
          select: { orders: true, ownedTickets: true, tenants: true },
        },
      },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    return { data: user }
  } catch (error) {
    console.error('Error fetching user:', error)
    return { error: 'Failed to fetch user' }
  }
}

/**
 * Update a user's role
 */
export async function updateUserRoleAction(
  userId: string,
  role: 'USER' | 'ADMIN'
) {
  try {
    const currentUser = await requireAdmin()

    // Prevent self-demotion
    if (currentUser.id === userId && role !== 'ADMIN') {
      return { error: 'Cannot remove your own admin role' }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    })

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
    return { data: updatedUser }
  } catch (error) {
    console.error('Error updating user role:', error)
    return { error: 'Failed to update user role' }
  }
}
