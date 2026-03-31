import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TenantSidebar from '@/components/dashboard/tenant-sidebar'
import { getEffectivePermissions } from '@/lib/permissions'

async function getTenantInfo(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: { application: true },
  })

  if (!tenant) {
    return null
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: { userId, tenantId: tenant.id },
    },
    include: {
      memberRoles: {
        include: {
          role: {
            select: {
              permissions: true,
              isOwnerRole: true,
            },
          },
        },
      },
    },
  })

  if (!membership) {
    return null
  }

  const roles = membership.memberRoles.map((mr) => mr.role)
  const permissions = getEffectivePermissions(roles)

  return { tenant, permissions: Array.from(permissions) }
}

export default async function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const user = await getCurrentUser()
  const { tenant: subdomain } = await params

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}`)
  }

  const result = await getTenantInfo(user.id, subdomain)

  if (!result) {
    redirect('/account')
  }

  const { tenant, permissions } = result
  const isApproved = tenant.application?.status === 'APPROVED'

  return (
    <div className="dark">
      <div className="flex h-screen overflow-hidden bg-background">
        <TenantSidebar
          tenantSubdomain={subdomain}
          isApproved={isApproved}
          permissions={permissions}
          userName={user.name}
          userEmail={user.email}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
