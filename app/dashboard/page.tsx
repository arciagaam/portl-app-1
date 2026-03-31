import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }

  const memberships = await prisma.tenantMember.findMany({
    where: { userId: user.id },
    include: {
      tenant: {
        include: {
          application: { select: { status: true } },
          _count: { select: { events: true } },
        },
      },
      memberRoles: {
        include: {
          role: { select: { name: true, color: true } },
        },
        orderBy: { role: { position: 'asc' } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Auto-redirect if user has exactly one tenant
  if (memberships.length === 1) {
    redirect(`/dashboard/${memberships[0].tenant.subdomain}`)
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizer Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Select a business to manage
        </p>
      </div>

      {memberships.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map((membership) => {
            const tenant = membership.tenant
            const appStatus = tenant.application?.status
            return (
              <Card key={membership.id} className="hover:shadow-md transition-shadow">
                <Link href={`/dashboard/${tenant.subdomain}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      <div className="flex gap-1">
                        {membership.memberRoles.slice(0, 2).map((mr, i) => (
                          <Badge
                            key={i}
                            style={{
                              backgroundColor: `${mr.role.color}20`,
                              color: mr.role.color,
                              borderColor: `${mr.role.color}40`,
                            }}
                            className="border text-xs"
                          >
                            {mr.role.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardDescription>{tenant.subdomain}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {tenant._count.events} {tenant._count.events === 1 ? 'event' : 'events'}
                      </div>
                      {appStatus && appStatus !== 'APPROVED' && (
                        <Badge
                          variant={appStatus === 'SUBMITTED' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {appStatus === 'SUBMITTED' ? 'Under Review' : appStatus.replace('_', ' ').toLowerCase()}
                        </Badge>
                      )}
                      {appStatus === 'APPROVED' && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">No businesses yet</CardTitle>
            <CardDescription>
              Register your business to start creating and managing events on Portl.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/organizer/register">
                <Plus className="mr-2 h-4 w-4" />
                Register as Organizer
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
