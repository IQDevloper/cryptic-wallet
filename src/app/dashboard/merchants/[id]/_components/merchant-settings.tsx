'use client'

import { useState } from 'react'
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import type { Merchant } from '@prisma/client'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const merchantSettingsSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    businessName: z.string().optional(),
    businessAddress: z.string().optional(),
    taxId: z.string().optional(),
})

export function MerchantSettings({ merchant }: { merchant: Merchant }) {
    const [isEditing, setIsEditing] = useState(false)
    const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)
    
    const updateMerchant = trpc.merchant.update.useMutation({
        onSuccess: () => {
            toast.success('Merchant settings updated successfully')
            setIsEditing(false)
        },
        onError: () => {
            toast.error('Failed to update merchant settings')
        }
    })

    const updateStatus = trpc.merchant.updateStatus.useMutation({
        onSuccess: () => {
            toast.success('Merchant status updated successfully')
            setIsSuspendDialogOpen(false)
        },
        onError: () => {
            toast.error('Failed to update merchant status')
        }
    })

    const form = useForm({
        resolver: zodResolver(merchantSettingsSchema),
        defaultValues: {
            name: merchant.name,
            businessName: merchant.businessName || '',
            businessAddress: merchant.businessAddress || '',
            taxId: merchant.taxId || '',
        }
    })

    async function onSubmit(data: z.infer<typeof merchantSettingsSchema>) {
        updateMerchant.mutate({
            merchantId: merchant.id,
            ...data
        })
    }

    async function handleSuspendMerchant() {
        updateStatus.mutate({
            merchantId: merchant.id,
            isActive: false
        })
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>
                        Manage your merchant account settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Merchant Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="businessName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Business Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!isEditing} />
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
                                        <FormLabel>Business Address</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!isEditing} />
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
                                        <FormLabel>Tax ID</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!isEditing} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-4">
                                {!isEditing ? (
                                    <Button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Settings
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsEditing(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={updateMerchant.isPending}>
                                            {updateMerchant.isPending ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible and destructive actions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold">Suspend Merchant</h4>
                            <p className="text-sm text-muted-foreground">
                                Temporarily disable this merchant's ability to process payments
                            </p>
                        </div>
                        <Button 
                            variant="destructive"
                            onClick={() => setIsSuspendDialogOpen(true)}
                            disabled={updateStatus.isPending}
                        >
                            {updateStatus.isPending ? 'Suspending...' : 'Suspend'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={isSuspendDialogOpen}
                onOpenChange={setIsSuspendDialogOpen}
                onConfirm={handleSuspendMerchant}
                title="Suspend Merchant"
                description={`Are you sure you want to suspend ${merchant.name}? This will immediately stop all payment processing for this merchant.`}
                confirmText="Suspend Merchant"
                variant="destructive"
            />
        </div>
    )
} 
