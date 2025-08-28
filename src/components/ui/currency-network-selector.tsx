'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  imageUrl?: string
  priority: number
  networks: CurrencyNetwork[]
}

interface CurrencyNetwork {
  currencyId: string
  networkId: string
  networkName: string
  networkCode: string
  isToken: boolean
  tokenStandard?: string
  contractAddress?: string
  decimals: number
  withdrawFee: number
  minAmount: number
  maxAmount?: number
}

interface SelectedCurrency {
  baseCurrency: Currency
  network: CurrencyNetwork
}

interface CurrencyNetworkSelectorProps {
  currencies: Currency[]
  value?: SelectedCurrency
  onValueChange: (value: SelectedCurrency) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CurrencyNetworkSelector({
  currencies,
  value,
  onValueChange,
  placeholder = 'Select currency and network',
  disabled = false,
  className,
}: CurrencyNetworkSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCurrencies = currencies.filter((currency) =>
    currency.code.toLowerCase().includes(search.toLowerCase()) ||
    currency.name.toLowerCase().includes(search.toLowerCase())
  )

  const formatNetworkDisplay = (network: CurrencyNetwork) => {
    if (network.isToken && network.tokenStandard) {
      return `${network.networkName} ${network.tokenStandard}`
    }
    return network.networkName
  }

  const formatFeeDisplay = (fee: number) => {
    if (fee === 0) return 'Free'
    if (fee < 0.01) return `${(fee * 1000).toFixed(2)}m`
    if (fee < 1) return fee.toFixed(4)
    return fee.toFixed(2)
  }

  const handleSelect = (baseCurrency: Currency, network: CurrencyNetwork) => {
    onValueChange({ baseCurrency, network })
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-auto min-h-[60px] p-3',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          {value ? (
            <div className="flex items-center space-x-3 w-full">
              {value.baseCurrency.imageUrl && (
                <Image
                  src={value.baseCurrency.imageUrl}
                  alt={value.baseCurrency.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {value.baseCurrency.code}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {formatNetworkDisplay(value.network)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {value.baseCurrency.name} • Fee: {formatFeeDisplay(value.network.withdrawFee)} {value.baseCurrency.code}
                </div>
              </div>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search currencies..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No currencies found.</CommandEmpty>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredCurrencies.map((currency) => (
              <CommandGroup key={currency.id} heading={currency.code}>
                {currency.networks.map((network) => (
                  <CommandItem
                    key={`${currency.id}-${network.networkId}`}
                    className="flex items-center space-x-3 p-3 cursor-pointer"
                    onSelect={() => handleSelect(currency, network)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {currency.imageUrl && (
                        <Image
                          src={currency.imageUrl}
                          alt={currency.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{currency.code}</span>
                          <Badge 
                            variant={network.isToken ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {formatNetworkDisplay(network)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {currency.name} • Fee: {formatFeeDisplay(network.withdrawFee)} {currency.code}
                          {network.contractAddress && (
                            <span className="ml-2">
                              {network.contractAddress.slice(0, 6)}...{network.contractAddress.slice(-4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {value?.network.currencyId === network.currencyId && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Hook for fetching currencies with tRPC
export function useCurrencyNetworkSelector() {
  // This would use the tRPC currency router
  // const { data: currencies, isLoading } = trpc.currency.getGroupedCurrencies.useQuery()
  
  // For now, return mock data structure
  return {
    currencies: [] as Currency[],
    isLoading: false,
  }
}