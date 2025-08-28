'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  BarChart,
  Store,
  CreditCard,
  Wallet,
  Key,
  Settings,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { useSidebarStore } from '@/store/sidebar-store'

const sidebarItems = [
  {
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard
      },
      {
        title: 'Analytics',
        href: '/dashboard/analytics',
        icon: BarChart
      }
    ]
  },
  {
    title: 'Business',
    items: [
      {
        title: 'Merchants',
        href: '/dashboard/merchants',
        icon: Store
      },
      {
        title: 'Transactions',
        href: '/dashboard/transactions',
        icon: CreditCard
      },
      {
        title: 'Wallets',
        href: '/dashboard/wallets',
        icon: Wallet
      }
    ]
  },
  {
    title: 'Settings & Support',
    items: [
      {
        title: 'API Keys',
        href: '/dashboard/api-keys',
        icon: Key
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        icon: Settings
      },
      {
        title: 'Support',
        href: '/dashboard/support',
        icon: HelpCircle
      }
    ]
  }
]

function SidebarContent() {
  const pathname = usePathname()
  const close = useSidebarStore((state) => state.close)

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 sm:flex hidden">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Cryptic</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 mt-6">
        <div className="space-y-4">
          {sidebarItems.map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="px-2 text-xs font-semibold tracking-tight text-muted-foreground">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={pathname === item.href ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      pathname === item.href && 'bg-secondary'
                    )}
                    onClick={() => close()}
                  >
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export function Sidebar() {
  const isOpen = useSidebarStore((state) => state.isOpen)
  const close = useSidebarStore((state) => state.close)

  return (
    <>
      <div className="hidden border-r bg-card md:block w-64">
        <SidebarContent />
      </div>

      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>
              <Link href="/dashboard" className="flex items-center space-x-2">
                <span className="text-xl font-bold">Cryptic</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
} 
