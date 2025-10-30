'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { getSupportedCurrencies } from '@/lib/crypto-config'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Compass, Sparkles } from 'lucide-react'

interface CreateInvoiceFormProps {
  merchantId: string
}

// Determine if we're in testnet mode (this could come from an env variable or API)
const isTestnet = process.env.NEXT_PUBLIC_TATUM_ENVIRONMENT === 'testnet'

// Get supported currencies from our crypto configuration
const CURRENCIES = getSupportedCurrencies().map(currency => ({
  ...currency,
  // Add testnet suffix for display in testnet mode
  name: isTestnet && !currency.name.includes('Testnet') ? `${currency.name} (Testnet)` : currency.name
}))

export function CreateInvoiceForm({ merchantId }: CreateInvoiceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  
  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: (invoice) => {
      toast.success(`Invoice ${invoice.id} created successfully`)
      router.push(`/dashboard/merchants/${merchantId}/invoices/${invoice.id}`)
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
      setIsSubmitting(false)
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const amount = parseFloat(formData.get('amount') as string)
    const currency = selectedCurrency
    const network = selectedNetwork
    const description = formData.get('description') as string
    const orderId = formData.get('orderId') as string

    if (!currency || !network) {
      toast.error('Please select both currency and network')
      setIsSubmitting(false)
      return
    }

    createInvoice.mutate({
      merchantId,
      amount,
      currency,
      network,
      description: description || undefined,
      orderId: orderId || undefined,
    })
  }

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency)

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border bg-card/90 shadow-2xl">
      <div className="absolute -top-32 -right-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="absolute -bottom-48 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
      <div className="relative z-10 flex flex-col gap-10 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="gap-1 rounded-full border-primary/40 bg-primary/10 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Smart invoice composer
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Bring your next payment request to life
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Combine precise amounts with curated crypto networks, and add narrative details so your customers know exactly what they are approving.
            </p>
          </div>
          {isTestnet && (
            <div className="flex items-center gap-2 rounded-full border border-yellow-200/40 bg-yellow-100/70 px-3 py-1 text-xs font-medium text-yellow-700 shadow-sm">
              <Compass className="h-3.5 w-3.5" aria-hidden /> Testnet mode enabled
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="group rounded-2xl border border-border/70 bg-background/60 p-5 shadow-inner transition hover:border-primary/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">Amount *</Label>
                  <span className="text-xs text-muted-foreground">In crypto value</span>
                </div>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.000001"
                  min="0"
                  placeholder="0.00"
                  required
                  className="h-12 rounded-xl border-0 bg-background/80 text-lg shadow-sm ring-1 ring-inset ring-border focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="group rounded-2xl border border-border/70 bg-background/60 p-5 shadow-inner transition hover:border-primary/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">Currency *</Label>
                  <span className="text-xs text-muted-foreground">Choose asset</span>
                </div>
                <Select
                  value={selectedCurrency}
                  onValueChange={(value) => {
                    setSelectedCurrency(value)
                    setSelectedNetwork('')
                  }}
                  required
                >
                  <SelectTrigger className="h-12 rounded-xl border-0 bg-background/80 text-left text-base shadow-sm ring-1 ring-inset ring-border focus:ring-2 focus:ring-primary">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-border bg-background/95 shadow-xl">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code} className="rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Image
                            src={currency.icon}
                            alt={currency.code}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                          <span className="text-sm font-medium">{currency.code}</span>
                          <span className="text-xs text-muted-foreground">{currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {selectedCurrency && (
            <div className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Network *</p>
                  <p className="text-xs text-primary/80">Optimized routes for {selectedCurrency}</p>
                </div>
                {selectedCurrencyData && (
                  <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                    <Image
                      src={selectedCurrencyData.icon}
                      alt={selectedCurrencyData.code}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                    {selectedCurrencyData.name}
                  </div>
                )}
              </div>
              <Select
                value={selectedNetwork}
                onValueChange={setSelectedNetwork}
                required
              >
                <SelectTrigger className="h-12 rounded-xl border-0 bg-background/80 text-left text-base shadow-sm ring-1 ring-inset ring-primary/40 focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-primary/40 bg-background/95 shadow-xl">
                  {selectedCurrencyData?.networks.map((network) => (
                    <SelectItem key={network.network} value={network.network} className="rounded-xl px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{network.displayName || network.network.toUpperCase()}</span>
                        {network.nativeAssetSymbol && (
                          <span className="text-xs text-muted-foreground">Native token: {network.nativeAssetSymbol}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-5 shadow-inner">
              <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">Narrative</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Share the story behind this invoice..."
                rows={4}
                className="rounded-xl border-0 bg-background/80 shadow-sm ring-1 ring-inset ring-border focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Visible to customers — perfect for product details or gratitude notes.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-5 shadow-inner">
              <Label htmlFor="orderId" className="text-sm font-medium text-muted-foreground">Order reference</Label>
              <Input
                id="orderId"
                name="orderId"
                placeholder="Optional order reference"
                className="h-12 rounded-xl border-0 bg-background/80 text-base shadow-sm ring-1 ring-inset ring-border focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground">Connect invoices to your CRM, help desk, or fulfillment workflow.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-12 flex-1 rounded-xl border-dashed"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedCurrency || !selectedNetwork}
              className="h-12 flex-1 rounded-xl bg-gradient-to-r from-primary via-primary/90 to-emerald-500 text-base font-semibold shadow-lg transition hover:brightness-110"
            >
              {isSubmitting ? 'Creating...' : 'Launch invoice'}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
