'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { QrScanner } from '../qr-scanner';
import {
  checkInTicketAction,
  undoCheckInAction,
} from '@/app/actions/tenant-events';
import { StatsCards } from './stats-cards';
import { AttendeeTable } from './attendee-table';
import type { Attendee, AttendeeStats, StatusFilter } from './types';

interface AttendeesSectionProps {
  attendees: Attendee[];
  stats: AttendeeStats;
  tenantSubdomain: string;
  eventName: string;
}

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
        return { success: false, message: result.error || 'Check-in failed' };
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
        <div class="info">${attendee.ticketType?.name ?? 'Unknown'}</div>
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

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />

      <QrScanner onCheckIn={handleCheckIn} />

      <AttendeeTable
        attendees={attendees}
        filteredAttendees={filteredAttendees}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        loadingTicketId={loadingTicketId}
        onRowCheckIn={handleRowCheckIn}
        onUndoCheckIn={handleUndoCheckIn}
        onPrint={handlePrintTicket}
      />
    </div>
  );
}
