'use client'

import { useState } from 'react'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/utils'
import { Loader2, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

interface WithdrawalFormProps {
  merchantId: string
}

export function WithdrawalForm({ merchantId }: WithdrawalFormProps) {
  const [currency, setCurrency] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [targetNetwork, setTargetNetwork] = useState<string>('')
  const [targetAddress, setTargetAddress] = useState<string>('')
  const [withdrawalPlan, setWithdrawalPlan] = useState<any>(null)

  // Get unified balances to show available amounts
  const { data: balances } = trpc.merchant.getBalances.useQuery({
    merchantId,
  })

  // Group balances by currency for display
  const groupedBalances = React.useMemo(() => {
    if (!balances) return []

    const groups = new Map<string, {
      currency: string
      totalBalance: number
      networks: Array<{
        network: string
        balance: number
        availableBalance: number
      }>
      imageUrl: string | null
      name: string
    }>()

    balances.forEach(balance => {
      const existing = groups.get(balance.currency)
      if (existing) {
        existing.totalBalance += balance.availableBalance
        existing.networks.push({
          network: balance.network,
          balance: balance.balance,
          availableBalance: balance.availableBalance
        })
      } else {
        groups.set(balance.currency, {
          currency: balance.currency,
          totalBalance: balance.availableBalance,
          networks: [{
            network: balance.network,
            balance: balance.balance,
            availableBalance: balance.availableBalance
          }],
          imageUrl: balance.imageUrl,
          name: balance.name
        })
      }
    })

    return Array.from(groups.values())
  }, [balances])

  // Withdrawal mutation
  const withdrawalMutation = trpc.merchant.requestWithdrawal.useMutation({
    onSuccess: (data) => {
      console.log('Withdrawal initiated:', data)
      // Reset form or show success message
      setAmount('')
      setTargetAddress('')
    },
    onError: (error) => {
      console.error('Withdrawal failed:', error)
    },
  })

  // Available networks for selected currency
  const selectedCurrencyData = groupedBalances?.find(b => b.currency === currency)
  const availableNetworks = balances
    ? balances.filter(b => b.currency === currency).map(b => b.network)
    : []

  // Calculate estimated fees and routing
  const calculateWithdrawalPlan = () => {
    if (!selectedCurrencyData || !amount || !targetNetwork) return null

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return null

    // Simple fee estimation (in production, this would call the API)
    const networkFees: Record<string, number> = {
      ethereum: 10.0,
      bsc: 1.0,
      tron: 1.0,
      polygon: 0.1,
      bitcoin: 5.0,
    }

    const bridgeFee = 5.0
    const networkFee = networkFees[targetNetwork] || 1.0
    
    // Check if we can withdraw directly from target network
    const targetNetworkBalance = selectedCurrencyData.networks.find(n => n.network === targetNetwork)
    const canWithdrawDirect = targetNetworkBalance && targetNetworkBalance.availableBalance >= amountNum
    
    return {
      needsBridging: !canWithdrawDirect,
      networkFee,
      bridgeFee: canWithdrawDirect ? 0 : bridgeFee,
      totalFees: networkFee + (canWithdrawDirect ? 0 : bridgeFee),
      youReceive: amountNum - (networkFee + (canWithdrawDirect ? 0 : bridgeFee)),
      estimatedTime: canWithdrawDirect ? '2-5 minutes' : '10-30 minutes',
    }
  }

  const plan = calculateWithdrawalPlan()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currency || !amount || !targetNetwork || !targetAddress) {
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return
    }

    withdrawalMutation.mutate({
      merchantId,
      currency,
      amount: amountNum,
      targetNetwork,
      targetAddress,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <p className="text-sm text-muted-foreground">
          Unified withdrawal across all networks for {currency || 'selected currency'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency to withdraw" />
              </SelectTrigger>
              <SelectContent>
                {groupedBalances?.map((balance) => (
                  <SelectItem key={balance.currency} value={balance.currency}>
                    <div className="flex items-center justify-between w-full">
                      <span>{balance.currency}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {balance.totalBalance.toFixed(4)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {balance.networks.length} {balance.networks.length === 1 ? 'network' : 'networks'}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          {currency && selectedCurrencyData && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.00000001"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {selectedCurrencyData.totalBalance.toFixed(8)} {currency}</span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => setAmount(selectedCurrencyData.totalBalance.toString())}
                >
                  Max
                </Button>
              </div>
            </div>
          )}

          {/* Target Network Selection */}
          {currency && availableNetworks.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="network">Withdraw to Network</Label>
              <Select value={targetNetwork} onValueChange={setTargetNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target network" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCurrencyData?.networks.map((networkData) => (
                    <SelectItem key={networkData.network} value={networkData.network}>
                      <div className="flex items-center justify-between w-full">
                        <span className="capitalize">{networkData.network}</span>
                        <span className="text-xs text-muted-foreground">
                          {networkData.availableBalance.toFixed(4)} {currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Address */}
          {targetNetwork && (
            <div className="space-y-2">
              <Label htmlFor="address">Withdrawal Address</Label>
              <Input
                id="address"
                placeholder={`Enter your ${targetNetwork} address...`}
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Make sure this is a valid {targetNetwork.toUpperCase()} address for {currency}
              </p>
            </div>
          )}

          {/* Withdrawal Plan Preview */}
          {plan && amount && targetNetwork && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Withdrawal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Amount:</span>
                  <span className="font-mono">{amount} {currency}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Network fees:</span>
                  <span className="font-mono">{plan.networkFee} {currency}</span>
                </div>
                
                {plan.needsBridging && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bridge fees:</span>
                    <span className="font-mono">{plan.bridgeFee} {currency}</span>
                  </div>
                )}
                
                <hr className="my-2" />
                
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-sm">You receive:</span>
                  <span className="font-mono">{plan.youReceive.toFixed(8)} {currency}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Estimated time:</span>
                  <span className="text-sm">{plan.estimatedTime}</span>
                </div>

                {plan.needsBridging && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This withdrawal requires cross-chain bridging. Funds will be sourced from multiple networks.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              !currency ||
              !amount ||
              !targetNetwork ||
              !targetAddress ||
              withdrawalMutation.isLoading ||
              !plan ||
              plan.youReceive <= 0
            }
          >
            {withdrawalMutation.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            {withdrawalMutation.isLoading ? 'Processing...' : 'Withdraw Funds'}
          </Button>

          {/* Success/Error Messages */}
          {withdrawalMutation.isSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Withdrawal request submitted successfully! You will receive a confirmation shortly.
              </AlertDescription>
            </Alert>
          )}

          {withdrawalMutation.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {withdrawalMutation.error?.message || 'Withdrawal failed. Please try again.'}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  )
}