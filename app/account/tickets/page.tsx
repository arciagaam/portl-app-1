import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ticket } from 'lucide-react'
import Link from 'next/link'
import { getMyTicketsAction } from '@/app/actions/orders'
import { TicketsList } from '@/components/account'

export default async function TicketsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/auth/signin?callbackUrl=/account/tickets')
    }

    const result = await getMyTicketsAction()
    const tickets = 'data' in result ? result.data : []

    return (
        <div className="container mx-auto px-6 py-8 max-w-5xl space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
                <p className="text-muted-foreground mt-1">
                    View and manage your purchased tickets
                </p>
            </div>

            {tickets.length === 0 ? (
                /* Empty State */
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <Ticket className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg mb-2">No tickets yet</CardTitle>
                        <CardDescription className="max-w-sm mb-6">
                            You haven&apos;t purchased any tickets. Browse upcoming events to find something exciting!
                        </CardDescription>
                        <Button asChild>
                            <Link href="/#events-section">
                                Browse Events
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <TicketsList tickets={tickets} />
            )}
        </div>
    )
}
