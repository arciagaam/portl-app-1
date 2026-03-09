'use client';

import { useState } from 'react';
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
import { VoucherCodeForm } from './voucher-code-form';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Promotion, Prisma } from '@/prisma/generated/prisma/client';
import {
  createVoucherCodeForTenantAction,
  deleteVoucherCodeForTenantAction,
} from '@/app/actions/tenant-events';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { VoucherCodeFormData } from '@/lib/validations/events';

type PromotionWithCodes = Promotion & Prisma.PromotionGetPayload<{
  include: {
    voucherCodes: true;
  };
}>;

interface VoucherCodesSectionProps {
  promotion: PromotionWithCodes;
  tenantSubdomain: string;
}

export function VoucherCodesSection({ promotion, tenantSubdomain }: VoucherCodesSectionProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreateVoucherCode = async (data: VoucherCodeFormData) => {
    const result = await createVoucherCodeForTenantAction(tenantSubdomain, promotion.id, data);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Voucher code created successfully');
      setCreateDialogOpen(false);
      router.refresh();
    }
  };

  const handleDeleteVoucherCode = async (voucherCodeId: string) => {
    if (!confirm('Are you sure you want to delete this voucher code?')) {
      return;
    }
    setIsDeleting(voucherCodeId);
    const result = await deleteVoucherCodeForTenantAction(tenantSubdomain, voucherCodeId);
    setIsDeleting(null);
    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Voucher code deleted successfully');
      router.refresh();
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{promotion.name} - Voucher Codes</h3>
          <p className="text-sm text-muted-foreground">
            Manage voucher codes for this promotion
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Voucher Code</DialogTitle>
              <DialogDescription>
                Create a new voucher code for {promotion.name}
              </DialogDescription>
            </DialogHeader>
            <VoucherCodeForm
              onSubmit={handleCreateVoucherCode}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {promotion.voucherCodes.length === 0 ? (
        <div className="border rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-4">
            No voucher codes created yet.
          </p>
          <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Voucher Code
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Max</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotion.voucherCodes.map((code) => {
              const isExhausted = code.maxRedemptions
                ? code.redeemedCount >= code.maxRedemptions
                : false;
              return (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{code.code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopyCode(code.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{code.redeemedCount}</TableCell>
                  <TableCell>
                    {code.maxRedemptions ? code.maxRedemptions : 'Unlimited'}
                  </TableCell>
                  <TableCell>
                    {isExhausted ? (
                      <Badge variant="destructive">Exhausted</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVoucherCode(code.id)}
                      disabled={isDeleting === code.id}
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
