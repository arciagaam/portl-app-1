'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Tag, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatPhp } from '@/lib/format';
import { TicketTypeStatusBadge } from './ticket-type-status-badge';
import type { TicketType } from './types';

interface TicketTypeListProps {
  items: TicketType[];
  onEdit: (ticketTypeId: string) => void;
  onOpenPriceTiers: (ticketTypeId: string) => void;
  onToggleStatus: (ticketTypeId: string, currentStatus: string) => void;
  onDelete: (ticketTypeId: string) => void;
  isPending: boolean;
  isDeleting: string | null;
}

export function TicketTypeList({
  items,
  onEdit,
  onOpenPriceTiers,
  onToggleStatus,
  onDelete,
  isPending,
  isDeleting,
}: TicketTypeListProps) {
  return (
    <div className="border">
      <div className="p-0">
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
                  <TableCell>
                    <TicketTypeStatusBadge
                      status={ticketType.status}
                      quantityTotal={ticketType.quantityTotal}
                      quantitySold={ticketType.quantitySold}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => onOpenPriceTiers(ticketType.id)}
                    >
                      {ticketType.priceTiers.length} tier{ticketType.priceTiers.length !== 1 ? 's' : ''}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(ticketType.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenPriceTiers(ticketType.id)}
                      >
                        <Tag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleStatus(ticketType.id, ticketType.status)}
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
                        onClick={() => onDelete(ticketType.id)}
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
    </div>
  );
}
