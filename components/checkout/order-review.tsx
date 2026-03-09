'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Tag, X } from 'lucide-react';
import { applyVoucherCodeAction, removeVoucherCodeAction } from '@/app/actions/checkout';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import { formatPhp } from '@/lib/format';

interface OrderReviewProps {
  order: OrderWithRelations;
  onContinue: () => void;
  onOrderUpdate: (order: OrderWithRelations) => void;
}

export function OrderReview({ order, onContinue, onOrderUpdate }: OrderReviewProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleApplyVoucher = () => {
    if (!voucherCode.trim()) return;

    setVoucherError(null);
    startTransition(async () => {
      const result = await applyVoucherCodeAction(order.id, { code: voucherCode.trim() });

      if ('error' in result) {
        setVoucherError(result.error);
        return;
      }

      setVoucherCode('');
      onOrderUpdate(result.data);
    });
  };

  const handleRemoveVoucher = () => {
    setVoucherError(null);
    startTransition(async () => {
      const result = await removeVoucherCodeAction(order.id);

      if ('error' in result) {
        setVoucherError(result.error);
        return;
      }

      onOrderUpdate(result.data);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Info */}
          <div className="pb-4 border-b">
            <h3 className="font-semibold">{order.event.name}</h3>
            <p className="text-sm text-muted-foreground">{order.tenant.name}</p>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.ticketType.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} x {formatPhp(item.unitPrice)}
                  </p>
                </div>
                <p className="font-medium">
                  {formatPhp(item.totalPrice)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Voucher Code */}
          <div className="space-y-2">
            <Label htmlFor="voucher">Voucher Code</Label>
            {order.voucherCode ? (
              <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium">{order.voucherCode.code}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveVoucher}
                  disabled={isPending}
                  className="h-8 w-8"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="voucher"
                  placeholder="Enter code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={isPending}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyVoucher}
                  disabled={isPending || !voucherCode.trim()}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            )}
            {voucherError && (
              <p className="text-sm text-destructive">{voucherError}</p>
            )}
          </div>

          <Separator />

          {/* Totals */}
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
            {order.serviceFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span>{formatPhp(order.serviceFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPhp(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={onContinue}>
        Continue to Attendee Details
      </Button>
    </div>
  );
}
