'use client';

import { useState, useCallback, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrScanner } from './qr-scanner';
import {
  checkInTicketAction,
  undoCheckInAction,
} from '@/app/actions/tenant-events';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  RotateCcw,
  Printer,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Attendee {
  id: string;
  ticketCode: string;
  status: string;
  checkedInAt: Date | string | null;
  holderFirstName: string | null;
  holderLastName: string | null;
  holderEmail: string | null;
  ticketType: { id: string; name: string; kind: string };
  order: {
    orderNumber: string;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  };
}

interface AttendeesSectionProps {
  attendees: Attendee[];
  stats: {
    total: number;
    checkedIn: number;
    remaining: number;
  };
  tenantSubdomain: string;
  eventName: string;
}

type StatusFilter = 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN';

export function AttendeesSection({
  attendees: initialAttendees,
  stats: initialStats,
  tenantSubdomain,
  eventName,
}: AttendeesSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);

  // Use initial data from server; router.refresh() will update after mutations
  const attendees = initialAttendees;
  const stats = initialStats;

  const handleCheckIn = useCallback(
    async (ticketCode: string) => {
      const result = await checkInTicketAction(tenantSubdomain, ticketCode);

      if ('error' in result) {
        return { success: false, message: result.error };
      }

      startTransition(() => {
        router.refresh();
      });

      return {
        success: true,
        message: `Checked in: ${result.data!.attendeeName}`,
        attendeeName: result.data!.attendeeName,
        ticketType: result.data!.ticketType,
      };
    },
    [tenantSubdomain, router]
  );

  const handleUndoCheckIn = async (ticketId: string) => {
    setLoadingTicketId(ticketId);
    const result = await undoCheckInAction(tenantSubdomain, ticketId);
    setLoadingTicketId(null);

    if (!('error' in result)) {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleRowCheckIn = async (ticketCode: string, ticketId: string) => {
    setLoadingTicketId(ticketId);
    await checkInTicketAction(tenantSubdomain, ticketCode);
    setLoadingTicketId(null);
    startTransition(() => {
      router.refresh();
    });
  };

  const handlePrintTicket = (attendee: Attendee) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const name = [attendee.holderFirstName, attendee.holderLastName]
      .filter(Boolean)
      .join(' ') || 'Guest';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${attendee.ticketCode}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; }
          .ticket-code { font-family: monospace; font-size: 18px; font-weight: bold; margin: 16px 0; }
          .event-name { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
          .info { color: #666; margin: 4px 0; }
          .qr { margin: 24px auto; }
          .divider { border-top: 1px dashed #ccc; margin: 24px 0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="event-name">${eventName}</div>
        <div class="divider"></div>
        <div class="info" style="font-size: 16px; font-weight: 600;">${name}</div>
        <div class="info">${attendee.holderEmail || attendee.order.user.email}</div>
        <div class="info">${attendee.ticketType.name}</div>
        <div class="divider"></div>
        <div class="qr" id="qr-container"></div>
        <div class="ticket-code">${attendee.ticketCode}</div>
        <div class="info">Status: ${attendee.status}</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredAttendees = attendees.filter((a) => {
    // Status filter
    if (statusFilter === 'CHECKED_IN' && a.status !== 'CHECKED_IN') return false;
    if (statusFilter === 'NOT_CHECKED_IN' && a.status === 'CHECKED_IN') return false;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = [a.holderFirstName, a.holderLastName].filter(Boolean).join(' ').toLowerCase();
      const email = (a.holderEmail || a.order.user.email).toLowerCase();
      const code = a.ticketCode.toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !code.includes(q)) return false;
    }

    return true;
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.checkedIn}</div>
            {stats.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.checkedIn / stats.total) * 100)}% of total
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Yet Checked In</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.remaining}</div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner */}
      <QrScanner onCheckIn={handleCheckIn} />

      {/* Attendee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ticket code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(['ALL', 'CHECKED_IN', 'NOT_CHECKED_IN'] as StatusFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === 'ALL' && 'All'}
                  {filter === 'CHECKED_IN' && 'Checked In'}
                  {filter === 'NOT_CHECKED_IN' && 'Not Checked In'}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filteredAttendees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>{attendees.length === 0 ? 'No attendees yet for this event.' : 'No attendees match your filter.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Ticket Code</th>
                    <th className="text-left py-3 px-2 font-medium">Attendee</th>
                    <th className="text-left py-3 px-2 font-medium">Email</th>
                    <th className="text-left py-3 px-2 font-medium">Ticket Type</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Checked In At</th>
                    <th className="text-right py-3 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((attendee) => {
                    const name =
                      [attendee.holderFirstName, attendee.holderLastName]
                        .filter(Boolean)
                        .join(' ') ||
                      [attendee.order.user.firstName, attendee.order.user.lastName]
                        .filter(Boolean)
                        .join(' ') ||
                      'Guest';
                    const email =
                      attendee.holderEmail || attendee.order.user.email;
                    const isCheckedIn = attendee.status === 'CHECKED_IN';
                    const isLoading = loadingTicketId === attendee.id;

                    return (
                      <tr key={attendee.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-mono text-xs">
                          {attendee.ticketCode}
                        </td>
                        <td className="py-3 px-2">{name}</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {email}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-xs">
                            {attendee.ticketType.name}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={isCheckedIn ? 'default' : 'secondary'}
                            className={`text-xs ${isCheckedIn ? 'bg-blue-600' : ''}`}
                          >
                            {isCheckedIn ? 'Checked In' : 'Active'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">
                          {formatDate(attendee.checkedInAt)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-end gap-1">
                            {isCheckedIn ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleUndoCheckIn(attendee.id)}
                                title="Undo check-in"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isLoading || attendee.status !== 'ACTIVE'}
                                onClick={() =>
                                  handleRowCheckIn(attendee.ticketCode, attendee.id)
                                }
                                title="Check in"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintTicket(attendee)}
                              title="Print ticket"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredAttendees.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              Showing {filteredAttendees.length} of {attendees.length} attendees
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
