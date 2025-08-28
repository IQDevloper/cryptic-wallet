'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Store, MoreVertical } from 'lucide-react'
import type { Merchant } from '@prisma/client'

export function MerchantHeader({ merchant }: { merchant: Merchant }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Store className="h-8 w-8" />
        <div>
          <h1 className="text-2xl font-bold">{merchant.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{merchant.email}</span>
            <Badge variant={merchant.isActive ? 'default' : 'secondary'}>
              {merchant.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Edit Details</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            Suspend Merchant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 
