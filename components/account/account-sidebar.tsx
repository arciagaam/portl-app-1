'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/layout/logout-button'
import { Home, Ticket, Receipt, Settings, Building2, Plus, ArrowLeft, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type Organization = {
  id: string
  memberRoles: { role: { name: string; color: string } }[]
  tenant: { name: string; subdomain: string }
}

type AccountSidebarProps = {
  organizations: Organization[]
  userName?: string | null
  userEmail?: string | null
}

export default function AccountSidebar({
  organizations,
  userName,
  userEmail
}: AccountSidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  const navItems = [
    { href: '/account', label: 'Overview', icon: Home },
    { href: '/account/tickets', label: 'My Tickets', icon: Ticket },
    { href: '/account/orders', label: 'Order History', icon: Receipt },
    { href: '/account/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 border-r bg-background flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/">
          <Image
            src="/images/logo/portl-logo-white.svg"
            alt="Portl Logo"
            width={80}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/account' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}

        <Separator className="my-4" />

        {/* Organizations Section */}
        {organizations.length > 0 ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <span className="flex items-center gap-3">
                <Building2 className="h-4 w-4" />
                My Organizations
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5 pl-4">
              {organizations.map((org) => {
                const topRole = org.memberRoles[0]?.role;
                return (
                  <Link
                    key={org.id}
                    href={`/dashboard/${org.tenant.subdomain}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-foreground"
                  >
                    <span className="truncate">{org.tenant.name}</span>
                    {topRole && (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none border"
                        style={{
                          backgroundColor: `${topRole.color}20`,
                          color: topRole.color,
                          borderColor: `${topRole.color}40`,
                        }}
                      >
                        {topRole.name}
                      </span>
                    )}
                  </Link>
                )
              })}
            </CollapsibleContent>
            <Link
              href="/organizer/register"
              className="flex items-center gap-3 px-3 py-2 mt-1 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Register New Business
            </Link>
          </Collapsible>
        ) : (
          <Link
            href="/organizer/register"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground text-foreground"
            )}
          >
            <Plus className="h-4 w-4" />
            Become an Organizer
          </Link>
        )}
      </nav>

      {/* Back to Home */}
      <div className="p-4 border-t">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t">
        {(userName || userEmail) && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">
              {userName || userEmail}
            </p>
            {userEmail && userName && (
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
          </div>
        )}
        <LogoutButton />
      </div>
    </aside>
  )
}
