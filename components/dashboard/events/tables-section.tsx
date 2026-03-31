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
import { TableForm } from './table-form';
import { BulkTableForm } from './bulk-table-form';
import { Plus, Package, Trash2, RefreshCw, Edit, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import {
  createTableForTenantAction,
  bulkCreateTablesForTenantAction,
  deleteTableForTenantAction,
  updateTableForTenantAction,
  regenerateSeatsForTenantAction,
  updateTableStatusForTenantAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatPhp } from '@/lib/format';
import type { TableFormData } from '@/lib/validations/events';

type EventWithTables = Event & Prisma.EventGetPayload<{
  include: {
    tables: {
      include: {
        seats: true;
        ticketTypes: {
          select: {
            id: true;
            name: true;
            quantityTotal: true;
            quantitySold: true;
            status: true;
          };
        };
        _count: {
          select: {
            ticketTypes: true;
          };
        };
      };
    };
  };
}>;

interface TablesSectionProps {
  event: EventWithTables;
  tenantSubdomain: string;
}

type TableItem = EventWithTables['tables'][number];

function getTableStatusBadge(table: TableItem) {
  if (table.status === 'HIDDEN') {
    return <Badge variant="outline">Hidden</Badge>;
  }
  if (table.status === 'CLOSED') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  // Sold out: all associated ticket types are sold out
  if (table.ticketTypes.length > 0) {
    const allSoldOut = table.ticketTypes.every(
      (tt) => tt.quantityTotal !== null && tt.quantitySold >= tt.quantityTotal
    );
    if (allSoldOut) {
      return <Badge variant="destructive">Sold Out</Badge>;
    }
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>;
}

function getTableInventory(table: TableItem) {
  if (table.ticketTypes.length === 0) {
    return { totalQty: null, totalSold: null, totalAvailable: null };
  }
  const totalQty = table.ticketTypes.reduce((sum, tt) => sum + (tt.quantityTotal ?? 0), 0);
  const totalSold = table.ticketTypes.reduce((sum, tt) => sum + tt.quantitySold, 0);
  const hasUnlimited = table.ticketTypes.some((tt) => tt.quantityTotal === null);
  return { totalQty, totalSold, totalAvailable: totalQty - totalSold, hasUnlimited };
}

export function TablesSection({ event, tenantSubdomain }: TablesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Group tables by associated ticket type name
  const groupMap = new Map<string, TableItem[]>();
  for (const table of event.tables) {
    if (table.ticketTypes.length === 0) {
      const list = groupMap.get('Unassigned') ?? [];
      list.push(table);
      groupMap.set('Unassigned', list);
    } else {
      const groupNames = new Set(table.ticketTypes.map((tt) => tt.name));
      for (const name of groupNames) {
        const list = groupMap.get(name) ?? [];
        list.push(table);
        groupMap.set(name, list);
      }
    }
  }

  const groupNames = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groupNames));

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateTable = async (data: TableFormData) => {
    const result = await createTableForTenantAction(tenantSubdomain, event.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Table created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleUpdateTable = async (data: TableFormData) => {
    if (!editingTable) return;
    const result = await updateTableForTenantAction(tenantSubdomain, editingTable.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Table updated successfully');
      setEditingTable(null);
      router.refresh();
    }
  };

  const handleBulkCreate = async (data: Parameters<typeof bulkCreateTablesForTenantAction>[2]) => {
    const result = await bulkCreateTablesForTenantAction(tenantSubdomain, event.id, data);
    if ('error' in result) {
      toast.error(result.error);
      return { error: result.error };
    } else {
      toast.success('Tables created successfully');
      setBulkDialogOpen(false);
      router.refresh();
      return { data: result.data };
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? This will also delete all seats.')) {
      return;
    }
    setIsDeleting(tableId);
    const result = await deleteTableForTenantAction(tenantSubdomain, tableId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Table deleted successfully');
      router.refresh();
    }
  };

  const handleRegenerateSeats = async (tableId: string) => {
    setIsRegenerating(tableId);
    const result = await regenerateSeatsForTenantAction(tenantSubdomain, tableId);
    setIsRegenerating(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Seats regenerated successfully');
      router.refresh();
    }
  };

  const handleToggleStatus = (tableId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'HIDDEN' ? 'OPEN' : 'HIDDEN';
    startTransition(async () => {
      const result = await updateTableStatusForTenantAction(tenantSubdomain, tableId, newStatus);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(newStatus === 'HIDDEN' ? 'Table hidden' : 'Table visible');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tables & Seats</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tables and their seat configurations for this event
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Create Tables</DialogTitle>
                <DialogDescription>
                  Create multiple tables at once (e.g., VIP1 to VIP10)
                </DialogDescription>
              </DialogHeader>
              <BulkTableForm
                onSubmit={handleBulkCreate}
                onCancel={() => setBulkDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Table</DialogTitle>
                <DialogDescription>
                  Add a new table to this event
                </DialogDescription>
              </DialogHeader>
              <TableForm
                onSubmit={handleCreateTable}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {event.tables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tables yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Create tables for VIP areas, bottle service, or shared seating.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                <Package className="mr-2 h-4 w-4" />
                Bulk Create
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Table
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupNames.map((groupName) => {
            const tables = groupMap.get(groupName)!;

            // Aggregate inventory for the group
            let groupTotalQty = 0;
            let groupTotalSold = 0;
            let groupHasUnlimited = false;
            for (const t of tables) {
              const inv = getTableInventory(t);
              if (inv.totalQty !== null) {
                groupTotalQty += inv.totalQty;
                groupTotalSold += inv.totalSold!;
                if (inv.hasUnlimited) groupHasUnlimited = true;
              }
            }

            return (
              <Collapsible key={groupName} open={openGroups.has(groupName)} onOpenChange={() => toggleGroup(groupName)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={`h-4 w-4 transition-transform ${openGroups.has(groupName) ? '' : '-rotate-90'}`} />
                        <span className="font-medium">{groupName}</span>
                        <span className="text-sm text-muted-foreground">
                          ({tables.length} table{tables.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mr-2">
                        {groupTotalQty > 0 || groupHasUnlimited ? (
                          <>
                            <span>Qty: {groupHasUnlimited ? `${groupTotalQty}+` : groupTotalQty}</span>
                            <span>Available: {groupHasUnlimited ? `${groupTotalQty - groupTotalSold}+` : groupTotalQty - groupTotalSold}</span>
                            <span>Sold: {groupTotalSold}</span>
                          </>
                        ) : (
                          <span>No ticket types</span>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Total Qty</TableHead>
                            <TableHead>Available</TableHead>
                            <TableHead>Sold</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tables.map((table) => {
                            const inv = getTableInventory(table);
                            return (
                              <TableRow key={table.id}>
                                <TableCell className="font-medium">{table.label}</TableCell>
                                <TableCell>
                                  <Badge variant={table.mode === 'EXCLUSIVE' ? 'default' : 'secondary'}>
                                    {table.mode === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{table.capacity}</TableCell>
                                <TableCell>
                                  {inv.totalQty !== null ? (inv.hasUnlimited ? `${inv.totalQty}+` : inv.totalQty) : <span className="text-muted-foreground">&mdash;</span>}
                                </TableCell>
                                <TableCell>
                                  {inv.totalAvailable !== null ? (inv.hasUnlimited ? `${inv.totalAvailable}+` : inv.totalAvailable) : <span className="text-muted-foreground">&mdash;</span>}
                                </TableCell>
                                <TableCell>
                                  {inv.totalSold !== null ? inv.totalSold : <span className="text-muted-foreground">&mdash;</span>}
                                </TableCell>
                                <TableCell>{getTableStatusBadge(table)}</TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingTable(table)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRegenerateSeats(table.id)}
                                      disabled={isRegenerating === table.id}
                                    >
                                      <RefreshCw className={`h-4 w-4 ${isRegenerating === table.id ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleToggleStatus(table.id, table.status)}
                                      disabled={isPending}
                                      title={table.status === 'HIDDEN' ? 'Show table' : 'Hide table'}
                                    >
                                      {table.status === 'HIDDEN' ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTable(table.id)}
                                      disabled={isDeleting === table.id}
                                      className="text-destructive hover:text-destructive"
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

      {/* Edit Dialog */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>
              Update table configuration for {editingTable?.label}
            </DialogDescription>
          </DialogHeader>
          {editingTable && (
            <TableForm
              defaultValues={{
                label: editingTable.label,
                capacity: editingTable.capacity,
                mode: editingTable.mode,
                minSpend: editingTable.minSpend ?? undefined,
                notes: editingTable.notes ?? undefined,
              }}
              onSubmit={handleUpdateTable}
              onCancel={() => setEditingTable(null)}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
