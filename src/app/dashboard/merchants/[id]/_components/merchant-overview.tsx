'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { 
  getNetworkDisplayStandard, 
  getCurrencyIcon,
  formatCurrencyAmount,
  getNetworkColor 
} from '@/lib/crypto-assets-config'


interface MerchantOverviewProps {
  merchantId: string
}

export function MerchantOverview({ merchantId }: MerchantOverviewProps) {
  const { data: balances, isLoading, error } = trpc.merchant.getBalances.useQuery({
    merchantId
  })
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading balances: {error.message}</p>
      </div>
    )
  }

  if (!balances || balances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No balances available</p>
      </div>
    )
  }

  const totalValue = balances.reduce((sum, balance) => sum + balance.value, 0)
  const activeBalances = balances.filter(b => b.balance > 0)

  return (
    <div className="space-y-6">
      {/* Total Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Total Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            {formatCurrency(totalValue)}
          </div>
          <p className="text-sm text-muted-foreground">
            {activeBalances.length} currencies with balance
          </p>
        </CardContent>
      </Card>

      {/* Individual Balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance, index) => (
          <Card key={`${balance.currency}-${balance.network}-${index}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {balance.imageUrl ? (
                  <img 
                    src={balance.imageUrl} 
                    alt={balance.name}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  // Fallback to config icon if balance doesn't have imageUrl
                  getCurrencyIcon(balance.currency) && (
                    <img 
                      src={getCurrencyIcon(balance.currency)!} 
                      alt={balance.currency}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )
                )}
                <div>
                  <CardTitle className="text-base">{balance.currency}</CardTitle>
                  <p className="text-xs text-muted-foreground">{balance.name}</p>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className="w-fit text-xs"
                style={{ 
                  backgroundColor: getNetworkColor(balance.currency, balance.network) || undefined,
                  color: getNetworkColor(balance.currency, balance.network) ? 'white' : undefined
                }}
              >
                {getNetworkDisplayStandard(balance.currency, balance.network, true)}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-xl font-semibold">
                    {formatCurrencyAmount(balance.balance, balance.currency)} {balance.currency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ≈ {formatCurrency(balance.value)}
                  </div>
                </div>
                
                {balance.balance > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Available: {formatCurrencyAmount(balance.availableBalance, balance.currency)}</div>
                    {balance.lockedBalance > 0 && (
                      <div className="text-orange-500">
                        Locked: {formatCurrencyAmount(balance.lockedBalance, balance.currency)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBalances.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {activeBalances.length > 0 ? formatCurrency(activeBalances[0].value) : '$0.00'}
            </div>
            {activeBalances.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {activeBalances[0].currency}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {formatCurrency(balances.reduce((sum, b) => sum + (b.balance * b.price), 0))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
