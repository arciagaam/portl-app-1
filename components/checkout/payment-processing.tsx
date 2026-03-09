'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { verifyAndConfirmPaymentAction } from '@/app/actions/checkout';
import { mainUrl } from '@/lib/url';

interface PaymentProcessingProps {
  orderId: string;
  tenantSubdomain: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // ~60 seconds total

export function PaymentProcessing({ orderId, tenantSubdomain }: PaymentProcessingProps) {
  const router = useRouter();
  const [pollCount, setPollCount] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (timedOut) return;

    const poll = async () => {
      const result = await verifyAndConfirmPaymentAction(orderId);

      if (!('error' in result) && result.data.status === 'confirmed') {
        // Reload the page to show the success state from the server component
        router.refresh();
        return;
      }

      setPollCount((prev) => {
        if (prev + 1 >= MAX_POLLS) {
          setTimedOut(true);
          return prev + 1;
        }
        return prev + 1;
      });
    };

    const timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [pollCount, timedOut, orderId, router]);

  if (timedOut) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h1 className="text-xl font-semibold">Payment Verification Taking Longer Than Expected</h1>
            <p className="text-sm text-muted-foreground">
              Your payment may still be processing. You can check your order status or try refreshing the page.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.refresh()}>
                Refresh Page
              </Button>
              <Button variant="outline" asChild>
                <a href={mainUrl('/account/orders')}>View My Orders</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <h1 className="text-xl font-semibold">Confirming Your Payment</h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your payment. This usually takes a few seconds.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
