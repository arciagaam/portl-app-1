'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { BulkTableForm } from './bulk-table-form';
import { CreateTableStepper } from '@/components/shared/create-table-stepper';
import { Plus, Package } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import { createTableWithPromotionAction, bulkCreateTablesAction, deleteTableAction } from '@/app/actions/events';
import type { TableWithPromotionFormData } from '@/lib/validations/events';
import { formatPhp } from '@/lib/format';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type EventWithTables = Event & Prisma.EventGetPayload<{
  include: {
    tables: true;
  };
}>;

interface TablesSectionProps {
  event: EventWithTables;
}

export function TablesSection({ event }: TablesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreateTable = async (data: TableWithPromotionFormData) => {
    const result = await createTableWithPromotionAction(event.id, data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(data.promotion ? 'Table and promotion created' : 'Table created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBulkCreate = async (data: any) => {
    const result = await bulkCreateTablesAction(event.id, data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Tables created successfully');
      setBulkDialogOpen(false);
      router.refresh();
    }
    return result;
  };

  const handleDeleteTable = async (tableId: string) => {
    const result = await deleteTableAction(tableId);
    setDeleteTarget(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Table deleted successfully');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Tables</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage table configurations
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
                  Create multiple tables at once (e.g., A1-A10)
                </DialogDescription>
              </DialogHeader>
              <BulkTableForm
                eventId={event.id}
                onSubmit={handleBulkCreate}
                onCancel={() => setBulkDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Table
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Table</DialogTitle>
                <DialogDescription>
                  Add a new table to this event
                </DialogDescription>
              </DialogHeader>
              <CreateTableStepper
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
            <p className="text-muted-foreground mb-4 text-center">
              No tables created yet. Create your first table to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Table
            </Button>
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
                  <TableHead>Capacity</TableHead>
                  <TableHead>Ticket Price</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.label}</TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell>{formatPhp(table.ticketPrice)}</TableCell>
                    <TableCell>
                      {table.requirementType === 'MINIMUM_SPEND' && table.minSpend != null ? (
                        <Badge variant="secondary">Min Spend: {formatPhp(table.minSpend)}</Badge>
                      ) : table.requirementType === 'BOTTLE_REQUIREMENT' && table.bottleCount != null ? (
                        <Badge variant="secondary">{table.bottleCount} bottle{table.bottleCount !== 1 ? 's' : ''}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{table.quantitySold}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{table.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(table.id)}
                      >
                        Delete
                      </Button>
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
        title="Delete table"
        description="Are you sure you want to delete this table? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDeleteTable(deleteTarget)}
      />
    </div>
  );
}
