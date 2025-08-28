'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'
import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { trpc } from '@/lib/trpc/client'

const formSchema = z.object({
  amount: z.coerce.number()
    .min(0.01, 'Amount must be greater than 0')
    .nonnegative('Amount cannot be negative'),
  currency: z.string().min(1, 'Select a currency'),
  description: z.string().optional(),
  orderId: z.string().optional(),
  notifyUrl: z.string().url().optional().or(z.literal('')),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  returnUrl: z.string().url().optional().or(z.literal('')),
})

interface Currency {
  id: string
  name: string
  code: string
  symbol?: string
  imageUrl: string | null
  network: {
    name: string
    code: string
  }
  price?: number
}

interface CreateInvoiceFormProps {
  currencies: Currency[]
  merchantId: string
}

export function CreateInvoiceForm({ currencies, merchantId }: CreateInvoiceFormProps) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const createInvoiceMutation = trpc.invoice.create.useMutation({
    onSuccess: () => {
      utils.invoice.list.invalidate()
      toast.success('Invoice created successfully')
      router.push(`/dashboard/merchants/${merchantId}?tab=invoices`)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invoice')
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: currencies.length > 0 ? currencies[0].code : '',
      description: '',
      orderId: '',
      notifyUrl: '',
      redirectUrl: '',
      returnUrl: '',
    },
  })

  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency | undefined>(
    currencies.length > 0 ? currencies[0] : undefined
  )

  const handleCurrencyChange = React.useCallback((value: string) => {
    const currency = currencies.find(c => c.code === value)
    setSelectedCurrency(currency)
  }, [currencies])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Convert amount to string format as required by the API
    const formattedAmount = values.amount.toFixed(18).replace(/\.?0+$/, '')
    
    await createInvoiceMutation.mutateAsync({
      amount: formattedAmount,
      currency: values.currency,
      description: values.description || undefined,
      orderId: values.orderId || undefined,
      expiresIn: 10800, // 3 hours in seconds
      notifyUrl: values.notifyUrl || undefined,
      redirectUrl: values.redirectUrl || undefined,
      returnUrl: values.returnUrl || undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    USD
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accept Payment In</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  handleCurrencyChange(value)
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a currency">
                      {selectedCurrency && (
                        <div className="flex items-center gap-2">
                          {selectedCurrency.imageUrl && (
                            <Image
                              src={selectedCurrency.imageUrl}
                              alt={selectedCurrency.code}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          <span>{selectedCurrency.name}</span>
                          <span className="text-muted-foreground">({selectedCurrency.code})</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  <div className="p-2">
                    {currencies.map((currency) => (
                      <SelectItem
                        key={currency.code}
                        value={currency.code}
                        className="my-1 cursor-pointer hover:bg-accent rounded-md"
                      >
                        <div className="flex items-center gap-2 py-1">
                          {currency.imageUrl && (
                            <Image
                              src={currency.imageUrl}
                              alt={currency.code}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )}
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{currency.name}</span>
                            <span className="text-xs text-muted-foreground">{currency.network.name}</span>
                          </div>
                          {currency.price && (
                            <span className="text-xs text-muted-foreground">
                              ${currency.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <FormMessage />
              {selectedCurrency && (
                <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Network:</span>
                    <span className="font-medium">{selectedCurrency.network.name}</span>
                  </div>
                  {selectedCurrency.price && form.watch('amount') > 0 && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="text-muted-foreground">Estimated:</span>
                      <span className="font-medium">
                        {(form.watch('amount') / selectedCurrency.price).toFixed(8)} {selectedCurrency.code}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order ID (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., ORD-123456"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Add details about this invoice"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <div className="text-xs text-muted-foreground mt-1">
                This invoice will automatically expire in 3 hours
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium">Advanced Options (Optional)</h3>
          
          <FormField
            control={form.control}
            name="notifyUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://your-server.com/webhook"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  URL to receive payment notifications
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="redirectUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Success Redirect URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://your-site.com/success"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Where to redirect after successful payment
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="returnUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancel Return URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://your-site.com/cancel"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Where to return if payment is cancelled
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createInvoiceMutation.isPending || !form.watch('currency')}
        >
          {createInvoiceMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Invoice'
          )}
        </Button>
      </form>
    </Form>
  )
}
