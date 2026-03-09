# Architecture

## Multi-Tenancy System

The application uses **subdomain-based multi-tenancy** where each tenant gets its own subdomain:

- **Main domain** (`lvh.me:3000` / `portl.com`): Landing page, auth, account, dashboard
- **Admin subdomain** (`admin.lvh.me:3000`): Admin panel
- **Tenant subdomains** (`acme.lvh.me:3000` / `acme.portl.com`): Public tenant pages

The `proxy.ts` rewrites `tenant.domain.com/*` → internal `/t/tenant/*` routes. The `app/t/[tenant]/` file structure is preserved but URLs are clean subdomains.

`lvh.me` is used for local development because it resolves to `127.0.0.1` and supports wildcard subdomain cookies (`.lvh.me`).

### URL Structure

| Area | URL Pattern | Notes |
|------|-------------|-------|
| Main site | `lvh.me:3000/` | Landing page |
| Auth | `lvh.me:3000/auth/*` | Sign in, sign up |
| Account | `lvh.me:3000/account/*` | User account area |
| Dashboard | `lvh.me:3000/dashboard/*` | Organizer dashboard |
| **Tenant pages** | `acme.lvh.me:3000/*` | Public tenant pages (subdomain) |
| Admin | `admin.lvh.me:3000/*` | Admin panel |

### Routing Flow

1. **Proxy-based routing** - Uses `proxy.ts` (Next.js 15+ pattern) for subdomain routing
2. The proxy handles:
   - Admin subdomain rewrites (`admin.domain.com/*` → `/admin/*` routes)
   - **Tenant subdomain rewrites** (`tenant.domain.com/*` → `/t/tenant/*` routes)
   - Backward compat redirects (`/t/tenant/*` on main domain → `tenant.domain.com/*`)
   - Auth page redirect for authenticated users (main domain only)
3. File structure uses `app/t/[tenant]/` internally — URLs are clean subdomains
4. Tenant validation happens at the **page/layout level** using `lib/tenant.ts`

### Proxy Configuration

The `proxy.ts` handles admin + tenant subdomain routing:

**Key Features**:
- Runs in Edge Runtime (no Prisma/database access)
- Handles admin and tenant subdomain rewrites
- Redirects `/t/*` paths on main domain to proper subdomain URLs
- Uses `NEXT_PUBLIC_ROOT_DOMAIN` to determine the root domain
- Skips static files (`/_next`) and API routes early for performance
- Supports `x-forwarded-host` header for reverse proxy/load balancer deployments

### URL Helper (`lib/url.ts`)

Two helper functions for building cross-domain URLs:

```typescript
import { tenantUrl, mainUrl } from '@/lib/url';

tenantUrl('acme', '/events')     // → 'http://acme.lvh.me:3000/events'
mainUrl('/auth/signin')          // → 'http://lvh.me:3000/auth/signin'
```

### Tenant Validation Pattern

```typescript
// In app/t/[tenant]/page.tsx or layout.tsx
import { getCurrentTenant } from '@/lib/tenant';
import { notFound } from 'next/navigation';

const tenant = await getCurrentTenant(params.tenant);
if (!tenant) {
  notFound();
}
```

For public pages requiring an ACTIVE tenant (checkout, events):
```typescript
import { getActiveTenantBySubdomain } from '@/lib/tenant';

const tenant = await getActiveTenantBySubdomain(params.tenant);
if (!tenant) notFound(); // Returns null for INACTIVE, SUSPENDED, or non-existent
```

**Important**: The proxy runs in Edge Runtime and cannot access Prisma/database. Tenant validation happens in Server Components at the page/layout level where you have access to the full Node.js runtime and Prisma Client. `getTenantBySubdomain()` is wrapped in React `cache()` for request deduplication.

## Database Architecture

### Prisma 7 Configuration

- Custom configuration in `prisma.config.ts` (required for Prisma 7)
- Prisma Client generated to `./prisma/generated/prisma/`
- Uses PostgreSQL adapter (`@prisma/adapter-pg`) for compatibility
- Singleton pattern in `prisma/client.ts`, re-exported from `lib/prisma.ts`

### Key Models

- **User**: Stores user accounts with `role` (USER, ADMIN) — global platform role only
- **Tenant**: Represents each organization/subdomain with unique subdomain constraint, has `type` (ORGANIZER, VENUE, ARTIST)
- **TenantMember**: Join table for tenant-scoped roles (`userId + tenantId` unique). Roles: OWNER, ADMIN, MANAGER, MEMBER
- **TenantInvitation**: Email-based team invitations with token, expiration, status (PENDING, ACCEPTED, EXPIRED, REVOKED)
- **OrganizerApplication**: Tracks organizer applications with multi-step status (NOT_STARTED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED). One application per user per tenant (composite unique constraint)
- **Cart**: One unified cart per user with sliding window expiration (15 min). One-to-many CartItems
- **CartItem**: Cart items with locked price (`unitPrice`), optional `priceTierId` and `seatId`. Composite unique: `[cartId, ticketTypeId, seatId]`
- **Transaction**: Payment transaction tracking (type: PAYMENT/REFUND, status: PENDING → COMPLETED/FAILED/CANCELLED). Stores provider info (PayMongo), external IDs, metadata
- **PasswordResetToken**: Token-based password reset with expiration. Composite unique: `[email, token]`
- **Account / Session / VerificationToken**: NextAuth adapter models (infrastructure for future OAuth providers, not actively used with JWT strategy)

