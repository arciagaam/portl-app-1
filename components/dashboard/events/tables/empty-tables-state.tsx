import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';

interface EmptyTablesStateProps {
  onBulkCreate: () => void;
  onAddTable: () => void;
}

export function EmptyTablesState({ onBulkCreate, onAddTable }: EmptyTablesStateProps) {
  return (
    <div className="border border-dashed p-16 text-center">
      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No tables yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Create tables for VIP areas, bottle service, or shared seating.
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={onBulkCreate}>
          <Package className="mr-2 h-4 w-4" />
          Bulk Create
        </Button>
        <Button onClick={onAddTable}>
          <Plus className="mr-2 h-4 w-4" />
          Add Table
        </Button>
      </div>
    </div>
  );
}
