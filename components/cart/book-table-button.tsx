'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { addToCartAction } from '@/app/actions/cart';
import { useCart } from './cart-provider';

interface BookTableButtonProps {
  eventId: string;
  tableId: string;
  tableLabel: string;
  totalPrice: number;
  disabled?: boolean;
  disabledReason?: string;
}

export function BookTableButton({
  eventId,
  tableId,
  tableLabel,
  totalPrice,
  disabled = false,
  disabledReason,
}: BookTableButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { refreshCart, openCart } = useCart();

  const handleBookTable = () => {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction({
        eventId,
        tableId,
        quantity: 1,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      await refreshCart();
      openCart();
    });
  };

  if (disabled) {
    return (
      <Button disabled variant="outline">
        {disabledReason || 'Sold Out'}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleBookTable} disabled={isPending}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Book Table
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
