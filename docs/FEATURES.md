# Features

## Event Management System

The platform includes a complete event management system for organizers to create and manage events, tables, tickets, and promotions.

### Routes Structure

```
app/dashboard/[tenant]/events/
├── page.tsx                    # Events listing with status filters
├── new/
│   └── page.tsx                # Create event form
└── [eventId]/
    ├── page.tsx                # Event overview (mini-dashboard)
    ├── edit/
    │   └── page.tsx            # Edit event details
    ├── tables/
    │   └── page.tsx            # Manage tables & seats
    ├── tickets/
    │   └── page.tsx            # Manage ticket types & price tiers
    └── promotions/
        └── page.tsx            # Manage promotions & voucher codes
```

### Components

Event management components are located in `components/dashboard/events/`:

- **event-form.tsx**: Create/edit event form (name, venue, dates, status)
- **event-header.tsx**: Event title, status badge, publish/archive actions
- **event-stats-cards.tsx**: Stats overview (tickets sold, revenue, tables)
- **event-sub-nav.tsx**: Tab navigation between event sections
- **events-list.tsx**: Events listing with status filters
- **tables-section.tsx**: Table listing and CRUD operations
- **table-form.tsx**: Single table form (label, capacity, mode, min spend)
- **bulk-table-form.tsx**: Bulk table creation (VIP1-VIP10 pattern)
- **tickets-section.tsx**: Ticket types listing and CRUD
- **ticket-type-form.tsx**: Ticket type form with table selection
- **price-tiers-section.tsx**: Price tiers per ticket type
- **price-tier-form.tsx**: Price tier form (TIME_WINDOW/ALLOCATION)
- **promotions-section.tsx**: Promotions listing and CRUD
- **promotion-form.tsx**: Promotion form with discount config
- **voucher-codes-section.tsx**: Voucher codes per promotion
- **voucher-code-form.tsx**: Voucher code form

### Server Actions

All event management server actions are in `app/actions/tenant-events.ts`:

- **Events**: `getEventsForTenantAction`, `getEventByIdForTenantAction`, `createEventForTenantAction`, `updateEventForTenantAction`, `publishEventForTenantAction`, `archiveEventForTenantAction`
- **Tables**: `createTableForTenantAction`, `bulkCreateTablesForTenantAction`, `updateTableForTenantAction`, `deleteTableForTenantAction`, `regenerateSeatsForTenantAction`
- **Ticket Types**: `createTicketTypeForTenantAction`, `updateTicketTypeForTenantAction`, `deleteTicketTypeForTenantAction`
- **Price Tiers**: `createPriceTierForTenantAction`, `updatePriceTierForTenantAction`, `deletePriceTierForTenantAction`
- **Promotions**: `createPromotionForTenantAction`, `updatePromotionForTenantAction`, `deletePromotionForTenantAction`
- **Voucher Codes**: `createVoucherCodeForTenantAction`, `updateVoucherCodeForTenantAction`, `deleteVoucherCodeForTenantAction`

### Validation Schemas

Zod schemas in `lib/validations/events.ts`:

- `eventSchema`: Event name, venue, dates, status
- `tableSchema`: Label, capacity, mode (EXCLUSIVE/SHARED), min spend
- `bulkTableSchema`: Prefix, start/end numbers, capacity, mode
- `ticketTypeSchema`: Name, kind (GENERAL/TABLE/SEAT), base price, table reference
- `priceTierSchema`: Name, price, strategy (TIME_WINDOW/ALLOCATION)
- `promotionSchema`: Name, discount type/value, applies to, valid period
- `voucherCodeSchema`: Code, max redemptions

### Key Concepts

#### Table Modes
- **EXCLUSIVE**: VIP tables sold as whole unit (bottle service)
- **SHARED**: Communal tables, seats sold individually

#### Ticket Types
- **GENERAL**: Standard admission (GA entry, drink tickets)
- **TABLE**: Full table booking (requires tableId, quantity = 1)
- **SEAT**: Individual seat at shared table (requires tableId, quantity = table capacity)

#### Price Tier Strategies
- **TIME_WINDOW**: Price applies during specific date/time range
- **ALLOCATION**: Price applies until allocation is sold out

#### Promotions
- Discount types: PERCENT (basis points, 100 = 1%), FIXED (PHP amount)
- Applies to: ORDER (cart total) or ITEM (per ticket)
- Optional voucher codes with max redemptions

#### Ticket Type Edit Restrictions (Sales Protection)

