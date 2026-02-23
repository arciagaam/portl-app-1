import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

/**
 * Next.js 15 Proxy Function (replaces middleware)
 *
 * Subdomain-based routing:
 * - admin.domain.com → rewrites to /admin routes
 * - tenant.domain.com → rewrites to /t/tenant routes
 * - Direct /t/* access on main domain → redirects to subdomain
 *
 * NOTE: This runs in Edge Runtime which doesn't support:
 * - Prisma (use Node.js runtime in pages/API routes instead)
 * - Full Node.js APIs
 */
export async function proxy(request: NextRequest) {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname

    // Skip static files and API routes early
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/favicon') ||
        /\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|map)$/i.test(pathname)
    ) {
        return NextResponse.next()
    }

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'lvh.me:3000'
    // Strip port for hostname comparison
    const rootHostname = rootDomain.split(':')[0]
    const currentHostname = host.split(':')[0]

    const stripPrefixFromPath = (path: string, prefix: string) => {
        if (path === prefix) return '/'
        if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || '/'
        return null
    }

    // --- Admin subdomain ---
    if (currentHostname === `admin.${rootHostname}`) {
        const strippedAdminPath = stripPrefixFromPath(pathname, '/admin')
        if (strippedAdminPath) {
            const canonicalAdminUrl = new URL(request.url)
            canonicalAdminUrl.pathname = strippedAdminPath
            return NextResponse.redirect(canonicalAdminUrl)
        }

        return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url))
    }

    // /admin route on main domain → redirect to admin subdomain
    if (pathname.startsWith('/admin') && currentHostname === rootHostname) {
        const adminUrl = new URL(request.url)
        adminUrl.host = `admin.${rootDomain}`
        adminUrl.pathname = pathname.replace(/^\/admin/, '') || '/'
        return NextResponse.redirect(adminUrl)
    }

    // --- Tenant subdomain ---
    // Check if current host is a subdomain of root domain (not admin, not main)
    if (
        currentHostname !== rootHostname &&
        currentHostname !== `admin.${rootHostname}` &&
        currentHostname.endsWith(`.${rootHostname}`)
    ) {
        const subdomain = currentHostname.replace(`.${rootHostname}`, '')
        const strippedTenantPath = stripPrefixFromPath(pathname, `/t/${subdomain}`)

        if (strippedTenantPath) {
            const canonicalTenantUrl = new URL(request.url)
            canonicalTenantUrl.pathname = strippedTenantPath
            return NextResponse.redirect(canonicalTenantUrl)
        }

        // Rewrite to internal /t/[tenant] routes
        return NextResponse.rewrite(new URL(`/t/${subdomain}${pathname}`, request.url))
    }

    // --- Main domain only below ---

    // Redirect /t/[tenant]/* on main domain → tenant subdomain
    if (pathname.startsWith('/t/') && currentHostname === rootHostname) {
        const segments = pathname.split('/')
        // segments: ['', 't', 'tenant-slug', ...rest]
        const subdomain = segments[2]
        if (subdomain) {
            const rest = segments.slice(3).join('/')
            const tenantUrl = new URL(request.url)
            tenantUrl.host = `${subdomain}.${rootDomain}`
            tenantUrl.pathname = rest ? `/${rest}` : '/'
            return NextResponse.redirect(tenantUrl)
        }
    }

    // Redirect authenticated users away from auth pages (main domain only)
    if (pathname.startsWith('/auth/') && currentHostname === rootHostname) {
        try {
            const session = await auth()
            if (session?.user) {
                return NextResponse.redirect(new URL('/account', request.url))
            }
        } catch {
            const sessionCookie = request.cookies.get('authjs.session-token') ||
                                 request.cookies.get('__Secure-authjs.session-token') ||
                                 request.cookies.get('next-auth.session-token') ||
                                 request.cookies.get('__Secure-next-auth.session-token')
            if (sessionCookie) {
                return NextResponse.redirect(new URL('/account', request.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|avif|css|js|woff|woff2|ttf|eot|map)$).*)',
    ],
}
