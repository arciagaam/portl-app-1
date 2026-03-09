import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Calendar, MapPin, Ticket, ExternalLink } from 'lucide-react'
import { tenantUrl } from '@/lib/url'
import { getOrderByIdAction } from '@/app/actions/orders'
import type { AccountOrderWithRelations } from '@/lib/types/order'

interface OrderDetailPageProps {
    params: Promise<{
        orderId: string
    }>
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    REFUNDED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
}

const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    PARTIALLY_REFUNDED: 'Partially Refunded',
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    noStore()
    const { orderId } = await params
    const user = await getCurrentUser()

    if (!user) {
        redirect(`/auth/signin?callbackUrl=/account/orders/${orderId}`)
    }

    const result = await getOrderByIdAction(orderId)

    if ('error' in result) {
        notFound()
    }

    const order = result.data as AccountOrderWithRelations

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-4xl space-y-8">
            {/* Back Button */}
            <Button variant="ghost" size="sm" asChild>
                <Link href="/account/orders">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Orders
                </Link>
            </Button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold">Order Details</h1>
                        <Badge className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Order #{order.orderNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Placed on {formatDateTime(order.createdAt)}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Event</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg">{order.event.name}</h3>
                                <p className="text-sm text-muted-foreground">{order.tenant.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{formatDate(order.event.startDate)} at {order.event.startTime}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.event.venueName}</span>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href={tenantUrl(order.tenant.subdomain, `/events/${order.eventId}`)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Event
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Tickets */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tickets</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Ticket className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{ticket.ticketType.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {ticket.holderFirstName
                                                    ? `${ticket.holderFirstName} ${ticket.holderLastName}`
                                                    : 'No attendee assigned'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <code className="text-xs bg-background px-2 py-1 rounded">
                                            {ticket.ticketCode}
                                        </code>
                                        <div className="mt-1">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/account/tickets/${ticket.id}`}>
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Order Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>
                                        {item.ticketType.name} x {item.quantity}
                                    </span>
                                    <span>PHP {item.totalPrice.toLocaleString()}</span>
                                </div>
                            ))}

                            <Separator />

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>PHP {order.subtotal.toLocaleString()}</span>
                                </div>
                                {order.discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span>-PHP {order.discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {order.serviceFee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Service Fee</span>
                                        <span>PHP {order.serviceFee.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span>PHP {order.total.toLocaleString()}</span>
                            </div>

                            {order.voucherCode && (
                                <div className="pt-2">
                                    <p className="text-xs text-muted-foreground">
                                        Voucher applied: <span className="font-mono">{order.voucherCode.code}</span>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>{order.contactEmail}</p>
                            {order.contactPhone && <p>{order.contactPhone}</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
