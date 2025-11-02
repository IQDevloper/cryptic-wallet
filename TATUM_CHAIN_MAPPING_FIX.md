# 🔧 Tatum Chain Mapping Fix

## Issue

When creating invoices, Tatum webhook subscription was failing with:
```
❌ Failed to create Tatum subscription:
Unsupported chain for webhooks: bsc-mainnet
```

## Root Cause

The database stores `tatumChainId` with `-mainnet` suffix (e.g., `bsc-mainnet`, `ethereum-mainnet`), but the Tatum webhook API `chainMap` only had mappings for the short format (e.g., `bsc`, `ethereum`).

## Solution

Added `-mainnet` suffix mappings to the `chainMap` in `src/lib/tatum/client.ts` (lines 589-627).

### Changes Made

**File**: `src/lib/tatum/client.ts`

**Before**:
```typescript
const chainMap: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  bsc: 'BSC',
  tron: 'TRON',
  polygon: 'MATIC',
  // ... only short formats
}
```

**After**:
```typescript
const chainMap: Record<string, string> = {
  // Mainnet chains - support both short and -mainnet suffix
  bitcoin: 'BTC',
  'bitcoin-mainnet': 'BTC',  // ← Added
  ethereum: 'ETH',
  'ethereum-mainnet': 'ETH', // ← Added
  bsc: 'BSC',
  'bsc-mainnet': 'BSC',      // ← Added
  tron: 'TRON',
  'tron-mainnet': 'TRON',    // ← Added
  polygon: 'MATIC',
  'polygon-mainnet': 'MATIC', // ← Added
  arbitrum: 'ARBITRUM',
  'arbitrum-mainnet': 'ARBITRUM', // ← Added
  solana: 'SOL',
  'solana-mainnet': 'SOL',   // ← Added
  sui: 'SUI',
  'sui-mainnet': 'SUI',      // ← Added
  dogecoin: 'DOGE',
  'dogecoin-mainnet': 'DOGE', // ← Added
  litecoin: 'LTC',
  'litecoin-mainnet': 'LTC', // ← Added
  dash: 'DASH',
  'dash-mainnet': 'DASH',    // ← Added
  bcash: 'BCH',
  'bitcoin-cash': 'BCH',     // ← Added alias
  // ... testnets unchanged
}
```

## Supported Chain Mappings

### Mainnet Chains (both formats supported)

| Database Value | Tatum Webhook Format |
|----------------|---------------------|
| `bitcoin` or `bitcoin-mainnet` | `BTC` |
| `ethereum` or `ethereum-mainnet` | `ETH` |
| `bsc` or `bsc-mainnet` | `BSC` |
| `tron` or `tron-mainnet` | `TRON` |
| `polygon` or `polygon-mainnet` | `MATIC` |
| `arbitrum` or `arbitrum-mainnet` | `ARBITRUM` |
| `solana` or `solana-mainnet` | `SOL` |
| `sui` or `sui-mainnet` | `SUI` |
| `dogecoin` or `dogecoin-mainnet` | `DOGE` |
| `litecoin` or `litecoin-mainnet` | `LTC` |
| `dash` or `dash-mainnet` | `DASH` |
| `bcash` or `bitcoin-cash` | `BCH` |

### Testnet Chains (unchanged)

| Database Value | Tatum Webhook Format |
|----------------|---------------------|
| `bitcoin-testnet` | `bitcoin-testnet` |
| `ethereum-sepolia` or `ethereum-testnet` | `ethereum-sepolia` |
| `bsc-testnet` | `bsc-testnet` |
| `polygon-amoy` | `polygon-amoy` |
| `arbitrum-sepolia` | `arbitrum-sepolia` |
| `tron-testnet` or `tron-shasta` | `tron-testnet` |
| `solana-devnet` | `solana-devnet` |
| `sui-testnet` | `sui-testnet` |

## Expected Behavior Now

When creating an invoice:

1. ✅ Database stores: `tatumChainId: "bsc-mainnet"`
2. ✅ Invoice router passes: `chain: "bsc-mainnet"` to notification service
3. ✅ Notification service calls Tatum client with: `chainId: "bsc-mainnet"`
4. ✅ Tatum client maps `"bsc-mainnet"` → `"BSC"` for webhook API
5. ✅ Webhook subscription created successfully
6. ✅ Payment monitoring active

## Testing

Create a test invoice:
```bash
# Create invoice with BSC/USDT
POST /api/trpc/invoice.create
{
  "merchantId": "...",
  "amount": 10,
  "currency": "USDT",
  "network": "bsc"
}

# Expected logs:
📡 [INVOICE] Creating Tatum notification subscription...
   Chain: bsc-mainnet
   Currency: USDT
✅ [INVOICE] Webhook subscription created successfully!
   Subscription ID: abc123...
   Monitoring address: 0x...
   Network: bsc-mainnet
   Currency: USDT
```

## Related Files

- ✅ `src/lib/tatum/client.ts` - Chain mapping fixed
- ✅ `src/lib/tatum/notification-service.ts` - Schema references fixed
- ✅ `src/lib/trpc/routers/invoice.ts` - Webhook creation working
- ✅ `prisma/seed.networks.ts` - Network configs (unchanged)

## Status

✅ **FIXED** - Tatum webhook subscriptions now work with both short format (`bsc`) and `-mainnet` suffix (`bsc-mainnet`) chain identifiers.

The system is now fully compatible with the database schema's `tatumChainId` format while properly mapping to Tatum's webhook API requirements.
