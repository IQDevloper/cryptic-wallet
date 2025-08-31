'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { getSupportedCurrencies } from '@/lib/crypto-config'
import Image from 'next/image'

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
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Create New Invoice
            {isTestnet && (
              <span className="text-sm font-normal text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                Testnet Mode
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
                />
              </div>

              <div className="space-y-2">
                <Label>Currency *</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={(value) => {
                    setSelectedCurrency(value)
                    setSelectedNetwork('') // Reset network when currency changes
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <div className="flex items-center gap-2">
                          <Image 
                            src={currency.icon} 
                            alt={currency.code} 
                            width={20} 
                            height={20} 
                            className="rounded-full"
                          />
                          <span>{currency.code} - {currency.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCurrency && (
              <div className="space-y-2">
                <Label>Network *</Label>
                <Select
                  value={selectedNetwork}
                  onValueChange={setSelectedNetwork}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCurrencyData?.networks.map((network) => (
                      <SelectItem key={network.network} value={network.network}>
                        {network.displayName || network.network.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Payment for..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                name="orderId"
                placeholder="Optional order reference"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
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
        </CardContent>
      </Card>
    </div>
  )
}
