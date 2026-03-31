'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createTenantRoleSchema, type CreateTenantRoleData } from '@/lib/validations/team';
import { createTenantRoleAction, updateTenantRoleAction } from '@/app/actions/tenant-roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  type Permission,
} from '@/lib/permissions';

const PRESET_COLORS = [
  '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6',
  '#10B981', '#F97316', '#EC4899', '#6B7280',
  '#14B8A6', '#6366F1', '#84CC16', '#A855F7',
];

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subdomain: string;
  userPermissions: string[];
  existingRole?: {
    id: string;
    name: string;
    color: string;
    permissions: string[];
  };
}

export function RoleForm({ open, onOpenChange, subdomain, userPermissions, existingRole }: RoleFormProps) {
  const router = useRouter();
  const isEditing = !!existingRole;

  const form = useForm<CreateTenantRoleData>({
    resolver: zodResolver(createTenantRoleSchema),
    defaultValues: {
      name: existingRole?.name ?? '',
      color: existingRole?.color ?? '#6B7280',
      permissions: existingRole?.permissions ?? [],
    },
  });

  const selectedPermissions = form.watch('permissions');
  const selectedColor = form.watch('color');

  const togglePermission = (permission: string) => {
    const current = form.getValues('permissions');
    if (current.includes(permission)) {
      form.setValue('permissions', current.filter((p) => p !== permission), { shouldValidate: true });
    } else {
      form.setValue('permissions', [...current, permission], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateTenantRoleData) => {
    const result = isEditing
      ? await updateTenantRoleAction(subdomain, existingRole.id, data)
      : await createTenantRoleAction(subdomain, data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? 'Role updated' : 'Role created');
    form.reset();
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the role settings and permissions.' : 'Create a new custom role with specific permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Marketing, Bouncer"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue('color', color)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? 'white' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{category}</p>
                <div className="space-y-1.5">
                  {perms.map((perm) => {
                    const hasPerm = userPermissions.includes(perm);
                    return (
                      <label
                        key={perm}
                        className="flex items-center gap-3 p-1.5 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedPermissions.includes(perm)}
                          onCheckedChange={() => togglePermission(perm)}
                          disabled={!hasPerm}
                        />
                        <span className="text-sm">
                          {PERMISSION_LABELS[perm as Permission] || perm}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {form.formState.errors.permissions && (
              <p className="text-sm text-destructive">{form.formState.errors.permissions.message}</p>
            )}
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
              {form.formState.isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Role')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
