'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper, type Step } from '@/components/ui/stepper';
import { EventForm } from '@/components/dashboard/events/event-form';
import { WizardTablesStep } from '@/components/dashboard/events/wizard-tables-step';
import { WizardTicketsStep } from '@/components/dashboard/events/wizard-tickets-step';
import { CalendarDays, MapPin } from 'lucide-react';
import type { EventFormData } from '@/lib/validations/events';
import type { Table, TicketType } from '@/prisma/generated/prisma/client';

interface CreateEventWizardProps {
  tenantSubdomain: string;
  onCreateEvent: (data: EventFormData) => Promise<{ error?: string; data?: { id: string } }>;
}

export function CreateEventWizard({ tenantSubdomain, onCreateEvent }: CreateEventWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventSummary, setEventSummary] = useState<{ name: string; venueName: string; startDate: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);

  const steps: Step[] = [
    {
      id: 1,
      title: 'Event Details',
      status: eventId ? 'completed' : currentStep === 1 ? 'in_progress' : 'not_started',
    },
    {
      id: 2,
      title: 'Tables & Seats',
      description: 'Optional',
      status: currentStep === 2 ? 'in_progress' : currentStep > 2 ? 'completed' : eventId ? 'not_started' : 'not_started',
    },
    {
      id: 3,
      title: 'Ticket Types',
      description: 'Optional',
      status: currentStep === 3 ? 'in_progress' : 'not_started',
    },
  ];

  const handleStepClick = (stepId: number) => {
    if (stepId === 1 || eventId) {
      setCurrentStep(stepId);
    }
  };

  const handleEventCreated = (data: { id: string }) => {
    setEventId(data.id);
    setCurrentStep(2);
  };

  const handleFinish = () => {
    router.push(`/dashboard/${tenantSubdomain}/events/${eventId}`);
  };

  return (
    <div className="space-y-8">
      <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

      <div className="border">
        <div className="p-6">
          {currentStep === 1 && (
            <>
              {eventId && eventSummary ? (
                <div className="space-y-4">
                  <div className="border bg-muted/30 p-5 space-y-2">
                    <h3 className="font-semibold text-lg">{eventSummary.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {eventSummary.venueName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {eventSummary.startDate}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Event created. You can edit details from the event page after finishing.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-sm font-medium text-foreground hover:underline underline-offset-4"
                    >
                      Continue to Tables & Seats &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <EventForm
                  tenantSubdomain={tenantSubdomain}
                  onSubmit={async (data) => {
                    const result = await onCreateEvent(data);
                    if (result.data) {
                      setEventSummary({
                        name: data.name,
                        venueName: data.venueName,
                        startDate: data.startDate,
                      });
                    }
                    return result;
                  }}
                  onSuccess={handleEventCreated}
                />
              )}
            </>
          )}

          {currentStep === 2 && eventId && (
            <WizardTablesStep
              tenantSubdomain={tenantSubdomain}
              eventId={eventId}
              tables={tables}
              onTableCreated={(table) => setTables((prev) => [...prev, table])}
              onTablesCreated={(newTables) => setTables((prev) => [...prev, ...newTables])}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
              onFinish={handleFinish}
            />
          )}

          {currentStep === 3 && eventId && (
            <WizardTicketsStep
              tenantSubdomain={tenantSubdomain}
              eventId={eventId}
              ticketTypes={ticketTypes}
              onTicketTypeCreated={(tt) => setTicketTypes((prev) => [...prev, tt])}
              onBack={() => setCurrentStep(2)}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
