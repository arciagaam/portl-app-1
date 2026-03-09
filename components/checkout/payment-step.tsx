'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react';
import { createPaymentSessionAction, confirmFreeOrderAction } from '@/app/actions/checkout';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import { useRouter } from 'next/navigation';
import type { AttendeeData } from './attendee-form';
import { formatPhp } from '@/lib/format';

interface PaymentStepProps {
  order: OrderWithRelations;
  attendees: AttendeeData[];
  onBack: () => void;
  tenantSubdomain: string;
}

export function PaymentStep({
  order,
  attendees,
  onBack,
  tenantSubdomain,
}: PaymentStepProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState(order.contactEmail);
  const [contactPhone, setContactPhone] = useState(order.contactPhone || '');

  const isFreeOrder = order.total === 0;

  const handleSubmit = () => {
    if (!contactEmail) {
      setError('Email is required');
      return;
    }

    setError(null);
    startTransition(async () => {
      if (isFreeOrder) {
        // Free order — confirm directly without payment gateway
        const result = await confirmFreeOrderAction({
          orderId: order.id,
          contactEmail,
          contactPhone: contactPhone || null,
          attendees,
        });

        if ('error' in result) {
          setError(result.error);
          return;
        }

        router.push(`/checkout/success/${order.id}`);
      } else {
        // Paid order — redirect to PayMongo
        const result = await createPaymentSessionAction({
          orderId: order.id,
          contactEmail,
          contactPhone: contactPhone || null,
          attendees,
        });

        if ('error' in result) {
          setError(result.error);
          return;
        }

        window.location.href = result.data.checkoutUrl;
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isFreeOrder ? <CheckCircle2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            {isFreeOrder ? 'Confirm Order' : 'Payment'}
          </CardTitle>
          <CardDescription>
            {isFreeOrder
              ? 'This is a free event. Confirm your details to receive your tickets.'
              : "You'll be redirected to PayMongo's secure checkout to complete your payment."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contact Information</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll send your order confirmation and tickets to this email.
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+63 912 345 6789"
              />
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{order.event.name}</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.ticketType.name} x {item.quantity}</span>
                  <span>{formatPhp(item.totalPrice)}</span>
                </div>
              ))}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPhp(order.discountAmount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPhp(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods Info */}
          {!isFreeOrder && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Accepted payment methods</p>
              <p className="text-xs text-muted-foreground">
                Credit/Debit Card, GCash, GrabPay, Maya
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={isPending}>
          Back
        </Button>
        <Button
          className="flex-1"
          size="lg"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isFreeOrder ? 'Confirming...' : 'Preparing Payment...'}
            </>
          ) : isFreeOrder ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Order
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Pay Now
            </>
          )}
        </Button>
      </div>

      {!isFreeOrder && (
        <p className="text-xs text-center text-muted-foreground">
          You will be redirected to PayMongo&apos;s secure checkout page to complete payment.
        </p>
      )}
    </div>
  );
}
