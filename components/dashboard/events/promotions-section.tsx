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
import { PromotionForm } from './promotion-form';
import { VoucherCodesSection } from './voucher-codes-section';
import { Plus, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { Event, Prisma } from '@/prisma/generated/prisma/client';
import {
  createPromotionForTenantAction,
  deletePromotionForTenantAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { PromotionFormData } from '@/lib/validations/events';

type EventWithPromotions = Event & Prisma.EventGetPayload<{
  include: {
    promotions: {
      include: {
        voucherCodes: true;
        ticketTypes: true;
      };
    };
    ticketTypes: true;
  };
}>;

interface PromotionsSectionProps {
  event: EventWithPromotions;
  tenantSubdomain: string;
}

const discountTypeLabels = {
  PERCENT: 'Percent',
  FIXED: 'Fixed',
};

const appliesToLabels = {
  ORDER: 'Order',
  ITEM: 'Item',
};

export function PromotionsSection({ event, tenantSubdomain }: PromotionsSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [voucherCodesDialogOpen, setVoucherCodesDialogOpen] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreatePromotion = async (data: PromotionFormData) => {
    const result = await createPromotionForTenantAction(tenantSubdomain, event.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Promotion created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('Are you sure you want to delete this promotion? This will also delete all voucher codes.')) {
      return;
    }
    setIsDeleting(promotionId);
    const result = await deletePromotionForTenantAction(tenantSubdomain, promotionId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Promotion deleted successfully');
      router.refresh();
    }
  };

  const formatDiscount = (promotion: EventWithPromotions['promotions'][0]) => {
    if (promotion.discountType === 'PERCENT') {
      return `${promotion.discountValue / 100}%`;
    }
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(promotion.discountValue);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isPromotionActive = (promotion: EventWithPromotions['promotions'][0]) => {
    const now = new Date();
    return new Date(promotion.validFrom) <= now && now <= new Date(promotion.validUntil);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Promotions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage promotions and voucher codes for this event
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Promotion</DialogTitle>
              <DialogDescription>
                Create a new promotion with discount rules
              </DialogDescription>
            </DialogHeader>
            <PromotionForm
              ticketTypes={event.ticketTypes}
              onSubmit={handleCreatePromotion}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {event.promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No promotions yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Create promotions with percentage or fixed discounts, and generate voucher codes.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Promotions</CardTitle>
            <CardDescription>
              {event.promotions.length} promotion{event.promotions.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Codes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.promotions.map((promotion) => {
                  const active = isPromotionActive(promotion);
                  return (
                    <TableRow key={promotion.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{promotion.name}</span>
                          {promotion.requiresCode && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Code Required
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {promotion.discountType === 'PERCENT' ? (
                            <Percent className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                          )}
                          {formatDiscount(promotion)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{appliesToLabels[promotion.appliesTo]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(promotion.validFrom)} - {formatDate(promotion.validUntil)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => setVoucherCodesDialogOpen(promotion.id)}
                        >
                          {promotion.voucherCodes.length} code{promotion.voucherCodes.length !== 1 ? 's' : ''}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoucherCodesDialogOpen(promotion.id)}
                          >
                            <Tag className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePromotion(promotion.id)}
                            disabled={isDeleting === promotion.id}
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

      {/* Voucher Codes Dialog */}
      {voucherCodesDialogOpen && (
        <Dialog
          open={!!voucherCodesDialogOpen}
          onOpenChange={(open) => !open && setVoucherCodesDialogOpen(null)}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Voucher Codes</DialogTitle>
              <DialogDescription>
                Manage voucher codes for this promotion
              </DialogDescription>
            </DialogHeader>
            {event.promotions.find((p) => p.id === voucherCodesDialogOpen) && (
              <VoucherCodesSection
                promotion={event.promotions.find((p) => p.id === voucherCodesDialogOpen)!}
                tenantSubdomain={tenantSubdomain}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
