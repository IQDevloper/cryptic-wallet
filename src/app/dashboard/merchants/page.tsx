import { Suspense } from 'react'
import { MerchantsList } from './_components/merchants-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function MerchantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Merchants</h1>
        <Button asChild>
          <Link href="/dashboard/merchants/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Merchant
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div>Loading merchants...</div>}>
        <MerchantsList />
      </Suspense>
    </div>
  )
} 
