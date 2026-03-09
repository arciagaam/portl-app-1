'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { completeCheckoutAction } from '@/app/actions/checkout';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import type { AttendeeData } from './attendee-form';

interface PaymentPlaceholderProps {
  order: OrderWithRelations;
  attendees: AttendeeData[];
  onBack: () => void;
  tenantSubdomain: string;
}

export function PaymentPlaceholder({
  order,
  attendees,
  onBack,
  tenantSubdomain,
}: PaymentPlaceholderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState(order.contactEmail);
  const [contactPhone, setContactPhone] = useState(order.contactPhone || '');

  const handleCompleteOrder = () => {
    if (!contactEmail) {
      setError('Email is required');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await completeCheckoutAction({
        orderId: order.id,
        contactEmail,
        contactPhone: contactPhone || null,
        attendees,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // Redirect to success page
      router.push(`/checkout/success/${order.id}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment
          </CardTitle>
          <CardDescription>
            Payment integration coming soon. Complete your order to reserve your tickets.
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
                  <span>PHP {item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-PHP {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>PHP {order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Placeholder Payment UI */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Payment gateway integration will be added here.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Complete Order&quot; to finalize your reservation.
            </p>
          </div>

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
          onClick={handleCompleteOrder}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Complete Order
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        By completing this order, you agree to the terms and conditions.
      </p>
    </div>
  );
}
