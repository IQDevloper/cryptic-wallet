'use client'

import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { Copy, ExternalLink, QrCode } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function InvoicePage() {
  const params = useParams()
  const merchantId = params.id as string
  const invoiceId = params.invoiceId as string
  const [showQR, setShowQR] = useState(false)

  const { data: invoice, isLoading, error } = trpc.invoice.get.useQuery({
    merchantId,
    invoiceId
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-500">Error loading invoice: {error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Invoice not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'EXPIRED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.id.slice(-8)}</h1>
            <p className="text-muted-foreground">
              Created {new Date(invoice.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">
                  {invoice.amount} {invoice.currency}
                </p>
                <p className="text-sm text-muted-foreground">
                  Network: {invoice.network?.toUpperCase() || 'N/A'}
                </p>
              </div>

              {invoice.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p>{invoice.description}</p>
                </div>
              )}

              {invoice.orderId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                  <p className="font-mono">{invoice.orderId}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground">Expires</p>
                <p>{new Date(invoice.expiresAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Send Payment To:
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <code className="flex-1 text-sm break-all font-mono">
                    {invoice.depositAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invoice.depositAddress, 'Address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="flex-1"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQR ? 'Hide QR' : 'Show QR'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(
                    invoice.qrCodeData || invoice.depositAddress, 
                    'Payment URI'
                  )}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copy URI
                </Button>
              </div>

              {showQR && (
                <div className="flex justify-center p-4 bg-white border rounded-lg">
                  {/* QR Code placeholder - you can add a QR code library here */}
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">QR Code</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Add QR library for display
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle>Status Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
                <p>{invoice.amountPaid || '0'} {invoice.currency}</p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid At</p>
                  <p>{new Date(invoice.paidAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            {invoice.transactions && invoice.transactions.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-2">Recent Transactions</h4>
                <div className="space-y-2">
                  {invoice.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-mono text-sm">{tx.txHash}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.amount} {invoice.currency} • {tx.status}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
