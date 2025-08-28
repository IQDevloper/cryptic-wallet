'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  BarChart,
  CreditCard,
  Store,
  Wallet,
  Settings,
  HelpCircle,
  Menu,
  Key
} from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { useSidebarStore } from '@/store/sidebar-store'

const navigationItems = [
  {
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        description: 'Overview of your payment gateway',
        icon: LayoutDashboard
      },
      {
        title: 'Analytics',
        href: '/dashboard/analytics',
        description: 'View detailed analytics and reports',
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
        description: 'Manage your merchant accounts',
        icon: Store
      },
      {
        title: 'Transactions',
        href: '/dashboard/transactions',
        description: 'View and manage transactions',
        icon: CreditCard
      },
      {
        title: 'Wallets',
        href: '/dashboard/wallets',
        description: 'Manage your crypto wallets',
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
        description: 'Manage your API credentials',
        icon: Key
      },
      {
        title: 'Settings',
        href: '/dashboard/settings',
        description: 'Configure your account settings',
        icon: Settings
      },
      {
        title: 'Support',
        href: '/dashboard/support',
        description: 'Get help and support',
        icon: HelpCircle
      }
    ]
  }
]

export function DashboardHeader() {
  const router = useRouter()
  const toggle = useSidebarStore((state) => state.toggle)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggle}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>

       
            <NavigationMenu>
              <NavigationMenuList>
                {navigationItems.map((section) => (
                  <NavigationMenuItem key={section.title}>
                    <NavigationMenuTrigger>{section.title}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                        {section.items.map((item) => {
                          const Icon = item.icon
                          return (
                            <li key={item.title}>
                              <NavigationMenuLink asChild>
                                <Link
                                  href={item.href}
                                  className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <div className="text-sm font-medium leading-none">
                                      {item.title}
                                    </div>
                                  </div>
                                  <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                </Link>
                              </NavigationMenuLink>
                            </li>
                          )
                        })}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/support')}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Support
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
} 
