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
import { PromoterForm } from './promoter-form';
import { Plus, Trash2, Megaphone, Copy, Check } from 'lucide-react';
import {
  createEventPromoterAction,
  deleteEventPromoterAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { EventPromoterFormData } from '@/lib/validations/events';

interface Promotion {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
}

interface PromoterWithVoucherCode {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  commissionRate: number | null;
  notes: string | null;
  voucherCodeId: string;
  voucherCode: {
    id: string;
    code: string;
    maxRedemptions: number | null;
    redeemedCount: number;
    promotion: {
      id: string;
      name: string;
      discountType: string;
      discountValue: number;
    };
  };
}

interface PromoterStats {
  promoterId: string;
  orders: number;
  tickets: number;
  revenue: number;
}

interface PromotersSectionProps {
  eventId: string;
  tenantSubdomain: string;
  promoters: PromoterWithVoucherCode[];
  stats: PromoterStats[];
  promotions: Promotion[];
}

const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
});

export function PromotersSection({
  eventId,
  tenantSubdomain,
  promoters,
  stats,
  promotions,
}: PromotersSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const statsMap = new Map(stats.map((s) => [s.promoterId, s]));

  const handleCreate = async (data: EventPromoterFormData) => {
    const result = await createEventPromoterAction(tenantSubdomain, eventId, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Promoter added successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleDelete = async (promoterId: string) => {
    if (!confirm('Are you sure you want to delete this promoter? Their promo code will also be deleted.')) {
      return;
    }
    setIsDeleting(promoterId);
    const result = await deleteEventPromoterAction(tenantSubdomain, promoterId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Promoter deleted successfully');
      router.refresh();
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatCommission = (rate: number | null, revenue: number) => {
    if (!rate) return '-';
    const amount = (revenue * rate) / 10000;
    return phpFormatter.format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Promoters</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign hosts and promoters with unique promo codes to track their performance
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Promoter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Promoter</DialogTitle>
              <DialogDescription>
                Assign a promoter with a unique promo code linked to an existing promotion
              </DialogDescription>
            </DialogHeader>
            <PromoterForm
              promotions={promotions}
              onSubmit={handleCreate}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {promoters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No promoters yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Add promoters with unique promo codes to track who drives ticket sales for your event.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promoter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Promoters</CardTitle>
            <CardDescription>
              {promoters.length} promoter{promoters.length !== 1 ? 's' : ''} assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Promotion</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoters.map((promoter) => {
                  const s = statsMap.get(promoter.id) || { orders: 0, tickets: 0, revenue: 0 };
                  return (
                    <TableRow key={promoter.id}>
                      <TableCell>
                        <span className="font-medium">{promoter.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {promoter.email && <div>{promoter.email}</div>}
                          {promoter.phone && (
                            <div className="text-muted-foreground">{promoter.phone}</div>
                          )}
                          {!promoter.email && !promoter.phone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {promoter.voucherCode.code}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(promoter.voucherCode.code)}
                          >
                            {copiedCode === promoter.voucherCode.code ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {promoter.voucherCode.maxRedemptions && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {promoter.voucherCode.redeemedCount}/{promoter.voucherCode.maxRedemptions} used
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{promoter.voucherCode.promotion.name}</span>
                      </TableCell>
                      <TableCell className="text-right">{s.orders}</TableCell>
                      <TableCell className="text-right">{s.tickets}</TableCell>
                      <TableCell className="text-right">
                        {phpFormatter.format(s.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          {formatCommission(promoter.commissionRate, s.revenue)}
                        </div>
                        {promoter.commissionRate && (
                          <div className="text-xs text-muted-foreground">
                            {promoter.commissionRate / 100}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(promoter.id)}
                            disabled={isDeleting === promoter.id}
                            className="text-destructive hover:text-destructive"
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
