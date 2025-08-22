"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Bitcoin,
  Ethereum,
  Plus
} from "lucide-react"

// Mock data for demonstration
const metrics = [
  {
    title: "Total Revenue",
    value: "$24,680.50",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "text-green-600"
  },
  {
    title: "Transactions",
    value: "1,247",
    change: "+8.2%",
    trend: "up", 
    icon: CreditCard,
    color: "text-blue-600"
  },
  {
    title: "Success Rate",
    value: "99.8%",
    change: "+0.1%",
    trend: "up",
    icon: TrendingUp,
    color: "text-emerald-600"
  },
  {
    title: "Active Customers",
    value: "342",
    change: "+23.1%",
    trend: "up",
    icon: Users,
    color: "text-purple-600"
  }
]

const recentTransactions = [
  {
    id: "tx_1",
    amount: "0.0234 BTC",
    usdValue: "$1,234.56",
    currency: "Bitcoin",
    status: "completed",
    time: "2 minutes ago",
    icon: Bitcoin
  },
  {
    id: "tx_2", 
    amount: "2.5 ETH",
    usdValue: "$5,678.90",
    currency: "Ethereum",
    status: "pending",
    time: "5 minutes ago",
    icon: Ethereum
  },
  {
    id: "tx_3",
    amount: "1000 USDT",
    usdValue: "$1,000.00",
    currency: "USDT (ERC20)",
    status: "completed",
    time: "12 minutes ago",
    icon: DollarSign
  }
]

const walletBalances = [
  { currency: "BTC", balance: "0.1234", usdValue: "$6,789.12", icon: Bitcoin },
  { currency: "ETH", balance: "5.6789", usdValue: "$12,345.67", icon: Ethereum },
  { currency: "USDT", balance: "10,000", usdValue: "$10,000.00", icon: DollarSign }
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your payments.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  <div className="flex items-center mt-1">
                    {metric.trend === "up" ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-full bg-gray-50 ${metric.color}`}>
                  <metric.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 rounded-full">
                      <tx.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.amount}</p>
                      <p className="text-sm text-gray-500">{tx.currency}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{tx.usdValue}</p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={tx.status === "completed" ? "default" : "secondary"}
                        className={tx.status === "completed" ? "bg-green-100 text-green-800" : ""}
                      >
                        {tx.status}
                      </Badge>
                      <span className="text-xs text-gray-500">{tx.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {walletBalances.map((wallet) => (
                <div key={wallet.currency} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 rounded-full">
                      <wallet.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{wallet.currency}</p>
                      <p className="text-sm text-gray-500">{wallet.balance}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{wallet.usdValue}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Manage Wallets
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Plus className="w-6 h-6 mb-2" />
              Create Invoice
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <CreditCard className="w-6 h-6 mb-2" />
              View Transactions
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="w-6 h-6 mb-2" />
              Customer Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
