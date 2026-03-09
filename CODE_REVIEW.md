# Code Review Checklist (Feb 2026)

Track progress on issues found during comprehensive code review. Update checkboxes as fixes are applied.

## CRITICAL — Security (fix before production)

- [x] **Payment bypass: `confirmOrderFromPayment` exported as server action** — Moved to `lib/checkout-internal.ts`. Also moved `cancelExpiredOrder`, `cleanupExpiredOrders`, `cleanupAllExpiredOrders`, `cleanupExpiredOrdersForTenant`, `sendConfirmationEmailForOrder`, `generateTicketCode`. _(fixed 2026-02-23)_
- [x] **Invitation accepts without email verification** — Added `user.email !== invitation.email` check in `acceptInvitationAction`. _(fixed 2026-02-23)_
- [x] **No password strength validation on signup** — Added `password.length < 8` check in `signUpAction`. _(fixed 2026-02-23)_

## HIGH — Security

- [x] **No subdomain reservation blocklist** — `app/actions/organizer.ts:110`. Added blocklist of 28 reserved subdomains. _(fixed 2026-02-23)_
- [x] **`saveApplicationAction` accepts `any` without validation** — `app/actions/organizer.ts:169`. Changed to `unknown`, added step-specific Zod schemas. _(fixed 2026-02-23)_
- [x] **`completeCheckoutAction` missing Zod validation** — `app/actions/checkout.ts:673`. Added `completeCheckoutWithAttendeesSchema` and `.safeParse()`. _(fixed 2026-02-23)_
- [x] **`deleteFileAction` no ownership check** — `app/actions/upload.ts:61`. Added user ID check on URL path. _(fixed 2026-02-23)_
- [x] **`removeTeamMemberAction` permission logic inverted** — `app/actions/tenant-members.ts:228`. Fixed to `hasMinimumRole(target.role, 'ADMIN')`. _(fixed 2026-02-23)_
- [x] **Broken token regeneration on re-invite** — `app/actions/tenant-members.ts:112`. Replaced `undefined` with `crypto.randomUUID()`. _(fixed 2026-02-23)_
- [x] **`cleanupAllExpiredOrders` callable without auth** — Moved to `lib/checkout-internal.ts` (no longer a server action). _(fixed 2026-02-23)_

## MEDIUM — Security

- [x] **Inactive/suspended tenants publicly visible** — Added `getActiveTenantBySubdomain()` in `lib/tenant.ts` that checks `status: 'ACTIVE'`. Used in `public-events.ts` and tenant layout. _(fixed 2026-02-23)_
- [x] **Checkout routes no server-side tenant validation** — Created `app/t/[tenant]/checkout/layout.tsx` with `getActiveTenantBySubdomain` check. _(fixed 2026-02-23)_
- [x] **Voucher code error leaks existence across tenants** — Changed to generic "Invalid voucher code" message in `checkout.ts`. _(fixed 2026-02-23)_
- [x] **Upload action user-controlled `folder` param** — Added `ALLOWED_FOLDER_PREFIXES` allowlist in `upload.ts`. _(fixed 2026-02-23)_
- [x] **No URL validation on image/logo/banner URLs** — Added `isValidStorageUrl()` in `tenant-page.ts`, URL validation in `tenant-events.ts`. _(fixed 2026-02-23)_
- [x] **No security headers** — Added X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in `next.config.ts`. _(fixed 2026-02-23)_
- [x] **JWT role not refreshed on demotion** — Added periodic role refresh via `roleCheckedAt` timestamp (5min TTL) in `auth.ts`. _(fixed 2026-02-23)_
- [x] **No rate limiting on auth** — Added Upstash `@upstash/ratelimit` in `lib/rate-limit.ts`, applied to signIn/signUp/forgotPassword. _(fixed 2026-02-23)_

## HIGH — Performance

