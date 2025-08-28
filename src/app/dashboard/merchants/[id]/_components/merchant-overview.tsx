'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc/client'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'


export function MerchantOverview({ merchantId }: { merchantId: string }) {
  const { data: balances, isLoading } = trpc.merchant.getBalances.useQuery({
    merchantId,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Total Balance Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <Skeleton className="h-4 w-[100px] mb-2" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <div className="flex items-center -space-x-2">
                {[1, 2, 3].map((_, index) => (
                  <Skeleton key={index} className="h-6 w-6 rounded-full" />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px] mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Balances Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px] mb-2" />
                <Skeleton className="h-4 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!balances || balances.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No wallets created yet</p>
      </div>
    )
  }

  // Calculate total balance in USD
  const totalBalance = balances.reduce((sum, balance) => {
    return sum + (balance.amount * balance.price)
  }, 0)

  // Get currencies with non-zero balances for display
  const activeBalances = balances.filter(b => b.amount > 0)

  return (
    <div className="space-y-4">
      {/* Total Balance Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <p className="text-xs text-muted-foreground">All currencies combined</p>
            </div>
            <div className="flex items-center -space-x-2">
              {activeBalances.slice(0, 3).map((balance) => (
                balance.currency.imageUrl && (
                  <Image
                    key={balance.currency.code}
                    src={balance.currency.imageUrl}
                    alt={balance.currency.name}
                    width={24}
                    height={24}
                    className="rounded-full border-2 border-background"
                  />
                )
              ))}
              {activeBalances.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{activeBalances.length - 3}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">
              {formatCurrency(totalBalance)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="sm">
                Withdraw
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                Convert
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Currency Balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => (
          <Card key={balance.currency.code}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {balance.currency.name} Balance
              </CardTitle>
              {balance.currency.imageUrl && (
                <Image
                  src={balance.currency.imageUrl}
                  alt={balance.currency.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balance.amount.toFixed(8)} {balance.currency.code}
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ {formatCurrency(balance.amount * balance.price)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Network: {balance.currency.network.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Currencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBalances.length}</div>
            <p className="text-xs text-muted-foreground">With balance = 0</p> 
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balances.length}</div>
            <p className="text-xs text-muted-foreground">Created wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balances.length > 0 
                ? formatCurrency(Math.max(...balances.map(b => b.amount * b.price)))
                : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {balances.length > 0 && balances[0] 
                ? balances[0].currency.code
                : 'No balance'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {balances.length > 0 
                ? new Date(balances[0].lastUpdated).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Real-time prices</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
