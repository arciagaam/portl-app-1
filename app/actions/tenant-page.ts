'use server';

import { requireTenantAccess } from '@/lib/tenant';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import type { TenantBrandingFormData } from '@/lib/validations/tenant-page';

const MAX_TENANT_IMAGES = 12;

function isValidStorageUrl(url: string | null): boolean {
  return url === null || url.startsWith('https://');
}

// ============================================================================
// DASHBOARD (Requires ADMIN+)
// ============================================================================

/**
 * Get tenant page settings (branding fields + gallery images)
 */
export async function getTenantPageSettingsAction(tenantSubdomain: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const tenantData = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: {
        id: true,
        subdomain: true,
        name: true,
        logoUrl: true,
        bannerUrl: true,
        tagline: true,
        description: true,
        socialInstagram: true,
        socialFacebook: true,
        socialTwitter: true,
        socialTiktok: true,
        socialWebsite: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!tenantData) {
      return { error: 'Tenant not found' };
    }

    return { data: tenantData };
  } catch (error) {
    console.error('Error fetching tenant page settings:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to fetch page settings' };
  }
}

/**
 * Update tenant branding (tagline, description, social links)
 */
export async function updateTenantBrandingAction(tenantSubdomain: string, data: TenantBrandingFormData) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        tagline: data.tagline || null,
        description: data.description || null,
        socialInstagram: data.socialInstagram || null,
        socialFacebook: data.socialFacebook || null,
        socialTwitter: data.socialTwitter || null,
        socialTiktok: data.socialTiktok || null,
        socialWebsite: data.socialWebsite || null,
      },
    });

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { success: true };
  } catch (error) {
    console.error('Error updating tenant branding:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to update branding' };
  }
}

/**
 * Update tenant logo
 */
export async function updateTenantLogoAction(tenantSubdomain: string, url: string | null) {
  try {
    if (!isValidStorageUrl(url)) {
      return { error: 'Invalid URL' };
    }

    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const current = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { logoUrl: true },
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { logoUrl: url },
    });

    // Clean up old blob
    if (current?.logoUrl && current.logoUrl.includes('.public.blob.vercel-storage.com')) {
      del(current.logoUrl).catch(() => {});
    }

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { success: true };
  } catch (error) {
    console.error('Error updating tenant logo:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to update logo' };
  }
}

/**
 * Update tenant banner
 */
export async function updateTenantBannerAction(tenantSubdomain: string, url: string | null) {
  try {
    if (!isValidStorageUrl(url)) {
      return { error: 'Invalid URL' };
    }

    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const current = await prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { bannerUrl: true },
    });

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { bannerUrl: url },
    });

    // Clean up old blob
    if (current?.bannerUrl && current.bannerUrl.includes('.public.blob.vercel-storage.com')) {
      del(current.bannerUrl).catch(() => {});
    }

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { success: true };
  } catch (error) {
    console.error('Error updating tenant banner:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to update banner' };
  }
}

/**
 * Add a gallery image to tenant
 */
export async function addTenantImageAction(tenantSubdomain: string, url: string) {
  try {
    if (!isValidStorageUrl(url)) {
      return { error: 'Invalid URL' };
    }

    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const count = await prisma.tenantImage.count({ where: { tenantId: tenant.id } });
    if (count >= MAX_TENANT_IMAGES) {
      return { error: `Maximum of ${MAX_TENANT_IMAGES} images allowed` };
    }

    const image = await prisma.tenantImage.create({
      data: {
        tenantId: tenant.id,
        url,
        position: count,
      },
    });

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { data: image };
  } catch (error) {
    console.error('Error adding tenant image:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to add image' };
  }
}

/**
 * Delete a tenant gallery image
 */
export async function deleteTenantImageAction(tenantSubdomain: string, imageId: string) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const image = await prisma.tenantImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return { error: 'Image not found' };
    }

    if (image.tenantId !== tenant.id) {
      return { error: 'Image does not belong to this tenant' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.tenantImage.delete({ where: { id: imageId } });

      const remaining = await tx.tenantImage.findMany({
        where: { tenantId: tenant.id },
        orderBy: { position: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await tx.tenantImage.update({
            where: { id: remaining[i].id },
            data: { position: i },
          });
        }
      }
    });

    // Clean up blob
    if (image.url.includes('.public.blob.vercel-storage.com')) {
      del(image.url).catch(() => {});
    }

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant image:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to delete image' };
  }
}

/**
 * Reorder tenant gallery images
 */
export async function reorderTenantImagesAction(tenantSubdomain: string, imageIds: string[]) {
  try {
    const { tenant } = await requireTenantAccess(tenantSubdomain, 'ADMIN');

    const images = await prisma.tenantImage.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    const existingIds = new Set(images.map((i) => i.id));
    for (const id of imageIds) {
      if (!existingIds.has(id)) {
        return { error: 'Invalid image ID in reorder list' };
      }
    }

    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.tenantImage.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    revalidatePath(`/t/${tenantSubdomain}`);
    revalidatePath(`/dashboard/${tenantSubdomain}/page-settings`);
    return { success: true };
  } catch (error) {
    console.error('Error reordering tenant images:', error);
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('not found') || error.message.includes('not approved'))) {
      return { error: error.message };
    }
    return { error: 'Failed to reorder images' };
  }
}

// ============================================================================
// PUBLIC (No auth required)
// ============================================================================

/**
 * Get public tenant page data (branding + images + latest 3 events)
 */
export async function getPublicTenantPageData(subdomain: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        id: true,
        subdomain: true,
        name: true,
        logoUrl: true,
        bannerUrl: true,
        tagline: true,
        description: true,
        contactEmail: true,
        socialInstagram: true,
        socialFacebook: true,
        socialTwitter: true,
        socialTiktok: true,
        socialWebsite: true,
        images: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    const events = await prisma.event.findMany({
      where: {
        tenantId: tenant.id,
        status: 'PUBLISHED',
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 3,
      include: {
        ticketTypes: {
          select: {
            id: true,
            basePrice: true,
          },
        },
        images: {
          take: 1,
          orderBy: { position: 'asc' },
          select: { url: true },
        },
      },
    });

    return { data: { ...tenant, events } };
  } catch (error) {
    console.error('Error fetching public tenant page:', error);
    return { error: 'Failed to fetch page data' };
  }
}
