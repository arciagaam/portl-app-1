'use client';

import { useState, useCallback } from 'react';
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
import { Plus } from 'lucide-react';
import { addEventImageAction } from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { uploadPendingFile } from '@/lib/upload';

interface AddImageDialogProps {
  eventId: string;
  tenantSubdomain: string;
  disabled: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddImageDialog({ eventId, tenantSubdomain, disabled, open, onOpenChange }: AddImageDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const addDialogOpen = open ?? internalOpen;
  const setAddDialogOpen = onOpenChange ?? setInternalOpen;
  const [pendingFile, setPendingFile] = useState<string | File | undefined>();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddImage = useCallback(async () => {
    if (!pendingFile) return;

    setIsAdding(true);
    try {
      const url = await uploadPendingFile(pendingFile, `events/${eventId}/gallery`);
      if (!url) {
        toast.error('Upload failed');
        return;
      }

      const result = await addEventImageAction(tenantSubdomain, eventId, url);
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
  }, [pendingFile, tenantSubdomain, eventId, router]);

  return (
    <Dialog
      open={addDialogOpen}
      onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) setPendingFile(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Gallery Image</DialogTitle>
          <DialogDescription>
            Upload an image to add to this event&apos;s gallery
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
  );
}
