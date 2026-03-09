'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { uploadPendingFile } from '@/lib/upload';

export interface IdentityVerificationData {
  governmentIdUrl?: string;
  selfieWithIdUrl?: string;
  businessIdUrl?: string;
}

interface IdentityVerificationFormProps {
  initialData?: IdentityVerificationData;
  onSave: (data: IdentityVerificationData) => Promise<void>;
  onSaveAndExit: (data: IdentityVerificationData) => Promise<void>;
}

export function IdentityVerificationForm({
  initialData,
  onSave,
  onSaveAndExit,
}: IdentityVerificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [governmentId, setGovernmentId] = useState<string | File | undefined>(
    initialData?.governmentIdUrl || undefined
  );
  const [selfieWithId, setSelfieWithId] = useState<string | File | undefined>(
    initialData?.selfieWithIdUrl || undefined
  );
  const [businessId, setBusinessId] = useState<string | File | undefined>(
    initialData?.businessIdUrl || undefined
  );

  const hasRequiredFiles = !!governmentId && !!selfieWithId;

  const uploadAll = async (): Promise<IdentityVerificationData> => {
    const [governmentIdUrl, selfieWithIdUrl, businessIdUrl] = await Promise.all([
      uploadPendingFile(governmentId, 'identity-verification'),
      uploadPendingFile(selfieWithId, 'identity-verification'),
      uploadPendingFile(businessId, 'identity-verification'),
    ]);
    return {
      governmentIdUrl: governmentIdUrl || '',
      selfieWithIdUrl: selfieWithIdUrl || '',
      businessIdUrl: businessIdUrl || '',
    };
  };

  const handleSave = async (shouldExit = false) => {
    setIsLoading(true);
    try {
      const data = await uploadAll();
      if (shouldExit) {
        await onSaveAndExit(data);
      } else {
        await onSave(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity Verification</CardTitle>
          <CardDescription>
            Please provide the required identity verification documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUpload
            label="Valid Government ID"
            description="Upload a clear photo of a valid government-issued ID (driver's license, passport, etc.)"
            required
            value={governmentId}
            onChange={(val) => setGovernmentId(val)}
          />

          <FileUpload
            label="Selfie with ID"
            description="Upload a selfie photo holding your government ID next to your face"
            required
            value={selfieWithId}
            onChange={(val) => setSelfieWithId(val)}
          />

          <FileUpload
            label="Business ID Card (Optional)"
            description="If applicable, upload a business registration or business ID card"
            value={businessId}
            onChange={(val) => setBusinessId(val)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => handleSave(true)}
          disabled={isLoading}
        >
          Save & Exit
        </Button>
        <Button
          onClick={() => handleSave(false)}
          disabled={isLoading || !hasRequiredFiles}
        >
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
