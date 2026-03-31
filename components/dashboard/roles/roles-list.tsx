'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Pencil, Users, Lock } from 'lucide-react';
import { deleteTenantRoleAction } from '@/app/actions/tenant-roles';
import { RoleForm } from './role-form';
import { toast } from 'sonner';
import { PERMISSION_LABELS, type Permission } from '@/lib/permissions';

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  isDefault: boolean;
  isOwnerRole: boolean;
  _count: { members: number };
}

interface RolesListProps {
  roles: Role[];
  subdomain: string;
  permissions: string[];
}

export function RolesList({ roles, subdomain, permissions }: RolesListProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`Delete the "${roleName}" role? Members with this role will lose it.`)) return;

    const result = await deleteTenantRoleAction(subdomain, roleId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Role deleted');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>{roles.length} role{roles.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roles.map((role) => {
              const canEdit = !role.isOwnerRole;
              const canDelete = !role.isOwnerRole && !role.isDefault;

              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{role.name}</span>
                        {role.isOwnerRole && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                        {role.isDefault && !role.isOwnerRole && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {role._count.members} member{role._count.members !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {role.isOwnerRole
                            ? 'All permissions'
                            : role.permissions
                                .map((p) => PERMISSION_LABELS[p as Permission] || p)
                                .join(', ')
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role.id, role.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <RoleForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        subdomain={subdomain}
        userPermissions={permissions}
      />

      {/* Edit Role Dialog */}
      {editingRole && (
        <RoleForm
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          subdomain={subdomain}
          userPermissions={permissions}
          existingRole={editingRole}
        />
      )}
    </div>
  );
}
