'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, Calendar, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type EventListItem = {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  venueName: string;
};

interface EventsListProps {
  events: EventListItem[];
  tenantSubdomain: string;
  tenantName: string;
}

const statusConfig = {
  DRAFT: { label: 'Draft', variant: 'secondary' as const },
  PUBLISHED: { label: 'Published', variant: 'default' as const },
  ARCHIVED: { label: 'Archived', variant: 'outline' as const },
};

type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export function EventsList({ events, tenantSubdomain, tenantName }: EventsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter((event) => event.status === statusFilter);

  const statusCounts = {
    all: events.length,
    DRAFT: events.filter((e) => e.status === 'DRAFT').length,
    PUBLISHED: events.filter((e) => e.status === 'PUBLISHED').length,
    ARCHIVED: events.filter((e) => e.status === 'ARCHIVED').length,
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            {tenantName}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        </div>
        <Button asChild size="lg">
          <Link href={`/dashboard/${tenantSubdomain}/events/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters */}
      {events.length > 0 && (
        <div className="flex gap-1 border-b">
          {([
            { value: 'all' as const, label: 'All', count: statusCounts.all },
            { value: 'DRAFT' as const, label: 'Drafts', count: statusCounts.DRAFT },
            { value: 'PUBLISHED' as const, label: 'Published', count: statusCounts.PUBLISHED },
            { value: 'ARCHIVED' as const, label: 'Archived', count: statusCounts.ARCHIVED },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                statusFilter === tab.value
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="border border-dashed p-16 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No events yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            You haven&apos;t created any events. Start by creating your first event.
          </p>
          <Button asChild>
            <Link href={`/dashboard/${tenantSubdomain}/events/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Event
            </Link>
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No {statusFilter.toLowerCase()} events found.
          </p>
        </div>
      ) : (
        <div className="divide-y border">
          {filteredEvents.map((event) => {
            const statusInfo = statusConfig[event.status];

            return (
              <div key={event.id} className="p-5 hover:bg-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/dashboard/${tenantSubdomain}/events/${event.id}`}
                        className="text-lg font-semibold hover:underline underline-offset-4 truncate"
                      >
                        {event.name}
                      </Link>
                      <Badge variant={statusInfo.variant} className="shrink-0">{statusInfo.label}</Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(event.startDate)} &ndash; {formatDate(event.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {event.startTime} &ndash; {event.endTime}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.venueName}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}`}>
                        View
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
