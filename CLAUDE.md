# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portl is a multi-tenant event platform built with Next.js 16, allowing organizations to host their own branded event pages on custom subdomains. Each tenant operates independently with their own events, organizers, and applications.

## Tech Stack

- **Framework**: Next.js 16.1.2 with App Router, React 19, Turbopack
- **Database**: PostgreSQL via Prisma 7.2.0 with PostgreSQL adapter
- **Authentication**: NextAuth v5 (beta.30) with JWT sessions
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Payments**: PayMongo Checkout Sessions (PHP currency, centavo amounts)
- **QR Codes**: react-qr-code (SVG-based), @yudiel/react-qr-scanner (for check-in)
- **Storage**: Upstash Redis for tenant data caching + rate limiting
- **Rate Limiting**: @upstash/ratelimit (sliding window, fail-open)
- **IDs**: nanoid for ticket code generation
- **Date Handling**: date-fns 4.1.0
- **Validation**: Zod 4.3.5
- **Package Manager**: pnpm 10.12.4

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server with Turbopack
pnpm build                  # Build for production
pnpm start                  # Start production server

# Database
pnpm prisma:generate        # Generate Prisma Client
pnpm prisma:studio          # Open Prisma Studio GUI
pnpm prisma:migrate         # Create and apply migration

# Note: Prisma Client is generated to ./prisma/generated/prisma/
```

## Architecture Overview

### Multi-Tenancy

- **Subdomain-based**: `tenant.lvh.me:3000` (dev) / `tenant.portl.com` (prod)
- `proxy.ts` rewrites `tenant.domain.com/*` → internal `/t/tenant/*` routes (Edge Runtime, no DB access)
- `lvh.me` resolves to `127.0.0.1`, supports wildcard subdomains for local dev
- Tenant validation in Server Components via `lib/tenant.ts` (not in proxy)
- URL helpers in `lib/url.ts`: `tenantUrl(subdomain, path)`, `mainUrl(path)`

### Key Models

- **User**: Global role (USER, ADMIN)
- **Tenant**: Organization with unique subdomain, type (ORGANIZER, VENUE, ARTIST)
- **TenantMember**: Join table — roles: OWNER, ADMIN, MANAGER, MEMBER
- **Cart/CartItem**: Price-locked cart with 15-min sliding expiry
- **Order/OrderItem**: PENDING → CONFIRMED/CANCELLED lifecycle
- **Transaction**: PayMongo payment tracking
- **Ticket/TicketType**: With price tiers, table associations, QR codes

### Auth

- NextAuth v5 with Credentials provider, JWT strategy
- JWT role refresh every 5 min (`roleCheckedAt` in token)
- Auth helpers: `getSession()`, `getCurrentUser()`, `requireAuth()` in `lib/auth.ts`
- Rate limiting on auth endpoints via Upstash Redis (fail-open)
- Prisma Client generated to `./prisma/generated/prisma/`, singleton in `prisma/client.ts`

### Server Actions

- All in `app/actions/` directory with `"use server"` directive
- Authorization via `requireTenantAccess(subdomain, 'ROLE')` from `lib/tenant.ts`

## Coding Conventions

### Server Actions
- **Always use Server Actions** for server-side operations instead of API routes
- Server Actions should be defined in `app/actions/` directory
- Use `"use server"` directive at the top of action files

### Form Handling
- **Always use React Hook Form** with **Zod** for form validation and handling
- Use Zod schemas for validation
- Integrate React Hook Form with Server Actions for form submissions

### React Imports
- **Always use direct imports for hooks**: `import { useState, useEffect, useCallback } from 'react'`
- **Always use direct imports for utilities**: `import { forwardRef, memo } from 'react'`
- **Use type-only imports for types**: `import type { ComponentProps, ElementRef } from 'react'`
- **Remove unnecessary React imports**: React 17+ doesn't require `import React from 'react'` for JSX
- **Only import what you use**: Don't import React if you're only using JSX (no hooks or React APIs)
- **shadcn/ui components exception**: Do not modify shadcn/ui components in `components/ui/` - they use `import * as React` and `React.ComponentProps` patterns by design

### Multi-Tenant Link Handling

With subdomain-based routing, there are three link contexts:

#### Rules

1. **Within-tenant links** (components rendered on a tenant subdomain):
   - Use **relative paths**: `href="/events"`, `href="/checkout"`
   - The proxy rewrites these to the correct internal `/t/[tenant]/*` route
   - **Never** use `/t/${tenant}/` prefix in tenant-rendered components

2. **Cross-domain links from main domain TO tenant** (dashboard, account, admin):
   - Use `tenantUrl()` helper: `href={tenantUrl(subdomain, '/events')}`
   - Use `<a>` tag (not `<Link>`) since it's a different domain

3. **Cross-domain links from tenant TO main domain** (auth, account, dashboard):
   - Use `mainUrl()` helper: `href={mainUrl('/auth/signin')}`
   - TenantNavbar passes `mainDomainPrefix` to HeaderActions/UserMenu
   - Use `<a>` tag (not `<Link>`) for cross-domain navigation

4. **Dashboard routes** (on main domain):
   - Use `/dashboard/` prefix: `href={`/dashboard/${tenant}/events`}`
   - These are organizer-facing, on the main domain

5. **Server Actions and redirects**:
   - Use `tenantUrl()` for PayMongo callback URLs
   - `revalidatePath('/t/${sub}/...')` still uses internal path (correct)
   - Auth redirects from tenant pages use `mainUrl()` with full `callbackUrl`

#### Examples

```typescript
import { tenantUrl, mainUrl } from '@/lib/url';

// GOOD - Within-tenant link (on tenant subdomain)
<Link href="/events">Events</Link>
<Link href={`/events/${eventId}`}>Event Detail</Link>

// GOOD - Main domain to tenant (cross-domain)
<a href={tenantUrl(subdomain, '/events')}>View Events</a>
<a href={tenantUrl(subdomain, `/events/${eventId}`)}>View Live</a>

// GOOD - Tenant to main domain (cross-domain)
<a href={mainUrl('/auth/signin')}>Sign In</a>
<a href={mainUrl('/account/tickets')}>My Tickets</a>

// GOOD - Dashboard (main domain, same domain)
<Link href={`/dashboard/${tenant}/events`}>Manage Events</Link>

// GOOD - Server Action PayMongo URLs
successUrl: tenantUrl(subdomain, `/checkout/success/${orderId}`)

// BAD - Using /t/ prefix in tenant-rendered component
<Link href={`/t/${tenant}/events`}>Events</Link>

// BAD - Using <Link> for cross-domain navigation
<Link href={tenantUrl(sub, '/events')}>Events</Link> // Should use <a>
```

#### Route Prefixes (internal file structure)

- `app/t/[tenant]/*` - Tenant pages (served via `tenant.domain.com/*`)
- `app/dashboard/[tenant]/*` - Organizer dashboard (main domain)
- `app/account/*` - User account area (main domain)
- `app/auth/*` - Authentication pages (main domain)
- `app/admin/*` - Admin panel (admin subdomain)

## Important Constraints

1. **Subdomain-based tenant routing**: Tenant pages served via `tenant.domain.com/*`, proxy rewrites to internal `/t/[tenant]/*`
2. **Admin subdomain**: Admin panel on `admin.domain.com`
3. **Edge Runtime limitations**: The proxy cannot access Prisma, database, or full Node.js APIs
4. **Tenant validation in components**: Always validate tenants in Server Components, not in the proxy
5. **JWT sessions required**: Credentials provider requires JWT strategy, not database sessions
6. **Prisma 7 specific**: Must use `prisma.config.ts` and custom client output path
7. **Multi-tenant unique constraints**: Users can have one application per tenant
8. **Cross-domain links**: Use `tenantUrl()` / `mainUrl()` helpers; use `<a>` not `<Link>` for cross-domain nav
9. **Cookie domain**: Set via `AUTH_URL` → `.lvh.me` in dev, `.portl.com` in prod; shared across all subdomains
10. **Internal functions pattern**: `lib/checkout-internal.ts` has NO auth checks — never add `'use server'`, only call from authenticated contexts
11. **Active tenant check**: Public-facing pages (checkout, events) should use `getActiveTenantBySubdomain()` to reject INACTIVE/SUSPENDED tenants

## Documentation Index

Detailed documentation is split into focused files:

| Document | Contents |
|----------|----------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Multi-tenancy system, database models, auth, user spaces, organizer flow |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Events, cart, checkout/payments, tickets, team management |
| [`docs/FILE_STRUCTURE.md`](docs/FILE_STRUCTURE.md) | Full directory layout for app/, components/, lib/, prisma/ |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Local testing, env vars, DB workflow, type safety patterns |
| [`docs/STATUS.md`](docs/STATUS.md) | Implementation status and links to other docs |
| `ORGANIZER_FLOW.md` | Complete organizer application implementation guide |
| `SETUP_FIXES_SUMMARY.md` | Database, auth, and multi-tenancy setup details |
| `README.md` | General project overview and getting started |
