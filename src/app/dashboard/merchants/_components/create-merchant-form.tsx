'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'

// Validation schema matching the updated Merchant model
const merchantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  websiteUrl: z.string().url('Please enter a valid URL'),
  businessAddress: z.string().max(500, 'Business address must be less than 500 characters').optional(),
  taxId: z.string().max(50, 'Tax ID must be less than 50 characters').optional(),
})

type MerchantFormData = z.infer<typeof merchantSchema>

export function CreateMerchantForm() {
    const router = useRouter()
    const utils = trpc.useUtils()
    const createMerchant = trpc.merchant.create.useMutation({
        onSuccess: () => {
            // Invalidate and refetch merchants list
            utils.merchant.list.invalidate()
            toast.success('Merchant created successfully')
            router.push('/dashboard/merchants')
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create merchant')
        }
    })

    const form = useForm<MerchantFormData>({
        resolver: zodResolver(merchantSchema),
        defaultValues: {
            name: '',
            websiteUrl: '',
            businessAddress: '',
            taxId: ''
        }
    })

    async function onSubmit(data: MerchantFormData) {
        try {
            await createMerchant.mutateAsync({
                name: data.name,
                websiteUrl: data.websiteUrl,
                businessAddress: data.businessAddress || undefined,
                taxId: data.taxId || undefined,
                webhookUrl: undefined, // Optional
                isActive: true,
            })
        } catch (error) {
            // Error handling is done in the mutation's onError callback
            console.error('Create merchant error:', error)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Merchant Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter merchant name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Website URL</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="https://example.com"
                                    type="url"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Business Address (Optional)</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter business address"
                                    className="min-h-[80px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tax ID (Optional)</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter tax identification number"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/dashboard/merchants')}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createMerchant.isPending}
                    >
                        {createMerchant.isPending ? 'Creating...' : 'Create Merchant'}
                    </Button>
                </div>
            </form>
        </Form>
    )
} 
