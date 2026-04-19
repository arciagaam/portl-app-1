'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { BookTableButton } from '@/components/cart/book-table-button';
import type { Table } from '@/prisma/generated/prisma/client';

interface TablesDisplayProps {
  eventId: string;
  tables: Table[];
}

export function TablesDisplay({ eventId, tables }: TablesDisplayProps) {
  if (tables.length === 0) {
    return null;
  }

  const getAvailability = (table: Table): string | null => {
    if (table.quantitySold >= 1) return 'Sold out';
    return null;
  };

  const getRequirementLabel = (table: Table): string | null => {
    if (table.requirementType === 'MINIMUM_SPEND' && table.minSpend) {
      return `PHP ${table.minSpend.toLocaleString()} consumable`;
    }
    if (table.requirementType === 'BOTTLE_REQUIREMENT' && table.bottleCount) {
      return `${table.bottleCount} bottle${table.bottleCount > 1 ? 's' : ''} required`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {tables.map((table) => {
        const availability = getAvailability(table);
        const isSoldOut = availability === 'Sold out';
        const totalTicketPrice = table.capacity * table.ticketPrice;
        const requirementLabel = getRequirementLabel(table);

        return (
          <Card key={table.id} className={isSoldOut ? 'opacity-60' : ''}>
            <CardContent className="py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{table.label}</h3>
                    {requirementLabel && (
                      <span className="text-sm text-muted-foreground">
                        ({requirementLabel})
                      </span>
                    )}
                    {availability && (
                      <Badge variant="outline" className="text-xs">
                        {availability}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ticket className="h-3.5 w-3.5" />
                    <span>incl. {table.capacity}x Tickets</span>
                  </div>
                  {requirementLabel && (
                    <p className="text-xs text-muted-foreground italic">
                      *payable upon entry*
                    </p>
                  )}
                  {table.notes && (
                    <p className="text-sm text-muted-foreground">{table.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      PHP {totalTicketPrice.toLocaleString()}
                    </div>
                  </div>
                  <BookTableButton
                    eventId={eventId}
                    tableId={table.id}
                    tableLabel={table.label}
                    totalPrice={totalTicketPrice}
                    disabled={isSoldOut}
                    disabledReason={isSoldOut ? 'Sold Out' : undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
