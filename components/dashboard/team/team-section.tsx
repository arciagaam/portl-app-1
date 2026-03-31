'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, Mail, Trash2, Clock } from 'lucide-react';
import { removeTeamMemberAction, revokeInvitationAction } from '@/app/actions/tenant-members';
import { assignRoleToMemberAction, removeRoleFromMemberAction } from '@/app/actions/tenant-roles';
import { InviteMemberForm } from './invite-member-form';
import { EditMemberForm } from './edit-member-form';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TenantRoleInfo {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  isOwnerRole: boolean;
  position: number;
}

interface MemberRoleInfo {
  id: string;
  role: TenantRoleInfo;
}

interface Member {
  id: string;
  title: string | null;
  userShowInProfile: boolean;
  tenantShowInProfile: boolean;
  createdAt: Date;
  memberRoles: MemberRoleInfo[];
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  roleIds: string[];
  roles: { id: string; name: string; color: string }[];
  title: string | null;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface TeamSectionProps {
  members: Member[];
  invitations: Invitation[];
  permissions: string[];
  subdomain: string;
  tenantRoles: { id: string; name: string; color: string }[];
}

export function TeamSection({ members, invitations, permissions, subdomain, tenantRoles }: TeamSectionProps) {
  const router = useRouter();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const canManageTeam = permissions.includes('manage_team');
  const isOwner = members.some((m) =>
    m.memberRoles.some((mr) => mr.role.isOwnerRole) &&
    m.user.id === editingMember?.user.id
  );

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;

    const result = await removeTeamMemberAction(subdomain, memberId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Member removed');
      router.refresh();
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const result = await revokeInvitationAction(subdomain, invitationId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Invitation revoked');
      router.refresh();
    }
  };

  const handleAssignRole = async (memberId: string, roleId: string) => {
    const result = await assignRoleToMemberAction(subdomain, memberId, roleId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Role assigned');
      router.refresh();
    }
  };

  const handleRemoveRole = async (memberId: string, roleId: string) => {
    const result = await removeRoleFromMemberAction(subdomain, memberId, roleId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Role removed');
      router.refresh();
    }
  };

  const formatName = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return email;
  };

  return (
    <div className="space-y-6">
      {/* Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>{members.length} team member{members.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            {canManageTeam && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const name = formatName(member.user.firstName, member.user.lastName, member.user.email);
              const memberIsOwner = member.memberRoles.some((mr) => mr.role.isOwnerRole);
              const canManageMember = canManageTeam && !memberIsOwner;
              const assignedRoleIds = new Set(member.memberRoles.map((mr) => mr.role.id));
              const availableRoles = tenantRoles.filter((r) => !assignedRoleIds.has(r.id));

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {member.title && (
                      <span className="text-xs text-muted-foreground">{member.title}</span>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      {member.memberRoles.map((mr) => (
                        <Badge
                          key={mr.id}
                          style={{
                            backgroundColor: `${mr.role.color}20`,
                            color: mr.role.color,
                            borderColor: `${mr.role.color}40`,
                          }}
                          className="border text-xs"
                        >
                          {mr.role.name}
                        </Badge>
                      ))}
                    </div>
                    {canManageMember && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingMember(member)}>
                            Edit
                          </DropdownMenuItem>
                          {availableRoles.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {availableRoles.map((role) => (
                                <DropdownMenuItem
                                  key={role.id}
                                  onClick={() => handleAssignRole(member.id, role.id)}
                                >
                                  <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: role.color }} />
                                  Add {role.name}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                          {member.memberRoles.filter((mr) => !mr.role.isOwnerRole).length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {member.memberRoles
                                .filter((mr) => !mr.role.isOwnerRole)
                                .map((mr) => (
                                  <DropdownMenuItem
                                    key={mr.id}
                                    onClick={() => handleRemoveRole(member.id, mr.role.id)}
                                    className="text-orange-500"
                                  >
                                    Remove {mr.role.name}
                                  </DropdownMenuItem>
                                ))}
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id, name)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              Pending Invitations
            </CardTitle>
            <CardDescription>{invitations.length} pending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {invitation.title && (
                      <span className="text-xs text-muted-foreground">{invitation.title}</span>
                    )}
                    <div className="flex gap-1">
                      {invitation.roles.map((role) => (
                        <Badge
                          key={role.id}
                          style={{
                            backgroundColor: `${role.color}20`,
                            color: role.color,
                            borderColor: `${role.color}40`,
                          }}
                          className="border text-xs"
                        >
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                    {canManageTeam && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      {canManageTeam && (
        <InviteMemberForm
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          subdomain={subdomain}
          tenantRoles={tenantRoles}
        />
      )}

      {/* Edit Dialog */}
      {editingMember && (
        <EditMemberForm
          open={!!editingMember}
          onOpenChange={(open) => !open && setEditingMember(null)}
          member={editingMember}
          subdomain={subdomain}
        />
      )}
    </div>
  );
}
