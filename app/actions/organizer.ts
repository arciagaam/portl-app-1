'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { OrganizerApplicationStatus } from '@/prisma/generated/prisma/client';

// Step-specific schemas for saveApplicationAction
const pastEventSchema = z.object({ name: z.string(), date: z.string(), venue: z.string(), description: z.string() });
const venueSchema = z.object({ name: z.string(), type: z.string() });
const artistsTalentSchema = z.object({ genres: z.array(z.string()), artists: z.array(z.string()) });
const referenceSchema = z.object({ name: z.string(), contact: z.string(), relationship: z.string() });

const applicationStep1Schema = z.object({
  pastEvents: z.array(pastEventSchema).optional(),
  venues: z.array(venueSchema).optional(),
  artistsTalent: artistsTalentSchema.optional(),
  references: z.array(referenceSchema).optional(),
});

const applicationStep2Schema = z.object({
  governmentIdUrl: z.string().url().startsWith('https://').optional().nullable(),
  selfieWithIdUrl: z.string().url().startsWith('https://').optional().nullable(),
  businessIdUrl: z.string().url().startsWith('https://').optional().nullable(),
});

const applicationStep3Schema = z.object({
  tosAccepted: z.boolean().optional(),
  organizerAgreementAccepted: z.boolean().optional(),
  privacyPolicyAccepted: z.boolean().optional(),
  communityGuidelinesAccepted: z.boolean().optional(),
});


export async function getTenantAction(subdomain: string) {
  try {
    if (!subdomain) {
      return { error: 'Subdomain required' };
    }

    // Get tenant (no longer auto-creates since registration is required)
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    return { data: tenant };
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return { error: 'Failed to fetch tenant' };
  }
}

export async function getApplicationAction(tenantId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    if (!tenantId) {
      return { error: 'Tenant ID required' };
    }

    // Verify user is a member of the tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: { userId: user.id, tenantId },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    // Get or create application
    let application = await prisma.organizerApplication.findUnique({
      where: {
        tenantId: tenantId,
      },
    });

    if (!application) {
      application = await prisma.organizerApplication.create({
        data: {
          tenantId: tenantId,
          status: 'NOT_STARTED',
          currentStep: 1,
        },
      });
    }

    return { data: application };
  } catch (error) {
    console.error('Error fetching organizer application:', error);
    return { error: 'Failed to fetch application' };
  }
}

export async function registerOrganizerAction(data: {
  name: string;
  subdomain: string;
  businessEmail: string;
  businessPhone: string;
  contactEmail?: string;
  contactPhone?: string;
  sameAsBusinessContact: boolean;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    if (!data.name || !data.subdomain || !data.businessEmail || !data.businessPhone) {
      return { error: 'All required fields are missing' };
    }

    // Validate contact info if different from business
    if (!data.sameAsBusinessContact) {
      if (!data.contactEmail || !data.contactPhone) {
        return { error: 'Contact email and phone are required when different from business contact' };
      }
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(data.subdomain)) {
      return { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
    }

    // Check against reserved subdomains
    const RESERVED_SUBDOMAINS = [
      'admin', 'www', 'api', 'mail', 'ftp', 'app', 'staging', 'dev', 'test',
      'status', 'help', 'support', 'billing', 'dashboard', 'account', 'auth',
      'login', 'signup', 'register', 'docs', 'blog', 'shop', 'store', 'cdn',
      'static', 'assets', 'img', 'images', 'media', 'download', 'uploads',
    ];
    if (RESERVED_SUBDOMAINS.includes(data.subdomain)) {
      return { error: 'This subdomain is reserved. Please choose another one.' };
    }

    // Check if subdomain is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain: data.subdomain },
    });

    if (existingTenant) {
      return { error: 'This subdomain is already taken. Please choose another one.' };
    }

    // Create tenant, application, and owner membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          subdomain: data.subdomain,
          name: data.name,
          businessEmail: data.businessEmail,
          businessPhone: data.businessPhone,
          contactEmail: data.sameAsBusinessContact ? data.businessEmail : data.contactEmail,
          contactPhone: data.sameAsBusinessContact ? data.businessPhone : data.contactPhone,
          sameAsBusinessContact: data.sameAsBusinessContact,
          status: 'INACTIVE',
          ownerId: user.id,
        },
      });

      const application = await tx.organizerApplication.create({
        data: {
          tenantId: tenant.id,
          status: 'NOT_STARTED',
          currentStep: 1,
        },
      });

      await tx.tenantMember.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      return { tenant, application };
    });

    return { data: { subdomain: result.tenant.subdomain } };
  } catch (error) {
    console.error('Error registering organizer:', error);
    return { error: 'Failed to register organizer. Please try again.' };
  }
}

