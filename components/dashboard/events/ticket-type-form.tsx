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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { Table } from '@/prisma/generated/prisma/client';
import { uploadPendingFile } from '@/lib/upload';

interface TicketTypeFormProps {
  tables: Table[];
  defaultValues?: Partial<TicketTypeFormData>;
  onSubmit: (data: TicketTypeFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  quantitySold?: number;
}

export function TicketTypeForm({ tables, defaultValues, onSubmit, onCancel, isEdit, quantitySold }: TicketTypeFormProps) {
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
    trigger,
  } = useForm<TicketTypeFormData>({
    resolver: zodResolver(ticketTypeSchema),
    defaultValues: defaultValues || {
      kind: 'GENERAL',
      transferrable: false,
      cancellable: false,
      basePrice: 0,
      tableId: null,
      imageUrl: null,
    },
  });

  const kind = watch('kind');
  const transferrable = watch('transferrable');
  const cancellable = watch('cancellable');

  // Filter tables based on kind
  const availableTables = kind === 'TABLE' || kind === 'SEAT' ? tables : [];

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
    <form onSubmit={handleSubmit(onSubmitForm, onError)} className="space-y-4">
      {hasSales && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <p className="text-sm text-amber-800">
            {quantitySold} ticket{quantitySold !== 1 ? 's' : ''} sold. Ticket kind and table assignment are locked.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Ticket Type Name *</Label>
        <Input
          id="name"
          {...register('name')}
          disabled={isLoading}
          placeholder="e.g., General Admission, VIP Table, Individual Seat"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          disabled={isLoading}
          rows={3}
          placeholder="Describe what's included with this ticket..."
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <FileUpload
        label="Ticket Image"
        description="Optional image shown on public ticket listing"
        value={imageFile}
        onChange={(val) => setImageFile(val)}
        disabled={isLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kind">Ticket Kind *</Label>
          <Select
            value={kind}
            onValueChange={(value) => {
              setValue('kind', value as 'GENERAL' | 'TABLE' | 'SEAT');
              if (value === 'GENERAL') {
                setValue('tableId', null);
              } else {
                // Clear tableId when switching to TABLE/SEAT so user must select
                setValue('tableId', null);
                // Clear quantityTotal as it will be auto-set by server for TABLE/SEAT
                setValue('quantityTotal', undefined);
              }
              // Clear any existing errors
              trigger(['tableId', 'quantityTotal']);
            }}
            disabled={isLoading || hasSales}
          >
            <SelectTrigger className={errors.kind ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General Admission</SelectItem>
              <SelectItem value="TABLE">Table Booking</SelectItem>
              <SelectItem value="SEAT">Individual Seat</SelectItem>
            </SelectContent>
          </Select>
          {errors.kind && (
            <p className="text-sm text-red-600">{errors.kind.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {kind === 'GENERAL' && 'Standard entry tickets without assigned seating'}
            {kind === 'TABLE' && 'Book an entire table (VIP/bottle service)'}
            {kind === 'SEAT' && 'Book individual seats at shared tables'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (PHP) *</Label>
          <Input
            id="basePrice"
            type="number"
            {...register('basePrice', { valueAsNumber: true })}
            disabled={isLoading}
            placeholder="e.g., 500"
            className={errors.basePrice ? 'border-red-500' : ''}
          />
          {errors.basePrice && (
            <p className="text-sm text-red-600">{errors.basePrice.message}</p>
          )}
        </div>
      </div>

      {(kind === 'TABLE' || kind === 'SEAT') && (
        <div className="space-y-2">
          <Label htmlFor="tableId">Select Table *</Label>
          {availableTables.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-sm text-amber-800">
                No tables available. Please create tables first in the Tables tab before creating a {kind === 'TABLE' ? 'table booking' : 'seat'} ticket.
              </p>
            </div>
          ) : (
            <>
              <Select
                value={watch('tableId') || ''}
                onValueChange={(value) => setValue('tableId', value)}
                disabled={isLoading || hasSales}
              >
                <SelectTrigger className={errors.tableId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {availableTables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.label} ({table.mode}, {table.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tableId && (
                <p className="text-sm text-red-600">{errors.tableId.message}</p>
              )}
            </>
          )}
          {kind === 'TABLE' && (
            <p className="text-xs text-muted-foreground">
              Quantity will be set to 1 (one table per ticket)
            </p>
          )}
          {kind === 'SEAT' && (
            <p className="text-xs text-muted-foreground">
              Quantity will match the table capacity
            </p>
          )}
        </div>
      )}

      {kind === 'GENERAL' && (
        <div className="space-y-2">
          <Label htmlFor="quantityTotal">Total Quantity Available</Label>
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
            className={errors.quantityTotal ? 'border-red-500' : ''}
          />
          {errors.quantityTotal && (
            <p className="text-sm text-red-600">{errors.quantityTotal.message}</p>
          )}
          {hasSales && (
            <p className="text-xs text-muted-foreground">
              Minimum {quantitySold} (tickets already sold)
            </p>
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

      {/* Show root-level form errors */}
      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}

      {/* Show tableId error prominently if kind requires table */}
      {(kind === 'TABLE' || kind === 'SEAT') && errors.tableId && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600 font-medium">
            Please select a table before creating this ticket type.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
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
