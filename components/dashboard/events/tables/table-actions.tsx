'use client';

import { Button } from '@/components/ui/button';
import { Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import type { TableItem } from './types';

interface TableActionsProps {
  table: TableItem;
  isDeleting: boolean;
  isPending: boolean;
  onEdit: (table: TableItem) => void;
  onToggleStatus: (tableId: string, currentStatus: string) => void;
  onDelete: (tableId: string) => void;
}

export function TableActions({
  table,
  isDeleting,
  isPending,
  onEdit,
  onToggleStatus,
  onDelete,
}: TableActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(table)}
        aria-label="Edit table"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggleStatus(table.id, table.status)}
        disabled={isPending}
        title={table.status === 'HIDDEN' ? 'Show table' : 'Hide table'}
        aria-label={table.status === 'HIDDEN' ? 'Show table' : 'Hide table'}
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
        onClick={() => onDelete(table.id)}
        disabled={isDeleting}
        className="text-destructive hover:text-destructive"
        aria-label="Delete table"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
