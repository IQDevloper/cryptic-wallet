"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  getCryptoIcon,
  getStatusColors,
  BusinessIcons,
  ArrowIcons,
  StatusIcons,
  CryptoIcons
} from "@/lib/icons"

// Mock transaction data
const transactions = [
  {
    id: "tx_001",
    hash: "0x1234...5678",
    amount: "0.0234",
    currency: "BTC",
    usdValue: "$1,234.56",
    network: "Bitcoin",
    status: "confirmed",
    type: "incoming",
    customer: "customer@example.com",
    invoice: "INV-001",
    timestamp: "2024-01-15T10:30:00Z",
    confirmations: 6
  },
  {
    id: "tx_002",
    hash: "0xabcd...efgh",
    amount: "2.5",
    currency: "ETH",
    usdValue: "$5,678.90",
    network: "Ethereum",
    status: "pending",
    type: "incoming",
    customer: "user@test.com",
    invoice: "INV-002",
    timestamp: "2024-01-15T10:25:00Z",
    confirmations: 2
  },
  {
    id: "tx_003",
    hash: "0x9876...5432",
    amount: "1000",
    currency: "USDT",
    usdValue: "$1,000.00",
    network: "Ethereum",
    status: "confirmed",
    type: "incoming",
    customer: "merchant@business.com",
    invoice: "INV-003",
    timestamp: "2024-01-15T09:45:00Z",
    confirmations: 12
  },
  {
    id: "tx_004",
    hash: "0xdef0...1234",
    amount: "0.5",
    currency: "BNB",
    usdValue: "$156.78",
    network: "BSC",
    status: "failed",
    type: "incoming",
    customer: "failed@payment.com",
    invoice: "INV-004",
    timestamp: "2024-01-15T09:15:00Z",
    confirmations: 0
  },
  {
    id: "tx_005",
    hash: "0x555...999",
    amount: "50",
    currency: "MATIC",
    usdValue: "$45.50",
    network: "Polygon",
    status: "confirmed",
    type: "incoming",
    customer: "polygon@user.com",
    invoice: "INV-005",
    timestamp: "2024-01-15T08:30:00Z",
    confirmations: 8
  }
]

export default function TransactionsPage() {
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === "all" || tx.status === filter
    const matchesSearch = searchTerm === "" || 
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.currency.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground text-lg mt-2">Monitor all payment transactions and their status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <BusinessIcons.Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <BusinessIcons.Filter className="w-4 h-4" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="relative">
                <BusinessIcons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search by hash, customer, invoice, or currency..."
                  className="pl-10 h-11 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
                className="min-w-[80px]"
              >
                All
              </Button>
              <Button
                variant={filter === "confirmed" ? "default" : "outline"}
                onClick={() => setFilter("confirmed")}
                size="sm"
                className="min-w-[80px] gap-1"
              >
                <StatusIcons.Success className="w-3 h-3" />
                Confirmed
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
                className="min-w-[80px] gap-1"
              >
                <StatusIcons.Pending className="w-3 h-3" />
                Pending
              </Button>
              <Button
                variant={filter === "failed" ? "default" : "outline"}
                onClick={() => setFilter("failed")}
                size="sm"
                className="min-w-[80px] gap-1"
              >
                <StatusIcons.Error className="w-3 h-3" />
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Recent Transactions</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTransactions.map((tx) => {
                const statusColors = getStatusColors(tx.status)
                return (
                  <div key={tx.id} className="p-6 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Transaction Direction Icon */}
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <ArrowIcons.Down className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        
                        {/* Crypto Icon and Details */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-muted/50">
                            {getCryptoIcon(tx.currency, { className: "w-6 h-6" })}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-foreground text-lg">
                                {tx.amount} {tx.currency}
                              </h3>
                              <Badge 
                                variant="secondary" 
                                className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border font-medium text-xs`}
                              >
                                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              <span className="font-medium">{tx.usdValue}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="font-mono">{tx.hash}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>{tx.network}</span>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{tx.invoice}</span>
                              <span>•</span>
                              <span>{tx.customer}</span>
                              <span>•</span>
                              <span>{new Date(tx.timestamp).toLocaleString()}</span>
                              {(tx.status === 'confirmed' || tx.status === 'pending') && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <StatusIcons.Shield className="w-3 h-3" />
                                    {tx.confirmations} confirmations
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <BusinessIcons.View className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
                <BusinessIcons.Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">No transactions found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm || filter !== "all" 
                  ? "Try adjusting your search terms or filters to find transactions."
                  : "Start accepting cryptocurrency payments to see transactions here."
                }
              </p>
              {(!searchTerm && filter === "all") && (
                <Button className="mt-6 gap-2">
                  <BusinessIcons.Add className="w-4 h-4" />
                  Create Invoice
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
