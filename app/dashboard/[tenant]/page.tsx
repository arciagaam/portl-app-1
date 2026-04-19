import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Stepper, type Step } from '@/components/ui/stepper'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  Plus
} from 'lucide-react'
import Link from 'next/link'

async function getOrganizerApplication(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      application: true,
      _count: {
        select: { events: true }
      }
    },
  })

  if (!tenant) {
    return { application: null, tenant: null }
  }

  const membership = await prisma.tenantMember.findUnique({
    where: {
      userId_tenantId: { userId, tenantId: tenant.id },
    },
  })

  if (!membership) {
    return { application: null, tenant: null }
  }

  return { application: tenant.application, tenant }
}

async function getRecentEvents(tenantId: string) {
  return await prisma.event.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })
}

async function getTenantStats(tenantId: string) {
  const [orderStats, ticketCount] = await Promise.all([
    prisma.order.aggregate({
      where: { tenantId, status: 'CONFIRMED' },
      _sum: { total: true },
      _count: true,
    }),
    prisma.ticket.count({
      where: {
        order: { tenantId, status: 'CONFIRMED' },
        status: 'ACTIVE',
      },
    }),
  ])

  return {
    totalAttendees: ticketCount,
    totalRevenue: orderStats._sum.total || 0,
    totalOrders: orderStats._count,
  }
}

function getStepStatus(currentStep: number, stepNumber: number, isSubmitted: boolean): Step['status'] {
  if (isSubmitted) return 'completed'
  if (stepNumber < currentStep) return 'completed'
  if (stepNumber === currentStep) return 'in_progress'
  return 'not_started'
}

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const user = await getCurrentUser()
  const { tenant: subdomain } = await params

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}`)
  }

  const { application, tenant } = await getOrganizerApplication(user.id, subdomain)

  if (!tenant) {
    redirect('/account')
  }

  const isSubmitted = application?.status === 'SUBMITTED'
  const isApproved = application?.status === 'APPROVED'
  const isRejected = application?.status === 'REJECTED'
  const isNotStarted = !application || application.status === 'NOT_STARTED'

  const [recentEvents, stats] = isApproved
    ? await Promise.all([getRecentEvents(tenant.id), getTenantStats(tenant.id)])
    : [[], { totalAttendees: 0, totalRevenue: 0, totalOrders: 0 }]

  const steps: Step[] = [
    {
      id: 1,
      title: 'Organizer Type',
      description: 'Tell us about yourself',
      status: getStepStatus(application?.currentStep || 1, 1, isSubmitted),
    },
    {
      id: 2,
      title: 'Event Portfolio',
      description: 'Your experience',
      status: getStepStatus(application?.currentStep || 1, 2, isSubmitted),
    },
    {
      id: 3,
      title: 'Compliance',
      description: 'Acknowledge requirements',
      status: getStepStatus(application?.currentStep || 1, 3, isSubmitted),
    },
  ]

  return (
    <div className="px-8 py-8 max-w-6xl space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            {tenant.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user.name || 'Organizer'}.
          </p>
        </div>
        {isApproved && (
          <Button asChild size="lg">
            <Link href={`/dashboard/${subdomain}/events/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4 border">
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Events</span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold tabular-nums">{tenant._count?.events || 0}</p>
        </div>
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Attendees</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold tabular-nums">{stats.totalAttendees.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.totalOrders} confirmed order{stats.totalOrders !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Revenue</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(stats.totalRevenue / 100)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Lifetime</p>
        </div>
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Status</span>
            {isApproved ? (
              <CheckCircle2 className="h-4 w-4 text-foreground" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-3xl font-bold">
            {isApproved ? 'Active' : 'Pending'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isApproved ? 'Verified' : 'Complete verification'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {!isApproved ? (
            <div className="border-l-2 border-l-foreground">
              <Card className="border-l-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Complete Your Registration</CardTitle>
                      <CardDescription className="mt-1">
                        Finish setting up your organizer profile to start hosting events.
                      </CardDescription>
                    </div>
                    <Badge variant={isSubmitted ? 'secondary' : 'default'}>
                      {isSubmitted ? 'Under Review' : 'In Progress'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Stepper steps={steps} currentStep={application?.currentStep || 1} />

                  {!isSubmitted && !isRejected && (
                    <div className="mt-6 flex justify-end">
                      <Button asChild>
                        <Link href={`/dashboard/${subdomain}/apply?step=${application?.currentStep}`}>
                          {isNotStarted ? 'Start Application' : 'Continue Application'}
                        </Link>
                      </Button>
                    </div>
                  )}

                  {isSubmitted && (
                    <div className="mt-4 p-4 bg-muted/50 flex items-center gap-3 text-sm text-muted-foreground border">
                      <Clock className="h-4 w-4 shrink-0" />
                      We are reviewing your application. You will be notified via email once approved.
                    </div>
                  )}

                  {isRejected && (
                    <div className="mt-4 p-4 border border-destructive/30 bg-destructive/5 flex items-start gap-3 text-sm">
                      <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                      <div>
                        <p className="font-medium text-destructive">Application Rejected</p>
                        <p className="text-muted-foreground mt-0.5">{application?.reviewNotes || 'Please contact support.'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Recent Events</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/${subdomain}/events`}>
                    View all
                  </Link>
                </Button>
              </div>
              {recentEvents.length > 0 ? (
                <div className="divide-y border">
                  {recentEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboard/${subdomain}/events/${event.id}`}
                      className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{event.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant={event.status === 'PUBLISHED' ? 'default' : 'secondary'} className="ml-3 shrink-0">
                        {event.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed p-12 text-center">
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                  <Button variant="outline" size="sm" asChild className="mt-4">
                    <Link href={`/dashboard/${subdomain}/events/new`}>Create your first event</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight mb-4">Notifications</h2>
            <div className="space-y-3">
              {isApproved ? (
                <div className="flex items-start gap-3 p-3 border">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Account Approved</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your organizer account has been fully approved.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 border">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Setup Required</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Complete the application steps to start.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
