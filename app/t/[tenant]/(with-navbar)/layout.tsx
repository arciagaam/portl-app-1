import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getActiveTenantBySubdomain } from '@/lib/tenant'
import { TenantNavbar } from '@/components/layout/tenant-navbar'
import { CartProvider, CartDrawer } from '@/components/cart'

type TenantWithNavbarLayoutProps = {
    children: ReactNode
    params: Promise<{ tenant: string }>
}

export default async function TenantWithNavbarLayout({
    children,
    params,
}: TenantWithNavbarLayoutProps) {
    const { tenant: subdomain } = await params
    const tenant = await getActiveTenantBySubdomain(subdomain)

    if (!tenant) {
        notFound()
    }

    return (
        <div className="dark">
            <CartProvider>
                <TenantNavbar
                    tenantSubdomain={subdomain}
                    tenantName={tenant.name}
                    tenantLogoUrl={tenant.logoUrl ?? undefined}
                />
                <main className="pt-16">
                    {children}
                </main>
                <CartDrawer />
            </CartProvider>
        </div>
    )
}
