# Multi-Network Currency Architecture

## Overview

This document describes the implementation of multi-network currency support in Cryptic Gateway, similar to platforms like CryptoMus. The architecture enables the same currency (like USDT) to exist across multiple blockchain networks with different implementations.

## Architecture Concept

### Problem Solved
Traditional crypto payment systems treat each currency-network combination as separate currencies. This creates confusion when:
- USDT exists on BSC, TRON, Ethereum, and Polygon
- Users need to choose the optimal network based on fees and speed
- Merchants need unified pricing across networks

### Solution: Base Currency + Network Variants
- **BaseCurrency**: Parent currency (USDT, BTC, ETH) with shared metadata
- **Currency**: Network-specific implementation with unique properties

## Database Schema

### BaseCurrency Model
```sql
CREATE TABLE base_currencies (
  id STRING PRIMARY KEY,
  code STRING UNIQUE,        -- "USDT", "BTC", "ETH"
  name STRING,               -- "Tether USD", "Bitcoin"
  symbol STRING,             -- "USDT", "BTC", "ETH"
  image_url STRING,          -- Shared icon across networks
  coin_gecko_id STRING,      -- For price fetching
  coin_market_cap_id STRING,
  priority INTEGER,          -- Display ordering
  is_active BOOLEAN
);
```

### Currency Model (Network-Specific)
```sql
CREATE TABLE currencies (
  id STRING PRIMARY KEY,
  base_currency_id STRING,   -- References base_currencies.id
  network_id STRING,         -- References networks.id
  contract_address STRING,   -- Token contract (null for native coins)
  decimals INTEGER,          -- Network-specific precision
  is_token BOOLEAN,          -- true for tokens, false for native coins
  token_standard STRING,     -- "BEP-20", "TRC-20", "ERC-20"
  withdraw_fee DECIMAL,      -- Network-specific fees
  min_amount DECIMAL,
  max_amount DECIMAL,
  UNIQUE(base_currency_id, network_id)  -- One variant per network
);
```

## Real-World Examples

### USDT Multi-Network Configuration

| Network | Token Standard | Contract Address | Decimals | Withdraw Fee |
|---------|---------------|------------------|----------|--------------|
| BSC     | BEP-20       | 0x55d398326f99...| 18       | 1.0 USDT     |
| TRON    | TRC-20       | TR7NHqjeKQxG...  | 6        | 1.0 USDT     |
| Ethereum| ERC-20       | 0xdAC17F958D...  | 6        | 10.0 USDT    |
| Polygon | ERC-20       | 0xc2132D05D3...  | 6        | 0.1 USDT     |

### Native Coins Configuration

| Currency | Network  | Contract Address | Is Token | Withdraw Fee |
|----------|----------|------------------|----------|--------------|
| BNB      | BSC      | null            | false    | 0.0005 BNB   |
| TRX      | TRON     | null            | false    | 1.0 TRX      |
| ETH      | Ethereum | null            | false    | 0.005 ETH    |
| MATIC    | Polygon  | null            | false    | 0.001 MATIC  |

## tRPC API Implementation

### Currency Router Endpoints

```typescript
// Get all currencies grouped by base currency
const currencies = await trpc.currency.getGroupedCurrencies.useQuery()

// Result format:
[
  {
    id: "usdt_base",
    code: "USDT",
    name: "Tether USD",
    symbol: "USDT",
    imageUrl: "https://...",
    networks: [
      {
        currencyId: "usdt_bsc",
        networkId: "bsc_network",
        networkName: "BNB Smart Chain",
        networkCode: "BSC",
        tokenStandard: "BEP-20",
        contractAddress: "0x55d398326f99...",
        withdrawFee: 1.0,
        minAmount: 1.0,
        maxAmount: 100000.0
      },
      // ... other networks
    ]
  }
]
```

### Network Selection Component Usage

```typescript
import { CurrencyNetworkSelector } from '@/components/ui/currency-network-selector'
import { trpc } from '@/lib/trpc/client'

function InvoiceForm() {
  const { data: currencies } = trpc.currency.getGroupedCurrencies.useQuery()
  const [selectedCurrency, setSelectedCurrency] = useState<SelectedCurrency>()

  return (
    <CurrencyNetworkSelector
      currencies={currencies || []}
      value={selectedCurrency}
      onValueChange={setSelectedCurrency}
      placeholder="Select currency and network"
    />
  )
}
```

