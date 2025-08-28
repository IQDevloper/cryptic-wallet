'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Store, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

// Type matching the merchant list API response
type MerchantListItem = {
  id: string
  name: string
  isActive: boolean
  webhookUrl: string | null
  createdAt: string
  _count: {
    invoices: number
  }
  stats: {
    totalInvoices: number
    totalRevenue: string
    successRate: string
  }
}

// Format currency helper function
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}

export function MerchantsList() {
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantListItem | null>(null)
  const { data, isLoading, error } = trpc.merchant.list.useQuery({
    page: 1,
    limit: 50,
  })

  if (isLoading) return <div>Loading merchants...</div>
  if (error) return <div>Error loading merchants</div>

  const merchants = data?.merchants || []

  if (merchants.length === 0) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <Store className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-medium">No merchants found</h3>
          <p className="text-sm text-muted-foreground">
            Create your first merchant to start accepting payments.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Income for today</TableHead>
            <TableHead>Total turnover</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merchants.map((merchant: MerchantListItem) => {
            // Calculate today's income (using total revenue as approximation)
            const todayIncome = parseFloat(merchant.stats.totalRevenue) / 30 // Rough daily average
            const percentageChange = merchant.stats.successRate

            return (
              <TableRow key={merchant.id}>
                <TableCell className="font-medium">
                  <Link 
                    href={`/dashboard/merchants/${merchant.id}`} 
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Store className="h-4 w-4 text-muted-foreground" />
                    {merchant.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div>{formatCurrency(todayIncome)}</div>
                    <div className="text-xs text-green-500">
                      {percentageChange}%
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {formatCurrency(merchant.stats.totalRevenue)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={merchant.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/merchants/${merchant.id}`}>
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/merchants/${merchant.id}?tab=settings`}>
                          Edit Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedMerchant(merchant)
                          // TODO: Add suspend functionality
                        }}
                      >
                        Suspend Merchant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    'ACTIVE': 'bg-green-50 text-green-700 border-green-300',
    'INACTIVE': 'bg-red-50 text-red-700 border-red-300',
    'NEW': 'bg-blue-50 text-blue-700 border-blue-300',
    'REJECTED': 'bg-red-50 text-red-700 border-red-300',
    'SUSPENDED': 'bg-yellow-50 text-yellow-700 border-yellow-300'
  }

  return (
    <Badge
      variant="outline"
      className={`${variants[status as keyof typeof variants]} font-medium`}
    >
      {status === 'NEW' && '🆕 '}
      {status}
    </Badge>
  )
}
