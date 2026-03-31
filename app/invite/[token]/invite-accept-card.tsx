'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitationAction } from '@/app/actions/invitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface InviteAcceptCardProps {
  token: string;
  invitation: {
    email: string;
    roles: { id: string; name: string; color: string }[];
    title: string | null;
    tenantName: string;
    tenantSubdomain: string;
    inviterName: string;
  };
  userEmail: string;
}

export function InviteAcceptCard({ token, invitation, userEmail }: InviteAcceptCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    const result = await acceptInvitationAction(token);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data?.alreadyMember) {
      toast.info('You are already a member of this team');
    } else {
      toast.success(`You have joined ${invitation.tenantName}!`);
    }

    router.push(`/dashboard/${invitation.tenantSubdomain}`);
  };

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <CardTitle className="text-xl">Join {invitation.tenantName}</CardTitle>
        <CardDescription>
          {invitation.inviterName} has invited you to join as{' '}
          {invitation.roles.map((role) => (
            <Badge
              key={role.id}
              style={{
                backgroundColor: `${role.color}20`,
                color: role.color,
                borderColor: `${role.color}40`,
              }}
              className="border text-xs ml-1"
            >
              {role.name}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitation.title && (
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="text-sm font-medium">{invitation.title}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium">{userEmail}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleAccept}
          disabled={isLoading}
          className="w-full"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {isLoading ? 'Accepting...' : 'Accept Invitation'}
        </Button>
      </CardFooter>
    </Card>
  );
}
