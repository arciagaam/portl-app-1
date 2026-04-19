import { Badge } from '@/components/ui/badge';
import type { TableItem } from './types';

export function TableStatusBadge({ table }: { table: TableItem }) {
  if (table.status === 'HIDDEN') {
    return <Badge variant="outline">Hidden</Badge>;
  }
  if (table.status === 'CLOSED') {
    return <Badge variant="secondary">Closed</Badge>;
  }
  // Sold out: table has been sold (quantitySold >= 1)
  if (table.quantitySold > 0) {
    return <Badge variant="destructive">Sold</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>;
}
