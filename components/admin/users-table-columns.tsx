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
import { MoreHorizontal, Shield, User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

export type UserRow = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  role: string
  createdAt: Date
  tenants: { id: string; subdomain: string; name: string; status: string }[]
  _count: { orders: number; ownedTickets: number }
}

const roleColors: Record<string, string> = {
  USER: 'bg-muted text-muted-foreground',
  ADMIN: 'bg-purple-500/20 text-purple-400',
}

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    accessorFn: (row) => {
      if (row.firstName && row.lastName) return `${row.firstName} ${row.lastName}`
      if (row.firstName) return row.firstName
      return row.email
    },
    cell: ({ row }) => {
      const user = row.original
      const name = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email
      return (
        <Link
          href={`/users/${user.id}`}
          className="font-medium hover:underline text-primary"
        >
          {name}
        </Link>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.email}</span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <Badge className={roleColors[role] || 'bg-muted text-muted-foreground'}>
          {role}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'tenants',
    header: 'Tenants',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.tenants.length}</span>
    ),
  },
  {
    accessorKey: 'orders',
    header: 'Orders',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original._count.orders}</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const user = row.original
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
              <Link href={`/users/${user.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => meta?.onRoleChange(user.id, 'USER')}
                  disabled={user.role === 'USER'}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  User
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => meta?.onRoleChange(user.id, 'ADMIN')}
                  disabled={user.role === 'ADMIN'}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
