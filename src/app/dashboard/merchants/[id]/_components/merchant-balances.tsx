'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { Merchant } from '@prisma/client'

export function MerchantBalances({ merchant }: { merchant: Merchant }) {
  const { data: balancesData, isLoading } = trpc.merchant.getBalances.useQuery({
    merchantId: merchant.id
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
    );
  }

  // Calculate total balance using real prices
  const totalBalance = balancesData?.reduce((sum: number, balance: any) => {
    return sum + (balance.amount * (balance.price || 0));
  }, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Total Balance Card */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <p className="text-xs text-muted-foreground">All currencies</p>
            </div>
            <div className="flex items-center -space-x-2">
              {balancesData?.map((balance: any) => (
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-4">
              {formatCurrency(totalBalance)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                Withdraw
              </Button>

            </div>
          </CardContent>
        </Card>
      </div>
      {/* Individual Balances */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {balancesData?.map((balance: any) => (
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
                {balance.amount} {balance.currency.code.split('_')[0]}
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ {formatCurrency(balance.amount * (balance.price || 0))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
