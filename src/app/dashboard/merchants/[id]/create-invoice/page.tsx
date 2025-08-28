import { CreateInvoiceForm } from './_components/create-invoice-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'
import getMerchant from '../actions/getMerchant'
import { prisma } from '@/lib/prisma'
import { fetchPricesFromAPI } from '@/services/price-provider'

export default async function CreateInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: merchantId } = await params
  const merchant = await getMerchant(merchantId)
  
  // Get currencies with wallet data
  const currencies = await prisma.currency.findMany({
    where: {
      wallets: {
        some: {
          merchantId: merchant.id
        }
      }
    },
    select: {
      id: true,
      name: true,
      code: true,
      imageUrl: true,
      network: true
    }
  })

  // Get currency prices from external API
  const currencyCodes = currencies.map(c => c.code)
  const prices = await fetchPricesFromAPI(currencyCodes)

  // Merge prices with currency data
  const currenciesWithPrices = currencies.map(currency => ({
    ...currency,
    price: prices[currency.code] || 0
  }))

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
            <BreadcrumbLink asChild>
              <Link href={`/dashboard/merchants/${merchantId}`}>{merchant.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Create Invoice</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>New Invoice</CardTitle>
            <CardDescription>
              Generate payment request for {merchant.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateInvoiceForm currencies={currenciesWithPrices} merchantId={merchantId} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
