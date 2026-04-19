'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketTypeSchema, type TicketTypeFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from '@/components/ui/file-upload';
import { uploadPendingFile } from '@/lib/upload';

interface TicketTypeFormProps {
  defaultValues?: Partial<TicketTypeFormData>;
  onSubmit: (data: TicketTypeFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  quantitySold?: number;
}

export function TicketTypeForm({ defaultValues, onSubmit, onCancel, isEdit, quantitySold }: TicketTypeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const hasSales = (quantitySold ?? 0) > 0;
  const [imageFile, setImageFile] = useState<string | File | undefined>(
    defaultValues?.imageUrl ?? undefined
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: defaultValues || {
      transferrable: false,
      cancellable: false,
      basePrice: 0,
      imageUrl: null,
    },
  });

  const transferrable = watch('transferrable');
  const cancellable = watch('cancellable');

  const onSubmitForm = async (data: TicketTypeFormData) => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadPendingFile(imageFile, 'ticket-types');
      data.imageUrl = imageUrl ?? null;
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (validationErrors: typeof errors) => {
    console.error('Form validation errors:', validationErrors);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm, onError)} className="space-y-6">
      {/* --- Basics --- */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Basics</legend>
        <div className="space-y-2">
          <Label htmlFor="name">Ticket Type Name *</Label>
          <Input
            id="name"
            {...register('name')}
            disabled={isLoading}
            placeholder="e.g., General Admission, Early Bird, VIP"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            disabled={isLoading}
            rows={2}
            placeholder="Describe what's included with this ticket..."
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <FileUpload
          label="Ticket Image"
          description="Optional image shown on public ticket listing"
          value={imageFile}
          onChange={(val) => setImageFile(val)}
          disabled={isLoading}
        />
      </fieldset>

      <hr className="border-border" />

      {/* --- Pricing --- */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Pricing & Quantity</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price (PHP) *</Label>
            <Input
              id="basePrice"
              type="number"
              {...register('basePrice', { valueAsNumber: true })}
              disabled={isLoading}
              placeholder="e.g., 500"
              className={errors.basePrice ? 'border-destructive' : ''}
            />
            {errors.basePrice && (
              <p className="text-sm text-destructive">{errors.basePrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityTotal">Total Quantity</Label>
            <Input
              id="quantityTotal"
              type="number"
              {...register('quantityTotal', {
                setValueAs: (v) => {
                  if (v === '' || v === null || v === undefined) return undefined;
                  const num = Number(v);
                  return isNaN(num) ? undefined : num;
                },
              })}
              disabled={isLoading}
              placeholder="Leave empty for unlimited"
              className={errors.quantityTotal ? 'border-destructive' : ''}
            />
            {errors.quantityTotal && (
              <p className="text-sm text-destructive">{errors.quantityTotal.message}</p>
            )}
            {hasSales && (
              <p className="text-xs text-muted-foreground">
                Minimum {quantitySold} (tickets already sold)
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <hr className="border-border" />

      {/* --- Options --- */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Options</legend>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="transferrable"
              checked={transferrable}
              onCheckedChange={(checked) => setValue('transferrable', !!checked)}
              disabled={isLoading}
            />
            <Label htmlFor="transferrable" className="font-normal cursor-pointer">
              Transferrable
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cancellable"
              checked={cancellable}
              onCheckedChange={(checked) => setValue('cancellable', !!checked)}
              disabled={isLoading}
            />
            <Label htmlFor="cancellable" className="font-normal cursor-pointer">
              Cancellable
            </Label>
          </div>
        </div>
      </fieldset>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEdit ? 'Update Ticket Type' : 'Create Ticket Type'}
        </Button>
      </div>
    </form>
  );
}