Once tickets have been sold (`quantitySold > 0`), structural fields are locked:

| Field | Status | Reason |
|-------|--------|--------|
| `kind` | LOCKED | Changing type breaks existing tickets |
| `tableId` | LOCKED | Changing table breaks seat assignments |
| `quantityTotal` | Must be >= `quantitySold` | Can't go below already sold |
| `name`, `description`, `basePrice`, `transferrable`, `cancellable` | Editable | Cosmetic/policy changes |

**Enforcement**:
- **Server-side**: `updateTicketTypeForTenantAction` rejects `kind`/`tableId` changes and invalid `quantityTotal` when `quantitySold > 0`
- **Server-side**: `deleteTicketTypeForTenantAction` blocks deletion when `quantitySold > 0`
- **UI**: `TicketTypeForm` accepts `quantitySold` prop, disables Kind/Table selects and shows amber warning banner
- **UI**: `TicketsSection` disables delete button with tooltip when sales exist

## Public Events Pages

Public-facing event pages allow users to browse and view published events.

### Routes Structure

```
app/t/[tenant]/events/
├── page.tsx                    # Public events listing (published only)
└── [eventId]/
    └── page.tsx                # Public event detail page
```

### Components

Public event components are in `components/public/events/`:

- **public-events-list.tsx**: Grid of event cards with empty state
- **public-event-card.tsx**: Event card (name, date, venue, starting price)
- **public-event-detail.tsx**: Full event view with sidebar
- **ticket-types-display.tsx**: Ticket options with current pricing

### Server Actions

Public event server actions in `app/actions/public-events.ts`:

- `getPublicEventsForTenant(subdomain)`: Fetch published events (no auth required)
- `getPublicEventById(subdomain, eventId)`: Fetch single published event

### Key Features

- **No authentication required**: Public pages are accessible to anyone
- **Published events only**: Only `PUBLISHED` status events are visible
- **Dynamic pricing display**: Shows current price based on active price tiers
- **Availability indicators**: Shows "Sold out" or remaining quantity
- **Responsive grid**: 1-3 column layout based on screen size

## Shopping Cart System

### Architecture

- **One cart per user** (`userId` unique on Cart model) with 15-minute sliding window expiration
- **Price locking**: Unit price and price tier locked at time of adding to cart (`CartItem.unitPrice`, `CartItem.priceTierId`)
- **Seat reservation**: SEAT ticket types reserve specific seats via `CartItem.seatId`
- **Multi-tenant**: Cart items span multiple tenants, grouped by tenant at checkout
- **CartProvider placement**: Only rendered on tenant pages (not main domain/admin):
  - `app/t/[tenant]/(with-navbar)/layout.tsx`
  - `app/t/[tenant]/checkout/layout.tsx`
- **Safe hook**: `useCart()` returns NOOP default outside provider (no crash)

### Server Actions (`app/actions/cart.ts`)

- `getOrCreateCartAction()` — get user's cart or create one
- `addToCartAction(data)` — add item with price locking
- `updateCartItemAction(data)` — update quantity
- `removeCartItemAction(cartItemId)` — remove item

### Validation Schemas (`lib/validations/checkout.ts`)

- `addToCartSchema`: ticketTypeId, quantity, eventId, optional seatId
- `updateCartItemSchema`: cartItemId, quantity

## Checkout & Payment System

### PayMongo Integration

The platform uses PayMongo Checkout Sessions for payment processing.

- **Currency**: PHP (amounts stored in centavos — 100 = PHP 1.00)
- **Flow**: Cart → Attendee details → Create order (PENDING, 15-min expiry) → Create checkout session → Redirect to PayMongo → Webhook confirms payment → Tickets generated → Redirect to success page
- **Webhook**: `/api/webhooks/paymongo` handles `checkout_session.payment.paid` event
- **Signature verification**: HMAC-SHA256 with `"${timestamp}.${rawBody}"` format; `te` = test, `li` = live in `Paymongo-Signature` header
- **Success page sync fallback**: If webhook hasn't arrived yet, success page retrieves checkout session directly from PayMongo API

### Order Lifecycle

1. **Cart** (15-min sliding expiration) → items with locked prices
2. **Order creation** (PENDING, 15-min hard expiry) → inventory reserved (`quantitySold` incremented)
3. **Payment** → redirect to PayMongo checkout
4. **Webhook** → `confirmOrderFromPayment()` marks CONFIRMED, generates tickets, sends email
5. **Expiration** → `cancelExpiredOrder()` marks CANCELLED, releases inventory (`quantitySold` decremented)

