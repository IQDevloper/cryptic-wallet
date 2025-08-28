'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Eye, EyeOff, RefreshCw, Settings, Webhook } from 'lucide-react'
import { MerchantStats } from './merchant-stats'
import { formatDistanceToNow } from 'date-fns'

interface MerchantDetailsProps {
  merchantId: string
}

export function MerchantDetails({ merchantId }: MerchantDetailsProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: merchant, isLoading, refetch } = trpc.merchant.getById.useQuery({ merchantId })
  const { data: wallets } = trpc.merchant.getWallets.useQuery(
    undefined,
    { enabled: !!merchant }
  )
  
  const regenerateApiKey = trpc.merchant.regenerateApiKey.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!merchant) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Merchant not found</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{merchant.name}</h1>
          <p className="text-muted-foreground">{merchant.email}</p>
        </div>
        <Badge variant={merchant.isActive ? 'default' : 'secondary'}>
          {merchant.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Stats */}
      <MerchantStats merchantId={merchantId} />

      {/* Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Configuration</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{merchant.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{merchant.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={merchant.isActive ? 'default' : 'secondary'} className="w-fit">
                    {merchant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(merchant.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {merchant.businessName && (
                <div>
                  <Label className="text-sm font-medium">Business Name</Label>
                  <p className="text-sm text-muted-foreground">{merchant.businessName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={merchant.apiKey}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(merchant.apiKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => regenerateApiKey.mutate({ merchantId })}
                  disabled={regenerateApiKey.isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate API Key
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  Keep your API key secure. It provides full access to your merchant account.
                  Use it in the Authorization header: <code>Bearer {merchant.apiKey}</code>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Merchant Wallets</CardTitle>
            </CardHeader>
            <CardContent>
              {wallets && wallets.length > 0 ? (
                <div className="space-y-4">
                  {wallets.map((wallet) => (
                    <div key={wallet.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{wallet.currency.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.currency.symbol} on {wallet.currency.network.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{wallet.balance || '0.00'}</p>
                        <p className="text-xs text-muted-foreground">Balance</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No wallets created yet. Wallets are automatically created when you create your first invoice for each currency.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={merchant.webhookUrl || ''}
                    placeholder="https://your-site.com/webhook"
                    readOnly
                  />
                </div>
                {merchant.webhookUrl ? (
                  <Alert>
                    <AlertDescription>
                      Webhook notifications will be sent to this URL for payment events.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No webhook URL configured. Set up a webhook to receive real-time payment notifications.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
