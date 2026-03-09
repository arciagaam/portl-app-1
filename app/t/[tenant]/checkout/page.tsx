'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { CheckoutSteps, OrderReview, AttendeeForm, PaymentStep, PaymentCancelledPrompt, type AttendeeData } from '@/components/checkout';
import { initializeCheckoutAction, getOrderForCheckoutAction, cancelOrderAction, getPendingOrderForTenantAction } from '@/app/actions/checkout';
import type { CheckoutOrderWithRelations as OrderWithRelations } from '@/lib/types/order';
import { getCartForTenantAction } from '@/app/actions/cart';
import { mainUrl } from '@/lib/url';
import { useSession } from 'next-auth/react';

const CHECKOUT_STEPS = [
  { title: 'Review', description: 'Review your order' },
  { title: 'Attendees', description: 'Enter attendee details' },
  { title: 'Payment', description: 'Complete payment' },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const tenantSubdomain = params.tenant as string;
  const isResume = searchParams.get('resume') === 'true';
  const isPaymentCancelled = searchParams.get('payment_cancelled') === 'true';

  const [currentStep, setCurrentStep] = useState(1);
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPaymentCancelledPrompt, setShowPaymentCancelledPrompt] = useState(false);

  // Ref to prevent duplicate initialization (React Strict Mode runs effects twice)
  const initializingRef = useRef(false);

  // Check for existing order or initialize checkout
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      // Redirect to sign in
      window.location.href = mainUrl(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    // Prevent duplicate initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

    // Check for existing pending order or initialize checkout
    const initCheckout = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, check for an existing pending order for this tenant
        const existingOrderResult = await getPendingOrderForTenantAction(tenantSubdomain);

        if (!('error' in existingOrderResult) && existingOrderResult.data) {
          // Resume existing pending order
          setOrder(existingOrderResult.data);

          // If resuming from PayMongo cancel, restore attendees from metadata
          if (isResume) {
            const metadata = existingOrderResult.data.metadata as { attendees?: AttendeeData[] } | null;
            if (metadata?.attendees) {
              setAttendees(metadata.attendees);
            }
            if (isPaymentCancelled) {
              setShowPaymentCancelledPrompt(true);
            }
          }

          setIsLoading(false);
          return;
        }

        // No existing order, check if there are items in cart for this tenant
        const cartResult = await getCartForTenantAction(tenantSubdomain);

        if ('error' in cartResult) {
          setError(cartResult.error);
          setIsLoading(false);
          initializingRef.current = false;
          return;
        }

        if (cartResult.data.items.length === 0) {
          // No items in cart, redirect to events
          router.push('/events');
          initializingRef.current = false;
          return;
        }

        // Initialize checkout
        const result = await initializeCheckoutAction(tenantSubdomain);

        if ('error' in result) {
          setError(result.error);
          setIsLoading(false);
          initializingRef.current = false;
          return;
        }

        setOrder(result.data.order);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing checkout:', err);
        setError('Failed to initialize checkout');
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    initCheckout();
  }, [status, tenantSubdomain, router, isResume, isPaymentCancelled]);

  const handleRetryPayment = () => {
    setShowPaymentCancelledPrompt(false);
    setCurrentStep(3);
  };

  const handleOrderUpdate = (updatedOrder: OrderWithRelations) => {
    setOrder(updatedOrder);
  };

  const handleAttendeesSubmit = (attendeeData: AttendeeData[]) => {
    setAttendees(attendeeData);
    setCurrentStep(3);
  };

  const handleCancel = () => {
    if (!order) return;

    startTransition(async () => {
      await cancelOrderAction(order.id);
      router.push('/events');
    });
  };

  // Loading state
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Checkout Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No order state
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-xl font-semibold">No items to checkout</h1>
          <p className="text-muted-foreground">
            Your cart is empty. Browse events to find tickets.
          </p>
          <Button asChild>
            <Link href="/events">
              Browse Events
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Payment cancelled prompt
  if (showPaymentCancelledPrompt) {
    return (
      <PaymentCancelledPrompt
        order={order}
        onRetryPayment={handleRetryPayment}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <h1 className="text-lg font-semibold">Checkout</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <CheckoutSteps currentStep={currentStep} steps={CHECKOUT_STEPS} />

        {currentStep === 1 && (
          <OrderReview
            order={order}
            onContinue={() => setCurrentStep(2)}
            onOrderUpdate={handleOrderUpdate}
          />
        )}

        {currentStep === 2 && (
          <AttendeeForm
            order={order}
            userEmail={session?.user?.email || undefined}
            userName={session?.user?.name || undefined}
            onContinue={handleAttendeesSubmit}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <PaymentStep
            order={order}
            attendees={attendees}
            onBack={() => setCurrentStep(2)}
            tenantSubdomain={tenantSubdomain}
          />
        )}
      </main>
    </div>
  );
}
