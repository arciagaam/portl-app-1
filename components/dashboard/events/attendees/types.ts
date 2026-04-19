export interface Attendee {
  id: string;
  ticketCode: string;
  status: string;
  checkedInAt: Date | string | null;
  holderFirstName: string | null;
  holderLastName: string | null;
  holderEmail: string | null;
  ticketType: { id: string; name: string } | null;
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

export interface AttendeeStats {
  total: number;
  checkedIn: number;
  remaining: number;
}

export type StatusFilter = 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN';
