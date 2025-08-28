'use client'

import { use } from 'react'
import { MerchantDetails } from '../_components/merchant-details'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'

interface MerchantPageProps {
  params: Promise<{ id: string }>
}

export default function MerchantPage({ params }: MerchantPageProps) {
  const { id: merchantId } = use(params)

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/merchants">Merchants</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <MerchantDetails merchantId={merchantId} />
    </div>
  )
} 
