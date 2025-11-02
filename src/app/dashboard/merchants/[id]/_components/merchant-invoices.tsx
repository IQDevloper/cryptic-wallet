'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Download, Copy, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import Image from 'next/image'
import { getCurrencyIcon, formatCurrencyAmount, getCurrencyConfig } from '@/lib/crypto-assets-config'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from 'use-debounce'
import type { Merchant } from '@prisma/client'

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
        case 'paid':
            return 'default'
        case 'pending':
            return 'secondary'
        case 'expired':
            return 'destructive'
        case 'cancelled':
            return 'outline'
        default:
            return 'secondary'
    }
}

export function MerchantInvoices({ merchant }: { merchant: Merchant }) {
    const router = useRouter()
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearchQuery] = useDebounce(searchQuery, 500)
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortField, setSortField] = useState('createdAt')
    const [sortOrder, setSortOrder] = useState('desc')
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null)
    const [page, setPage] = useState(1)

    const { data, isLoading, error, refetch } = trpc.merchant.invoices.useQuery({
        merchantId: merchant.id,
        page: page,
        limit: 10,
        search: debouncedSearchQuery || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'),
    })

    useEffect(() => {
        if (searchInputRef.current && debouncedSearchQuery) {
            searchInputRef.current.focus()
        }
    }, [isLoading])

    if (isLoading) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-[300px]" />
                    <Skeleton className="h-10 w-[180px]" />
                </div>
                <Skeleton className="h-10 w-[100px]" />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {[...Array(5)].map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-4 w-[100px]" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-4 w-4" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-[120px]" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[80px]" />
                                            <Skeleton className="h-4 w-[60px]" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-6 w-[80px] rounded-full" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-[100px]" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
    if (error) return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-[300px]" />
                    <Skeleton className="h-10 w-[180px]" />
                </div>
                <Skeleton className="h-10 w-[100px]" />
            </div>

            <div className="rounded-md border p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="text-destructive">
                        <AlertCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-medium">Failed to load invoices</h3>
                    <p className="text-sm text-muted-foreground text-center">
                        {error.message || 'An unexpected error occurred'}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="mt-4"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    )

    const invoices = data?.invoices || []
    const hasNextPage = data?.pagination && data.pagination.page < data.pagination.pages

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${type} has been copied to clipboard`)
    }

    const truncateText = (text: string, start: number = 8, end: number = 4) => {
        if (!text) return ''
        return `${text.slice(0, start)}...${text.slice(-end)}`
    }

    const loadMore = () => {
        setPage(page + 1)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative" >
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search invoices..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                if (!searchInputRef.current?.contains(document.activeElement)) {
                                    searchInputRef.current?.focus()
                                }
                            }}
                            disabled={isLoading}
                            aria-busy={isLoading}
                            aria-describedby="search-status"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            <SelectItem value="UNDERPAID">Underpaid</SelectItem>
                            <SelectItem value="OVERPAID">Overpaid</SelectItem>
                            <SelectItem value="PROCESSING">Processing</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead>Invoice ID</TableHead>
                            <TableHead>Amount / Paid</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead
                                className="cursor-pointer"
                                onClick={() => {
                                    if (sortField === 'createdAt') {
                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                    } else {
                                        setSortField('createdAt')
                                        setSortOrder('desc')
                                    }
                                }}
                            >
                                Created {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.map((invoice: any) => (
                            <React.Fragment key={invoice.id}>
                                <TableRow
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => setExpandedInvoiceId(
                                        expandedInvoiceId === invoice.id ? null : invoice.id
                                    )}
                                >
                                    <TableCell>
                                        {expandedInvoiceId === invoice.id ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            className="hover:text-primary transition-colors text-left"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                router.push(`/dashboard/merchants/${merchant.id}/invoices/${invoice.id}`)
                                                            }}
                                                        >
                                                            {truncateText(invoice.id)}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Click to view invoice details</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <Copy
                                                className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    copyToClipboard(invoice.id, 'Invoice ID')
                                                }}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-3">
                                            {getCurrencyIcon(invoice.currency) && (
                                                <div className="relative h-8 w-8">
                                                    <Image
                                                        src={getCurrencyIcon(invoice.currency)!}
                                                        alt={getCurrencyConfig(invoice.currency)?.name || invoice.currency}
                                                        fill
                                                        className="rounded-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-medium">
                                                        {formatCurrencyAmount(parseFloat(invoice.amount), invoice.currency)} {invoice.currency}
                                                    </span>
                                                </div>
                                                {parseFloat(invoice.amountPaid) > 0 && (
                                                    <div className="flex items-baseline gap-1 text-green-600">
                                                        <span className="font-medium">
                                                            Paid: {formatCurrencyAmount(parseFloat(invoice.amountPaid), invoice.currency)} {invoice.currency}
                                                        </span>
                                                        <span className="text-xs">✓</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(invoice.status)}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                                </TableRow>
                                {expandedInvoiceId === invoice.id && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-0">
                                            <div className="bg-muted/50 p-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="text-sm font-medium">Payment Details</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-muted-foreground">Amount Due:</span>
                                                                <span className="font-medium">
                                                                    {formatCurrencyAmount(parseFloat(invoice.amount), invoice.currency)} {invoice.currency}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-muted-foreground">Paid:</span>
                                                                <span className="font-medium">
                                                                    {formatCurrencyAmount(parseFloat(invoice.amountPaid), invoice.currency)} {invoice.currency}
                                                                </span>
                                                            </div>
                                                            {invoice.network && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-muted-foreground">Network:</span>
                                                                    <span className="font-medium uppercase">{invoice.network}</span>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="text-sm font-medium">Payment Address</CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {invoice.depositAddress ? (
                                                                <div className="flex flex-wrap items-start gap-2">
                                                                    <code className="flex-1 min-w-0 rounded bg-muted px-3 py-2 text-xs font-mono break-all whitespace-normal text-foreground">
                                                                        {invoice.depositAddress}
                                                                    </code>
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 shrink-0 p-0"
                                                                                    onClick={() => copyToClipboard(invoice.depositAddress, 'Payment address')}
                                                                                >
                                                                                    <Copy className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Copy payment address</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">N/A</p>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {invoice.title && (
                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="space-y-2">
                                                                <div>
                                                                    <span className="text-sm font-medium">Title:</span>
                                                                    <p className="text-sm text-muted-foreground">{invoice.title}</p>
                                                                </div>
                                                                {invoice.description && (
                                                                    <div>
                                                                        <span className="text-sm font-medium">Description:</span>
                                                                        <p className="text-sm text-muted-foreground">{invoice.description}</p>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="text-sm font-medium">Timestamps</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-muted-foreground">Created:</span>
                                                                <span className="text-sm">{formatDate(invoice.createdAt)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-muted-foreground">Updated:</span>
                                                                <span className="text-sm">{formatDate(invoice.updatedAt)}</span>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                        {invoices.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-4 text-muted-foreground"
                                >
                                    No invoices found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {hasNextPage && (
                <div className="flex justify-center mt-4">
                    <Button onClick={loadMore} variant="outline">
                        Load More
                    </Button>
                </div>
            )}
        </div>
    )
}
