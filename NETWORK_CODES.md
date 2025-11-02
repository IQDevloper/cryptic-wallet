# Network Codes Reference

This document lists all supported network codes and their aliases for invoice creation.

## Supported Networks

### BNB Smart Chain (BSC)
**Primary Code**: `bsc`

**Accepted Aliases**:
- `bsc` (recommended)
- `binance_smart_chain` ✅
- `bnb_smart_chain`
- `binance`

**Supported Assets**: BNB (native), USDT, USDC

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 12,
  "currency": "USDT",
  "network": "binance_smart_chain"  // Will be normalized to "bsc"
}
```

---

### Ethereum
**Primary Code**: `ethereum`

**Accepted Aliases**:
- `ethereum` (recommended)
- `ethereum_mainnet`
- `eth`

**Supported Assets**: ETH (native), USDT, USDC

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 100,
  "currency": "USDT",
  "network": "ethereum"
}
```

---

### TRON
**Primary Code**: `tron`

**Accepted Aliases**:
- `tron` (recommended)
- `tron_mainnet`
- `trx`

**Supported Assets**: TRX (native), USDT

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 50,
  "currency": "USDT",
  "network": "tron"
}
```

---

### Polygon
**Primary Code**: `polygon`

**Accepted Aliases**:
- `polygon` (recommended)
- `polygon_mainnet`
- `matic`

**Supported Assets**: MATIC (native), USDT, USDC

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 25,
  "currency": "USDT",
  "network": "polygon"
}
```

---

### Bitcoin
**Primary Code**: `bitcoin`

**Accepted Aliases**:
- `bitcoin` (recommended)
- `bitcoin_mainnet`
- `btc`

**Supported Assets**: BTC (native only)

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 0.001,
  "currency": "BTC",
  "network": "bitcoin"
}
```

---

### Litecoin
**Primary Code**: `litecoin`

**Accepted Aliases**:
- `litecoin` (recommended)
- `litecoin_mainnet`
- `ltc`

**Supported Assets**: LTC (native only)

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 0.1,
  "currency": "LTC",
  "network": "litecoin"
}
```

---

### Dogecoin
**Primary Code**: `dogecoin`

**Accepted Aliases**:
- `dogecoin` (recommended)
- `dogecoin_mainnet`
- `doge`

**Supported Assets**: DOGE (native only)

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 100,
  "currency": "DOGE",
  "network": "dogecoin"
}
```

---

### Bitcoin Cash
**Primary Code**: `bitcoin-cash`

**Accepted Aliases**:
- `bitcoin-cash` (recommended)
- `bitcoin_cash`
- `bch`

**Supported Assets**: BCH (native only)

**Example**:
```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 0.05,
  "currency": "BCH",
  "network": "bitcoin-cash"
}
```

---

## Complete Asset-Network Matrix

| Asset Symbol | Networks | Notes |
|-------------|----------|-------|
| **USDT** | ethereum, bsc, tron, polygon | Stablecoin - most networks |
| **USDC** | ethereum, bsc, polygon | Stablecoin |
| **BTC** | bitcoin | Native only |
| **ETH** | ethereum | Native only |
| **BNB** | bsc | Native only |
| **TRX** | tron | Native only |
| **MATIC** | polygon | Native only |
| **LTC** | litecoin | Native only |
| **DOGE** | dogecoin | Native only |
| **BCH** | bitcoin-cash | Native only |

---

## API Endpoint

**URL**: `POST /api/trpc/invoice.create`

**Authentication**: JWT Token (user session)

**Request Body**:
```json
{
  "merchantId": "string (required)",
  "amount": "number (required, positive)",
  "currency": "string (required, 2-10 chars)",
  "network": "string (required, 2-20 chars)",
  "description": "string (optional, max 500 chars)",
  "orderId": "string (optional, max 100 chars)"
}
```

**Success Response**:
```json
{
  "id": "inv_clx1y2z3...",
  "amount": "12",
  "currency": "USDT",
  "network": "bsc",
  "depositAddress": "0x1234567890abcdef...",
  "qrCodeData": "usdt:0x1234567890abcdef...?amount=12",
  "expiresAt": "2025-11-02T15:30:00.000Z",
  "status": "PENDING",
  "message": "Invoice created successfully with payment monitoring enabled"
}
```

**Error Response** (Unsupported Network):
```json
{
  "error": {
    "message": "Unsupported currency/network combination: USDT/wrong_network (normalized to: wrong_network). Available networks: bsc, ethereum, tron, polygon, bitcoin, litecoin, dogecoin, bitcoin-cash",
    "code": "BAD_REQUEST"
  }
}
```

---

## Network Normalization Logic

The system automatically normalizes network codes, so you can use any of the aliases listed above:

```javascript
// These are ALL equivalent:
{ "network": "bsc" }
{ "network": "binance_smart_chain" }  // ✅ Your format works now!
{ "network": "bnb_smart_chain" }
{ "network": "binance" }

// All will be normalized to: "bsc"
```

---

## Testing Your Request

Your exact request now works:

```json
{
  "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
  "amount": 12,
  "currency": "USDT",
  "network": "binance_smart_chain"  // ✅ This now works!
}
```

**Expected Result**:
- ✅ Network normalized to `bsc`
- ✅ USDT-BSC asset network found
- ✅ KMS wallet retrieved
- ✅ Unique BEP-20 address generated
- ✅ Invoice created successfully
- ✅ Webhook monitoring activated

---

## Recommended Networks for Each Asset

### For USDT (Stablecoin):
1. **TRON** (`tron`) - Lowest fees (~$1)
2. **BSC** (`bsc`) - Low fees (~$0.20)
3. **Polygon** (`polygon`) - Very low fees (~$0.01)
4. **Ethereum** (`ethereum`) - Highest fees (~$5-50) but most secure

### For USDC (Stablecoin):
1. **Polygon** (`polygon`) - Very low fees
2. **BSC** (`bsc`) - Low fees
3. **Ethereum** (`ethereum`) - Highest fees

### For Native Assets:
Use the primary network for each asset (BTC on bitcoin, ETH on ethereum, etc.)

---

## Quick Reference

```bash
# Create USDT invoice on BSC (using your format)
curl -X POST http://localhost:3000/api/trpc/invoice.create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
    "amount": 12,
    "currency": "USDT",
    "network": "binance_smart_chain"
  }'

# Create USDT invoice on TRON (lowest fees)
curl -X POST http://localhost:3000/api/trpc/invoice.create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "cmhcsobpn0002mxy3wmgfj25u",
    "amount": 12,
    "currency": "USDT",
    "network": "tron"
  }'
```

---

## Migration Guide

If you're migrating from another payment system, use this mapping:

| Your System | Our System |
|-------------|------------|
| `BINANCE_SMART_CHAIN` | `binance_smart_chain` or `bsc` |
| `ETH` | `ethereum` or `eth` |
| `TRX` | `tron` or `trx` |
| `MATIC` | `polygon` or `matic` |
| `BTC` | `bitcoin` or `btc` |

All variations are automatically normalized!
