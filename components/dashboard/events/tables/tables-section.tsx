'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createTableWithPromotionForTenantAction,
  bulkCreateTablesForTenantAction,
  deleteTableForTenantAction,
  updateTableForTenantAction,
  updateTableStatusForTenantAction,
} from '@/app/actions/tenant-events';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { TableFormData, TableWithPromotionFormData } from '@/lib/validations/events';
import type { TablesSectionProps, TableItem } from './types';
import { groupTablesByRequirementType, getSortedGroupNames } from './table-utils';
import { CreateTableDialog, BulkCreateTableDialog, EditTableDialog } from './table-dialogs';
import { EmptyTablesState } from './empty-tables-state';
import { TableGroup } from './table-group';

export function TablesSection({ event, tenantSubdomain }: TablesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groupMap = groupTablesByRequirementType(event.tables);
  const groupNames = getSortedGroupNames(groupMap);

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groupNames));

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateTable = async (data: TableWithPromotionFormData) => {
    const result = await createTableWithPromotionForTenantAction(tenantSubdomain, event.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success(data.promotion ? 'Table and promotion created' : 'Table created successfully');
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
    setIsDeleting(tableId);
    const result = await deleteTableForTenantAction(tenantSubdomain, tableId);
    setIsDeleting(null);
    setDeleteTarget(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Table deleted successfully');
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
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">Management</p>
          <h2 className="text-2xl font-semibold tracking-tight">Tables</h2>
        </div>
        <div className="flex gap-2">
          <BulkCreateTableDialog
            open={bulkDialogOpen}
            onOpenChange={setBulkDialogOpen}
            onSubmit={handleBulkCreate}
          />
          <CreateTableDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSubmit={handleCreateTable}
          />
        </div>
      </div>

      {event.tables.length === 0 ? (
        <EmptyTablesState
          onBulkCreate={() => setBulkDialogOpen(true)}
          onAddTable={() => setCreateDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {groupNames.map((groupName) => (
            <TableGroup
              key={groupName}
              groupName={groupName}
              tables={groupMap.get(groupName)!}
              isOpen={openGroups.has(groupName)}
              onToggle={() => toggleGroup(groupName)}
              isDeleting={isDeleting}
              isPending={isPending}
              onEdit={setEditingTable}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete table"
        description="Are you sure you want to delete this table? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={!!isDeleting}
        onConfirm={() => deleteTarget && handleDeleteTable(deleteTarget)}
      />

      <EditTableDialog
        editingTable={editingTable}
        onOpenChange={() => setEditingTable(null)}
        onSubmit={handleUpdateTable}
      />
    </div>
  );
}