### TenantMember Roles

| Role | Dashboard Access | Events | Team Management |
|------|-----------------|--------|-----------------|
| OWNER | Full | Full | Full (can change roles) |
| ADMIN | Full | Full | Can invite/remove MANAGER/MEMBER |
| MANAGER | Limited | View/Edit | View only |
| MEMBER | Home only | None | None |

### Authorization Pattern

```typescript
import { requireTenantAccess } from '@/lib/tenant';

// In server actions - specify minimum role
const { tenant, user, membership } = await requireTenantAccess(subdomain, 'ADMIN');

// requireTenantOwner delegates to requireTenantAccess('ADMIN')
const { tenant, user } = await requireTenantOwner(subdomain);

// Check role hierarchy
import { hasMinimumRole } from '@/lib/tenant';
hasMinimumRole('ADMIN', 'MANAGER'); // true
```

### Database Connection

Uses `DATABASE_URL` from environment variables. Alternative configurations supported:
- Vercel Postgres: `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING`
- Prisma Accelerate: `PRISMA_DATABASE_URL`

## Authentication System

**NextAuth v5 (beta) with Credentials provider**:

- Uses JWT strategy (required for Credentials provider, not database sessions)
- Session data includes `id` and `role` from JWT token
- **JWT role refresh**: Re-fetches user role from DB every 5 minutes (`roleCheckedAt` timestamp in token) — prevents stale role after admin demotion
- Auth helpers in `lib/auth.ts`: `getSession()`, `getCurrentUser()`, `requireAuth()`
- Auth pages: `/auth/signin`, `/auth/signup`, `/auth/error`, `/auth/forgot-password`, `/auth/reset-password/[token]`
- Session expires after 30 days

**Rate limiting** (via `lib/rate-limit.ts` + Upstash Redis):
- Sign-in: 5 attempts per 15 min per email
- Sign-up: 3 attempts per hour per IP
- Forgot password: 3 attempts per hour per email
- Graceful fallback when Redis not configured (local dev) — fail-open strategy

**Password reset flow**:
1. User submits email on `/auth/forgot-password`
2. `forgotPasswordAction` generates token, sends reset email via SendGrid
3. User clicks link → `/auth/reset-password/[token]`
4. `resetPasswordAction` validates token, updates password

**Important**: The auth configuration uses `trustHost: true` for multi-domain/Vercel deployment support.

## User Spaces

The platform has two distinct user-facing areas:

### Account Area (Attendees)
- **Purpose**: Ticket purchases, order history, profile settings
- **Routes**: `/account/*` on main domain
- **Access**: Any authenticated user
- **Key pages**:
  - `/account` - Overview
  - `/account/tickets` - My tickets list (grouped by event)
  - `/account/tickets/[ticketId]` - Ticket detail with QR code
  - `/account/orders` - Order history
  - `/account/orders/[orderId]` - Order detail
  - `/account/settings` - Profile and password settings

### Dashboard Area (Organizers)
- **Purpose**: Business/tenant management, event creation, team management
- **Routes**: `/dashboard/*` on main domain
- **Access**: Users with `TenantMember` membership (role-based visibility)
- **Key pages**:
  - `/dashboard` - Business selector (auto-redirects to tenant dashboard if user has only 1 tenant)
  - `/dashboard/[tenant]` - Tenant dashboard
  - `/dashboard/[tenant]/events` - Event management (OWNER, ADMIN, MANAGER)
  - `/dashboard/[tenant]/team` - Team management (OWNER, ADMIN)
  - `/dashboard/[tenant]/apply` - Organizer application (OWNER only)

**Smart redirect**: Users with a single tenant skip the business selector and go directly to their dashboard.

### Navigation Pattern
- Users without tenants see "Become an Organizer" CTA
- Users with tenants see "Organizer Dashboard" link
- Both spaces accessible from navbar dropdown menu

## Organizer Application Flow

Multi-step application system for users to become organizers:

1. **Step 1**: Organizer Type Selection (INDIVIDUAL, TEAM, COMPANY) + description
2. **Step 2**: Event Portfolio (past events or planned events)
3. **Step 3**: Compliance & Acknowledgement (checkboxes for T&C)

### Key Implementation Files

- `app/dashboard/[tenant]/page.tsx`: Main dashboard showing application status
- `app/dashboard/[tenant]/apply/page.tsx`: Multi-step application form
- `app/api/organizer/application/route.ts`: CRUD operations for applications
- `app/api/organizer/tenant/route.ts`: Tenant lookup/creation
- `components/organizer/*.tsx`: Form components for each step
- `components/ui/stepper.tsx`: Progress indicator component

### Application State Management

- Applications save progress automatically (can exit and resume)
- Status tracked: NOT_STARTED → IN_PROGRESS → SUBMITTED → APPROVED/REJECTED
- On approval: `TenantMember(role: OWNER)` is created, tenant status set to ACTIVE
- User's global role stays `USER` — tenant access is controlled by `TenantMember` membership
