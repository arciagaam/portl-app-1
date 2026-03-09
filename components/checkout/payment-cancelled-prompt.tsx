'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, XCircle, Loader2 } from 'lucide-react';
import { cancelOrderAction } from '@/app/actions/checkout';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import { formatPhp } from '@/lib/format';

interface PaymentCancelledPromptProps {
  order: OrderWithRelations;
  onRetryPayment: () => void;
}

export function PaymentCancelledPrompt({ order, onRetryPayment }: PaymentCancelledPromptProps) {
  const router = useRouter();
  const [isCancelling, startCancelTransition] = useTransition();

  const formattedTotal = formatPhp(order.total);

  const handleCancelOrder = () => {
    startCancelTransition(async () => {
      const result = await cancelOrderAction(order.id);
      if ('success' in result) {
        router.push(`/events/${order.eventId}`);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            Your payment for order <span className="font-medium text-foreground">{order.orderNumber}</span> was not completed.
          </p>
          <p className="text-lg font-semibold">{formattedTotal}</p>
          <p className="text-sm text-muted-foreground">
            Your tickets are still reserved. You can try paying again or cancel the order.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={onRetryPayment}
            disabled={isCancelling}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancelOrder}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel Order
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
