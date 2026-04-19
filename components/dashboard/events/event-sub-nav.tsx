'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, TableIcon, Ticket, Tag, ImageIcon, ClipboardList, UserCheck, Megaphone } from 'lucide-react';

interface EventSubNavProps {
  eventId: string;
  tenantSubdomain: string;
  tableCounts?: {
    tables: number;
    ticketTypes: number;
    promotions: number;
    promoters?: number;
    images: number;
    orders?: number;
    attendees?: number;
  };
}

export function EventSubNav({ eventId, tenantSubdomain, tableCounts }: EventSubNavProps) {
  const pathname = usePathname();

  const basePath = `/dashboard/${tenantSubdomain}/events/${eventId}`;

  const navItems = [
    {
      label: 'Overview',
      href: basePath,
      icon: LayoutDashboard,
      isActive: pathname === basePath,
    },
    {
      label: `Gallery${tableCounts ? ` (${tableCounts.images})` : ''}`,
      href: `${basePath}/gallery`,
      icon: ImageIcon,
      isActive: pathname === `${basePath}/gallery`,
    },
    {
      label: `Tables${tableCounts ? ` (${tableCounts.tables})` : ''}`,
      href: `${basePath}/tables`,
      icon: TableIcon,
      isActive: pathname === `${basePath}/tables`,
    },
    {
      label: `Tickets${tableCounts ? ` (${tableCounts.ticketTypes})` : ''}`,
      href: `${basePath}/tickets`,
      icon: Ticket,
      isActive: pathname === `${basePath}/tickets`,
    },
    {
      label: `Promotions${tableCounts ? ` (${tableCounts.promotions})` : ''}`,
      href: `${basePath}/promotions`,
      icon: Tag,
      isActive: pathname === `${basePath}/promotions`,
    },
    {
      label: `Promoters${tableCounts?.promoters !== undefined ? ` (${tableCounts.promoters})` : ''}`,
      href: `${basePath}/promoters`,
      icon: Megaphone,
      isActive: pathname === `${basePath}/promoters`,
    },
    {
      label: `Orders${tableCounts?.orders !== undefined ? ` (${tableCounts.orders})` : ''}`,
      href: `${basePath}/orders`,
      icon: ClipboardList,
      isActive: pathname === `${basePath}/orders`,
    },
    {
      label: `Attendees${tableCounts?.attendees !== undefined ? ` (${tableCounts.attendees})` : ''}`,
      href: `${basePath}/attendees`,
      icon: UserCheck,
      isActive: pathname === `${basePath}/attendees`,
    },
  ];

  return (
    <nav className="flex gap-0 border-b overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              item.isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
