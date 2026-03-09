'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PriceTierForm } from './price-tier-form';
import { Plus, Trash2, Clock, Package } from 'lucide-react';
import { TicketType, Prisma } from '@/prisma/generated/prisma/client';
import {
  createPriceTierForTenantAction,
  deletePriceTierForTenantAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { formatPhp } from '@/lib/format';
import { useRouter } from 'next/navigation';
import type { PriceTierFormData } from '@/lib/validations/events';

type TicketTypeWithTiers = TicketType & Prisma.TicketTypeGetPayload<{
  include: {
    priceTiers: true;
  };
}>;

interface PriceTiersSectionProps {
  ticketType: TicketTypeWithTiers;
  tenantSubdomain: string;
}

const strategyLabels = {
  TIME_WINDOW: 'Time Window',
  ALLOCATION: 'Allocation',
};

export function PriceTiersSection({ ticketType, tenantSubdomain }: PriceTiersSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreatePriceTier = async (data: PriceTierFormData) => {
    const result = await createPriceTierForTenantAction(tenantSubdomain, ticketType.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Price tier created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleDeletePriceTier = async (priceTierId: string) => {
    if (!confirm('Are you sure you want to delete this price tier?')) {
      return;
    }
    setIsDeleting(priceTierId);
    const result = await deletePriceTierForTenantAction(tenantSubdomain, priceTierId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Price tier deleted successfully');
      router.refresh();
    }
  };

  // Determine active tier
  const getActiveTier = () => {
    const now = new Date();
    return ticketType.priceTiers.find((tier) => {
      if (tier.strategy === 'TIME_WINDOW' && tier.startsAt && tier.endsAt) {
        return new Date(tier.startsAt) <= now && now <= new Date(tier.endsAt);
      }
      if (tier.strategy === 'ALLOCATION' && tier.allocationTotal) {
        return tier.allocationSold < tier.allocationTotal;
      }
      return false;
    });
  };

  const activeTier = getActiveTier();

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{ticketType.name} - Price Tiers</h3>
          <p className="text-sm text-muted-foreground">
            Manage pricing tiers (e.g., Early Bird, Regular, Door)
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Price Tier</DialogTitle>
              <DialogDescription>
                Create a new price tier for {ticketType.name}
              </DialogDescription>
            </DialogHeader>
            <PriceTierForm
              onSubmit={handleCreatePriceTier}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {ticketType.priceTiers.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-4">
            No price tiers configured. Base price ({formatPhp(ticketType.basePrice)}) will be used.
          </p>
          <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Price Tier
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketType.priceTiers
              .sort((a, b) => b.priority - a.priority)
              .map((tier) => {
                const isActive = activeTier?.id === tier.id;
                return (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.name}</TableCell>
                    <TableCell>{formatPhp(tier.price)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{strategyLabels[tier.strategy]}</Badge>
                    </TableCell>
                    <TableCell>
                      {tier.strategy === 'TIME_WINDOW' && tier.startsAt && tier.endsAt ? (
                        <div className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDateTime(tier.startsAt)} - {formatDateTime(tier.endsAt)}
                        </div>
                      ) : tier.strategy === 'ALLOCATION' && tier.allocationTotal ? (
                        <div className="text-sm flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          {tier.allocationSold}/{tier.allocationTotal} sold
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{tier.priority}</TableCell>
                    <TableCell>
                      {isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePriceTier(tier.id)}
                        disabled={isDeleting === tier.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
