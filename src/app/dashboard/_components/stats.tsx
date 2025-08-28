'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MdAccountBalanceWallet,
  MdPayment,
  MdStore,
  MdSecurity,
  MdSupport
} from 'react-icons/md'

export function DashboardStats() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <MdAccountBalanceWallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$12,345.67</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
          <MdPayment className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$2,345.00</div>
          <p className="text-xs text-muted-foreground">
            5 pending transactions
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 
