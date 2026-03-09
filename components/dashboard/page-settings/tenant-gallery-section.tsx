'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { Plus, ImageIcon, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { TenantImage } from '@/prisma/generated/prisma/client';
import {
  addTenantImageAction,
  deleteTenantImageAction,
  reorderTenantImagesAction,
} from '@/app/actions/tenant-page';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { uploadPendingFile } from '@/lib/upload';

interface TenantGallerySectionProps {
  tenant: {
    id: string;
    images: TenantImage[];
  };
  tenantSubdomain: string;
}

const MAX_IMAGES = 12;

export function TenantGallerySection({ tenant, tenantSubdomain }: TenantGallerySectionProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | File | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handleAddImage = useCallback(async () => {
    if (!pendingFile) return;

    setIsAdding(true);
    try {
      const url = await uploadPendingFile(pendingFile, `tenants/${tenant.id}/gallery`);
      if (!url) {
        toast.error('Upload failed');
        return;
      }

      const result = await addTenantImageAction(tenantSubdomain, url);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Image added to gallery');
        setAddDialogOpen(false);
        setPendingFile(undefined);
        router.refresh();
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsAdding(false);
    }
  }, [pendingFile, tenantSubdomain, tenant.id, router]);

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(imageId);
    const result = await deleteTenantImageAction(tenantSubdomain, imageId);
    setIsDeleting(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Image removed');
      router.refresh();
    }
  };

  const handleReorder = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = tenant.images.findIndex((img) => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tenant.images.length) return;

    const newOrder = [...tenant.images];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    setIsReordering(true);
    const result = await reorderTenantImagesAction(
      tenantSubdomain,
      newOrder.map((img) => img.id)
    );
    setIsReordering(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gallery</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tenant.images.length} of {MAX_IMAGES} images
          </p>
        </div>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) setPendingFile(undefined);
          }}
        >
          <DialogTrigger asChild>
            <Button disabled={tenant.images.length >= MAX_IMAGES}>
              <Plus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gallery Image</DialogTitle>
              <DialogDescription>
                Upload an image to showcase on your landing page
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FileUpload
                value={pendingFile}
                onChange={(val) => setPendingFile(val)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setPendingFile(undefined);
                  }}
                  disabled={isAdding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddImage} disabled={!pendingFile || isAdding}>
                  {isAdding ? 'Uploading...' : 'Add to Gallery'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tenant.images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No images yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Add images to showcase your venue, past events, or brand on your landing page.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Gallery Images</CardTitle>
            <CardDescription>
              These images appear in the Gallery section of your landing page. Use arrows to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-lg border bg-gray-50"
                >
                  <div className="aspect-[16/9]">
                    <img
                      src={image.url}
                      alt={`Gallery image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">
                        {index + 1}
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(image.id, 'up')}
                        disabled={index === 0 || isReordering}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReorder(image.id, 'down')}
                        disabled={index === tenant.images.length - 1 || isReordering}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteImage(image.id)}
                        disabled={isDeleting === image.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
