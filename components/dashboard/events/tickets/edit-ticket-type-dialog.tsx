import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TicketTypeForm } from '../ticket-type-form';
import type { TicketTypeFormData } from '@/lib/validations/events';
import type { TicketType } from './types';

interface EditTicketTypeDialogProps {
  ticketType: TicketType;
  onClose: () => void;
  onSubmit: (data: TicketTypeFormData) => Promise<void>;
}

export function EditTicketTypeDialog({
  ticketType,
  onClose,
  onSubmit,
}: EditTicketTypeDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Ticket Type</DialogTitle>
          <DialogDescription>
            Update the details for this ticket type
          </DialogDescription>
        </DialogHeader>
        <TicketTypeForm
          defaultValues={{
            name: ticketType.name,
            description: ticketType.description || undefined,
            basePrice: ticketType.basePrice,
            quantityTotal: ticketType.quantityTotal ?? undefined,
            transferrable: ticketType.transferrable,
            cancellable: ticketType.cancellable,
            imageUrl: ticketType.imageUrl,
          }}
          onSubmit={onSubmit}
          onCancel={onClose}
          isEdit
          quantitySold={ticketType.quantitySold}
        />
      </DialogContent>
    </Dialog>
  );
}
