'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export type TenantRow = {
  id: string
  subdomain: string
  name: string
  status: string
  createdAt: Date
  owner: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    role: string
  }
  application: { id: string; status: string } | null
  _count: { events: number; orders: number }
}

const statusColors: Record<string, string> = {
  INACTIVE: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-green-500/20 text-green-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
}

const appStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
  SUBMITTED: 'bg-yellow-500/20 text-yellow-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
}

export const columns: ColumnDef<TenantRow>[] = [
  {
    accessorKey: 'subdomain',
    header: 'Subdomain',
    cell: ({ row }) => (
      <Link
        href={`/tenants/${row.original.id}`}
        className="font-mono text-sm hover:underline text-primary"
      >
        {row.original.subdomain}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        href={`/tenants/${row.original.id}`}
        className="font-medium hover:underline text-primary"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'owner',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.original.owner
      const name = owner.firstName && owner.lastName
        ? `${owner.firstName} ${owner.lastName}`
        : owner.email
      return (
        <div className="flex flex-col">
          <span className="text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{owner.email}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status] || ''}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'application.status',
    header: 'Application',
    cell: ({ row }) => {
      const app = row.original.application
      if (!app) return <span className="text-muted-foreground text-sm">None</span>
      return (
        <Badge className={appStatusColors[app.status] || ''}>
          {app.status.replace('_', ' ')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'events',
    header: 'Events',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original._count.events}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const tenant = row.original
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = table.options.meta as any

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
              <Link href={`/tenants/${tenant.id}`}>View Details</Link>
            </DropdownMenuItem>
            {tenant.application && (
              <DropdownMenuItem asChild>
                <Link href={`/applications/${tenant.application.id}`}>
                  View Application
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => meta?.onStatusChange(tenant.id, 'ACTIVE')}
                  disabled={tenant.status === 'ACTIVE'}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => meta?.onStatusChange(tenant.id, 'INACTIVE')}
                  disabled={tenant.status === 'INACTIVE'}
                >
                  Inactive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => meta?.onStatusChange(tenant.id, 'SUSPENDED')}
                  disabled={tenant.status === 'SUSPENDED'}
                  className="text-red-600"
                >
                  Suspended
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
