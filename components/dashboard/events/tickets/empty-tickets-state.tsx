import { Button } from '@/components/ui/button';
import { Plus, Ticket } from 'lucide-react';

interface EmptyTicketsStateProps {
  onCreateClick: () => void;
}

export function EmptyTicketsState({ onCreateClick }: EmptyTicketsStateProps) {
  return (
    <div className="border border-dashed p-16 text-center">
      <Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No ticket types yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Create ticket types for general admission, VIP tables, or individual seats.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Add Ticket Type
      </Button>
    </div>
  );
}
