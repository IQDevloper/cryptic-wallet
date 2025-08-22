"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Plus,
  Search,
  Download,
  ExternalLink,
  Copy,
  QrCode,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"

// Mock invoice data
const invoices = [
  {
    id: "INV-001",
    amount: "$1,234.56",
    currency: "BTC",
    status: "paid",
    customer: "customer@example.com",
    description: "Website Development Services",
    createdAt: "2024-01-15T10:30:00Z",
    paidAt: "2024-01-15T11:45:00Z",
    expiresAt: "2024-01-16T10:30:00Z",
    paymentAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    txHash: "0x1234...5678"
  },
  {
    id: "INV-002",
    amount: "$5,678.90",
    currency: "ETH",
    status: "pending",
    customer: "user@test.com",
    description: "E-commerce Platform Setup",
    createdAt: "2024-01-15T10:25:00Z",
    paidAt: null,
    expiresAt: "2024-01-16T10:25:00Z",
    paymentAddress: "0x742d35Cc6634C0532925a3b8D4C9db7C5b7b3b3b",
    txHash: null
  },
  {
    id: "INV-003",
    amount: "$1,000.00",
    currency: "USDT",
    status: "paid",
    customer: "merchant@business.com",
    description: "Monthly Subscription",
    createdAt: "2024-01-15T09:45:00Z",
    paidAt: "2024-01-15T10:12:00Z",
    expiresAt: "2024-01-16T09:45:00Z",
    paymentAddress: "0x742d35Cc6634C0532925a3b8D4C9db7C5b7b3b3b",
    txHash: "0x9876...5432"
  },
  {
    id: "INV-004",
    amount: "$156.78",
    currency: "BNB",
    status: "expired",
    customer: "expired@payment.com",
    description: "Consulting Services",
    createdAt: "2024-01-14T09:15:00Z",
    paidAt: null,
    expiresAt: "2024-01-15T09:15:00Z",
    paymentAddress: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2",
    txHash: null
  }
]

const statusColors = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800"
}

const statusIcons = {
  paid: CheckCircle,
  pending: Clock,
  expired: XCircle,
  cancelled: XCircle
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const filteredInvoices = invoices.filter(invoice => {
    const matchesFilter = filter === "all" || invoice.status === filter
    const matchesSearch = searchTerm === "" || 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Create and manage payment invoices for your customers</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {invoices.filter(i => i.status === 'paid').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {invoices.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {invoices.filter(i => i.status === 'expired').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
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
                  placeholder="Search by invoice ID, customer, or description..."
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
                variant={filter === "paid" ? "default" : "outline"}
                onClick={() => setFilter("paid")}
                size="sm"
              >
                Paid
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filter === "expired" ? "default" : "outline"}
                onClick={() => setFilter("expired")}
                size="sm"
              >
                Expired
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="grid gap-6">
        {filteredInvoices.map((invoice) => {
          const StatusIcon = statusIcons[invoice.status as keyof typeof statusIcons]
          return (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <StatusIcon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{invoice.id}</h3>
                      <p className="text-sm text-gray-500">{invoice.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                      {invoice.status}
                    </Badge>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{invoice.amount}</p>
                      <p className="text-sm text-gray-500">{invoice.currency}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer</p>
                    <p className="text-sm text-gray-900">{invoice.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expires</p>
                    <p className="text-sm text-gray-900">
                      {new Date(invoice.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {invoice.status === "pending" && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Payment Address</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {invoice.paymentAddress}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(invoice.paymentAddress)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {invoice.txHash && (
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Transaction Hash</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm bg-white p-2 rounded border font-mono">
                        {invoice.txHash}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(invoice.txHash)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {invoice.status === "pending" && (
                    <Button variant="outline" size="sm">
                      Send Reminder
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredInvoices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No invoices found matching your criteria.</p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Invoice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
