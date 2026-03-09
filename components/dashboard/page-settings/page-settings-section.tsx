'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { BrandingForm } from './branding-form';
import { TenantGallerySection } from './tenant-gallery-section';
import { updateTenantLogoAction, updateTenantBannerAction } from '@/app/actions/tenant-page';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { TenantImage } from '@/prisma/generated/prisma/client';
import { uploadPendingFile } from '@/lib/upload';

type TenantPageSettings = {
  id: string;
  subdomain: string;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  tagline: string | null;
  description: string | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialTiktok: string | null;
  socialWebsite: string | null;
  images: TenantImage[];
};

interface PageSettingsSectionProps {
  tenant: TenantPageSettings;
  tenantSubdomain: string;
}

export function PageSettingsSection({ tenant, tenantSubdomain }: PageSettingsSectionProps) {
  const router = useRouter();
  const [logoFile, setLogoFile] = useState<string | File | undefined>(tenant.logoUrl ?? undefined);
  const [bannerFile, setBannerFile] = useState<string | File | undefined>(tenant.bannerUrl ?? undefined);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Track whether the user has changed something from what's saved
  const logoChanged = logoFile !== (tenant.logoUrl ?? undefined);
  const bannerChanged = bannerFile !== (tenant.bannerUrl ?? undefined);

  const handleSaveLogo = useCallback(async () => {
    setIsSavingLogo(true);
    try {
      const url = await uploadPendingFile(logoFile, `tenants/${tenant.id}/logo`);
      const result = await updateTenantLogoAction(tenantSubdomain, url ?? null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(url ? 'Logo updated' : 'Logo removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setIsSavingLogo(false);
    }
  }, [logoFile, tenantSubdomain, tenant.id, router]);

  const handleSaveBanner = useCallback(async () => {
    setIsSavingBanner(true);
    try {
      const url = await uploadPendingFile(bannerFile, `tenants/${tenant.id}/banner`);
      const result = await updateTenantBannerAction(tenantSubdomain, url ?? null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(url ? 'Banner updated' : 'Banner removed');
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload banner');
    } finally {
      setIsSavingBanner(false);
    }
  }, [bannerFile, tenantSubdomain, tenant.id, router]);

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Your logo appears in the tenant navbar and on your landing page hero section.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            value={logoFile}
            onChange={(val) => setLogoFile(val)}
            description="Recommended: Square image, at least 200x200px"
            disabled={isSavingLogo}
          />
          {logoChanged && (
            <div className="flex justify-end">
              <Button onClick={handleSaveLogo} disabled={isSavingLogo}>
                {isSavingLogo ? 'Saving...' : 'Save Logo'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Banner */}
      <Card>
        <CardHeader>
          <CardTitle>Banner</CardTitle>
          <CardDescription>
            The banner is displayed as the hero background on your landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            value={bannerFile}
            onChange={(val) => setBannerFile(val)}
            description="Recommended: 1920x600px or wider for best results"
            disabled={isSavingBanner}
          />
          {bannerChanged && (
            <div className="flex justify-end">
              <Button onClick={handleSaveBanner} disabled={isSavingBanner}>
                {isSavingBanner ? 'Saving...' : 'Save Banner'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Set your tagline, description, and social media links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm
            tenant={tenant}
            tenantSubdomain={tenantSubdomain}
          />
        </CardContent>
      </Card>

      {/* Gallery */}
      <TenantGallerySection
        tenant={tenant}
        tenantSubdomain={tenantSubdomain}
      />
    </div>
  );
}
