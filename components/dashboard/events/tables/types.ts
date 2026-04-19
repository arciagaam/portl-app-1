import { Event, Prisma } from '@/prisma/generated/prisma/client';

export type EventWithTables = Event & Prisma.EventGetPayload<{
  include: {
    tables: true;
  };
}>;

export interface TablesSectionProps {
  event: EventWithTables;
  tenantSubdomain: string;
}

export type TableItem = EventWithTables['tables'][number];
