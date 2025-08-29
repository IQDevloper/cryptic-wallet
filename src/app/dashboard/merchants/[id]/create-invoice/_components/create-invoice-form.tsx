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

interface CreateInvoiceFormProps {
  merchantId: string
}

const CURRENCIES = [
  { code: 'USDT', name: 'Tether USD', networks: ['ethereum', 'bsc', 'tron', 'polygon'] },
  { code: 'BTC', name: 'Bitcoin', networks: ['bitcoin'] },
  { code: 'ETH', name: 'Ethereum', networks: ['ethereum'] },
  { code: 'BNB', name: 'BNB', networks: ['bsc'] },
  { code: 'TRX', name: 'TRON', networks: ['tron'] },
  { code: 'MATIC', name: 'Polygon', networks: ['polygon'] }
]

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
          <CardTitle>Create New Invoice</CardTitle>
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
                        {currency.code} - {currency.name}
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
                      <SelectItem key={network} value={network}>
                        {network.toUpperCase()}
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