export async function saveApplicationAction(
  tenantId: string,
  step: number,
  data: unknown,
  shouldExit: boolean = false
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    if (!tenantId) {
      return { error: 'Tenant ID required' };
    }

    // Validate step-specific data
    if (step === 1) {
      const parsed = applicationStep1Schema.safeParse(data);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Invalid step 1 data' };
      }
      data = parsed.data;
    } else if (step === 2) {
      const parsed = applicationStep2Schema.safeParse(data);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Invalid step 2 data' };
      }
      data = parsed.data;
    } else if (step === 3) {
      const parsed = applicationStep3Schema.safeParse(data);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Invalid step 3 data' };
      }
      data = parsed.data;
    } else if (step !== 4) {
      return { error: 'Invalid step number' };
    }

    // Verify user is OWNER of the tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: { userId: user.id, tenantId },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    // Get existing application or create new one
    let application = await prisma.organizerApplication.findUnique({
      where: {
        tenantId: tenantId,
      },
    });

    if (!application) {
      application = await prisma.organizerApplication.create({
        data: {
          tenantId: tenantId,
          status: 'IN_PROGRESS',
          currentStep: step,
        },
      });
    }

    // Check if application can be edited
    if (application.reviewStartedAt) {
      return { error: 'Application is under review and cannot be edited' };
    }

    // Update application based on step
    const updateData: {
      status: OrganizerApplicationStatus;
      updatedAt: Date;
      currentStep?: number;
      pastEvents?: z.infer<typeof pastEventSchema>[];
      venuesWorkedWith?: z.infer<typeof venueSchema>[];
      artistsTalent?: z.infer<typeof artistsTalentSchema>;
      references?: z.infer<typeof referenceSchema>[];
      governmentIdUrl?: string | null;
      selfieWithIdUrl?: string | null;
      businessIdUrl?: string | null;
      tosAccepted?: boolean;
      organizerAgreementAccepted?: boolean;
      privacyPolicyAccepted?: boolean;
      communityGuidelinesAccepted?: boolean;
      submittedAt?: Date;
    } = {
      status: shouldExit ? 'IN_PROGRESS' : application.status,
      updatedAt: new Date(),
    };

    if (step === 1) {
      // Event Portfolio (4 parts) — validated above
      const d = data as z.infer<typeof applicationStep1Schema>;
      updateData.pastEvents = d.pastEvents;
      updateData.venuesWorkedWith = d.venues;
      updateData.artistsTalent = d.artistsTalent;
      updateData.references = d.references;
      if (!shouldExit) {
        updateData.currentStep = 2;
      }
    } else if (step === 2) {
      // Identity Verification — validated above
      const d = data as z.infer<typeof applicationStep2Schema>;
      updateData.governmentIdUrl = d.governmentIdUrl;
      updateData.selfieWithIdUrl = d.selfieWithIdUrl;
      updateData.businessIdUrl = d.businessIdUrl;
      if (!shouldExit) {
        updateData.currentStep = 3;
      }
    } else if (step === 3) {
      // Agreements — validated above
      const d = data as z.infer<typeof applicationStep3Schema>;
      updateData.tosAccepted = d.tosAccepted;
      updateData.organizerAgreementAccepted = d.organizerAgreementAccepted;
      updateData.privacyPolicyAccepted = d.privacyPolicyAccepted;
      updateData.communityGuidelinesAccepted = d.communityGuidelinesAccepted;
      if (!shouldExit) {
        updateData.currentStep = 4;
      }
    } else if (step === 4) {
      // Review & Submit
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date();
    }

    const updatedApplication = await prisma.organizerApplication.update({
      where: {
        id: application.id,
      },
      data: updateData,
    });

    return { data: updatedApplication };
  } catch (error) {
    console.error('Error updating organizer application:', error);
    return { error: 'Failed to update application' };
  }
}
