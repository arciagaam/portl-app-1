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
import { TableForm } from './table-form';
import { BulkTableForm } from './bulk-table-form';
import { Plus, Package, Trash2, RefreshCw, Edit } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import {
  createTableForTenantAction,
  bulkCreateTablesForTenantAction,
  deleteTableForTenantAction,
  updateTableForTenantAction,
  regenerateSeatsForTenantAction,
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

export function TablesSection({ event, tenantSubdomain }: TablesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<typeof event.tables[0] | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

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
        <Card>
          <CardHeader>
            <CardTitle>All Tables</CardTitle>
            <CardDescription>
              {event.tables.length} table{event.tables.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Min Spend</TableHead>
                  <TableHead>Ticket Types</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.label}</TableCell>
                    <TableCell>
                      <Badge variant={table.mode === 'EXCLUSIVE' ? 'default' : 'secondary'}>
                        {table.mode === 'EXCLUSIVE' ? 'Exclusive' : 'Shared'}
                      </Badge>
                    </TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>{table.seats.length} seats</TableCell>
                    <TableCell>
                      {table.minSpend ? formatPhp(table.minSpend) : '—'}
                    </TableCell>
                    <TableCell>{table._count.ticketTypes}</TableCell>
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
                          onClick={() => handleDeleteTable(table.id)}
                          disabled={isDeleting === table.id}
                          className="text-destructive hover:text-destructive"
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
