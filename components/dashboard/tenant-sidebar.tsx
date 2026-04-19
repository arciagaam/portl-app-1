'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/layout/logout-button'
import { Home, Calendar, Lock, Users, Globe, ArrowLeft, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

type TenantSidebarProps = {
  tenantSubdomain: string
  isApproved: boolean
  permissions: string[]
  userName?: string | null
  userEmail?: string | null
}

export default function TenantSidebar({
  tenantSubdomain,
  isApproved,
  permissions,
  userName,
  userEmail
}: TenantSidebarProps) {
  const pathname = usePathname()

  const basePath = `/dashboard/${tenantSubdomain}`
  const homePath = basePath
  const eventsPath = `${basePath}/events`
  const teamPath = `${basePath}/team`
  const rolesPath = `${basePath}/roles`
  const pageSettingsPath = `${basePath}/page-settings`

  const isHomeActive = pathname === homePath || pathname === basePath
  const isEventsActive = pathname?.startsWith(eventsPath)
  const isTeamActive = pathname?.startsWith(teamPath)
  const isRolesActive = pathname?.startsWith(rolesPath)
  const isPageSettingsActive = pathname?.startsWith(pageSettingsPath)

  const has = (perm: string) => permissions.includes(perm)

  const canSeeEvents = has('view_events')
  const canSeeTeam = has('view_team') || has('manage_team')
  const canSeeRoles = has('manage_roles')
  const canSeePageSettings = has('manage_page')

  const navLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors relative',
      isActive
        ? 'bg-foreground/10 text-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
    )

  const lockedClass = 'flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground/40 cursor-not-allowed'

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/account">
          <Image
            src="/images/logo/portl-logo-white.svg"
            alt="Portl Logo"
            width={80}
            height={32}
            className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </Link>
      </div>

      {/* Tenant Context */}
      <div className="px-5 py-4 border-b border-sidebar-border">
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground truncate">
          {tenantSubdomain}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
          {tenantSubdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href={homePath} className={navLinkClass(isHomeActive)}>
          <Home className="h-4 w-4" />
          Home
        </Link>

        {isApproved && canSeeEvents ? (
          <Link href={eventsPath} className={navLinkClass(isEventsActive)}>
            <Calendar className="h-4 w-4" />
            Events
          </Link>
        ) : (
          <div
            className={lockedClass}
            title={!isApproved ? 'Available after application approval' : 'Requires View Events permission'}
          >
            <Lock className="h-4 w-4" />
            Events
          </div>
        )}

        {isApproved && canSeeTeam && (
          <Link href={teamPath} className={navLinkClass(isTeamActive)}>
            <Users className="h-4 w-4" />
            Team
          </Link>
        )}

        {isApproved && canSeeRoles && (
          <Link href={rolesPath} className={navLinkClass(isRolesActive)}>
            <Shield className="h-4 w-4" />
            Roles
          </Link>
        )}

        {isApproved && canSeePageSettings ? (
          <Link href={pageSettingsPath} className={navLinkClass(isPageSettingsActive)}>
            <Globe className="h-4 w-4" />
            Page
          </Link>
        ) : canSeePageSettings ? (
          <div className={lockedClass} title="Available after application approval">
            <Lock className="h-4 w-4" />
            Page
          </div>
        ) : null}
      </nav>

      {/* Back to Profile */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <Link
          href="/account"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      </div>

      {/* User Info & Logout */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        {(userName || userEmail) && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground truncate">
              {userName || userEmail}
            </p>
            {userEmail && userName && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
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
