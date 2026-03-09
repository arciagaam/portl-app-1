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
import { Plus, ImageIcon, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { Event, EventImage } from '@/prisma/generated/prisma/client';
import {
  addEventImageAction,
  deleteEventImageAction,
  reorderEventImagesAction,
  setEventThumbnailAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { uploadPendingFile } from '@/lib/upload';

type EventWithImages = Event & {
  images: EventImage[];
};

interface GallerySectionProps {
  event: EventWithImages;
  tenantSubdomain: string;
}

const MAX_IMAGES = 10;

export function GallerySection({ event, tenantSubdomain }: GallerySectionProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<string | File | undefined>();
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isSettingThumbnail, setIsSettingThumbnail] = useState(false);

  const handleAddImage = useCallback(async () => {
    if (!pendingFile) return;

    setIsAdding(true);
    try {
      const url = await uploadPendingFile(pendingFile, `events/${event.id}/gallery`);
      if (!url) {
        toast.error('Upload failed');
        return;
      }

      const result = await addEventImageAction(tenantSubdomain, event.id, url);
      if ('error' in result) {
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
  }, [pendingFile, tenantSubdomain, event.id, router]);

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(imageId);
    const result = await deleteEventImageAction(tenantSubdomain, imageId);
    setIsDeleting(null);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Image removed');
      router.refresh();
    }
  };

  const handleReorder = async (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = event.images.findIndex((img) => img.id === imageId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= event.images.length) return;

    const newOrder = [...event.images];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    setIsReordering(true);
    const result = await reorderEventImagesAction(
      tenantSubdomain,
      event.id,
      newOrder.map((img) => img.id)
    );
    setIsReordering(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      router.refresh();
    }
  };

  const handleSetThumbnail = async (imageUrl: string) => {
    setIsSettingThumbnail(true);
    const isCurrent = event.thumbnailUrl === imageUrl;
    const result = await setEventThumbnailAction(
      tenantSubdomain,
      event.id,
      isCurrent ? null : imageUrl
    );
    setIsSettingThumbnail(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(isCurrent ? 'Thumbnail cleared (will use first gallery image)' : 'Thumbnail set');
      router.refresh();
    }
  };

  const isThumbnail = (imageUrl: string) => {
    return event.thumbnailUrl === imageUrl;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Gallery</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {event.images.length} of {MAX_IMAGES} images
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
            <Button disabled={event.images.length >= MAX_IMAGES}>
              <Plus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gallery Image</DialogTitle>
              <DialogDescription>
                Upload an image to add to this event's gallery
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

      {event.images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No images yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Add images to showcase your event. The first image will be used as the default thumbnail.
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
            <CardTitle>Event Images</CardTitle>
            <CardDescription>
              Click the star to set an image as the event thumbnail. Use arrows to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {event.images.map((image, index) => (
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
                        onClick={() => handleSetThumbnail(image.url)}
                        disabled={isSettingThumbnail}
                        title={isThumbnail(image.url) ? 'Clear thumbnail' : 'Set as thumbnail'}
                      >
                        <Star
                          className={`h-4 w-4 ${isThumbnail(image.url) ? 'fill-yellow-500 text-yellow-500' : ''}`}
                        />
                      </Button>
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
                        disabled={index === event.images.length - 1 || isReordering}
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

                  {/* Thumbnail badge */}
                  {isThumbnail(image.url) && (
                    <div className="absolute bottom-2 left-2">
                      <span className="flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs font-medium text-white">
                        <Star className="h-3 w-3 fill-white" />
                        Thumbnail
                      </span>
                    </div>
                  )}

                  {/* Default thumbnail indicator */}
                  {!event.thumbnailUrl && index === 0 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">
                        Default thumbnail
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
