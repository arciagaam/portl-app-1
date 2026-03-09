import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Shield, Ticket, Receipt, Settings, Plus } from 'lucide-react'
import Link from 'next/link'
import { AffiliationsSection } from '@/components/account/affiliations-section'

async function getUserAffiliations(userId: string) {
    return await prisma.tenantMember.findMany({
        where: { userId },
        include: {
            tenant: {
                select: { name: true, subdomain: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    })
}

export default async function AccountPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/auth/signin?callbackUrl=/account')
    }

    const fullName = user.name || user.email || 'User'
    const affiliations = await getUserAffiliations(user.id)
    const hasTenants = affiliations.length > 0

    const quickLinks = [
        { href: '/account/tickets', label: 'My Tickets', icon: Ticket, description: 'View your purchased tickets' },
        { href: '/account/orders', label: 'Order History', icon: Receipt, description: 'View your past orders' },
        { href: '/account/settings', label: 'Settings', icon: Settings, description: 'Manage your account' },
    ]

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your tickets, orders, and account settings
                </p>
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{fullName}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                            </div>
                        </div>
                        <Badge
                            variant={
                                user.role === 'ADMIN'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role}
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {/* Quick Links Grid */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {quickLinks.map((link) => {
                        const Icon = link.icon
                        return (
                            <Card key={link.href} className="hover:shadow-md transition-shadow">
                                <Link href={link.href}>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                                <Icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{link.label}</CardTitle>
                                                <CardDescription className="text-xs">{link.description}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Link>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Affiliations */}
            {hasTenants && (
                <AffiliationsSection affiliations={affiliations} />
            )}

            {/* Become an Organizer CTA (only if no memberships) */}
            {!hasTenants && (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-lg">Become an Organizer</CardTitle>
                        <CardDescription>
                            Want to host events on Portl? Register your business and start creating memorable experiences.
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
