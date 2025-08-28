import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import getMerchant from './actions/getMerchant'
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { MerchantHeader } from './_components/merchant-header'
import { redirect } from 'next/navigation'

// Lazy load components
const MerchantApiKeys = dynamic(
    () => import('./_components/merchant-api-keys').then(mod => mod.MerchantApiKeys),
    {
        loading: () => <Skeleton className="h-[400px] w-full" />
    }
)

const MerchantWebhooks = dynamic(
    () => import('./_components/merchant-webhooks').then(mod => mod.MerchantWebhooks),
    {
        loading: () => <Skeleton className="h-[400px] w-full" />
    }
)

const MerchantInvoices = dynamic(
    () => import('./_components/merchant-invoices').then(mod => mod.MerchantInvoices),
    {
        loading: () => <Skeleton className="h-[400px] w-full" />
    }
)

const MerchantOverview = dynamic(
    () => import('./_components/merchant-overview').then(mod => mod.MerchantOverview),
    {
        loading: () => <Skeleton className="h-[400px] w-full" />
    }
)

const MerchantSettings = dynamic(
    () => import('./_components/merchant-settings').then(mod => mod.MerchantSettings),
    {
        loading: () => <Skeleton className="h-[400px] w-full" />
    }
)

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'integration', label: 'Integration' },
    { id: 'settings', label: 'Settings' }
]

export default async function MerchantPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string }>
}) {
    const { id: merchantId } = await params
    const merchant = await getMerchant(merchantId)
    const tab = (await searchParams).tab ?? 'overview'

    // Validate tab parameter
    if (!tabs.find(t => t.id === tab)) {
        redirect(`/dashboard/merchants/${merchantId}?tab=overview`)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <MerchantHeader merchant={merchant} />
                <Button asChild>
                    <Link href={`/dashboard/merchants/${merchantId}/create-invoice`}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Create Invoice
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue={tab} className="space-y-4">
                <TabsList>
                    {tabs.map(({ id, label }) => (
                        <TabsTrigger
                            key={id}
                            value={id}
                            asChild
                        >
                            <Link href={`/dashboard/merchants/${merchantId}?tab=${id}`}>
                                {label}
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {tab === 'overview' && (
                        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                            <MerchantOverview merchantId={merchantId} />
                        </Suspense>
                    )}
                </TabsContent>

                <TabsContent value="integration" className="space-y-4">
                    {tab === 'integration' && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <MerchantApiKeys merchant={merchant} />
                            <MerchantWebhooks merchant={merchant} />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="invoices" className="space-y-4">
                    {tab === 'invoices' && (
                        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                            <MerchantInvoices merchant={merchant} />
                        </Suspense>
                    )}
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    {tab === 'settings' && (
                        <MerchantSettings merchant={merchant} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
} 
