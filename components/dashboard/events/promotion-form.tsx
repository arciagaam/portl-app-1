'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inlinePromotionSchema, type InlinePromotionFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { TicketType } from '@/prisma/generated/prisma/client';

interface PromotionFormProps {
  ticketTypes: TicketType[];
  defaultValues?: Partial<InlinePromotionFormData>;
  onSubmit: (data: InlinePromotionFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function PromotionForm({ ticketTypes, defaultValues, onSubmit, onCancel, isEdit }: PromotionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InlinePromotionFormData>({
    resolver: zodResolver(inlinePromotionSchema),
    defaultValues: defaultValues || {
      name: '',
      description: '',
      requiresCode: true,
      discountType: 'PERCENT',
      discountValue: 0,
      appliesTo: 'ITEM',
      validFrom: '',
      validUntil: '',
      ticketTypeIds: [],
      codes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'codes',
  });

  const requiresCode = form.watch('requiresCode');
  const selectedTicketTypeIds = form.watch('ticketTypeIds') || [];

  const toggleTicketType = (ticketTypeId: string) => {
    const current = selectedTicketTypeIds;
    if (current.includes(ticketTypeId)) {
      form.setValue('ticketTypeIds', current.filter((id) => id !== ticketTypeId));
    } else {
      form.setValue('ticketTypeIds', [...current, ticketTypeId]);
    }
  };

  const onSubmitForm = async (data: InlinePromotionFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Promotion Name *</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} placeholder="e.g., Early Bird Discount, Group Deal" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isLoading} rows={2} placeholder="Describe this promotion..." />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (PHP)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch('discountType') === 'FIXED' ? 'Amount (PHP) *' : 'Percentage (%) *'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    disabled={isLoading}
                    placeholder={form.watch('discountType') === 'PERCENT' ? 'e.g., 10 for 10%' : 'e.g., 100 for PHP 100'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="appliesTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Applies To *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ORDER">Entire Order</SelectItem>
                    <SelectItem value="ITEM">Per Ticket</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiresCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code Required</FormLabel>
                <div className="flex items-center space-x-2 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <span className="text-sm font-normal cursor-pointer">
                    Requires voucher code
                  </span>
                </div>
                <FormDescription>
                  {field.value
                    ? 'Customers must enter a code to apply'
                    : 'Discount applies automatically'}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="validFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid From</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} disabled={isLoading} />
                </FormControl>
                <FormDescription>Defaults to event start</FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valid Until</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} disabled={isLoading} />
                </FormControl>
                <FormDescription>Defaults to event end</FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxRedemptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Total Redemptions</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    value={field.value ?? ''}
                    disabled={isLoading}
                    placeholder="Unlimited"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxPerUser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Per User</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    value={field.value ?? ''}
                    disabled={isLoading}
                    placeholder="Unlimited"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {ticketTypes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Eligible Ticket Types</p>
            <p className="text-xs text-muted-foreground mb-2">
              Select which ticket types this promotion applies to. Leave empty for all types.
            </p>
            <div className="border rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
              {ticketTypes.map((ticketType) => (
                <div key={ticketType.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ticketType-${ticketType.id}`}
                    checked={selectedTicketTypeIds.includes(ticketType.id)}
                    onCheckedChange={() => toggleTicketType(ticketType.id)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor={`ticketType-${ticketType.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {ticketType.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {requiresCode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Voucher Codes</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ code: '', maxRedemptions: undefined })}
                disabled={isLoading}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Code
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No codes yet. Add codes now or manage them later.
              </p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`codes.${index}.code`}
                  render={({ field: codeField }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...codeField}
                          placeholder="e.g., EARLYBIRD20"
                          disabled={isLoading}
                          className="uppercase"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`codes.${index}.maxRedemptions`}
                  render={({ field: maxField }) => (
                    <FormItem className="w-32">
                      <FormControl>
                        <Input
                          type="number"
                          {...maxField}
                          onChange={(e) => maxField.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          value={maxField.value ?? ''}
                          placeholder="Max uses"
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEdit ? 'Update Promotion' : 'Create Promotion'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