- [x] **`cacheComponents: false` disables component caching** — Removed from `next.config.ts`. _(fixed 2026-02-23)_
- [x] **`CartProvider`/`CartDrawer` in root layout for ALL routes** — Moved to tenant-only layouts (`(with-navbar)/layout.tsx`, `checkout/layout.tsx`). Made `useCart()` safe outside provider with NOOP default. _(fixed 2026-02-23)_
- [x] **Native `<img>` tags instead of Next.js `<Image>`** — Replaced in `public-event-card.tsx`, `public-event-detail.tsx`, `ticket-types-display.tsx`, tenant landing page. Added `images.remotePatterns` for Vercel Blob. _(fixed 2026-02-23)_
- [x] **`getCurrentTenant` not wrapped in `cache()`** — Wrapped `getTenantBySubdomain` in React `cache()` in `lib/tenant.ts`. _(fixed 2026-02-23)_
- [x] **Redundant `verifyEventBelongsToTenant` queries** — Combined verify + main query using compound `where: { id, tenantId }` for 4 event-level actions. _(fixed 2026-02-23)_
- [x] **No pagination on admin/attendee/order list queries** — Added `page`/`pageSize` params to `admin-users.ts` and `admin-tenants.ts`. _(fixed 2026-02-23)_
- [x] **4 Google Fonts loaded on every page** — Removed unused `Inter_Tight` and `Geist_Mono` from `app/layout.tsx`. _(fixed 2026-02-23)_
- [x] **Missing `revalidatePath` for public tenant pages** — Added `/t/${subdomain}/events`, `/t/${subdomain}/events/${eventId}`, `/t/${subdomain}` to publish/archive/update actions. _(fixed 2026-02-23)_

## MEDIUM — Performance

- [x] **Over-fetching without `select` in list queries** — Added `select` to `getEventsForTenantAction`, `getAllEventsAction`, and dashboard events page inline query. Updated `EventsList` component type. _(fixed 2026-02-23)_
- [x] **`getPublicEventById` triggers `cleanupExpiredOrders` side effect** — Removed fire-and-forget `cleanupExpiredOrdersForTenant()` from `public-events.ts`. Cron handles this. _(fixed 2026-02-23)_
- [x] **Dynamic import of Prisma in server component** — Replaced `await import('@/lib/prisma')` with static import in `app/dashboard/[tenant]/events/[eventId]/page.tsx`. _(fixed 2026-02-23)_
- [x] **`unstable_noStore` redundant on auth-gated pages** — Removed from `app/account/page.tsx` and `account/tickets/page.tsx`. _(fixed 2026-02-23)_
- [ ] **Duplicate Radix UI packages** — `package.json`. Both `radix-ui` and individual `@radix-ui/*` listed. Kept intentionally — `radix-ui` umbrella used by shadcn.

## HIGH — Code Quality

- [x] **Massive duplication: `events.ts` vs `tenant-events.ts`** — Created `lib/event-helpers.ts` with 17 shared CRUD helpers (tables, ticket types, price tiers, promotions, vouchers). Both action files are now thin auth wrappers. _(fixed 2026-02-23)_
- [x] **Duplicate `OrderWithRelations` types diverging** — Created `lib/types/order.ts` with 6 shared types (`CheckoutOrderWithRelations`, `AccountOrderWithRelations`, `TicketWithRelations`, `TicketWithTicketType`, `OrderListItem`, `OrderItemWithRelations`). Consumers import directly from types file. _(fixed 2026-02-23)_
- [x] **5+ duplicate `formatCurrency` functions** — Replaced with `formatPhp` from `lib/format.ts` in 5 dashboard components. Fixed `/100` bug in `orders-section.tsx` (amounts are PHP, not centavos). _(fixed 2026-02-23)_
- [x] **Repeated order include block ~8 times** — Extracted `ORDER_WITH_RELATIONS_INCLUDE` constant in `checkout.ts`, replaced 7 inline include blocks. _(fixed 2026-02-23)_
- [x] **Duplicated ticket generation logic x3** — Extracted `generateTicketsForOrder()` in `lib/checkout-internal.ts`, replaced 3 duplicate loops in `confirmOrderFromPayment`, `completeCheckoutAction`, `confirmFreeOrderAction`. _(fixed 2026-02-23)_

## MEDIUM — Code Quality

