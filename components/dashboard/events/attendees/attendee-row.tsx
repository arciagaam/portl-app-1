'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, RotateCcw, Printer, Loader2 } from 'lucide-react';
import type { Attendee } from './types';

interface AttendeeRowProps {
  attendee: Attendee;
  isLoading: boolean;
  onCheckIn: (ticketCode: string, ticketId: string) => void;
  onUndoCheckIn: (ticketId: string) => void;
  onPrint: (attendee: Attendee) => void;
}

function formatDate(date: Date | string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AttendeeRow({
  attendee,
  isLoading,
  onCheckIn,
  onUndoCheckIn,
  onPrint,
}: AttendeeRowProps) {
  const name =
    [attendee.holderFirstName, attendee.holderLastName]
      .filter(Boolean)
      .join(' ') ||
    [attendee.order.user.firstName, attendee.order.user.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Guest';
  const email = attendee.holderEmail || attendee.order.user.email;
  const isCheckedIn = attendee.status === 'CHECKED_IN';

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="py-3 px-2 font-mono text-xs">
        {attendee.ticketCode}
      </td>
      <td className="py-3 px-2">{name}</td>
      <td className="py-3 px-2 text-muted-foreground">
        {email}
      </td>
      <td className="py-3 px-2">
        <Badge variant="outline" className="text-xs">
          {attendee.ticketType?.name ?? 'Unknown'}
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
              onClick={() => onUndoCheckIn(attendee.id)}
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
              onClick={() => onCheckIn(attendee.ticketCode, attendee.id)}
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
            onClick={() => onPrint(attendee)}
            title="Print ticket"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
