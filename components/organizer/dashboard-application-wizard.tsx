'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, type Step } from '@/components/ui/stepper';
import { EventPortfolioForm, type EventPortfolioData } from '@/components/organizer/event-portfolio';
import type { PastEvent } from '@/components/organizer/event-portfolio/past-events-form';
import type { Venue } from '@/components/organizer/event-portfolio/venues-form';
import type { ArtistsTalent } from '@/components/organizer/event-portfolio/artists-form';
import type { Reference } from '@/components/organizer/event-portfolio/references-form';
import { IdentityVerificationForm, type IdentityVerificationData } from '@/components/organizer/identity-verification-form';
import { AgreementsForm, type AgreementsData } from '@/components/organizer/agreements-form';
import { ReviewForm } from '@/components/organizer/review-form';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { saveApplicationAction } from '@/app/actions/organizer';
import { OrganizerApplication } from '@/prisma/generated/prisma/client';

interface DashboardApplicationWizardProps {
  tenant: string;
  tenantId: string;
  tenantName: string;
  initialApplication: OrganizerApplication | null;
  initialStep: number;
}

export function DashboardApplicationWizard({
  tenant,
  tenantId,
  tenantName,
  initialApplication,
  initialStep: initialStepProp
}: DashboardApplicationWizardProps) {
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
      alert(result.error || 'Failed to save application. Please try again.');
      return;
    }

    const appData = result.data as unknown as typeof initialApplication;
    setApplication(appData);

    if (shouldExit) {
      router.push(`/dashboard/${tenant}`);
    } else if (step < 4) {
      setCurrentStep(step + 1);
    } else {
      // Application submitted
      router.push(`/dashboard/${tenant}`);
    }
  };

  const canEdit = !application?.reviewStartedAt && application?.status !== 'APPROVED' && application?.status !== 'REJECTED';

  const steps: Step[] = [
    {
      id: 1,
      title: 'Event Portfolio',
      status: currentStep === 1 ? 'in_progress' : currentStep > 1 ? 'completed' : 'not_started',
    },
    {
      id: 2,
      title: 'Identity Verification',
      status: currentStep === 2 ? 'in_progress' : currentStep > 2 ? 'completed' : 'not_started',
    },
    {
      id: 3,
      title: 'Agreements',
      status: currentStep === 3 ? 'in_progress' : currentStep > 3 ? 'completed' : 'not_started',
    },
    {
      id: 4,
      title: 'Review & Submit',
      status: currentStep === 4 ? 'in_progress' : 'not_started',
    },
  ];

  const eventPortfolioData: EventPortfolioData = {
    pastEvents: application?.pastEvents as PastEvent[] | undefined,
    venues: application?.venuesWorkedWith as Venue[] | undefined,
    artistsTalent: application?.artistsTalent as ArtistsTalent | undefined,
    references: application?.references as Reference[] | undefined,
  };

  const identityVerificationData: IdentityVerificationData = {
    governmentIdUrl: application?.governmentIdUrl || undefined,
    selfieWithIdUrl: application?.selfieWithIdUrl || undefined,
    businessIdUrl: application?.businessIdUrl || undefined,
  };

  const agreementsData: AgreementsData = {
    tosAccepted: application?.tosAccepted || false,
    organizerAgreementAccepted: application?.organizerAgreementAccepted || false,
    privacyPolicyAccepted: application?.privacyPolicyAccepted || false,
    communityGuidelinesAccepted: application?.communityGuidelinesAccepted || false,
  };

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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Organizer Application</h1>
          {!canEdit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Application locked</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Complete your application to become an approved event organizer for {tenantName}.
        </p>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            <strong>Application Under Review:</strong> Your application is currently being reviewed by our team.
            You cannot make changes at this time.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={(stepId) => {
              if (canEdit && stepId <= (application?.currentStep || 1)) {
                setCurrentStep(stepId);
              }
            }}
          />
        </CardContent>
      </Card>

      {currentStep === 1 && (
        <EventPortfolioForm
          initialData={eventPortfolioData}
          onSave={async (data) => {
            await saveApplication(1, {
              pastEvents: data.pastEvents,
              venues: data.venues,
              artistsTalent: data.artistsTalent,
              references: data.references,
            }, false);
          }}
          onSaveAndExit={async (data) => {
            await saveApplication(1, {
              pastEvents: data.pastEvents,
              venues: data.venues,
              artistsTalent: data.artistsTalent,
              references: data.references,
            }, true);
          }}
        />
      )}

      {currentStep === 2 && (
        <IdentityVerificationForm
          initialData={identityVerificationData}
          onSave={async (data) => {
            await saveApplication(2, data, false);
          }}
          onSaveAndExit={async (data) => {
            await saveApplication(2, data, true);
          }}
        />
      )}

      {currentStep === 3 && (
        <AgreementsForm
          initialData={agreementsData}
          onSubmit={async (data) => {
            await saveApplication(3, data, false);
          }}
        />
      )}

      {currentStep === 4 && (
        <ReviewForm
          eventPortfolio={eventPortfolioData}
          identityVerification={identityVerificationData}
          agreements={agreementsData}
          onEditStep={(step) => {
            if (canEdit) {
              setCurrentStep(step);
            }
          }}
          onSubmit={async () => {
            await saveApplication(4, {}, false);
          }}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
