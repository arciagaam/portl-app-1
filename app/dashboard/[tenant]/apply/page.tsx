import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DashboardApplicationWizard } from '@/components/organizer/dashboard-application-wizard'

async function getApplication(userId: string, subdomain: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    include: {
      application: true,
    },
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
        include: { role: { select: { isOwnerRole: true } } },
      },
    },
  })

  // Only OWNERs can manage applications
  if (!membership || !membership.memberRoles.some((mr) => mr.role.isOwnerRole)) {
    return null
  }

  return { tenant, application: tenant.application }
}

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const user = await getCurrentUser()
  const { tenant: subdomain } = await params
  const { step } = await searchParams

  if (!user) {
    redirect(`/auth/signin?callbackUrl=/dashboard/${subdomain}/apply`)
  }

  const data = await getApplication(user.id, subdomain)

  if (!data) {
    redirect('/account')
  }

  const { tenant, application } = data

  // If already approved or submitted, redirect to dashboard
  if (application?.status === 'APPROVED' || application?.status === 'SUBMITTED') {
    redirect(`/dashboard/${subdomain}`)
  }

  const initialStep = step ? parseInt(step) : application?.currentStep || 1

  return (
    <DashboardApplicationWizard
      tenantId={tenant.id}
      tenant={subdomain}
      tenantName={tenant.name}
      initialStep={initialStep}
      initialApplication={application}
    />
  )
}
