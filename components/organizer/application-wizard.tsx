'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, type Step } from '@/components/ui/stepper';
import { OrganizerTypeForm, type OrganizerType } from '@/components/organizer/organizer-type-form';
import { EventPortfolioForm, type EventPortfolioEntry } from '@/components/organizer/event-portfolio-form';
import { ComplianceForm } from '@/components/organizer/compliance-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { saveApplicationAction } from '@/app/actions/organizer';
import { OrganizerApplication } from '@/prisma/generated/prisma/client';

interface ApplicationWizardProps {
  tenant: string;
  tenantId: string;
  initialApplication: OrganizerApplication | null;
  initialStep: number;
}

export function ApplicationWizard({ 
  tenant, 
  tenantId, 
  initialApplication,
  initialStep: initialStepProp 
}: ApplicationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const stepParam = searchParams.get('step');
  const [currentStep, setCurrentStep] = useState(
    stepParam ? parseInt(stepParam) : (initialApplication?.currentStep || initialStepProp || 1)
  );
  const [application, setApplication] = useState(initialApplication);

  const saveApplication = async (step: number, data: any, shouldExit = false) => {
    const result = await saveApplicationAction(tenantId, step, data, shouldExit);

    if (result.error || !result.data) {
      console.error('Error saving application:', result.error);
      toast.error('Failed to save application. Please try again.');
      return;
    }

    setApplication(result.data);

    if (shouldExit) {
      router.push(`/dashboard/${tenant}`);
    } else if (step < 3) {
      setCurrentStep(step + 1);
    } else {
      // Application submitted
      router.push(`/dashboard/${tenant}`);
    }
  };

  const steps: Step[] = [
    {
      id: 1,
      title: 'Organizer Type',
      status: currentStep === 1 ? 'in_progress' : currentStep > 1 ? 'completed' : 'not_started',
    },
    {
      id: 2,
      title: 'Event Portfolio',
      status: currentStep === 2 ? 'in_progress' : currentStep > 2 ? 'completed' : 'not_started',
    },
    {
      id: 3,
      title: 'Compliance',
      status: currentStep === 3 ? 'in_progress' : 'not_started',
    },
  ];

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
      <div>
        <Link
          href={`/dashboard/${tenant}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Organizer Application</h1>
        <p className="text-muted-foreground mt-1">
          Complete all steps to submit your application
        </p>
      </div>

      <Card>
          <CardContent className="pt-6">
            <Stepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={(stepId) => {
                if (stepId <= (application?.currentStep || 1)) {
                  setCurrentStep(stepId);
                }
              }}
            />
          </CardContent>
        </Card>

        {currentStep === 1 && (
          <OrganizerTypeForm
            initialData={{
              organizerType: undefined,
              organizerDescription: undefined,
            }}
            onSave={async (data) => {
              await saveApplication(1, data, false);
            }}
            onSaveAndExit={async (data) => {
              await saveApplication(1, data, true);
            }}
          />
        )}

        {currentStep === 2 && (
          <EventPortfolioForm
            initialData={application?.pastEvents as EventPortfolioEntry[] | undefined}
            onSave={async (data) => {
              await saveApplication(2, data, false);
            }}
            onSaveAndExit={async (data) => {
              await saveApplication(2, data, true);
            }}
          />
        )}

      {currentStep === 3 && (
        <ComplianceForm
          initialData={application?.tosAccepted && application?.organizerAgreementAccepted && application?.privacyPolicyAccepted && application?.communityGuidelinesAccepted}
          onSubmit={async () => {
            await saveApplication(3, {}, false);
          }}
        />
      )}
    </div>
  );
}