- [x] **`any` types in server actions** — `admin.ts:142`, `tenant-members.ts:179`, `organizer.ts:8-12,280`. Replaced with explicit typed objects, proper Zod schemas, and `TenantMemberRole`/`OrganizerApplicationStatus` enum types. _(fixed 2026-02-23)_
- [x] **Debug `console.log` in production** — `tickets-section.tsx:72,75`, `ticket-type-form.tsx:66`. Removed. _(fixed 2026-02-23)_
- [x] **Inconsistent Prisma imports** — `auth.ts:9`, `profile.ts:5` used `@/prisma/client`. Standardized to `import { prisma } from '@/lib/prisma'`. _(fixed 2026-02-23)_
- [x] **Auth/profile forms bypass Zod** — Created `lib/validations/auth.ts` (signUp, signIn, forgotPassword, resetPassword schemas) and `lib/validations/profile.ts` (updateProfile, updatePassword schemas). Refactored all 6 actions to use `.safeParse()`. _(fixed 2026-02-23)_
- [ ] **Inconsistent return types** — Mix of `{ data }`, `{ success: true }`, `{ error }`. Define `ActionResult<T>` and `ActionSuccess` types. _Deferred: touches ~34 actions + consumers, low ROI._
- [x] **~30 identical catch blocks in `tenant-events.ts`** — Extracted `handleActionError()` in `lib/action-utils.ts` with known error pattern matching and custom handler support. Replaced ~34 catch blocks. Updated consumers to use `'error' in result` for proper TS narrowing. _(fixed 2026-02-23)_
- [ ] **Missing return type annotations** — Most exported server actions lack explicit return types. _Deferred: 68 functions, TypeScript inference is sufficient._
- [x] **`as any` in components** — `dashboard-application-wizard.tsx:88-91`. Replaced with specific type casts (`PastEvent[]`, `Venue[]`, `ArtistsTalent`, `Reference[]`). _(fixed 2026-02-23)_
- [x] **`inviteTeamMemberAction` uses stale `user.name` from JWT** — `tenant-members.ts:125`. Now fetches fresh `firstName`/`lastName` from DB. _(fixed 2026-02-23)_
- [x] **Tautological ticket validation** — `lib/event-helpers.ts`. Removed 4 unreachable `table.mode` checks in `createTicketType` and `updateTicketType` (TableMode enum only has EXCLUSIVE and SHARED). _(fixed 2026-02-23)_
- [x] **`updateTable` doesn't regenerate seats on capacity change** — `lib/event-helpers.ts`. Wrapped in transaction, detects capacity change, deletes and recreates seats. _(fixed 2026-02-23)_

## LOW — Code Quality / Architecture

- [ ] **No `error.tsx` boundaries** — Only root-level exists. Add at `app/t/[tenant]/`, `app/dashboard/[tenant]/`, `app/admin/`.
- [ ] **No `not-found.tsx` boundaries** — Dashboard/tenant segments get generic bare page. Add segment-specific files.
- [ ] **Double tenant validation (layout + pages)** — `app/t/[tenant]/(with-navbar)/layout.tsx` validates, then child pages re-validate. Remove child checks.
- [ ] **Redundant auth checks in dashboard layouts** — Parent `dashboard/layout.tsx` checks auth with wrong callbackUrl, child re-checks.
- [ ] **Profile page uses `<Link>` for cross-domain nav** — `app/t/[tenant]/(with-navbar)/profile/page.tsx:99`. Should use `<a href={mainUrl(...)}>`.
- [ ] **Missing composite DB indexes** — `order.prisma`. Add `@@index([status, expiresAt])` and `@@index([userId, tenantId, status])`.
- [ ] **Typo in admin page** — `app/admin/users/page.tsx:12`. "Error Loading 2Users" (extra `2`).
- [ ] **`addToCartAction` missing Zod validation** — `app/actions/cart.ts:188`. Add `.safeParse()`.
- [ ] **`dotenv` in production deps** — `package.json`. Move to devDependencies.

## Completed

_Move items here as they are fixed, with date._
