import { Users, UserCheck, UserX } from 'lucide-react';
import type { AttendeeStats } from './types';

interface StatsCardsProps {
  stats: AttendeeStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-px bg-border md:grid-cols-3 border">
      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total Attendees</span>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{stats.total}</p>
      </div>
      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Checked In</span>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{stats.checkedIn}</p>
        {stats.total > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round((stats.checkedIn / stats.total) * 100)}% of total
          </p>
        )}
      </div>
      <div className="bg-background p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Remaining</span>
          <UserX className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{stats.remaining}</p>
      </div>
    </div>
  );
}
