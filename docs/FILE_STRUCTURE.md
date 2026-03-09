# File Structure

## Path Aliases

Uses `@/*` for imports mapping to project root:
```typescript
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/tenant';
```

## Directory Layout

```
app/
├── (landing-page)/         # Landing page route group
│   ├── layout.tsx
│   ├── page.tsx            # Landing page
│   ├── hero-section.tsx
│   ├── services-section.tsx
│   ├── events-showcase-section.tsx
│   ├── about-us-section.tsx
│   ├── faq-section.tsx
│   ├── cta-section.tsx
│   ├── postings-section.tsx
│   └── organizer/register/ # Organizer registration
├── account/                # Attendee account area
│   ├── layout.tsx
│   ├── page.tsx            # Account overview + affiliations
│   ├── tickets/            # My tickets
│   ├── orders/             # Order history
│   └── settings/           # Profile settings
├── actions/                # Server actions
│   ├── admin.ts            # Admin application management
│   ├── admin-tenants.ts    # Admin tenant management
│   ├── admin-users.ts      # Admin user management
│   ├── auth.ts             # Auth actions (signin, signup, forgot/reset password)
│   ├── cart.ts             # Cart actions (add, update, remove, get/create)
│   ├── checkout.ts         # Checkout/payment actions
│   ├── events.ts           # Event query actions
│   ├── invitations.ts      # Invitation accept/get actions
│   ├── orders.ts           # Order query actions (account area)
│   ├── organizer.ts        # Organizer registration/application
│   ├── profile.ts          # User profile actions
│   ├── public-events.ts    # Public event queries
│   ├── tenant-events.ts    # Tenant event CRUD (tables, tickets, promotions)
│   ├── tenant-members.ts   # Team management actions
│   ├── tenant-page.ts      # Tenant page actions
│   └── upload.ts           # File upload actions
├── admin/                  # Admin panel (admin subdomain)
├── auth/                   # Auth pages
│   ├── signin/
│   ├── signup/
│   ├── error/
│   ├── forgot-password/    # Password reset request
│   └── reset-password/[token]/  # Password reset with token
├── dashboard/              # Organizer dashboard (main domain)
│   ├── page.tsx            # Business selector (auto-redirects if 1 tenant)
│   └── [tenant]/           # Tenant-specific dashboard
│       ├── events/         # Event management
│       └── team/           # Team management (OWNER/ADMIN only)
│           └── page.tsx
├── invite/                 # Invitation accept flow
│   └── [token]/
│       ├── page.tsx        # Server component
│       └── invite-accept-card.tsx  # Client component
├── t/                      # Tenant routes (internal, served via subdomain rewrite)
│   └── [tenant]/           # Dynamic tenant routes (public via tenant.domain.com)
│       ├── (with-navbar)/  # Layout with navbar + CartProvider
│       │   ├── layout.tsx
│       │   └── page.tsx    # Tenant home page
│       ├── checkout/       # Checkout flow (separate layout with CartProvider)
│       │   ├── layout.tsx  # Validates tenant is ACTIVE, provides CartProvider
│       │   └── success/[orderId]/
│       ├── events/         # Tenant events listing
│       └── profile/        # Tenant profile page
└── api/                    # API routes
    ├── auth/               # NextAuth handlers
    ├── cron/
    │   └── cleanup-orders/ # Cron: expire abandoned orders (Bearer CRON_SECRET)
    └── webhooks/
        └── paymongo/       # PayMongo webhook (checkout_session.payment.paid)

components/
├── account/                # Account area components
│   └── affiliations-section.tsx  # Tenant memberships with visibility toggle
├── admin/                  # Admin panel components
├── cart/                   # Shopping cart components
│   ├── cart-provider.tsx   # React Context (NOOP default, safe outside provider)
│   ├── cart-drawer.tsx     # Slide-out cart UI
│   ├── cart-button.tsx     # Cart icon with badge
│   ├── add-to-cart-button.tsx
│   ├── cart-item.tsx
│   ├── cart-tenant-group.tsx
│   ├── cart-empty-state.tsx
│   └── index.ts            # Barrel exports
├── checkout/               # Checkout flow components
├── dashboard/              # Dashboard components
│   ├── events/             # Event management components
│   └── team/               # Team management components
│       ├── team-section.tsx
│       ├── invite-member-form.tsx
│       └── edit-member-form.tsx
├── layout/                 # Navbar, Footer, UserMenu
├── organizer/              # Organizer form components
├── profile/                # Profile form components
├── providers/              # SessionProvider wrapper
├── public/                 # Public-facing components
│   └── events/             # Public event pages components
└── ui/                     # shadcn/ui components + ticket-qr-code.tsx

lib/
├── auth.ts                 # Auth helper functions
├── checkout-internal.ts    # Internal checkout functions (NOT server actions, no auth)
├── email.ts                # SendGrid email helper
├── format.ts               # Currency formatting (formatPhp)
├── paymongo.ts             # PayMongo API client helper
├── prisma.ts               # Prisma client re-export
├── rate-limit.ts           # Upstash Redis rate limiting
├── redis.ts                # Upstash Redis client
├── tenant.ts               # Tenant validation + requireTenantAccess()
├── upload.ts               # File upload helpers
├── url.ts                  # URL helpers (tenantUrl, mainUrl)
└── validations/
    ├── checkout.ts          # Checkout/payment/cart Zod schemas
    ├── events.ts            # Event management Zod schemas
    └── team.ts              # Team management Zod schemas

prisma/
├── client.ts               # Prisma Client singleton
├── generated/              # Generated Prisma Client (gitignored)
├── models/                 # Prisma schema files (multi-file)
│   ├── account.prisma       # NextAuth OAuth accounts (future use)
│   ├── cart.prisma
│   ├── cart-item.prisma
│   ├── event.prisma
│   ├── event-image.prisma
│   ├── order.prisma
│   ├── order-item.prisma
│   ├── organizer-application.prisma
│   ├── application-note.prisma
│   ├── password-reset-token.prisma
│   ├── promotion.prisma
│   ├── promotion-ticket-type.prisma
│   ├── seat.prisma
│   ├── session.prisma       # NextAuth sessions (future use)
│   ├── table.prisma
│   ├── tenant.prisma
│   ├── tenant-image.prisma
│   ├── tenant-invitation.prisma
│   ├── tenant-member.prisma
│   ├── ticket.prisma
│   ├── ticket-type.prisma
│   ├── ticket-type-price-tier.prisma
│   ├── transaction.prisma
│   ├── user.prisma
│   ├── verification-token.prisma  # NextAuth (future use)
│   └── voucher-code.prisma
├── scripts/                # Migration/backfill scripts
│   └── backfill-tenant-members.ts
└── seed.ts                 # Database seed script

prisma.config.ts            # Prisma 7 configuration (root level)
auth.ts                     # NextAuth configuration (root level)
proxy.ts                    # Next.js proxy for subdomain routing (root level)
```
