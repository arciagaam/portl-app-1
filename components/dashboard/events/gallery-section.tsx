'use client';

import { useState } from 'react';
import { AddImageDialog } from './gallery/add-image-dialog';
import { ImageGrid } from './gallery/image-grid';
import { EmptyGallery } from './gallery/empty-gallery';
import { MAX_IMAGES } from './gallery/types';
import type { GallerySectionProps } from './gallery/types';

export function GallerySection({ event, tenantSubdomain }: GallerySectionProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">{event.images.length} / {MAX_IMAGES} images</p>
          <h2 className="text-2xl font-semibold tracking-tight">Gallery</h2>
        </div>
        <AddImageDialog
          eventId={event.id}
          tenantSubdomain={tenantSubdomain}
          disabled={event.images.length >= MAX_IMAGES}
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
        />
      </div>

      {event.images.length === 0 ? (
        <EmptyGallery onAddImage={() => setAddDialogOpen(true)} />
      ) : (
        <ImageGrid event={event} tenantSubdomain={tenantSubdomain} />
      )}
    </div>
  );
}
