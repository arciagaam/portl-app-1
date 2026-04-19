'use client';

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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

interface InlinePromotionFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  itemLabel?: string;
}

export function InlinePromotionForm({
  form,
  enabled,
  onToggle,
  disabled = false,
  itemLabel,
}: InlinePromotionFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'promotion.codes',
  });

  const requiresCode = form.watch('promotion.requiresCode');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Add a promotion</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optionally create a discount for {itemLabel ? `"${itemLabel}"` : 'this item'}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={disabled} />
      </div>

      {enabled && (
        <div className="space-y-6">
          {/* --- Discount Details --- */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Discount Details</legend>

            <FormField
              control={form.control}
              name="promotion.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion Name *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={disabled} placeholder="e.g., Early Bird Discount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="promotion.description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} disabled={disabled} rows={2} placeholder="Describe this promotion..." />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="promotion.discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
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
                name="promotion.discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch('promotion.discountType') === 'FIXED' ? 'Amount (PHP) *' : 'Percentage (%) *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        disabled={disabled}
                        placeholder={form.watch('promotion.discountType') === 'FIXED' ? 'e.g., 100' : 'e.g., 10'}
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
                name="promotion.appliesTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applies To *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={disabled}>
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
                name="promotion.requiresCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promo Code</FormLabel>
                    <div className="flex items-center space-x-2 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <span className="text-sm font-normal cursor-pointer">
                        Requires code to redeem
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <hr className="border-border" />

          {/* --- Validity & Limits --- */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Validity & Limits</legend>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="promotion.validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>Defaults to event start</FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promotion.validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={disabled} />
                    </FormControl>
                    <FormDescription>Defaults to event end</FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="promotion.maxRedemptions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Total Redemptions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        value={field.value ?? ''}
                        disabled={disabled}
                        placeholder="Unlimited"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promotion.maxPerUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Per User</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        value={field.value ?? ''}
                        disabled={disabled}
                        placeholder="Unlimited"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          {/* --- Voucher Codes --- */}
          {requiresCode && (
            <>
              <hr className="border-border" />
              <fieldset className="space-y-3">
              <div className="flex items-center justify-between">
                <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Voucher Codes</legend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ code: '', maxRedemptions: undefined })}
                  disabled={disabled}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Code
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No codes yet. Add codes now or create them later from the Promotions tab.
                </p>
              )}

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`promotion.codes.${index}.code`}
                    render={({ field: codeField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...codeField}
                            placeholder="e.g., EARLYBIRD20"
                            disabled={disabled}
                            className="uppercase"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`promotion.codes.${index}.maxRedemptions`}
                    render={({ field: maxField }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input
                            type="number"
                            {...maxField}
                            onChange={(e) => maxField.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            value={maxField.value ?? ''}
                            placeholder="Max uses"
                            disabled={disabled}
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
                    disabled={disabled}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              </fieldset>
            </>
          )}
        </div>
      )}
    </div>
  );
}
