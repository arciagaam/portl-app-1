'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bulkTableSchema, type BulkTableFormData } from '@/lib/validations/events';
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
import { useRouter } from 'next/navigation';

interface BulkTableFormProps {
  eventId: string;
  onSubmit: (data: BulkTableFormData) => Promise<{ error?: string; data?: unknown }>;
  onCancel: () => void;
}

export function BulkTableForm({ eventId, onSubmit, onCancel }: BulkTableFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<string | File | undefined>();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BulkTableFormData>({
    resolver: zodResolver(bulkTableSchema),
    defaultValues: {
      prefix: 'A',
      startNumber: 1,
      endNumber: 10,
      capacity: 6,
      ticketPrice: 0,
      transferrable: false,
      cancellable: false,
      imageUrl: null,
    },
  });

  const requirementType = watch('requirementType');
  const prefix = watch('prefix');
  const startNumber = watch('startNumber');
  const endNumber = watch('endNumber');
  const transferrable = watch('transferrable');
  const cancellable = watch('cancellable');

  const onSubmitForm = async (data: BulkTableFormData) => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadPendingFile(imageFile, 'tables');
      data.imageUrl = imageUrl ?? null;
      const result = await onSubmit(data);
      if (result.error) {
        return;
      }
      router.refresh();
      onCancel();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-400">
          This will create tables from {prefix}{startNumber} to {prefix}{endNumber} ({endNumber - startNumber + 1} tables total)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prefix">Prefix *</Label>
          <Input
            id="prefix"
            {...register('prefix')}
            disabled={isLoading}
            placeholder="e.g., A, B, VIP"
            className={errors.prefix ? 'border-red-500' : ''}
          />
          {errors.prefix && (
            <p className="text-sm text-destructive">{errors.prefix.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="startNumber">Start Number *</Label>
            <Input
              id="startNumber"
              type="number"
              {...register('startNumber', { valueAsNumber: true })}
              disabled={isLoading}
              className={errors.startNumber ? 'border-red-500' : ''}
            />
            {errors.startNumber && (
              <p className="text-sm text-destructive">{errors.startNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endNumber">End Number *</Label>
            <Input
              id="endNumber"
              type="number"
              {...register('endNumber', { valueAsNumber: true })}
              disabled={isLoading}
              className={errors.endNumber ? 'border-red-500' : ''}
            />
            {errors.endNumber && (
              <p className="text-sm text-destructive">{errors.endNumber.message}</p>
            )}
          </div>
        </div>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          disabled={isLoading}
          rows={3}
          placeholder="Describe what's included with these tables..."
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <FileUpload
        label="Table Image"
        description="Optional image shown on public listing (applies to all tables)"
        value={imageFile}
        onChange={(val) => setImageFile(val)}
        disabled={isLoading}
      />

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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : `Create ${endNumber - startNumber + 1} Tables`}
        </Button>
      </div>
    </form>
  );
}