## User Experience Flow

### 1. Currency Selection UI
- Display currencies grouped by base currency (USDT, BTC, ETH)
- Show network variants with badges (BSC BEP-20, TRON TRC-20, etc.)
- Include fee information and network icons
- Enable search/filtering by currency name or network

### 2. Network Comparison
Users can compare networks for the same currency:
- **USDT on BSC**: Fast (3s), Low Fee (1 USDT)
- **USDT on TRON**: Fast (3s), Low Fee (1 USDT)  
- **USDT on Ethereum**: Slow (60s), High Fee (10 USDT)
- **USDT on Polygon**: Fast (5s), Ultra Low Fee (0.1 USDT)

### 3. Optimal Network Suggestion
System can recommend networks based on:
- Transaction amount (small amounts → low fee networks)
- User preferences (speed vs cost)
- Network congestion status

## Wallet Creation Integration

### Merchant Wallet Setup
When merchants are created, wallets are generated for ALL active currency variants:

```typescript
// During merchant creation
const activeCurrencies = await prisma.currency.findMany({
  where: { isActive: true },
  include: { network: true, baseCurrency: true }
})

// Create wallet for each currency variant
const walletPromises = activeCurrencies.map(currency => 
  createWallet(merchantId, currency.id, currency.network.tatumChainId)
)
```

### Address Generation
Each currency variant gets its own deposit address:
- USDT (BSC): `0xabc123...` (BSC address format)
- USDT (TRON): `TRabc123...` (TRON address format)  
- USDT (ETH): `0xdef456...` (Ethereum address format)

## Tatum API Integration

### Virtual Account Mapping
```typescript
// Create virtual accounts per network
const tatumAccounts = {
  'usdt_bsc': 'va_bsc_merchant123_usdt',
  'usdt_tron': 'va_tron_merchant123_usdt',
  'usdt_eth': 'va_eth_merchant123_usdt',
  'usdt_polygon': 'va_polygon_merchant123_usdt'
}
```

### Webhook Processing
Webhooks are processed per network, then mapped to base currency for pricing:

```typescript
// Webhook receives: USDT payment on BSC network
const currency = await prisma.currency.findUnique({
  where: { id: 'usdt_bsc' },
  include: { baseCurrency: true }
})

// Update wallet balance and fetch price using baseCurrency.code
const price = await fetchPrice(currency.baseCurrency.code) // "USDT"
```

## Implementation Benefits

1. **User Clarity**: Clear network selection with fee comparison
2. **Unified Pricing**: All USDT variants use same USD price
3. **Flexible Configuration**: Easy to add new networks
4. **Optimal UX**: Users can choose best network for their needs
5. **Merchant Simplicity**: Automatic wallet creation across networks

## Migration Process

### From Single-Network to Multi-Network

1. **Create Migration SQL**: Populate base_currencies and update currencies table
2. **Update tRPC Procedures**: Include baseCurrency relations
3. **Update UI Components**: Support network selection
4. **Update Price Fetching**: Use base currency codes
5. **Update Wallet Creation**: Create wallets for all variants

### Data Migration Script
```sql
-- See: prisma/migrations/populate-multi-network-currencies.sql
-- Creates base currencies and network-specific variants
-- Maintains backward compatibility during transition
```

## Future Enhancements

1. **Dynamic Network Selection**: Auto-select optimal network based on amount
2. **Cross-Chain Swapping**: Convert between network variants
3. **Network Status Monitoring**: Real-time fee and speed tracking
4. **Smart Routing**: Route payments through lowest-cost networks
5. **Batch Processing**: Combine multiple small payments efficiently

## Technical Considerations

### Performance
- Index on `(base_currency_id, network_id)` for fast lookups
- Cache network configurations for UI performance
- Batch price fetching for all base currencies

### Security
- Validate contract addresses against known good addresses
- Monitor for suspicious network additions
- Rate limit currency creation operations

### Monitoring
- Track payment distribution across networks
- Monitor network performance and fees
- Alert on unusual network activity patterns