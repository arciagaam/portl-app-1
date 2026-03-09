'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Plus, Calendar, MapPin, Clock } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your events for {tenantName}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${tenantSubdomain}/events/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters */}
      {events.length > 0 && (
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="DRAFT">
              Drafts ({statusCounts.DRAFT})
            </TabsTrigger>
            <TabsTrigger value="PUBLISHED">
              Published ({statusCounts.PUBLISHED})
            </TabsTrigger>
            <TabsTrigger value="ARCHIVED">
              Archived ({statusCounts.ARCHIVED})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No events yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              You haven&apos;t created any events. Start by creating your first event.
            </p>
            <Button asChild>
              <Link href={`/dashboard/${tenantSubdomain}/events/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No {statusFilter.toLowerCase()} events found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const statusInfo = statusConfig[event.status];

            return (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">
                        <Link
                          href={`/dashboard/${tenantSubdomain}/events/${event.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {event.name}
                        </Link>
                      </CardTitle>
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDate(event.startDate)} - {formatDate(event.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {event.startTime} - {event.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venueName}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/${tenantSubdomain}/events/${event.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
