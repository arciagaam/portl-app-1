'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { OrganizerApplication, Prisma } from '@/prisma/generated/prisma/client';

type Application = OrganizerApplication & Prisma.OrganizerApplicationGetPayload<{
  include: {
    tenant: {
      include: {
        owner: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;

const statusColors = {
  NOT_STARTED: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  SUBMITTED: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
};

const statusLabels = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const columns: ColumnDef<Application>[] = [
  {
    accessorKey: 'tenant.subdomain',
    header: 'Subdomain',
    cell: ({ row }) => {
      const subdomain = row.original.tenant.subdomain;
      const applicationId = row.original.id;
      return (
        <Link
          href={`/applications/${applicationId}`}
          className="font-mono text-sm hover:underline text-primary"
        >
          {subdomain}
        </Link>
      );
    },
  },
  {
    accessorKey: 'tenant.name',
    header: 'Organization Name',
    cell: ({ row }) => {
      const applicationId = row.original.id;
      return (
        <Link
          href={`/applications/${applicationId}`}
          className="font-medium hover:underline text-primary"
        >
          {row.original.tenant.name}
        </Link>
      );
    },
  },
  {
    accessorKey: 'tenant.owner',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.original.tenant.owner;
      const name = owner.firstName && owner.lastName
        ? `${owner.firstName} ${owner.lastName}`
        : owner.email;
      return (
        <div className="flex flex-col">
          <span className="text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{owner.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status as keyof typeof statusColors;
      return (
        <Badge className={statusColors[status]}>
          {statusLabels[status]}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'currentStep',
    header: 'Progress',
    cell: ({ row }) => {
      const step = row.original.currentStep;
      const status = row.original.status;
      
      if (status === 'SUBMITTED' || status === 'APPROVED' || status === 'REJECTED') {
        return <span className="text-sm text-muted-foreground">Completed</span>;
      }
      
      return <span className="text-sm text-muted-foreground">Step {step}/3</span>;
    },
  },
  {
    accessorKey: 'submittedAt',
    header: 'Submitted',
    cell: ({ row }) => {
      const submittedAt = row.original.submittedAt;
      if (!submittedAt) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const application = row.original;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = table.options.meta as any;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/applications/${application.id}`}>
                View Details
              </Link>
            </DropdownMenuItem>
            {application.status === 'SUBMITTED' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => meta?.onApprove(application)}
                  className="text-green-600"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => meta?.onReject(application)}
                  className="text-red-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
