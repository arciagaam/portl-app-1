'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TicketTypeForm } from '@/components/dashboard/events/ticket-type-form';
import { createTicketTypeForTenantAction } from '@/app/actions/tenant-events';
import { Plus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketType } from '@/prisma/generated/prisma/client';
import type { TicketTypeFormData } from '@/lib/validations/events';

interface WizardTicketsStepProps {
  tenantSubdomain: string;
  eventId: string;
  ticketTypes: TicketType[];
  onTicketTypeCreated: (ticketType: TicketType) => void;
  onBack: () => void;
  onFinish: () => void;
}

export function WizardTicketsStep({
  tenantSubdomain,
  eventId,
  ticketTypes,
  onTicketTypeCreated,
  onBack,
  onFinish,
}: WizardTicketsStepProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleCreateTicketType = async (data: TicketTypeFormData) => {
    const result = await createTicketTypeForTenantAction(tenantSubdomain, eventId, data);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    onTicketTypeCreated(result.data as TicketType);
    toast.success('Ticket type created');
    setShowAddDialog(false);
  };

  const formatPrice = (price: number | bigint | { toNumber?: () => number }) => {
    const num = typeof price === 'bigint' ? Number(price) : typeof price === 'object' && price && 'toNumber' in price ? price.toNumber!() : Number(price);
    return `PHP ${num.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Ticket Types</h3>
        <p className="text-sm text-muted-foreground">
          Optional. Add ticket types now or later from the event page.
        </p>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Ticket Type
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Ticket Type</DialogTitle>
          </DialogHeader>
          <TicketTypeForm
            onSubmit={handleCreateTicketType}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {ticketTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No ticket types added yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ticketTypes.map((tt) => (
            <div
              key={tt.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{tt.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(tt.basePrice)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button onClick={onFinish}>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Finish
        </Button>
      </div>
    </div>
  );
}
