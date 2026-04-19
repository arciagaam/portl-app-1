import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateTicketTypeStepper } from '@/components/shared/create-ticket-type-stepper';
import { Plus } from 'lucide-react';
import type { TicketTypeWithPromotionFormData } from '@/lib/validations/events';

interface CreateTicketTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketTypeWithPromotionFormData) => Promise<void>;
}

export function CreateTicketTypeDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateTicketTypeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Ticket Type
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ticket Type</DialogTitle>
          <DialogDescription>
            Create a new ticket type for this event
          </DialogDescription>
        </DialogHeader>
        <CreateTicketTypeStepper
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
