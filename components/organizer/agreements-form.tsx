'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AgreementsData {
  tosAccepted: boolean;
  organizerAgreementAccepted: boolean;
  privacyPolicyAccepted: boolean;
  communityGuidelinesAccepted: boolean;
}

interface AgreementsFormProps {
  initialData?: AgreementsData;
  onSubmit: (data: AgreementsData) => Promise<void>;
}

export function AgreementsForm({ initialData, onSubmit }: AgreementsFormProps) {
  const [agreements, setAgreements] = useState<AgreementsData>({
    tosAccepted: initialData?.tosAccepted || false,
    organizerAgreementAccepted: initialData?.organizerAgreementAccepted || false,
    privacyPolicyAccepted: initialData?.privacyPolicyAccepted || false,
    communityGuidelinesAccepted: initialData?.communityGuidelinesAccepted || false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(agreements);
    } finally {
      setIsLoading(false);
    }
  };

  const allChecked =
    agreements.tosAccepted &&
    agreements.organizerAgreementAccepted &&
    agreements.privacyPolicyAccepted &&
    agreements.communityGuidelinesAccepted;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agreements & Policies</CardTitle>
          <CardDescription>
            Please review and accept the following agreements to proceed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="tos"
                checked={agreements.tosAccepted}
                onCheckedChange={(checked) =>
                  setAgreements({ ...agreements, tosAccepted: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="tos" className="cursor-pointer text-base font-medium">
                  Terms of Service
                </Label>
                <p className="text-sm text-muted-foreground">
                  I agree to the platform&apos;s Terms of Service and understand my obligations as an organizer.
                  <button className="text-primary hover:underline ml-1">
                    View Terms of Service
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="organizer-agreement"
                checked={agreements.organizerAgreementAccepted}
                onCheckedChange={(checked) =>
                  setAgreements({ ...agreements, organizerAgreementAccepted: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="organizer-agreement" className="cursor-pointer text-base font-medium">
                  Organizer Agreement
                </Label>
                <p className="text-sm text-muted-foreground">
                  I agree to the Organizer Agreement, including event compliance requirements and platform standards.
                  <button className="text-primary hover:underline ml-1">
                    View Organizer Agreement
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="privacy-policy"
                checked={agreements.privacyPolicyAccepted}
                onCheckedChange={(checked) =>
                  setAgreements({ ...agreements, privacyPolicyAccepted: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="privacy-policy" className="cursor-pointer text-base font-medium">
                  Privacy Policy
                </Label>
                <p className="text-sm text-muted-foreground">
                  I have read and agree to the Privacy Policy regarding how my data is collected, used, and protected.
                  <button className="text-primary hover:underline ml-1">
                    View Privacy Policy
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="community-guidelines"
                checked={agreements.communityGuidelinesAccepted}
                onCheckedChange={(checked) =>
                  setAgreements({ ...agreements, communityGuidelinesAccepted: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="community-guidelines" className="cursor-pointer text-base font-medium">
                  Community Guidelines
                </Label>
                <p className="text-sm text-muted-foreground">
                  I agree to follow the Community Guidelines and understand the standards for events and interactions on the platform.
                  <button className="text-primary hover:underline ml-1">
                    View Community Guidelines
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Next Steps:</strong> After accepting all agreements, you&apos;ll be able to review your application
              before final submission. Our team will review your application after submission.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!allChecked || isLoading}
          size="lg"
        >
          {isLoading ? 'Processing...' : 'Continue to Review'}
        </Button>
      </div>
    </div>
  );
}
