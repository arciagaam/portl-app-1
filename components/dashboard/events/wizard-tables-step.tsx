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
import { TableForm } from '@/components/dashboard/events/table-form';
import { BulkTableForm } from '@/components/dashboard/events/bulk-table-form';
import {
  createTableForTenantAction,
  bulkCreateTablesForTenantAction,
} from '@/app/actions/tenant-events';
import { Plus, Layers, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Table } from '@/prisma/generated/prisma/client';
import type { TableFormData, BulkTableFormData } from '@/lib/validations/events';

interface WizardTablesStepProps {
  tenantSubdomain: string;
  eventId: string;
  tables: Table[];
  onTableCreated: (table: Table) => void;
  onTablesCreated: (tables: Table[]) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export function WizardTablesStep({
  tenantSubdomain,
  eventId,
  tables,
  onTableCreated,
  onTablesCreated,
  onBack,
  onNext,
  onFinish,
}: WizardTablesStepProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const handleCreateTable = async (data: TableFormData) => {
    const result = await createTableForTenantAction(tenantSubdomain, eventId, data);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    onTableCreated(result.data as Table);
    toast.success('Table created');
    setShowAddDialog(false);
  };

  const handleBulkCreate = async (data: BulkTableFormData) => {
    const result = await bulkCreateTablesForTenantAction(tenantSubdomain, eventId, data);
    if ('error' in result) {
      toast.error(result.error);
      return result;
    }
    onTablesCreated(result.data as Table[]);
    toast.success('Tables created');
    setShowBulkDialog(false);
    return result;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Tables & Seats</h3>
        <p className="text-sm text-muted-foreground">
          Optional. Add tables now or later from the event page.
        </p>
      </div>

      <div className="flex gap-2">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Table</DialogTitle>
            </DialogHeader>
            <TableForm
              onSubmit={handleCreateTable}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Layers className="h-4 w-4 mr-1" />
              Bulk Create
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Create Tables</DialogTitle>
            </DialogHeader>
            <BulkTableForm
              onSubmit={handleBulkCreate}
              onCancel={() => setShowBulkDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No tables added yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium">{table.label}</p>
                <p className="text-sm text-muted-foreground">
                  {table.capacity} seats
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={onFinish}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Skip to Finish
          </Button>
          <Button onClick={onNext}>
            Next: Ticket Types
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
