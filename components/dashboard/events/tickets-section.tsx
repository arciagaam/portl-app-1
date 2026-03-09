'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TicketTypeForm } from './ticket-type-form';
import { PriceTiersSection } from './price-tiers-section';
import { Plus, Trash2, Tag, Ticket, Pencil } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import {
  createTicketTypeForTenantAction,
  updateTicketTypeForTenantAction,
  deleteTicketTypeForTenantAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatPhp } from '@/lib/format';
import type { TicketTypeFormData } from '@/lib/validations/events';

type EventWithTicketTypes = Event & Prisma.EventGetPayload<{
  include: {
    ticketTypes: {
      include: {
        table: true;
        priceTiers: true;
        _count: {
          select: {
            promotions: true;
          };
        };
      };
    };
    tables: true;
  };
}>;

interface TicketsSectionProps {
  event: EventWithTicketTypes;
  tenantSubdomain: string;
}

const kindLabels = {
  GENERAL: 'General',
  TABLE: 'Table',
  SEAT: 'Seat',
};

const kindColors = {
  GENERAL: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  TABLE: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  SEAT: 'bg-green-100 text-green-800 hover:bg-green-100',
};

export function TicketsSection({ event, tenantSubdomain }: TicketsSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<string | null>(null);
  const [priceTiersDialogOpen, setPriceTiersDialogOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreateTicketType = async (data: TicketTypeFormData) => {
    try {
      const result = await createTicketTypeForTenantAction(tenantSubdomain, event.id, data);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success('Ticket type created successfully');
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
    if (!confirm('Are you sure you want to delete this ticket type? This will also delete all price tiers.')) {
      return;
    }
    setIsDeleting(ticketTypeId);
    const result = await deleteTicketTypeForTenantAction(tenantSubdomain, ticketTypeId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Ticket type deleted successfully');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Ticket Types</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage ticket types and pricing for this event
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Ticket Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Ticket Type</DialogTitle>
              <DialogDescription>
                Create a new ticket type for this event
              </DialogDescription>
            </DialogHeader>
            <TicketTypeForm
              tables={event.tables}
              onSubmit={handleCreateTicketType}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {event.ticketTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No ticket types yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Create ticket types for general admission, VIP tables, or individual seats.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Ticket Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Ticket Types</CardTitle>
            <CardDescription>
              {event.ticketTypes.length} ticket type{event.ticketTypes.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Price Tiers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.ticketTypes.map((ticketType) => (
                  <TableRow key={ticketType.id}>
                    <TableCell className="font-medium">{ticketType.name}</TableCell>
                    <TableCell>
                      <Badge className={kindColors[ticketType.kind]}>
                        {kindLabels[ticketType.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPhp(ticketType.basePrice)}</TableCell>
                    <TableCell>
                      {ticketType.quantityTotal
                        ? `${ticketType.quantitySold}/${ticketType.quantityTotal}`
                        : 'Unlimited'}
                    </TableCell>
                    <TableCell>
                      {ticketType.table ? (
                        <span className="text-sm">{ticketType.table.label}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => setPriceTiersDialogOpen(ticketType.id)}
                      >
                        {ticketType.priceTiers.length} tier{ticketType.priceTiers.length !== 1 ? 's' : ''}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTicketType(ticketType.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPriceTiersDialogOpen(ticketType.id)}
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTicketType(ticketType.id)}
                          disabled={isDeleting === ticketType.id || ticketType.quantitySold > 0}
                          className="text-destructive hover:text-destructive"
                          title={ticketType.quantitySold > 0 ? `Cannot delete: ${ticketType.quantitySold} tickets sold` : 'Delete ticket type'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Ticket Type Dialog */}
      {editingTicketType && (() => {
        const ticketType = event.ticketTypes.find((tt) => tt.id === editingTicketType);
        if (!ticketType) return null;
        return (
          <Dialog
            open={!!editingTicketType}
            onOpenChange={(open) => !open && setEditingTicketType(null)}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Ticket Type</DialogTitle>
                <DialogDescription>
                  Update the details for this ticket type
                </DialogDescription>
              </DialogHeader>
              <TicketTypeForm
                tables={event.tables}
                defaultValues={{
                  name: ticketType.name,
                  description: ticketType.description || undefined,
                  kind: ticketType.kind,
                  basePrice: ticketType.basePrice,
                  quantityTotal: ticketType.quantityTotal ?? undefined,
                  tableId: ticketType.tableId,
                  transferrable: ticketType.transferrable,
                  cancellable: ticketType.cancellable,
                  imageUrl: ticketType.imageUrl,
                }}
                onSubmit={handleUpdateTicketType}
                onCancel={() => setEditingTicketType(null)}
                isEdit
                quantitySold={ticketType.quantitySold}
              />
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Price Tiers Dialog */}
      {priceTiersDialogOpen && (
        <Dialog
          open={!!priceTiersDialogOpen}
          onOpenChange={(open) => !open && setPriceTiersDialogOpen(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Price Tiers</DialogTitle>
              <DialogDescription>
                Manage price tiers for this ticket type
              </DialogDescription>
            </DialogHeader>
            {event.ticketTypes.find((tt) => tt.id === priceTiersDialogOpen) && (
              <PriceTiersSection
                ticketType={event.ticketTypes.find((tt) => tt.id === priceTiersDialogOpen)!}
                tenantSubdomain={tenantSubdomain}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
