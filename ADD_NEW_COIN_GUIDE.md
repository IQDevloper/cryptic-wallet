# 🪙 How to Add a New Coin - SIMPLE GUIDE

## 🎯 Super Simple - 3 Steps Only!

Want to add a new coin like **DOGE**, **SOL**, **XRP**? Follow these 3 steps:

---

## Step 1: Add to Config File (5 minutes)

### Edit: `prisma/seed.networks.ts`

Find the `SUPPORTED_NETWORKS` section and add your coin:

```typescript
const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  // ... existing networks ...

  // 👇 ADD YOUR NEW COIN HERE
  'solana': {
    code: 'solana',
    name: 'Solana',
    type: NetworkType.EVM, // or UTXO, TRON, SOLANA
    tatumChainId: 'solana-mainnet',
    nativeAsset: {
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9
    },
    derivationPath: "m/44'/501'/0'/0'", // Solana's BIP44 path
    blockConfirmations: 32,
    kmsChainCode: 'SOL', // For Tatum KMS
    explorerUrl: 'https://explorer.solana.com'
  },
}
```

### Token Example (USDC on Solana):

```typescript
const SUPPORTED_TOKENS: TokenConfig[] = [
  // ... existing tokens ...

  // 👇 ADD TOKEN HERE
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: '/tokens/usdc.svg',
    networks: [
      // ... existing networks ...
      {
        networkCode: 'solana',
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        tokenStandard: 'SPL'
      }
    ]
  }
]
```

---

## Step 2: Generate Wallet for New Coin (2 minutes)

```bash
# Start KMS
npm run kms:start

# Generate wallet for new coin
echo "YOUR_PASSWORD" | docker exec -i cryptic-kms \
  node /opt/app/dist/index.js generatemanagedwallet SOL

# Output will show:
# {
#   "signatureId": "abc123-def456...",
#   "xpub": "xpub6D4BDPcP2GT577Vvch3R8..."
# }

# Save this signatureId and xpub!
```

---

## Step 3: Seed Database (1 minute)

```bash
# Run seed script to add new coin to database
npm run db:seed:networks

# This will:
# ✅ Create Network (Solana)
# ✅ Create Asset (SOL)
# ✅ Create AssetNetwork (SOL on Solana)
# ✅ Create KmsWallet (with xpub)
```

---

## ✅ Done! Test It

```bash
# Create test invoice with new coin
curl -X POST http://localhost:3000/api/trpc/invoice.create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "your-merchant-id",
    "amount": "10",
    "currency": "SOL",
    "network": "solana"
  }'

# Should return unique SOL address!
```

---

## 📋 Quick Reference - Common Coins

### Copy & Paste These Configurations:

#### Dogecoin
```typescript
'dogecoin': {
  code: 'dogecoin',
  name: 'Dogecoin',
  type: NetworkType.UTXO,
  tatumChainId: 'dogecoin-mainnet',
  nativeAsset: { symbol: 'DOGE', name: 'Dogecoin', decimals: 8 },
  derivationPath: "m/44'/3'/0'/0",
  blockConfirmations: 6,
  kmsChainCode: 'DOGE',
  explorerUrl: 'https://dogechain.info'
},
```

#### Solana
```typescript
'solana': {
  code: 'solana',
  name: 'Solana',
  type: NetworkType.SOLANA,
  tatumChainId: 'solana-mainnet',
  nativeAsset: { symbol: 'SOL', name: 'Solana', decimals: 9 },
  derivationPath: "m/44'/501'/0'/0'",
  blockConfirmations: 32,
  kmsChainCode: 'SOL',
  explorerUrl: 'https://explorer.solana.com'
},
```

#### Ripple (XRP)
```typescript
'ripple': {
  code: 'ripple',
  name: 'Ripple',
  type: NetworkType.UTXO, // XRP uses its own consensus
  tatumChainId: 'xrp-mainnet',
  nativeAsset: { symbol: 'XRP', name: 'Ripple', decimals: 6 },
  derivationPath: "m/44'/144'/0'/0",
  blockConfirmations: 1,
  kmsChainCode: 'XRP',
  explorerUrl: 'https://xrpscan.com'
},
```

#### Arbitrum
```typescript
'arbitrum': {
  code: 'arbitrum',
  name: 'Arbitrum One',
  type: NetworkType.EVM,
  tatumChainId: 'arbitrum-mainnet',
  nativeAsset: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  derivationPath: "m/44'/60'/0'/0", // Same as Ethereum
  blockConfirmations: 10,
  kmsChainCode: 'ETH', // Uses ETH wallet
  explorerUrl: 'https://arbiscan.io'
},
```

#### Base
```typescript
'base': {
  code: 'base',
  name: 'Base',
  type: NetworkType.EVM,
  tatumChainId: 'base-mainnet',
  nativeAsset: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  derivationPath: "m/44'/60'/0'/0", // Same as Ethereum
  blockConfirmations: 10,
  kmsChainCode: 'ETH', // Uses ETH wallet
  explorerUrl: 'https://basescan.org'
},
```

