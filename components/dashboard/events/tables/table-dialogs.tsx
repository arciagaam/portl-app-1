'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TableForm } from '../table-form';
import { BulkTableForm } from '../bulk-table-form';
import { CreateTableStepper } from '@/components/shared/create-table-stepper';
import { Plus, Package } from 'lucide-react';
import type { TableItem } from './types';
import type { TableFormData, TableWithPromotionFormData } from '@/lib/validations/events';
import type { bulkCreateTablesForTenantAction } from '@/app/actions/tenant-events';

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TableWithPromotionFormData) => Promise<void>;
}

export function CreateTableDialog({ open, onOpenChange, onSubmit }: CreateTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Table
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Table</DialogTitle>
          <DialogDescription>
            Add a new table to this event
          </DialogDescription>
        </DialogHeader>
        <CreateTableStepper
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface BulkCreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Parameters<typeof bulkCreateTablesForTenantAction>[2]) => Promise<{ error: string } | { data: unknown }>;
}

export function BulkCreateTableDialog({ open, onOpenChange, onSubmit }: BulkCreateTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditTableDialogProps {
  editingTable: TableItem | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TableFormData) => Promise<void>;
}

export function EditTableDialog({ editingTable, onOpenChange, onSubmit }: EditTableDialogProps) {
  return (
    <Dialog open={!!editingTable} onOpenChange={(open) => !open && onOpenChange(false)}>
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
              description: editingTable.description ?? undefined,
              imageUrl: editingTable.imageUrl ?? undefined,
              capacity: editingTable.capacity,
              ticketPrice: editingTable.ticketPrice,
              requirementType: editingTable.requirementType ?? undefined,
              minSpend: editingTable.minSpend ?? undefined,
              bottleCount: editingTable.bottleCount ?? undefined,
              transferrable: editingTable.transferrable,
              cancellable: editingTable.cancellable,
              notes: editingTable.notes ?? undefined,
            }}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            isEdit
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
