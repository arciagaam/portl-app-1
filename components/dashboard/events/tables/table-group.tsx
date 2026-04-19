'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { formatPhp } from '@/lib/format';
import type { TableItem } from './types';
import { TableStatusBadge } from './table-status-badge';
import { TableActions } from './table-actions';

interface TableGroupProps {
  groupName: string;
  tables: TableItem[];
  isOpen: boolean;
  onToggle: () => void;
  isDeleting: string | null;
  isPending: boolean;
  onEdit: (table: TableItem) => void;
  onToggleStatus: (tableId: string, currentStatus: string) => void;
  onDelete: (tableId: string) => void;
}

export function TableGroup({
  groupName,
  tables,
  isOpen,
  onToggle,
  isDeleting,
  isPending,
  onEdit,
  onToggleStatus,
  onDelete,
}: TableGroupProps) {
  const totalSold = tables.reduce((sum, t) => sum + t.quantitySold, 0);
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              <span className="font-medium">{groupName}</span>
              <span className="text-sm text-muted-foreground">
                ({tables.length} table{tables.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground mr-2">
              <span>Capacity: {totalCapacity}</span>
              <span>Available: {tables.length - totalSold}</span>
              <span>Sold: {totalSold}</span>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Ticket Price</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
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
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>{table.quantitySold}</TableCell>
                    <TableCell><TableStatusBadge table={table} /></TableCell>
                    <TableCell>
                      <TableActions
                        table={table}
                        isDeleting={isDeleting === table.id}
                        isPending={isPending}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
