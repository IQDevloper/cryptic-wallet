'use client'

import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import {
  Copy,
  Check,
  ArrowLeft,
  Clock,
  Wallet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import QRCode from 'react-qr-code'
import {
  getNetworkDisplayStandard,
  getCurrencyIcon,
  formatCurrencyAmount,
  getNetworkColor
} from '@/lib/crypto-assets-config'
import { cn } from '@/lib/utils'

export default function InvoicePage() {
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string
  const invoiceId = params.invoiceId as string
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const { data: invoice, isLoading, error } = trpc.invoice.get.useQuery({
    merchantId,
    invoiceId
  })

  // Calculate time remaining
  useEffect(() => {
    if (!invoice?.expiresAt) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(invoice.expiresAt).getTime()
      const distance = expiry - now

      if (distance < 0) {
        setTimeLeft('Expired')
        clearInterval(interval)
        return
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [invoice?.expiresAt])

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle2 className="h-4 w-4" />
      case 'EXPIRED':
        return <XCircle className="h-4 w-4" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4" />
      case 'PENDING':
      default:
        return <Timer className="h-4 w-4" />
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          bg: 'bg-green-500/10',
          text: 'text-green-500',
          border: 'border-green-500/20'
        }
      case 'PENDING':
        return {
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-500',
          border: 'border-yellow-500/20'
        }
      case 'EXPIRED':
        return {
          bg: 'bg-red-500/10',
          text: 'text-red-500',
          border: 'border-red-500/20'
        }
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          border: 'border-muted'
        }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-12 w-64 bg-card/50 rounded-lg animate-pulse" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-[600px] bg-card/50 rounded-xl animate-pulse" />
            <div className="h-[600px] bg-card/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invoice Not Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {error?.message || 'The requested invoice could not be loaded.'}
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusConfig = getStatusConfig(invoice.status)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Payment Invoice
              </h1>
              <p className="text-sm text-muted-foreground">
                Invoice #{invoice.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "flex items-center gap-2 px-4 py-2 border",
              statusConfig.bg,
              statusConfig.text,
              statusConfig.border
            )}
          >
            {getStatusIcon(invoice.status)}
            {invoice.status}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Payment Card */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardContent className="p-6 md:p-8 space-y-8">

              {/* Amount Display */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border">
                  {getCurrencyIcon(invoice.currency) && (
                    <img
                      src={getCurrencyIcon(invoice.currency)!}
                      alt={invoice.currency}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Amount Due</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-4xl font-bold text-primary">
                        {formatCurrencyAmount(parseFloat(invoice.amount), invoice.currency)}
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        {invoice.currency}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className="text-xs font-medium"
                    style={{
                      backgroundColor: getNetworkColor(invoice.currency, invoice.network) || '#ef9f0b',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {getNetworkDisplayStandard(invoice.currency, invoice.network)}
                  </Badge>
                </div>

                {invoice.status === 'PENDING' && timeLeft && timeLeft !== 'Expired' && (
                  <div className="flex items-center justify-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Expires in {timeLeft}</span>
                  </div>
                )}
              </div>

              {/* Payment Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  <span>Send {invoice.currency} to this address</span>
                </div>

                <div className="flex flex-wrap items-start gap-2 p-4 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <code className="flex-1 min-w-0 text-sm font-mono break-all whitespace-normal text-foreground">
                    {invoice.depositAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 p-0"
                    onClick={() => copyToClipboard(invoice.depositAddress, 'Address')}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Invoice Details */}
              {(invoice.description || invoice.orderId) && (
                <div className="grid gap-4 md:grid-cols-2 pt-6 border-t border-border">
                  {invoice.description && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Description</p>
                      <p className="text-sm text-foreground">{invoice.description}</p>
                    </div>
                  )}
                  {invoice.orderId && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Order ID</p>
                      <p className="text-sm font-mono text-foreground">{invoice.orderId}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Progress */}
              {invoice.amountPaid && parseFloat(invoice.amountPaid) > 0 && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-medium text-foreground">
                      {formatCurrencyAmount(parseFloat(invoice.amountPaid), invoice.currency)} / {formatCurrencyAmount(parseFloat(invoice.amount), invoice.currency)} {invoice.currency}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((parseFloat(invoice.amountPaid) / parseFloat(invoice.amount)) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Transactions */}
              {invoice.transactions && invoice.transactions.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-border">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Recent Transactions
                  </h4>
                  <div className="space-y-2">
                    {invoice.transactions.slice(0, 3).map((tx: any) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-muted-foreground truncate">
                            {tx.txHash}
                          </p>
                          <p className="text-xs text-green-500 font-medium mt-1">
                            +{formatCurrencyAmount(parseFloat(tx.amount), invoice.currency)} {invoice.currency}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code Card */}
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg text-foreground">Scan to Pay</h3>
                <p className="text-xs text-muted-foreground">
                  Scan with your {invoice.currency} wallet
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center p-6 bg-background rounded-xl border border-border">
                <QRCode
                  value={invoice.qrCodeData || invoice.depositAddress}
                  size={200}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(invoice.qrCodeData || invoice.depositAddress, 'Payment URI')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Payment URI
              </Button>

              {/* Timeline */}
              <div className="pt-6 border-t border-border space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Created</p>
                    <p className="text-muted-foreground">{new Date(invoice.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <div className={cn(
                    "h-2 w-2 rounded-full mt-1",
                    invoice.status === 'EXPIRED' || timeLeft === 'Expired' ? "bg-destructive" : "bg-yellow-500"
                  )} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Expires</p>
                    <p className="text-muted-foreground">{new Date(invoice.expiresAt).toLocaleString()}</p>
                  </div>
                </div>
                {invoice.paidAt && (
                  <div className="flex items-start gap-3 text-xs">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Paid</p>
                      <p className="text-muted-foreground">{new Date(invoice.paidAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Instructions */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">Payment Instructions</p>
                <p className="text-muted-foreground">
                  Send exactly <strong className="text-foreground">{formatCurrencyAmount(parseFloat(invoice.amount), invoice.currency)} {invoice.currency}</strong> to the address above.
                  The payment will be automatically confirmed once the transaction is verified on the blockchain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
