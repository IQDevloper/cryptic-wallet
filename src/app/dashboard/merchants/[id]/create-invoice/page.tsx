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

export default async function CreateInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: merchantId } = await params
  const merchant = await getMerchant(merchantId)
  

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
            <CreateInvoiceForm merchantId={merchantId} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
