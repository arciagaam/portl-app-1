import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getActiveTenantBySubdomain } from '@/lib/tenant'
import { CartProvider, CartDrawer } from '@/components/cart'

type CheckoutLayoutProps = {
    children: ReactNode
    params: Promise<{ tenant: string }>
}

export default async function CheckoutLayout({
    children,
    params,
}: CheckoutLayoutProps) {
    const { tenant: subdomain } = await params
    const tenant = await getActiveTenantBySubdomain(subdomain)

    if (!tenant) {
        notFound()
    }

    return (
        <CartProvider>
            {children}
            <CartDrawer />
        </CartProvider>
    )
}
