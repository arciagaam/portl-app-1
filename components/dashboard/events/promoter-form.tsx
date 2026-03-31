'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventPromoterSchema, type EventPromoterFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shuffle } from 'lucide-react';

interface Promotion {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
}

interface PromoterFormProps {
  promotions: Promotion[];
  onSubmit: (data: EventPromoterFormData) => Promise<void>;
  onCancel: () => void;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function PromoterForm({ promotions, onSubmit, onCancel }: PromoterFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventPromoterFormData>({
    resolver: zodResolver(eventPromoterSchema),
    defaultValues: {
      code: generateCode(),
    },
  });

  const selectedPromotionId = watch('promotionId');

  const onSubmitForm = async (data: EventPromoterFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDiscount = (promo: Promotion) => {
    if (promo.discountType === 'PERCENT') {
      return `${promo.discountValue / 100}% off`;
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(promo.discountValue) + ' off';
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...register('name')}
          disabled={isLoading}
          placeholder="e.g., John Doe"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            disabled={isLoading}
            placeholder="john@example.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...register('phone')}
            disabled={isLoading}
            placeholder="+63 9XX XXX XXXX"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promotionId">Promotion *</Label>
        <Select
          value={selectedPromotionId}
          onValueChange={(v) => setValue('promotionId', v, { shouldValidate: true })}
          disabled={isLoading}
        >
          <SelectTrigger className={errors.promotionId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select a promotion" />
          </SelectTrigger>
          <SelectContent>
            {promotions.map((promo) => (
              <SelectItem key={promo.id} value={promo.id}>
                {promo.name} ({formatDiscount(promo)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.promotionId && (
          <p className="text-sm text-red-600">{errors.promotionId.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The discount from this promotion will apply when the promo code is used
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Promo Code *</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            {...register('code')}
            disabled={isLoading}
            placeholder="e.g., JOHN2024"
            className={errors.code ? 'border-red-500' : ''}
            style={{ textTransform: 'uppercase' }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setValue('code', generateCode(), { shouldValidate: true })}
            disabled={isLoading}
            title="Generate random code"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        </div>
        {errors.code && (
          <p className="text-sm text-red-600">{errors.code.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Letters, numbers, hyphens, and underscores only. Will be converted to uppercase.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="maxRedemptions">Max Redemptions</Label>
          <Input
            id="maxRedemptions"
            type="number"
            {...register('maxRedemptions', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? undefined : Number(v)),
            })}
            disabled={isLoading}
            placeholder="Unlimited"
            className={errors.maxRedemptions ? 'border-red-500' : ''}
          />
          {errors.maxRedemptions && (
            <p className="text-sm text-red-600">{errors.maxRedemptions.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="commissionRate">Commission Rate (%)</Label>
          <Input
            id="commissionRate"
            type="number"
            step="0.01"
            {...register('commissionRate', {
              valueAsNumber: true,
              setValueAs: (v) => {
                if (v === '' || v === undefined) return undefined;
                return Math.round(Number(v) * 100); // Convert percentage to basis points
              },
            })}
            disabled={isLoading}
            placeholder="e.g., 5"
            className={errors.commissionRate ? 'border-red-500' : ''}
          />
          {errors.commissionRate && (
            <p className="text-sm text-red-600">{errors.commissionRate.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Percentage of revenue earned by the promoter
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          disabled={isLoading}
          placeholder="Any additional notes about this promoter..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || promotions.length === 0}>
          {isLoading ? 'Creating...' : 'Add Promoter'}
        </Button>
      </div>

      {promotions.length === 0 && (
        <p className="text-sm text-amber-600">
          You need to create at least one promotion first before adding promoters.
        </p>
      )}
    </form>
  );
}
