'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { CreateTicketTypeStepper } from '@/components/shared/create-ticket-type-stepper';
import { PriceTiersSection } from './price-tiers-section';
import { Plus, Tag } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import type { TicketTypeWithPromotionFormData } from '@/lib/validations/events';
import { createTicketTypeWithPromotionAction, deleteTicketTypeAction } from '@/app/actions/events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type EventWithTicketTypes = Event & Prisma.EventGetPayload<{
  include: {
    ticketTypes: {
      include: {
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

interface TicketTypesSectionProps {
  event: EventWithTicketTypes;
}


export function TicketTypesSection({ event }: TicketTypesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [priceTiersDialogOpen, setPriceTiersDialogOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreateTicketType = async (data: TicketTypeWithPromotionFormData) => {
    const result = await createTicketTypeWithPromotionAction(event.id, data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(data.promotion ? 'Ticket type and promotion created' : 'Ticket type created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleDeleteTicketType = async (ticketTypeId: string) => {
    const result = await deleteTicketTypeAction(ticketTypeId);
    setDeleteTarget(null);
    if (result.error) {
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
              Create Ticket Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Ticket Type</DialogTitle>
              <DialogDescription>
                Add a new ticket type to this event
              </DialogDescription>
            </DialogHeader>
            <CreateTicketTypeStepper
              onSubmit={handleCreateTicketType}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {event.ticketTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4 text-center">
              No ticket types created yet. Create your first ticket type to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Ticket Type
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
                  <TableHead>Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Price Tiers</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.ticketTypes.map((ticketType) => (
                  <TableRow key={ticketType.id}>
                    <TableCell className="font-medium">{ticketType.name}</TableCell>
                    <TableCell>
                      ₱{ticketType.basePrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {ticketType.quantityTotal
                        ? `${ticketType.quantitySold}/${ticketType.quantityTotal}`
                        : 'Unlimited'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setPriceTiersDialogOpen(ticketType.id)}
                      >
                        {ticketType.priceTiers.length} tier{ticketType.priceTiers.length !== 1 ? 's' : ''}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPriceTiersDialogOpen(ticketType.id)}
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          Tiers
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(ticketType.id)}
                        >
                          Delete
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

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete ticket type"
        description="Are you sure you want to delete this ticket type? This will also delete all price tiers."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDeleteTicketType(deleteTarget)}
      />

      {priceTiersDialogOpen && (
        <Dialog open={!!priceTiersDialogOpen} onOpenChange={(open) => !open && setPriceTiersDialogOpen(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Price Tiers</DialogTitle>
              <DialogDescription>
                Manage price tiers for this ticket type
              </DialogDescription>
            </DialogHeader>
            {event.ticketTypes.find(tt => tt.id === priceTiersDialogOpen) && (
              <PriceTiersSection
                ticketType={event.ticketTypes.find(tt => tt.id === priceTiersDialogOpen)!}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
