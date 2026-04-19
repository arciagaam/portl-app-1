'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ComplianceFormProps {
  initialData?: boolean;
  onSubmit: () => Promise<void>;
}

export function ComplianceForm({ initialData, onSubmit }: ComplianceFormProps) {
  const [acknowledgements, setAcknowledgements] = useState({
    terms: initialData || false,
    policies: initialData || false,
    verification: initialData || false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit();
    } finally {
      setIsLoading(false);
    }
  };

  const allChecked = acknowledgements.terms && acknowledgements.policies && acknowledgements.verification;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance & Platform Acknowledgement</CardTitle>
          <CardDescription>
            Please review and acknowledge the following requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1 text-foreground">Important Information</p>
                <p>
                  By completing this application, you&apos;re taking the first step to becoming an organizer on our platform.
                  We need to ensure all organizers comply with our standards and policies.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="terms"
                checked={acknowledgements.terms}
                onCheckedChange={(checked) =>
                  setAcknowledgements({ ...acknowledgements, terms: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="terms" className="cursor-pointer text-base font-medium">
                  Platform Terms & Conditions
                </Label>
                <p className="text-sm text-muted-foreground">
                  I agree to abide by the platform&apos;s terms of service and organizer guidelines.
                  <button className="text-primary hover:underline ml-1">
                    View terms
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="policies"
                checked={acknowledgements.policies}
                onCheckedChange={(checked) =>
                  setAcknowledgements({ ...acknowledgements, policies: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="policies" className="cursor-pointer text-base font-medium">
                  Event Compliance
                </Label>
                <p className="text-sm text-muted-foreground">
                  I confirm that all events I organize will comply with platform policies, local laws, 
                  and regulations. I understand that non-compliant events may be removed.
                  <button className="text-primary hover:underline ml-1">
                    View policies
                  </button>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border rounded-lg p-4">
              <Checkbox
                id="verification"
                checked={acknowledgements.verification}
                onCheckedChange={(checked) =>
                  setAcknowledgements({ ...acknowledgements, verification: checked as boolean })
                }
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="verification" className="cursor-pointer text-base font-medium">
                  Future Verification
                </Label>
                <p className="text-sm text-muted-foreground">
                  I acknowledge that additional verification or documentation may be required in the future, 
                  depending on event type, size, or platform requirements.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Next Steps:</strong> After submission, our team will review your application.
              You&apos;ll receive an email notification once the review is complete. This typically takes 2-3 business days.
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
          {isLoading ? 'Submitting...' : 'Confirm & Submit Application'}
        </Button>
      </div>
    </div>
  );
}
