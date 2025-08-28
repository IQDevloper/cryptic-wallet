'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from "sonner"
import { trpc } from '@/lib/trpc/client'
import type { Merchant } from '@prisma/client'
import { Bell } from 'lucide-react'

export function MerchantWebhooks({ merchant }: { merchant: Merchant }) {
  const [url, setUrl] = useState(merchant.webhookUrl || '')
  
  const updateWebhook = trpc.merchant.updateWebhookUrl.useMutation({
    onSuccess: () => {
      toast.success('Webhook URL updated successfully')
    },
    onError: () => {
      toast.error('Failed to update webhook URL')
    }
  })

  const saveWebhook = async () => {
    updateWebhook.mutate({
      merchantId: merchant.id,
      webhookUrl: url
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>
          Configure webhook endpoints to receive real-time payment notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-domain.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={saveWebhook} disabled={updateWebhook.isPending}>
              {updateWebhook.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Available Events</h4>
          <div className="grid gap-2">
            {['payment.created', 'payment.completed', 'payment.failed'].map((event) => (
              <div key={event} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{event}</span>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 
