'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Loader2 } from 'lucide-react'

interface CreateInvoiceFormProps {
  merchantId: string
}

// Determine if we're in testnet mode
const isTestnet = process.env.NEXT_PUBLIC_TATUM_ENVIRONMENT === 'testnet'

// Quick select popular currencies
const QUICK_SELECT_CURRENCIES = ['ETH', 'BTC', 'USDT', 'USDC']

export function CreateInvoiceForm({ merchantId }: CreateInvoiceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [openCurrencyDialog, setOpenCurrencyDialog] = useState(false)

  // Fetch active currencies from server
  const { data: currencies, isLoading: loadingCurrencies, error: currenciesError } = trpc.currency.getActiveAssets.useQuery()

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

  // Handle loading and error states
  if (loadingCurrencies) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading currencies...</span>
      </div>
    )
  }

  if (currenciesError) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
        <p className="text-destructive">Error loading currencies: {currenciesError.message}</p>
      </div>
    )
  }

  if (!currencies || currencies.length === 0) {
    return (
      <div className="p-4 bg-muted border rounded-lg">
        <p className="text-muted-foreground">No currencies available. Please contact support.</p>
      </div>
    )
  }

  // Add testnet suffix for display in testnet mode
  const CURRENCIES = currencies.map(currency => ({
    ...currency,
    name: isTestnet && !currency.name.includes('Testnet') ? `${currency.name} (Testnet)` : currency.name
  }))

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency)
  const quickSelectCurrencies = CURRENCIES.filter(c => QUICK_SELECT_CURRENCIES.includes(c.code))

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quick Select Currency Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {quickSelectCurrencies.map((currency) => (
            <button
              key={currency.code}
              type="button"
              onClick={() => {
                setSelectedCurrency(currency.code)
                setSelectedNetwork('')
              }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                selectedCurrency === currency.code
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background hover:bg-accent border-input"
              )}
            >
              <Image
                src={currency.icon}
                alt={currency.code}
                width={20}
                height={20}
                className="rounded-full"
              />
              {currency.code}
            </button>
          ))}

          {/* More Button with Dialog */}
          <Dialog open={openCurrencyDialog} onOpenChange={setOpenCurrencyDialog}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full border text-sm font-medium transition-all bg-background hover:bg-accent border-input"
              >
                More
                <ChevronDown className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Select Currency</DialogTitle>
              </DialogHeader>
              <Command>
                <CommandInput placeholder="Search currency..." />
                <CommandList>
                  <CommandEmpty>No currency found.</CommandEmpty>
                  <CommandGroup>
                    {CURRENCIES.map((currency) => (
                      <CommandItem
                        key={currency.code}
                        value={currency.code}
                        onSelect={() => {
                          setSelectedCurrency(currency.code)
                          setSelectedNetwork('')
                          setOpenCurrencyDialog(false)
                        }}
                      >
                        <Image
                          src={currency.icon}
                          alt={currency.code}
                          width={24}
                          height={24}
                          className="rounded-full mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{currency.code}</div>
                          <div className="text-xs text-muted-foreground">{currency.name}</div>
                        </div>
                        {selectedCurrency === currency.code && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-5">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.00"
              required
              className="h-10"
            />
          </div>

          {/* Deposit Currency Dropdown */}
          <div className="space-y-2">
            <Label>Deposit Currency *</Label>
            <Dialog open={openCurrencyDialog} onOpenChange={setOpenCurrencyDialog}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 bg-background border rounded-md text-left hover:bg-accent transition-colors",
                    !selectedCurrency && "text-muted-foreground"
                  )}
                >
                  {selectedCurrency ? (
                    <div className="flex items-center gap-2">
                      <Image
                        src={selectedCurrencyData?.icon || ''}
                        alt={selectedCurrency}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span className="font-medium">{selectedCurrency}</span>
                    </div>
                  ) : (
                    <span>Select currency</span>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DialogTrigger>
            </Dialog>
          </div>

          {/* Network Selection Dropdown */}
          {selectedCurrency && selectedCurrencyData && (
            <div className="space-y-2">
              <Label>Choose Coin Network *</Label>
              <Select
                value={selectedNetwork}
                onValueChange={setSelectedNetwork}
                required
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCurrencyData.networks.map((network) => (
                    <SelectItem key={network.network} value={network.network}>
                      {network.displayName || network.network.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Payment for..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Order ID */}
          <div className="space-y-2">
            <Label htmlFor="orderId">Order ID (Optional)</Label>
            <Input
              id="orderId"
              name="orderId"
              placeholder="ORD-12345"
            />
          </div>
        </div>

        {/* Testnet Warning */}
        {isTestnet && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <span className="text-xs text-yellow-800 dark:text-yellow-200">
              Testnet Mode - Test transactions only
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCurrency || !selectedNetwork}
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
