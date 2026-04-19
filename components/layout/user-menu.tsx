'use client'

import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { User, Ticket, Settings, Plus, LogOut, ChevronDown, LayoutDashboard } from 'lucide-react'
import { signOut } from 'next-auth/react'

type UserMenuProps = {
  userName: string | null
  userEmail: string | null
  hasTenants: boolean
  /** When on a tenant subdomain, prepend this to main-domain links (e.g. "http://lvh.me:3000"). Empty string on main domain. */
  mainDomainPrefix?: string
}

function AnchorLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className}>{children}</a>
}

function NextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} className={className}>{children}</Link>
}

export function UserMenu({ userName, userEmail, hasTenants, mainDomainPrefix = '' }: UserMenuProps) {
  const displayName = userName || userEmail || 'Account'
  const p = mainDomainPrefix // shorthand

  // On tenant subdomains, use <a> for cross-domain navigation; on main domain, use <Link>
  const MenuLink = p ? AnchorLink : NextLink
  const link = (path: string) => `${p}${path}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="hidden md:inline max-w-[120px] truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {userName && <p className="text-sm font-medium leading-none">{userName}</p>}
            {userEmail && (
              <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <MenuLink href={link('/account')} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            My Account
          </MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href={link('/account/tickets')} className="cursor-pointer">
            <Ticket className="mr-2 h-4 w-4" />
            My Tickets
          </MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href={link('/account/settings')} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </MenuLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {hasTenants ? (
          <DropdownMenuItem asChild>
            <MenuLink href={link('/dashboard')} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Organizer Dashboard
            </MenuLink>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <MenuLink href={link('/organizer/register')} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Become an Organizer
            </MenuLink>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut({ callbackUrl: p ? `${p}/` : '/' })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
