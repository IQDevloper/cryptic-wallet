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
import { gql, useMutation } from '@apollo/client'
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

import { Currency } from '@/graphql/generated/graphql'
import { client } from '@/lib/apollo-client'
import { GET_MERCHANT_INVOICES } from '../merchants/merchant-invoices'

const formSchema = z.object({
  amount: z.coerce.number()
    .min(0.01, 'Amount must be greater than 0')
    .nonnegative('Amount cannot be negative'),
  acceptedCurrencies: z.array(z.string()).min(1, 'Select at least one currency'),
  title: z.string().optional(),
  description: z.string().optional(),
})

const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
    }
  }
`

interface CreateInvoiceFormProps {
  currencies: Currency[]
  merchantId: string
}

export function CreateInvoiceForm({ currencies, merchantId }: CreateInvoiceFormProps) {
  useCsrf()
  const router = useRouter()
  const [createInvoice, { loading }] = useMutation(CREATE_INVOICE)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      acceptedCurrencies: currencies.map(c => c.code),
      title: '',
      description: '',
    },
  })

  const handleCurrencySelection = React.useCallback((value: string, field: any) => {
    if (value === 'all') {
      field.onChange(currencies.map(c => c.code));
    } else if (value === 'none') {
      field.onChange([]);
    } else {
      const values = new Set(field.value || []);
      if (values.has(value)) {
        values.delete(value);
      } else {
        values.add(value);
      }
      field.onChange(Array.from(values));
    }
  }, [currencies]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000)
      await createInvoice({
        variables: {
          input: {
            ...values,
            merchantId,
            expiresAt,
            fixedPrice: true,
          },
        },
      })
      await client.refetchQueries({
        include: [GET_MERCHANT_INVOICES],
      })

      toast({
        title: 'Success',
        description: 'Invoice created successfully'
      })
      router.push(`/dashboard/merchants/${merchantId}?tab=invoices`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invoice',
      })
    }
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
          name="acceptedCurrencies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accept Payment In</FormLabel>
              <Select
                onValueChange={(value) => handleCurrencySelection(value, field)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {field.value?.length === currencies.length
                        ? "All Currencies Selected"
                        : field.value?.length === 0
                          ? "Select Currencies"
                          : `${field.value?.length} Currencies Selected`}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  <div className="sticky top-0 bg-background border-b p-2 space-y-2">
                    <SelectItem value="all" className="font-medium">
                      <div className="flex items-center gap-2">
                        <Check className={cn(
                          "h-4 w-4",
                          field.value?.length === currencies.length ? "opacity-100" : "opacity-0"
                        )} />
                        <span>Select All Currencies</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="none" className="font-medium text-destructive">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        <span>Clear Selection</span>
                      </div>
                    </SelectItem>
                  </div>
                  <div className="p-2">
                    {currencies.map((currency) => (
                      <SelectItem
                        key={currency.code}
                        value={currency.code}
                        className="my-1 cursor-pointer hover:bg-accent rounded-md"
                      >
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex items-center gap-2 flex-1">
                            <Image
                              src={currency.imageUrl}
                              alt={currency.code}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{currency.name}</span>
                              <span className="text-xs text-muted-foreground">{currency.network}</span>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 flex-shrink-0",
                              field.value?.includes(currency.code) ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>

              {/* Selected Currencies Display */}
              <div className="mt-2 flex flex-wrap gap-2">
                {field.value?.map((code) => {
                  const currency = currencies.find(c => c.code === code);
                  if (!currency) return null;

                  return (
                    <div
                      key={code}
                      className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full text-sm hover:bg-secondary/80 transition-colors"
                    >
                      <Image
                        src={currency.imageUrl}
                        alt={currency.code}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span>{currency.name}</span>
                      <button
                        type="button"
                        className="hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-full"
                        onClick={() => handleCurrencySelection(code, field)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <FormMessage />
              {field.value?.length === 0 && (
                <p className="text-sm text-destructive mt-1">
                  Please select at least one currency
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Customer can pay using any of the selected currencies
              </p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Monthly Service Payment"
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

        <Button
          type="submit"
          className="w-full"
          disabled={loading || form.watch('acceptedCurrencies').length === 0}
        >
          {loading ? (
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
