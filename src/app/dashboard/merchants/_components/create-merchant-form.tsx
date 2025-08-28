'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const createMerchantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().max(500, 'Business name too long').optional(),
  webhookUrl: z.string().url('Invalid webhook URL').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

type CreateMerchantFormData = z.infer<typeof createMerchantSchema>

export function CreateMerchantForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateMerchantFormData>({
    resolver: zodResolver(createMerchantSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const createMerchant = trpc.merchant.create.useMutation({
    onSuccess: (data) => {
      setSubmitSuccess(true)
      setSubmitError(null)
      setTimeout(() => {
        router.push(`/dashboard/merchants/${data.id}`)
      }, 1500)
    },
    onError: (error) => {
      setSubmitError(error.message)
      setSubmitSuccess(false)
      setIsSubmitting(false)
    },
  })

  const onSubmit = async (data: CreateMerchantFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await createMerchant.mutateAsync({
        name: data.name,
        email: data.email,
        businessName: data.businessName || undefined,
        webhookUrl: data.webhookUrl || undefined,
        isActive: data.isActive,
      })
    } catch (error) {
      // Error handled by mutation onError
    }
  }

  const isActiveValue = watch('isActive')

  if (submitSuccess) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Merchant created successfully! Redirecting to merchant details...
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Merchant Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter merchant name"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="merchant@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            {...register('businessName')}
            placeholder="Optional business name"
            disabled={isSubmitting}
          />
          {errors.businessName && (
            <p className="text-sm text-destructive">{errors.businessName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            type="url"
            {...register('webhookUrl')}
            placeholder="https://your-site.com/webhook"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Optional webhook URL to receive payment notifications
          </p>
          {errors.webhookUrl && (
            <p className="text-sm text-destructive">{errors.webhookUrl.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="isActive">Active Status</Label>
            <p className="text-xs text-muted-foreground">
              Whether this merchant can create new invoices
            </p>
          </div>
          <Switch
            id="isActive"
            checked={isActiveValue}
            onCheckedChange={(checked) => setValue('isActive', checked)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Merchant'
          )}
        </Button>
      </div>
    </form>
  )
}
