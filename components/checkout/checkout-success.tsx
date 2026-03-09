import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Calendar, MapPin, Ticket, ExternalLink } from 'lucide-react';
import { TicketQRCode } from '@/components/ui/ticket-qr-code';
import { mainUrl } from '@/lib/url';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import { formatPhp } from '@/lib/format';

interface CheckoutSuccessProps {
  order: OrderWithRelations;
  tenantSubdomain: string;
}

export function CheckoutSuccess({ order, tenantSubdomain }: CheckoutSuccessProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Order Confirmed!</h1>
          <p className="text-muted-foreground mt-1">
            Your tickets have been reserved. Order #{order.orderNumber}
          </p>
        </div>
      </div>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{order.event.name}</h3>
            <div className="flex items-start gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{formatDate(order.event.startDate)} at {order.event.startTime}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span>{order.event.venueName}</span>
            </div>
          </div>

          <Separator />

          {/* Tickets */}
          <div className="space-y-3">
            <h4 className="font-medium">Your Tickets</h4>
            {order.tickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                <TicketQRCode value={ticket.ticketCode} size={64} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{ticket.ticketType.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.holderFirstName
                      ? `${ticket.holderFirstName} ${ticket.holderLastName}`
                      : 'Attendee not assigned'}
                  </p>
                  <code className="text-xs bg-background px-2 py-1 rounded mt-1 inline-block">
                    {ticket.ticketCode}
                  </code>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPhp(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPhp(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total Paid</span>
              <span>{formatPhp(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm">
              A confirmation email has been sent to{' '}
              <span className="font-medium">{order.contactEmail}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Keep your ticket codes safe. You&apos;ll need them to enter the event.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild className="flex-1">
          <a href={mainUrl('/account/tickets')}>
            <Ticket className="mr-2 h-4 w-4" />
            View My Tickets
          </a>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/events">
            <ExternalLink className="mr-2 h-4 w-4" />
            Browse More Events
          </Link>
        </Button>
      </div>
    </div>
  );
}
