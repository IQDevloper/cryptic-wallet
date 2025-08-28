'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { 
  MdAccountBalanceWallet,
  MdPayment,
  MdStore,
  MdSecurity,
  MdSupport
} from 'react-icons/md'

const actions = [
  {
    icon: MdAccountBalanceWallet,
    label: 'Withdraw Funds',
    description: 'Transfer your earnings',
    color: 'text-green-500',
    bgColor: 'bg-green-50'
  },
  {
    icon: MdPayment,
    label: 'View Payments',
    description: 'Transaction history',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  {
    icon: MdStore,
    label: 'Manage Merchants',
    description: 'View your stores',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50'
  },
  {
    icon: MdSecurity,
    label: 'Security Settings',
    description: 'Manage account security',
    color: 'text-red-500',
    bgColor: 'bg-red-50'
  },
  {
    icon: MdSupport,
    label: 'Support Tickets',
    description: 'Get help',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
] as const

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4 hover:bg-muted/50"
              >
                <div className={`${action.bgColor} p-2 rounded-full mr-4`}>
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{action.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {action.description}
                  </span>
                </div>
              </Button>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}
