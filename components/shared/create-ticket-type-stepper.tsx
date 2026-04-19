'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketTypeWithPromotionSchema, type TicketTypeWithPromotionFormData } from '@/lib/validations/events';
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
import { InlinePromotionForm } from '@/components/shared/inline-promotion-form';
import { uploadPendingFile } from '@/lib/upload';

interface CreateTicketTypeStepperProps {
  onSubmit: (data: TicketTypeWithPromotionFormData) => Promise<void>;
  onCancel: () => void;
}

const TICKET_FIELDS = ['name', 'basePrice', 'quantityTotal', 'description', 'transferrable', 'cancellable', 'imageUrl'] as const;

export function CreateTicketTypeStepper({ onSubmit, onCancel }: CreateTicketTypeStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [imageFile, setImageFile] = useState<string | File | undefined>(undefined);

  const form = useForm<TicketTypeWithPromotionFormData>({
    resolver: zodResolver(ticketTypeWithPromotionSchema),
    defaultValues: {
      name: '',
      description: '',
      transferrable: false,
      cancellable: false,
      basePrice: 0,
      imageUrl: null,
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

  const ticketName = form.watch('name');

  const steps: Step[] = [
    { id: 1, title: 'Ticket Details', status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'in_progress' : 'not_started' },
    { id: 2, title: 'Promotion', description: 'Optional', status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'in_progress' : 'not_started' },
  ];

  const handleNext = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valid = await form.trigger(TICKET_FIELDS as any);
    if (valid) setCurrentStep(2);
  };

  const handleBack = () => setCurrentStep(1);

  const handleTogglePromo = (enabled: boolean) => {
    setPromoEnabled(enabled);
    if (enabled && !form.getValues('promotion.name')) {
      form.setValue('promotion.name', `Promo for ${ticketName || 'Ticket'}`);
    }
    if (!enabled) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue('promotion', undefined as any);
    }
  };

  const onSubmitForm = async (data: TicketTypeWithPromotionFormData) => {
    setIsLoading(true);
    try {
      const imageUrl = await uploadPendingFile(imageFile, 'ticket-types');
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Type Name *</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isLoading} placeholder="e.g., General Admission, Early Bird, VIP" />
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
                        <Textarea {...field} disabled={isLoading} rows={2} placeholder="Describe what's included with this ticket..." />
                      </FormControl>
                    </FormItem>
                  )}
                />

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
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (PHP) *</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="quantityTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            value={field.value ?? ''}
                            disabled={isLoading}
                            placeholder="Leave empty for unlimited"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                itemLabel={ticketName}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading}>
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : promoEnabled ? 'Create Ticket Type' : 'Create Without Promotion'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  );
}
