'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createTicketTypeWithPromotionForTenantAction,
  updateTicketTypeForTenantAction,
  deleteTicketTypeForTenantAction,
  updateTicketTypeStatusForTenantAction,
} from '@/app/actions/tenant-events';
import type { TicketTypeFormData, TicketTypeWithPromotionFormData } from '@/lib/validations/events';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { TicketsSectionProps } from './types';
import { CreateTicketTypeDialog } from './create-ticket-type-dialog';
import { EditTicketTypeDialog } from './edit-ticket-type-dialog';
import { PriceTiersDialog } from './price-tiers-dialog';
import { TicketTypeList } from './ticket-type-list';
import { EmptyTicketsState } from './empty-tickets-state';

export function TicketsSection({ event, tenantSubdomain }: TicketsSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<string | null>(null);
  const [priceTiersDialogOpen, setPriceTiersDialogOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateTicketType = async (data: TicketTypeWithPromotionFormData) => {
    try {
      const result = await createTicketTypeWithPromotionForTenantAction(tenantSubdomain, event.id, data);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(data.promotion ? 'Ticket type and promotion created' : 'Ticket type created successfully');
        setCreateDialogOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error('Error calling server action:', error);
      toast.error('Failed to create ticket type');
    }
  };

  const handleUpdateTicketType = async (data: TicketTypeFormData) => {
    if (!editingTicketType) return;
    try {
      const result = await updateTicketTypeForTenantAction(tenantSubdomain, editingTicketType, data);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Ticket type updated successfully');
        setEditingTicketType(null);
        router.refresh();
      }
    } catch (error) {
      console.error('Error updating ticket type:', error);
      toast.error('Failed to update ticket type');
    }
  };

  const handleDeleteTicketType = async (ticketTypeId: string) => {
    setIsDeleting(ticketTypeId);
    const result = await deleteTicketTypeForTenantAction(tenantSubdomain, ticketTypeId);
    setIsDeleting(null);
    setDeleteTarget(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Ticket type deleted successfully');
      router.refresh();
    }
  };

  const handleToggleStatus = (ticketTypeId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'HIDDEN' ? 'OPEN' : 'HIDDEN';
    startTransition(async () => {
      const result = await updateTicketTypeStatusForTenantAction(tenantSubdomain, ticketTypeId, newStatus);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(newStatus === 'HIDDEN' ? 'Ticket type hidden' : 'Ticket type visible');
        router.refresh();
      }
    });
  };

  const editingTicketTypeData = editingTicketType
    ? event.ticketTypes.find((tt) => tt.id === editingTicketType)
    : null;

  const priceTiersTicketType = priceTiersDialogOpen
    ? event.ticketTypes.find((tt) => tt.id === priceTiersDialogOpen)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Management</p>
          <h2 className="text-2xl font-semibold tracking-tight">Ticket Types</h2>
        </div>
        <CreateTicketTypeDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateTicketType}
        />
      </div>

      {event.ticketTypes.length === 0 ? (
        <EmptyTicketsState onCreateClick={() => setCreateDialogOpen(true)} />
      ) : (
        <TicketTypeList
          items={event.ticketTypes}
          onEdit={setEditingTicketType}
          onOpenPriceTiers={setPriceTiersDialogOpen}
          onToggleStatus={handleToggleStatus}
          onDelete={setDeleteTarget}
          isPending={isPending}
          isDeleting={isDeleting}
        />
      )}

      {editingTicketTypeData && (
        <EditTicketTypeDialog
          ticketType={editingTicketTypeData}
          onClose={() => setEditingTicketType(null)}
          onSubmit={handleUpdateTicketType}
        />
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete ticket type"
        description="Are you sure you want to delete this ticket type? This will also delete all price tiers."
        confirmLabel="Delete"
        variant="destructive"
        loading={!!isDeleting}
        onConfirm={() => deleteTarget && handleDeleteTicketType(deleteTarget)}
      />

      {priceTiersTicketType && (
        <PriceTiersDialog
          ticketType={priceTiersTicketType}
          tenantSubdomain={tenantSubdomain}
          onClose={() => setPriceTiersDialogOpen(null)}
        />
      )}
    </div>
  );
}
