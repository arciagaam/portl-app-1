import { Button } from '@/components/ui/button';
import { ImageIcon, Plus } from 'lucide-react';

interface EmptyGalleryProps {
  onAddImage: () => void;
}

export function EmptyGallery({ onAddImage }: EmptyGalleryProps) {
  return (
    <div className="border border-dashed p-16 text-center">
      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No images yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Add images to showcase your event. The first image will be used as the default thumbnail.
      </p>
      <Button onClick={onAddImage}>
        <Plus className="mr-2 h-4 w-4" />
        Add Image
      </Button>
    </div>
  );
}
