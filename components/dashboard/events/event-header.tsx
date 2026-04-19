'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Edit, MoreVertical, Globe, Archive, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Event } from '@/prisma/generated/prisma/client';
import { tenantUrl } from '@/lib/url';
import { publishEventForTenantAction, archiveEventForTenantAction } from '@/app/actions/tenant-events';

interface EventHeaderProps {
  event: Event;
  tenantSubdomain: string;
}

const statusConfig = {
  DRAFT: { label: 'Draft', variant: 'secondary' as const },
  PUBLISHED: { label: 'Published', variant: 'default' as const },
  ARCHIVED: { label: 'Archived', variant: 'outline' as const },
};

export function EventHeader({ event, tenantSubdomain }: EventHeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const statusInfo = statusConfig[event.status];

  const handlePublish = async () => {
    setIsLoading(true);
    const result = await publishEventForTenantAction(tenantSubdomain, event.id);
    setIsLoading(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Event published successfully');
      router.refresh();
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    const result = await archiveEventForTenantAction(tenantSubdomain, event.id);
    setIsLoading(false);
    setShowArchiveConfirm(false);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      toast.success('Event archived successfully');
      router.refresh();
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{event.venueName}</span>
          <span className="text-border">|</span>
          <span>{formatDate(event.startDate)}</span>
          <span className="text-border">|</span>
          <span>{event.startTime}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {event.status === 'DRAFT' && (
          <Button onClick={handlePublish} disabled={isLoading} size="lg">
            <Globe className="mr-2 h-4 w-4" />
            Publish
          </Button>
        )}

        {event.status === 'PUBLISHED' && (
          <Button variant="outline" asChild>
            <a href={tenantUrl(tenantSubdomain, `/events/${event.id}`)} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" />
              View Live
            </a>
          </Button>
        )}

        <Button variant="outline" asChild>
          <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isLoading}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {event.status !== 'ARCHIVED' && (
              <DropdownMenuItem
                onClick={() => setShowArchiveConfirm(true)}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Event
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmationDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive event"
        description="Are you sure you want to archive this event? It will be hidden from the public."
        confirmLabel="Archive"
        variant="destructive"
        loading={isLoading}
        onConfirm={handleArchive}
      />
    </div>
  );
}
