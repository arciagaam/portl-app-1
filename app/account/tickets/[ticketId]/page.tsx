import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, MapPin, Clock, Ticket } from 'lucide-react'
import { TicketQRCode } from '@/components/ui/ticket-qr-code'
import { EditAttendeeForm } from '@/components/account/edit-attendee-form'
import { tenantUrl } from '@/lib/url'
import { getTicketByIdAction } from '@/app/actions/orders'

interface TicketDetailPageProps {
    params: Promise<{
        ticketId: string
    }>
}

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    CHECKED_IN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    TRANSFERRED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
}

const statusLabels: Record<string, string> = {
    ACTIVE: 'Active',
    CHECKED_IN: 'Checked In',
    TRANSFERRED: 'Transferred',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
    noStore()
    const { ticketId } = await params
    const user = await getCurrentUser()

    if (!user) {
        redirect(`/auth/signin?callbackUrl=/account/tickets/${ticketId}`)
    }

    const result = await getTicketByIdAction(ticketId)

    if ('error' in result) {
        notFound()
    }

    const ticket = result.data

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-2xl space-y-8">
            {/* Back Button */}
            <Button variant="ghost" size="sm" asChild>
                <Link href="/account/tickets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tickets
                </Link>
            </Button>

            {/* Ticket Card */}
            <Card className="overflow-hidden">
                {/* Ticket Header */}
                <div className="bg-primary text-primary-foreground p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <Badge className={statusColors[ticket.status]}>
                                {statusLabels[ticket.status]}
                            </Badge>
                            <h1 className="text-2xl font-bold mt-3">{ticket.event.name}</h1>
                            <p className="text-primary-foreground/80 mt-1">
                                {ticket.event.tenant.name}
                            </p>
                        </div>
                        <Ticket className="h-10 w-10 opacity-50" />
                    </div>
                </div>

                {/* Ticket Details */}
                <CardContent className="p-6 space-y-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-2">
                        <TicketQRCode value={ticket.ticketCode} status={ticket.status} />
                        {ticket.status === 'CHECKED_IN' && ticket.checkedInAt && (
                            <p className="text-sm text-muted-foreground">
                                Checked in on {new Date(ticket.checkedInAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </p>
                        )}
                    </div>

                    {/* Ticket Code */}
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Ticket Code</p>
                        <code className="text-2xl font-mono font-bold tracking-wider">
                            {ticket.ticketCode}
                        </code>
                    </div>

                    <Separator />

                    {/* Ticket Type */}
                    <div>
                        <h3 className="font-semibold mb-2">
                            {ticket.table
                                ? `Table ${ticket.table.label}`
                                : ticket.ticketType?.name ?? 'Unknown'}
                        </h3>
                        {ticket.ticketType?.description && (
                            <p className="text-sm text-muted-foreground">
                                {ticket.ticketType.description}
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Event Details */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">{formatDate(ticket.event.startDate)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">{ticket.event.startTime} - {ticket.event.endTime}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">{ticket.event.venueName}</p>
                                {ticket.event.venueAddress && (
                                    <p className="text-sm text-muted-foreground">{ticket.event.venueAddress}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Attendee Info */}
                    <EditAttendeeForm
                        ticketId={ticket.id}
                        currentAttendee={{
                            firstName: ticket.holderFirstName,
                            lastName: ticket.holderLastName,
                            email: ticket.holderEmail,
                            phone: ticket.holderPhone,
                        }}
                        canEdit={
                            ticket.ownerId === user.id
                            && ticket.status === 'ACTIVE'
                            && new Date(`${new Date(ticket.event.startDate).toISOString().split('T')[0]}T${ticket.event.startTime}`) > new Date()
                        }
                    />

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-4">
                        <Button variant="outline" asChild>
                            <Link href={`/account/orders/${ticket.orderId}`}>
                                View Order Details
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={tenantUrl(ticket.event.tenant.subdomain, `/events/${ticket.eventId}`)}>
                                View Event Page
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Important Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Important Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        Present this QR code at the venue entrance for admission. Each QR code can only be scanned once.
                    </p>
                    <p>
                        You can update attendee details until the event starts.
                    </p>
                    <p>
                        Keep your ticket code confidential to prevent unauthorized use.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
