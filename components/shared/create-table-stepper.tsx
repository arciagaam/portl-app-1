'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tableWithPromotionSchema, type TableWithPromotionFormData } from '@/lib/validations/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from '@/components/ui/file-upload';
import { Stepper, type Step } from '@/components/ui/stepper';
import {
  Form,
  FormControl,
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
import { InlinePromotionForm } from '@/components/shared/inline-promotion-form';
import { uploadPendingFile } from '@/lib/upload';

interface CreateTableStepperProps {
  onSubmit: (data: TableWithPromotionFormData) => Promise<void>;
  onCancel: () => void;
}

const TABLE_FIELDS = ['label', 'capacity', 'ticketPrice', 'description', 'requirementType', 'minSpend', 'bottleCount', 'transferrable', 'cancellable', 'notes', 'imageUrl'] as const;

export function CreateTableStepper({ onSubmit, onCancel }: CreateTableStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [imageFile, setImageFile] = useState<string | File | undefined>(undefined);

  const form = useForm<TableWithPromotionFormData>({
    resolver: zodResolver(tableWithPromotionSchema),
    defaultValues: {
      label: '',
      description: '',
      capacity: 6,
      ticketPrice: 0,
      requirementType: null,
      transferrable: false,
      cancellable: false,
      imageUrl: null,
      notes: '',
      promotion: {
        name: '',
        description: '',
        requiresCode: true,
        discountType: 'PERCENT',
        discountValue: 0,
        appliesTo: 'ITEM',
        validFrom: '',
        validUntil: '',
        codes: [],
      },
    },
  });

  const tableLabel = form.watch('label');
  const requirementType = form.watch('requirementType');
  const capacity = form.watch('capacity');
  const ticketPrice = form.watch('ticketPrice');
  const total = (capacity || 0) * (ticketPrice || 0);

  const steps: Step[] = [
    { id: 1, title: 'Table Details', status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'in_progress' : 'not_started' },
    { id: 2, title: 'Promotion', description: 'Optional', status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'in_progress' : 'not_started' },
  ];

  const handleNext = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valid = await form.trigger(TABLE_FIELDS as any);
    if (valid) setCurrentStep(2);
  };

  const handleBack = () => setCurrentStep(1);

  const handleTogglePromo = (enabled: boolean) => {
    setPromoEnabled(enabled);
    if (enabled && !form.getValues('promotion.name')) {
      form.setValue('promotion.name', `Promo for Table ${tableLabel || ''}`);
    }
    if (!enabled) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue('promotion', undefined as any);
    }
  };

  const onSubmitForm = async (data: TableWithPromotionFormData) => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadPendingFile(imageFile, 'tables');
      data.imageUrl = imageUrl ?? null;
      if (!promoEnabled) {
        data.promotion = undefined;
      }
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper steps={steps} currentStep={currentStep} onStepClick={(id) => {
        if (id < currentStep) setCurrentStep(id);
        if (id === 2 && currentStep === 1) handleNext();
      }} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-6">
          {currentStep === 1 && (
            <>
              {/* --- Basics --- */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Basics</legend>
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Label *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isLoading} placeholder="e.g., A1, B2, VIP1" />
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
                        <Textarea {...field} disabled={isLoading} rows={2} placeholder="Describe what's included with this table..." />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticketPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Ticket (PHP) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            disabled={isLoading}
                            placeholder="e.g., 500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {total > 0 && (
                  <div className="border bg-muted/30 p-3">
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="font-semibold text-foreground">PHP {total.toLocaleString()}</span>
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="requirementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requirement</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'NONE') {
                            field.onChange(null);
                            form.setValue('minSpend', null);
                            form.setValue('bottleCount', null);
                          } else {
                            field.onChange(value);
                            if (value === 'MINIMUM_SPEND') form.setValue('bottleCount', null);
                            else form.setValue('minSpend', null);
                          }
                        }}
                        value={field.value ?? 'NONE'}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select requirement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="MINIMUM_SPEND">Minimum Spend</SelectItem>
                          <SelectItem value="BOTTLE_REQUIREMENT">Bottle Requirement</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {requirementType === 'MINIMUM_SPEND' && (
                  <FormField
                    control={form.control}
                    name="minSpend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Spend (PHP) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            value={field.value ?? ''}
                            disabled={isLoading}
                            placeholder="e.g., 5000"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {requirementType === 'BOTTLE_REQUIREMENT' && (
                  <FormField
                    control={form.control}
                    name="bottleCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bottle Count *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            value={field.value ?? ''}
                            disabled={isLoading}
                            placeholder="e.g., 2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </fieldset>

              <hr className="border-border" />

              {/* --- Options --- */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Options</legend>
                <div className="flex items-center gap-6">
                  <FormField
                    control={form.control}
                    name="transferrable"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer !mt-0">Transferrable</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cancellable"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer !mt-0">Cancellable</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={isLoading} rows={2} placeholder="Additional notes about this table..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </fieldset>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNext} disabled={isLoading}>
                  Next
                </Button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <InlinePromotionForm
                form={form}
                enabled={promoEnabled}
                onToggle={handleTogglePromo}
                disabled={isLoading}
                itemLabel={tableLabel ? `Table ${tableLabel}` : undefined}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : promoEnabled ? 'Create Table' : 'Create Without Promotion'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
