'use client';

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
import { useState } from 'react';

interface TableFormProps {
  eventId: string;
  defaultValues?: Partial<TableFormData>;
  onSubmit: (data: TableFormData) => Promise<void>;
  onCancel: () => void;
}

export function TableForm({ eventId, defaultValues, onSubmit, onCancel }: TableFormProps) {
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
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Table Label *</Label>
        <Input
          id="label"
          {...register('label')}
          disabled={isLoading}
          placeholder="e.g., A1, B2"
          className={errors.label ? 'border-red-500' : ''}
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
          rows={3}
          placeholder="Describe what's included with this table..."
          className={errors.description ? 'border-red-500' : ''}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity *</Label>
          <Input
            id="capacity"
            type="number"
            {...register('capacity', { valueAsNumber: true })}
            disabled={isLoading}
            className={errors.capacity ? 'border-red-500' : ''}
          />
          {errors.capacity && (
            <p className="text-sm text-destructive">{errors.capacity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticketPrice">Price per Ticket *</Label>
          <Input
            id="ticketPrice"
            type="number"
            {...register('ticketPrice', { valueAsNumber: true })}
            disabled={isLoading}
            placeholder="e.g., 500 for ₱500.00"
            className={errors.ticketPrice ? 'border-red-500' : ''}
          />
          {errors.ticketPrice && (
            <p className="text-sm text-destructive">{errors.ticketPrice.message}</p>
          )}
        </div>
      </div>

      {capacity > 0 && ticketPrice > 0 && (
        <div className="bg-muted/50 border rounded-lg p-3">
          <p className="text-sm font-medium">
            Total: PHP {(capacity * ticketPrice).toLocaleString()}
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
              if (value === 'MINIMUM_SPEND') setValue('bottleCount', null);
              if (value === 'BOTTLE_REQUIREMENT') setValue('minSpend', null);
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
          <Label htmlFor="minSpend">Minimum Spend *</Label>
          <Input
            id="minSpend"
            type="number"
            {...register('minSpend', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
            disabled={isLoading}
            placeholder="e.g., 500 for ₱500.00"
            className={errors.minSpend ? 'border-red-500' : ''}
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
            className={errors.bottleCount ? 'border-red-500' : ''}
          />
          {errors.bottleCount && (
            <p className="text-sm text-destructive">{errors.bottleCount.message}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-6 pt-2">
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
          rows={3}
          className={errors.notes ? 'border-red-500' : ''}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Table'}
        </Button>
      </div>
    </form>
  );
}
