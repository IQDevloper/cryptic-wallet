import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { CreateInvoiceForm } from './_components/create-invoice-form'
import getMerchant from '../actions/getMerchant'
import { Clock, QrCode, ShieldCheck, Sparkles } from 'lucide-react'

export default async function CreateInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: merchantId } = await params
  const merchant = await getMerchant(merchantId)
  const recentInvoice = merchant.invoices?.[0]
  const highlightCards = [
    {
      icon: Sparkles,
      title: 'Smart presets',
      description: 'Remember the last networks you used and accelerate future payments.'
    },
    {
      icon: QrCode,
      title: 'Ready-to-share',
      description: 'Generate QR and deep links that connect customers to the right wallet.'
    },
    {
      icon: ShieldCheck,
      title: 'Payment assurance',
      description: 'Automatic status updates keep you and your team in sync.'
    }
  ] as const


  return (
    <div className="space-y-8">
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

        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-xl sm:p-10">
          <div className="absolute -left-24 top-0 h-52 w-52 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 text-primary">
                {merchant.name}
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Craft a beautifully branded invoice in moments
                </h1>
                <p className="text-base text-muted-foreground sm:text-lg">
                  Personalize the payment experience with currency-aware invoices, smart network routing, and instant confirmations for your customers.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {highlightCards.map((item) => (
                  <div key={item.title} className="group flex gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border/80 bg-background/80 p-6 backdrop-blur supports-[backdrop-filter]:bg-background/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Last invoice drafted</p>
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
              {recentInvoice ? (
                <div className="space-y-2">
                  <p className="text-2xl font-semibold text-foreground">
                    {recentInvoice.currency} {recentInvoice.amount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(recentInvoice.createdAt).toLocaleString()}
                  </p>
                  {recentInvoice.description && (
                    <p className="rounded-lg bg-muted/60 p-2 text-sm text-muted-foreground">
                      “{recentInvoice.description}”
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-semibold text-foreground">No invoices yet</p>
                  <p className="text-sm text-muted-foreground">
                    Your first invoice is just a few fields away.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tailor the amount, currency, and memo before sending a secure payment request.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CreateInvoiceForm merchantId={merchantId} />

        <aside className="flex flex-col gap-4 rounded-3xl border bg-card/70 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Creative invoicing tips</h2>
          <ul className="space-y-4 text-sm text-muted-foreground">
            <li className="rounded-2xl bg-muted/40 p-4">
              🎨 <span className="font-medium text-foreground">Tell your brand story.</span> Add context in the description so customers know exactly what they are paying for.
            </li>
            <li className="rounded-2xl bg-muted/40 p-4">
              💡 <span className="font-medium text-foreground">Match the right network.</span> Pick the chain that offers the best experience for your customer’s wallet.
            </li>
            <li className="rounded-2xl bg-muted/40 p-4">
              🚀 <span className="font-medium text-foreground">Automate follow-ups.</span> Use order IDs to sync this invoice with your support tools.
            </li>
          </ul>
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
            Need recurring invoices? Save this layout as a template and duplicate it whenever you launch a new product.
          </div>
        </aside>
      </div>
    </div>
  )
}
