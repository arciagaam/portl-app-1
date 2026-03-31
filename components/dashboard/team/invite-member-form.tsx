'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { inviteMemberSchema, type InviteMemberData } from '@/lib/validations/team';
import { inviteTeamMemberAction } from '@/app/actions/tenant-members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface InviteMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subdomain: string;
  tenantRoles: { id: string; name: string; color: string }[];
}

export function InviteMemberForm({ open, onOpenChange, subdomain, tenantRoles }: InviteMemberFormProps) {
  const router = useRouter();

  const form = useForm<InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      roleIds: [],
      title: '',
    },
  });

  const selectedRoleIds = form.watch('roleIds');

  const toggleRole = (roleId: string) => {
    const current = form.getValues('roleIds');
    if (current.includes(roleId)) {
      form.setValue('roleIds', current.filter((id) => id !== roleId), { shouldValidate: true });
    } else {
      form.setValue('roleIds', [...current, roleId], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: InviteMemberData) => {
    const result = await inviteTeamMemberAction(subdomain, data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Invitation sent to ${data.email}`);
    form.reset();
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add someone to your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="space-y-2">
              {tenantRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <Badge
                    style={{
                      backgroundColor: `${role.color}20`,
                      color: role.color,
                      borderColor: `${role.color}40`,
                    }}
                    className="border text-xs"
                  >
                    {role.name}
                  </Badge>
                </label>
              ))}
            </div>
            {form.formState.errors.roleIds && (
              <p className="text-sm text-destructive">{form.formState.errors.roleIds.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g. Resident DJ, Event Manager"
              {...form.register('title')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
