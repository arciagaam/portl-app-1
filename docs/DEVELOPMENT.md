# Development

## Local Testing

Uses `lvh.me` which resolves to `127.0.0.1` and supports wildcard subdomains:
- Landing page: `http://lvh.me:3000`
- Tenant pages: `http://acme.lvh.me:3000/events`
- Dashboard: `http://lvh.me:3000/dashboard`
- Admin: `http://admin.lvh.me:3000`

No `/etc/hosts` configuration needed - `lvh.me` works out of the box.

### Environment Variables

**Required for local dev**:
```
AUTH_URL="http://lvh.me:3000"
NEXT_PUBLIC_APP_URL="http://lvh.me:3000"
NEXT_PUBLIC_ROOT_DOMAIN="lvh.me:3000"
DATABASE_URL="postgresql://..."
```

**Payments**:
- `PAYMONGO_SECRET_KEY`, `PAYMONGO_PUBLIC_KEY` — PayMongo API keys
- `PAYMONGO_WEBHOOK_SECRET` — Webhook signature verification

**Email**:
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` — SendGrid (graceful fallback to console)

**Storage**:
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage

**Rate Limiting** (optional, graceful fallback):
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — Upstash Redis

**Cron**:
- `CRON_SECRET` — Bearer token for cron endpoint auth

## Database Workflow

1. Modify schema files in `prisma/models/*.prisma` (multi-file schema)
2. Run `pnpm prisma:migrate` to create migration
3. Run `pnpm prisma:generate` to update Prisma Client
4. Import types from `@/prisma/generated/prisma/client`

## Adding shadcn/ui Components

The project uses shadcn/ui. Components are in `components/ui/` and use:
- Radix UI primitives
- Tailwind CSS 4
- `class-variance-authority` for variants
- `tailwind-merge` for class merging

## API Route Patterns

API routes follow this pattern:
```typescript
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Your logic here
}
```

## Type Safety

- **Always use generated Prisma types** from `@/prisma/generated/prisma/client`
- **Never manually define types** that duplicate Prisma-generated types
- For models with relationships, use the pattern: `Model & Prisma.ModelGetPayload<{include: {...}}>`
- Match type includes with actual Prisma query includes for type safety
- NextAuth session types extended in `types/next-auth.d.ts`
- TypeScript strict mode enabled

### Prisma Type Pattern

When working with Prisma models that have relationships:

```typescript
import { OrganizerApplication, Prisma } from '@/prisma/generated/prisma/client';

// For models with relationships, use GetPayload to ensure type safety
type ApplicationWithRelations = OrganizerApplication & Prisma.OrganizerApplicationGetPayload<{
  include: {
    tenant: {
      include: {
        owner: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
    notes: {
      include: {
        user: {
          select: {
            id: true;
            email: true;
            firstName: true;
            lastName: true;
          };
        };
      };
    };
  };
}>;
```

**Important**: The `include` structure in your type definition should exactly match the `include` structure in your Prisma query to ensure type safety.
