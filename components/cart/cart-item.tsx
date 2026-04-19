'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { updateCartItemAction, removeFromCartAction } from '@/app/actions/cart';
import { useCart } from './cart-provider';
import type { CartItemWithRelations } from '@/app/actions/cart';

interface CartItemProps {
  item: CartItemWithRelations;
}

export function CartItem({ item }: CartItemProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { refreshCart } = useCart();

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity < 0 || newQuantity > 10) return;

    setError(null);
    startTransition(async () => {
      const result = await updateCartItemAction({
        cartItemId: item.id,
        quantity: newQuantity,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      await refreshCart();
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      const result = await removeFromCartAction(item.id);

      if ('error' in result) {
        setError(result.error);
        return;
      }

      await refreshCart();
    });
  };

  const subtotal = item.unitPrice * item.quantity;
  const isTableItem = !!item.table;
  const itemName = item.table
    ? item.table.label
    : item.ticketType?.name ?? 'Unknown item';

  const getTableRequirementNote = (): string | null => {
    if (!item.table) return null;
    if (item.table.requirementType === 'MINIMUM_SPEND' && item.table.minSpend) {
      return `(PHP ${item.table.minSpend.toLocaleString()} consumable — payable at the venue)`;
    }
    if (item.table.requirementType === 'BOTTLE_REQUIREMENT' && item.table.bottleCount) {
      return `(${item.table.bottleCount} bottle${item.table.bottleCount > 1 ? 's' : ''} required — payable at the venue)`;
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-2 py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{item.event.name}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isPending}
          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-start justify-between gap-2 -mt-1">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-medium text-sm">{itemName}</p>
          {isTableItem && item.table && (
            <>
              <p className="text-xs text-muted-foreground">
                {item.table.capacity}x Tickets
              </p>
              {getTableRequirementNote() && (
                <p className="text-xs text-muted-foreground italic">
                  {getTableRequirementNote()}
                </p>
              )}
            </>
          )}
          {!isTableItem && (
            <p className="text-xs text-muted-foreground">
              PHP {item.unitPrice.toLocaleString()} each
            </p>
          )}
        </div>
        <p className="text-sm font-semibold shrink-0">
          PHP {subtotal.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {isTableItem ? (
          <p className="text-xs text-muted-foreground">1 table</p>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1 || isPending}
              className="h-7 w-7"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => handleUpdateQuantity(parseInt(e.target.value, 10) || 1)}
              min={1}
              max={10}
              className="w-12 h-7 text-center text-sm"
              disabled={isPending}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleUpdateQuantity(item.quantity + 1)}
              disabled={item.quantity >= 10 || isPending}
              className="h-7 w-7"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        {!isTableItem && (
          <p className="text-sm font-semibold">
            PHP {subtotal.toLocaleString()}
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
