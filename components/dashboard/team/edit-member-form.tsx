'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { updateMemberSchema, type UpdateMemberData } from '@/lib/validations/team';
import { updateTeamMemberAction } from '@/app/actions/tenant-members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface EditMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    title: string | null;
    tenantShowInProfile: boolean;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  };
  subdomain: string;
}

export function EditMemberForm({ open, onOpenChange, member, subdomain }: EditMemberFormProps) {
  const router = useRouter();

  const memberName = member.user.firstName && member.user.lastName
    ? `${member.user.firstName} ${member.user.lastName}`
    : member.user.email;

  const form = useForm<UpdateMemberData>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      title: member.title ?? '',
      tenantShowInProfile: member.tenantShowInProfile,
    },
  });

  const onSubmit = async (data: UpdateMemberData) => {
    const result = await updateTeamMemberAction(subdomain, member.id, data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Member updated');
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update {memberName}&apos;s details. Use the role dropdown menu to manage role assignments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Resident DJ, Event Manager"
              value={form.watch('title') ?? ''}
              onChange={(e) => form.setValue('title', e.target.value || null)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="visibility">Show on public profile</Label>
              <p className="text-xs text-muted-foreground">Display this member on the tenant&apos;s public page</p>
            </div>
            <Switch
              id="visibility"
              checked={form.watch('tenantShowInProfile')}
              onCheckedChange={(checked) => form.setValue('tenantShowInProfile', checked)}
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
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
