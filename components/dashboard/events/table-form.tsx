'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tableSchema, type TableFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from '@/components/ui/file-upload';
import { uploadPendingFile } from '@/lib/upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TableFormProps {
  defaultValues?: Partial<TableFormData>;
  onSubmit: (data: TableFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function TableForm({ defaultValues, onSubmit, onCancel, isEdit }: TableFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<string | File | undefined>(
    defaultValues?.imageUrl ?? undefined
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: defaultValues || {
      capacity: 6,
      ticketPrice: 0,
      requirementType: null,
      transferrable: false,
      cancellable: false,
      imageUrl: null,
    },
  });

  const requirementType = watch('requirementType');
  const capacity = watch('capacity');
  const ticketPrice = watch('ticketPrice');
  const transferrable = watch('transferrable');
  const cancellable = watch('cancellable');

  const total = (capacity || 0) * (ticketPrice || 0);

  const onSubmitForm = async (data: TableFormData) => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadPendingFile(imageFile, 'tables');
      data.imageUrl = imageUrl ?? null;
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* --- Basics --- */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Basics</legend>
        <div className="space-y-2">
          <Label htmlFor="label">Table Label *</Label>
          <Input
            id="label"
            {...register('label')}
            disabled={isLoading}
            placeholder="e.g., A1, B2, VIP1"
            className={errors.label ? 'border-destructive' : ''}
          />
          {errors.label && (
            <p className="text-sm text-destructive">{errors.label.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            disabled={isLoading}
            rows={2}
            placeholder="Describe what's included with this table..."
            className={errors.description ? 'border-destructive' : ''}
          />
          {errors.description && (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        <FileUpload
          label="Table Image"
          description="Optional image shown on public listing"
          value={imageFile}
          onChange={(val) => setImageFile(val)}
          disabled={isLoading}
        />
      </fieldset>

      <hr className="border-border" />

      {/* --- Pricing --- */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Pricing</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity *</Label>
            <Input
              id="capacity"
              type="number"
              {...register('capacity', { valueAsNumber: true })}
              disabled={isLoading}
              className={errors.capacity ? 'border-destructive' : ''}
            />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketPrice">Price per Ticket (PHP) *</Label>
            <Input
              id="ticketPrice"
              type="number"
              {...register('ticketPrice', { valueAsNumber: true })}
              disabled={isLoading}
              placeholder="e.g., 500"
              className={errors.ticketPrice ? 'border-destructive' : ''}
            />
            {errors.ticketPrice && (
              <p className="text-sm text-destructive">{errors.ticketPrice.message}</p>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">PHP {total.toLocaleString()}</span>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="requirementType">Requirement</Label>
          <Select
            value={requirementType ?? 'NONE'}
            onValueChange={(value) => {
              if (value === 'NONE') {
                setValue('requirementType', null);
                setValue('minSpend', null);
                setValue('bottleCount', null);
              } else {
                setValue('requirementType', value as 'MINIMUM_SPEND' | 'BOTTLE_REQUIREMENT');
                if (value === 'MINIMUM_SPEND') {
                  setValue('bottleCount', null);
                } else {
                  setValue('minSpend', null);
                }
              }
            }}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select requirement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="MINIMUM_SPEND">Minimum Spend</SelectItem>
              <SelectItem value="BOTTLE_REQUIREMENT">Bottle Requirement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {requirementType === 'MINIMUM_SPEND' && (
          <div className="space-y-2">
            <Label htmlFor="minSpend">Minimum Spend (PHP) *</Label>
            <Input
              id="minSpend"
              type="number"
              {...register('minSpend', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              disabled={isLoading}
              placeholder="e.g., 5000"
              className={errors.minSpend ? 'border-destructive' : ''}
            />
            {errors.minSpend && (
              <p className="text-sm text-destructive">{errors.minSpend.message}</p>
            )}
          </div>
        )}

        {requirementType === 'BOTTLE_REQUIREMENT' && (
          <div className="space-y-2">
            <Label htmlFor="bottleCount">Bottle Count *</Label>
            <Input
              id="bottleCount"
              type="number"
              {...register('bottleCount', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              disabled={isLoading}
              placeholder="e.g., 2"
              className={errors.bottleCount ? 'border-destructive' : ''}
            />
            {errors.bottleCount && (
              <p className="text-sm text-destructive">{errors.bottleCount.message}</p>
            )}
          </div>
        )}
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

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            disabled={isLoading}
            rows={2}
            placeholder="Additional notes about this table..."
            className={errors.notes ? 'border-destructive' : ''}
          />
          {errors.notes && (
            <p className="text-sm text-destructive">{errors.notes.message}</p>
          )}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEdit ? 'Update Table' : 'Create Table'}
        </Button>
      </div>
    </form>
  );
}
