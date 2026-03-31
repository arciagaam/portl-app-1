'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Building2 } from 'lucide-react';
import { toggleMemberProfileVisibilityAction } from '@/app/actions/tenant-members';
import { toast } from 'sonner';

interface Affiliation {
  id: string;
  title: string | null;
  userShowInProfile: boolean;
  memberRoles: {
    role: {
      name: string;
      color: string;
    };
  }[];
  tenant: {
    name: string;
    subdomain: string;
  };
}

interface AffiliationsSectionProps {
  affiliations: Affiliation[];
}

export function AffiliationsSection({ affiliations }: AffiliationsSectionProps) {
  const router = useRouter();

  const handleToggleVisibility = async (memberId: string, visible: boolean) => {
    const result = await toggleMemberProfileVisibilityAction(memberId, visible);
    if (result.error) {
      toast.error(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">My Affiliations</CardTitle>
            <CardDescription>Teams and organizations you belong to</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {affiliations.map((affiliation) => (
            <div
              key={affiliation.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{affiliation.tenant.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {affiliation.tenant.subdomain}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {affiliation.title && (
                  <span className="text-xs text-muted-foreground">{affiliation.title}</span>
                )}
                <div className="flex gap-1">
                  {affiliation.memberRoles.map((mr, i) => (
                    <Badge
                      key={i}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show on profile</span>
                  <Switch
                    checked={affiliation.userShowInProfile}
                    onCheckedChange={(checked) =>
                      handleToggleVisibility(affiliation.id, checked)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
