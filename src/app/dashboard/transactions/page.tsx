"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bitcoin,
  Ethereum,
  DollarSign,
  Search,
  Filter,
  Download,
  ExternalLink,
  Calendar
} from "lucide-react"

// Mock transaction data
const transactions = [
  {
    id: "tx_001",
    hash: "0x1234...5678",
    amount: "0.0234 BTC",
    usdValue: "$1,234.56",
    currency: "Bitcoin",
    network: "Bitcoin",
    status: "completed",
    type: "payment",
    customer: "customer@example.com",
    invoice: "INV-001",
    timestamp: "2024-01-15T10:30:00Z",
    confirmations: 6,
    icon: Bitcoin
  },
  {
    id: "tx_002",
    hash: "0xabcd...efgh",
    amount: "2.5 ETH",
    usdValue: "$5,678.90",
    currency: "Ethereum",
    network: "Ethereum",
    status: "pending",
    type: "payment",
    customer: "user@test.com",
    invoice: "INV-002",
    timestamp: "2024-01-15T10:25:00Z",
    confirmations: 2,
    icon: Ethereum
  },
  {
    id: "tx_003",
    hash: "0x9876...5432",
    amount: "1000 USDT",
    usdValue: "$1,000.00",
    currency: "USDT",
    network: "Ethereum",
    status: "completed",
    type: "payment",
    customer: "merchant@business.com",
    invoice: "INV-003",
    timestamp: "2024-01-15T09:45:00Z",
    confirmations: 12,
    icon: DollarSign
  },
  {
    id: "tx_004",
    hash: "0xdef0...1234",
    amount: "0.5 BNB",
    usdValue: "$156.78",
    currency: "BNB",
    network: "BSC",
    status: "failed",
    type: "payment",
    customer: "failed@payment.com",
    invoice: "INV-004",
    timestamp: "2024-01-15T09:15:00Z",
    confirmations: 0,
    icon: DollarSign
  }
]

const statusColors = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800"
}

export default function TransactionsPage() {
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === "all" || tx.status === filter
    const matchesSearch = searchTerm === "" || 
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.invoice.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Monitor all payment transactions and their status</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by hash, customer, or invoice..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                onClick={() => setFilter("completed")}
                size="sm"
              >
                Completed
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filter === "failed" ? "default" : "outline"}
                onClick={() => setFilter("failed")}
                size="sm"
              >
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Transaction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-50 rounded-full">
                          <tx.icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tx.hash}</p>
                          <p className="text-sm text-gray-500">{tx.network}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{tx.amount}</p>
                        <p className="text-sm text-gray-500">{tx.usdValue}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{tx.customer}</p>
                        <p className="text-sm text-gray-500">{tx.invoice}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col space-y-1">
                        <Badge className={statusColors[tx.status as keyof typeof statusColors]}>
                          {tx.status}
                        </Badge>
                        {tx.status === "completed" && (
                          <span className="text-xs text-gray-500">{tx.confirmations} confirmations</span>
                        )}
                        {tx.status === "pending" && (
                          <span className="text-xs text-gray-500">{tx.confirmations}/6 confirmations</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
