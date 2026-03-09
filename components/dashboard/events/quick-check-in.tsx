'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrScanner } from './qr-scanner';
import { checkInTicketAction } from '@/app/actions/tenant-events';
import { UserCheck } from 'lucide-react';
import Link from 'next/link';

interface QuickCheckInProps {
  tenantSubdomain: string;
  eventId: string;
}

export function QuickCheckIn({ tenantSubdomain, eventId }: QuickCheckInProps) {
  const handleCheckIn = useCallback(
    async (ticketCode: string) => {
      const result = await checkInTicketAction(tenantSubdomain, ticketCode);

      if ('error' in result) {
        return { success: false, message: result.error };
      }

      return {
        success: true,
        message: `Checked in: ${result.data!.attendeeName}`,
        attendeeName: result.data!.attendeeName,
        ticketType: result.data!.ticketType,
      };
    },
    [tenantSubdomain]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Quick Check-in
            </CardTitle>
            <CardDescription>Scan a ticket QR code or enter the code manually</CardDescription>
          </div>
          <Link
            href={`/dashboard/${tenantSubdomain}/events/${eventId}/attendees`}
            className="text-sm text-primary hover:underline"
          >
            View all attendees
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <QrScanner onCheckIn={handleCheckIn} compact />
      </CardContent>
    </Card>
  );
}
