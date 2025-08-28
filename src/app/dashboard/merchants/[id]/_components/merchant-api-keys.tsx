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
import { Copy, Eye, EyeOff, Key } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { Merchant } from '@prisma/client'

export function MerchantApiKeys({ merchant }: { merchant: Merchant }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false)
  
  const regenerateApiKey = trpc.merchant.regenerateApiKey.useMutation({
    onSuccess: () => {
      setIsRegenerateDialogOpen(false)
      toast.success('API key regenerated successfully. Make sure to update your integration.')
    },
    onError: () => {
      toast.error('Failed to regenerate API key')
    }
  })

  const handleCopyApiKey = (key: string) => () => {
    navigator.clipboard.writeText(key)
    toast.success('API key copied to clipboard')
  }

  const handleRegenerateKey = async () => {
    regenerateApiKey.mutate({ merchantId: merchant.id })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Manage your API keys for secure access to our payment services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Live API Key</h4>
            <div className="flex gap-2">
              <Input
                type={isVisible ? 'text' : 'password'}
                value={merchant.apiKey}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsVisible(!isVisible)}
                title={isVisible ? 'Hide API key' : 'Show API key'}
              >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyApiKey(merchant.apiKey)}
                title="Copy API key"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>Status: {merchant.isActive ? 'Active' : 'Inactive'}</p>
              <p>Created: {new Date(merchant.apiKeyCreatedAt).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              This key is used for live transactions. Keep it secure and never share it publicly.
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Security Controls</h4>
                <p className="text-sm text-muted-foreground">
                  Manage your API key security settings
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsRegenerateDialogOpen(true)}
                className="flex items-center gap-2"
                disabled={regenerateApiKey.isPending}
              >
                <Key className="h-4 w-4" />
                {regenerateApiKey.isPending ? 'Regenerating...' : 'Regenerate Key'}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-md bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium">Integration Example</h4>
          <pre className="text-xs overflow-x-auto">
            {`curl -X POST https://api.cryptopayments.com/v1/invoices \\
  -H "Authorization: Bearer ${isVisible ? merchant.apiKey : '••••••••••••••••'}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 100, "currency": "BTC"}'`}
          </pre>
        </div>
      </CardContent>

      <ConfirmDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        onConfirm={handleRegenerateKey}
        title="Regenerate API Key"
        description="Are you sure you want to regenerate the API key? The current key will be invalidated immediately and any integrations using it will stop working."
        confirmText="Regenerate Key"
        variant="destructive"
      />
    </Card>
  )
}
