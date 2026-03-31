'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TicketTypeForm } from './ticket-type-form';
import { PriceTiersSection } from './price-tiers-section';
import { Plus, Trash2, Tag, Ticket, Pencil, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import {
  createTicketTypeForTenantAction,
  updateTicketTypeForTenantAction,
  deleteTicketTypeForTenantAction,
  updateTicketTypeStatusForTenantAction,
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

const kindLabels: Record<string, string> = {
  GENERAL: 'General Admission',
  TABLE: 'Table',
  SEAT: 'Seat',
};

const kindColors: Record<string, string> = {
  GENERAL: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  TABLE: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  SEAT: 'bg-green-100 text-green-800 hover:bg-green-100',
};

function getStatusBadge(ticketType: { status: string; quantityTotal: number | null; quantitySold: number }) {
  if (ticketType.status === 'HIDDEN') {
    return <Badge variant="outline">Hidden</Badge>;
  }
  if (ticketType.status === 'CLOSED') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  if (ticketType.quantityTotal !== null && ticketType.quantitySold >= ticketType.quantityTotal) {
    return <Badge variant="destructive">Sold Out</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>;
}

export function TicketsSection({ event, tenantSubdomain }: TicketsSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<string | null>(null);
  const [priceTiersDialogOpen, setPriceTiersDialogOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['GENERAL', 'TABLE', 'SEAT']));
  const [isPending, startTransition] = useTransition();

  const toggleGroup = (kind: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

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

  // Group ticket types by kind
  const grouped = new Map<string, typeof event.ticketTypes>();
  for (const tt of event.ticketTypes) {
    const list = grouped.get(tt.kind) ?? [];
    list.push(tt);
    grouped.set(tt.kind, list);
  }

  const kindOrder = ['GENERAL', 'TABLE', 'SEAT'] as const;

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
        <div className="space-y-4">
          {kindOrder.map((kind) => {
            const items = grouped.get(kind);
            if (!items || items.length === 0) return null;

            const totalQty = items.reduce((sum, tt) => sum + (tt.quantityTotal ?? 0), 0);
            const totalSold = items.reduce((sum, tt) => sum + tt.quantitySold, 0);
            const totalAvailable = totalQty - totalSold;
            const hasUnlimited = items.some((tt) => tt.quantityTotal === null);

            return (
              <Collapsible key={kind} open={openGroups.has(kind)} onOpenChange={() => toggleGroup(kind)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.has(kind) ? '' : '-rotate-90'}`} />
                        <Badge className={kindColors[kind]}>{kindLabels[kind]}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({items.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mr-2">
                        <span>Qty: {hasUnlimited ? `${totalQty}+` : totalQty}</span>
                        <span>Available: {hasUnlimited ? `${totalAvailable}+` : totalAvailable}</span>
                        <span>Sold: {totalSold}</span>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Base Price</TableHead>
                            <TableHead>Total Qty</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Sold</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Price Tiers</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((ticketType) => {
                            const available = ticketType.quantityTotal !== null
                              ? ticketType.quantityTotal - ticketType.quantitySold
                              : null;

                            return (
                              <TableRow key={ticketType.id}>
                                <TableCell className="font-medium">{ticketType.name}</TableCell>
                                <TableCell>{formatPhp(ticketType.basePrice)}</TableCell>
                                <TableCell>
                                  {ticketType.quantityTotal ?? <span className="text-muted-foreground">Unlimited</span>}
                                </TableCell>
                                <TableCell>
                                  {available !== null ? available : <span className="text-muted-foreground">Unlimited</span>}
                                </TableCell>
                                <TableCell>{ticketType.quantitySold}</TableCell>
                                <TableCell>{getStatusBadge(ticketType)}</TableCell>
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
                                      onClick={() => handleToggleStatus(ticketType.id, ticketType.status)}
                                      disabled={isPending}
                                      title={ticketType.status === 'HIDDEN' ? 'Show ticket type' : 'Hide ticket type'}
                                    >
                                      {ticketType.status === 'HIDDEN' ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
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
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
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