### Internal Checkout Functions (`lib/checkout-internal.ts`)

**Security pattern**: These functions have NO auth checks and must only be called from authenticated contexts (server actions, webhook handlers, cron endpoints). **DO NOT add `'use server'` to this file.**

- `confirmOrderFromPayment(orderId, paymentData)` — confirm order, generate tickets, send email
- `cancelExpiredOrder(orderId)` — cancel single expired order, release inventory
- `cleanupExpiredOrders(userId, tenantId)` — cleanup for user+tenant
- `cleanupAllExpiredOrders()` — global cleanup (cron)
- `cleanupExpiredOrdersForTenant(tenantId)` — tenant-specific cleanup
- `sendConfirmationEmailForOrder(orderId)` — fire-and-forget email
- `generateTicketCode()` — generates `TKT-XXXX-XXXX` codes (nanoid)

### Cron Cleanup (`/api/cron/cleanup-orders`)

- Bearer token auth via `CRON_SECRET` env var
- Calls `cleanupAllExpiredOrders()` to release abandoned inventory
- Returns count of cancelled orders

### Checkout Routes

```
app/t/[tenant]/checkout/
├── layout.tsx                      # Validates tenant ACTIVE, provides CartProvider
├── page.tsx                        # Checkout flow (cart review, attendee forms)
└── success/
    └── [orderId]/
        └── page.tsx                # Order confirmation with ticket QR codes
```

### Key Files

- `app/actions/checkout.ts`: Server actions for creating orders and checkout sessions
- `lib/checkout-internal.ts`: Internal functions (order confirmation, cleanup, ticket generation)
- `app/api/webhooks/paymongo/route.ts`: Webhook handler for payment confirmation
- `app/api/cron/cleanup-orders/route.ts`: Cron job for expired order cleanup
- `lib/paymongo.ts`: PayMongo API client helper
- `lib/format.ts`: Currency formatting (`formatPhp()`)
- `lib/validations/checkout.ts`: Checkout/cart Zod schemas
- `components/checkout/`: Checkout flow components
- `components/cart/`: Shopping cart components

### Order Metadata

Order metadata (Json field) stores attendee data across the redirect to PayMongo. The `paymentAttendeeSchema` (from `lib/validations/checkout.ts`) is used for payment session data — distinct from the component-level `AttendeeData` type.

## Ticket QR Codes

- **Library**: `react-qr-code` (SVG-based, lightweight)
- **Component**: `components/ui/ticket-qr-code.tsx` — client component wrapper (`'use client'`)
- **Ticket detail page** (`/account/tickets/[ticketId]`): Full-size QR (192px) encoding `ticketCode`
- **Checkout success page**: Small QR (64px) next to each ticket in order confirmation
- QR encodes the `ticketCode` string (format: `TKT-XXXX-XXXX`)

## Team Management

### Invitation Flow

1. OWNER/ADMIN invites via email → `TenantInvitation` created with 7-day expiry token
2. SendGrid sends email with invite link (`/invite/[token]`)
3. Recipient clicks link → redirected to signin if not authenticated
4. Authenticated user sees invitation details → clicks "Accept"
5. `TenantMember` created, invitation marked ACCEPTED, user redirected to dashboard

### Server Actions (`app/actions/tenant-members.ts`)

- `getTeamMembersAction(subdomain)` — requires MANAGER+
- `inviteTeamMemberAction(subdomain, data)` — requires ADMIN+
- `updateTeamMemberAction(subdomain, memberId, data)` — OWNER for role changes, ADMIN for title/visibility
- `removeTeamMemberAction(subdomain, memberId)` — cannot remove self or OWNER
- `toggleMemberProfileVisibilityAction(memberId, visible)` — user toggles own `userShowInProfile`
- `getPendingInvitationsAction(subdomain)` — requires ADMIN+
- `revokeInvitationAction(subdomain, invitationId)` — requires ADMIN+

### Validation Schemas (`lib/validations/team.ts`)

- `inviteMemberSchema`: email, role (ADMIN/MANAGER/MEMBER), optional title
- `updateMemberSchema`: optional role, title, tenantShowInProfile

### Email (`lib/email.ts`)

- Uses SendGrid (`@sendgrid/mail`)
- Graceful fallback: logs to console when `SENDGRID_API_KEY` not set
- Env vars: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