---

## 🔄 Common Token Contracts

### USDT (Tether)
```typescript
{
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 6,
  logoUrl: '/tokens/usdt.svg',
  networks: [
    {
      networkCode: 'ethereum',
      contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      tokenStandard: 'ERC-20'
    },
    {
      networkCode: 'bsc',
      contractAddress: '0x55d398326f99059fF775485246999027B3197955',
      tokenStandard: 'BEP-20'
    },
    {
      networkCode: 'polygon',
      contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      tokenStandard: 'ERC-20'
    },
    {
      networkCode: 'tron',
      contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      tokenStandard: 'TRC-20'
    }
  ]
}
```

### USDC
```typescript
{
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  logoUrl: '/tokens/usdc.svg',
  networks: [
    {
      networkCode: 'ethereum',
      contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      tokenStandard: 'ERC-20'
    },
    {
      networkCode: 'bsc',
      contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      tokenStandard: 'BEP-20'
    },
    {
      networkCode: 'polygon',
      contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      tokenStandard: 'ERC-20'
    },
    {
      networkCode: 'arbitrum',
      contractAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      tokenStandard: 'ERC-20'
    },
    {
      networkCode: 'base',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      tokenStandard: 'ERC-20'
    }
  ]
}
```

---

## 🛠️ Troubleshooting

### Issue: "Network not found"
**Solution:** Run seed script again
```bash
npm run db:seed:networks
```

### Issue: "KMS wallet generation failed"
**Solution:** Check if KMS Docker is running
```bash
docker ps | grep cryptic-kms
# If not running:
npm run kms:start
```

### Issue: "Address generation failed"
**Solution:** Verify xPub is in database
```bash
npx prisma studio
# Check kms_wallets table
# Should have xpub for your new coin
```

---

## 📊 What Happens Behind the Scenes?

### Database Structure:
```
Asset (SOL)
   ↓
Network (Solana)
   ↓
AssetNetwork (SOL on Solana)
   ↓
KmsWallet (signatureId + xpub)
   ↓
PaymentAddress (unique per invoice)
```

### When Invoice Created:
```typescript
1. Find AssetNetwork (SOL on Solana)
2. Find KmsWallet for Solana
3. Get xPub from KmsWallet
4. Generate address: derivePath(`0/${index}`)
5. Save PaymentAddress to database
6. Return unique address to customer
```

---

## 🎓 Understanding Derivation Paths

Each coin uses a different BIP44 derivation path:

```
Format: m / purpose' / coin_type' / account' / change / address_index

Examples:
- Bitcoin:  m/44'/0'/0'/0/{index}
- Ethereum: m/44'/60'/0'/0/{index}
- Litecoin: m/44'/2'/0'/0/{index}
- Dogecoin: m/44'/3'/0'/0/{index}
- Solana:   m/44'/501'/0'/0/{index}
```

**Find more:** https://github.com/satoshilabs/slips/blob/master/slip-0044.md

---

## ✅ Checklist for Adding New Coin

- [ ] Add coin config to `seed.networks.ts`
- [ ] Generate KMS wallet (`generatemanagedwallet`)
- [ ] Copy signatureId and xpub
- [ ] Run seed script (`npm run db:seed:networks`)
- [ ] Verify in Prisma Studio
- [ ] Test invoice creation
- [ ] Add coin logo to `/public/tokens/`
- [ ] Update frontend coin selector

---

## 🚀 Advanced: Bulk Add Multiple Coins

```bash
# Add multiple coins at once
npm run db:seed:networks

# The script will:
# 1. Read all configs from seed.networks.ts
# 2. Create missing networks
# 3. Create missing assets
# 4. Link assets to networks
# 5. Generate KMS wallets (if configured)
```

---

## 💡 Pro Tips

1. **EVM Chains (Ethereum, BSC, Polygon, Arbitrum, Base):**
   - All use same xPub (Ethereum wallet)
   - Just add network config
   - No need for new KMS wallet!

2. **Tokens (USDT, USDC, DAI):**
   - Don't need separate wallets
   - Use native coin's wallet (ETH for ERC-20)
   - Just add contract address

3. **Testing:**
   - Use testnet first
   - Change `tatumChainId` to `-testnet`
   - Get free testnet coins from faucets

---

## 📞 Need Help?

**Common questions:**
- "What's the derivation path?" → Check BIP44 registry
- "Where's the contract address?" → Check blockchain explorer
- "What's the token standard?" → ERC-20, BEP-20, TRC-20, SPL
- "How many confirmations?" → Check coin's documentation

**Still stuck?** Open an issue with:
- Coin name
- Network type (EVM/UTXO/etc)
- What you tried
- Error messages

---

**That's it! Adding a new coin takes < 10 minutes!** 🎉
