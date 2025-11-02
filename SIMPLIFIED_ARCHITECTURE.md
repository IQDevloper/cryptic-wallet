# 🏗️ Simplified System Architecture

## 🎯 Your System in Simple Terms

Think of your payment gateway like a **bank for crypto payments**:

---

## 📊 Simple Data Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         DATABASE                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Asset (The Coin)                                   │   │
│  │  - symbol: "BTC", "ETH", "USDT"                    │   │
│  │  - name: "Bitcoin", "Ethereum", "Tether"           │   │
│  │  - type: NATIVE or TOKEN                           │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    │ can exist on multiple networks         │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │  Network (The Blockchain)                           │   │
│  │  - code: "ethereum", "bsc", "polygon"              │   │
│  │  - type: EVM, UTXO, TRON, SOLANA                  │   │
│  │  - blockConfirmations: 12                          │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    │ each network has                        │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │  AssetNetwork (Coin on Specific Chain)             │   │
│  │  - USDT on Ethereum (ERC-20)                       │   │
│  │  - USDT on BSC (BEP-20)                           │   │
│  │  - contractAddress: 0xabc...                       │   │
│  │  - decimals: 6                                     │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    │ generates addresses from                │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │  KmsWallet (Master Key for Network)                │   │
│  │  - signatureId: "abc-123-def-456"                 │   │
│  │  - xpub: "xpub6D4BDPcP2GT577Vvch3R8..."          │   │
│  │  - nextAddressIndex: 0, 1, 2, 3...               │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│                    │ derives unique addresses                │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │  PaymentAddress (Unique per Invoice)               │   │
│  │  - address: "0x742d35Cc8fF34A82D1C8F2B9..."       │   │
│  │  - derivationIndex: 0                              │   │
│  │  - balance: 0                                      │   │
│  │  - invoiceId: "invoice_xyz"                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works (Invoice Flow)

### Step 1: Customer Creates Invoice
```
Customer: "I want to pay $100 in USDT on BSC"
```

### Step 2: System Finds Configuration
```typescript
// 1. Find Asset
const asset = db.assets.find(symbol: "USDT")

// 2. Find Network
const network = db.networks.find(code: "bsc")

// 3. Find AssetNetwork (USDT on BSC)
const assetNetwork = db.assetNetworks.find({
  assetId: asset.id,
  networkId: network.id
})

// Result:
{
  asset: "USDT",
  network: "BSC",
  contractAddress: "0x55d398326f99059fF775485246999027B3197955",
  decimals: 18,
  tokenStandard: "BEP-20"
}
```

### Step 3: Generate Unique Address
```typescript
// 1. Get KMS wallet for BSC
const kmsWallet = db.kmsWallets.find(networkId: bsc.id)

// 2. Get next index
const index = kmsWallet.nextAddressIndex // e.g., 5

// 3. Generate address from xPub
const address = deriveAddress(kmsWallet.xpub, index)
// Result: "0xD9FC154Ae4EbC2A1735d73DcF2D8Ef6633De5815"

// 4. Increment index for next invoice
kmsWallet.nextAddressIndex = 6
```

### Step 4: Create Invoice
```typescript
const invoice = {
  amount: 100,
  currency: "USDT",
  network: "bsc",
  depositAddress: "0xD9FC154Ae4EbC2A1735d73DcF2D8Ef6633De5815",
  status: "PENDING"
}
```

### Step 5: Monitor Payment
```
Tatum Webhook → Payment received → Update invoice → Notify merchant
```

---

## 🪙 Adding New Coin - Visual Guide

### Option 1: Interactive Tool (Easiest)
```bash
npm run add-coin

# Wizard asks you:
# 1. Coin symbol? SOL
# 2. Coin name? Solana
# 3. Network type? Solana
# 4. Decimals? 9
# 5. Explorer URL? https://explorer.solana.com
# 6. Generate wallet? Yes

# Done! ✅
```

### Option 2: Manual (More Control)

#### Step 1: Edit Config File
```typescript
// File: prisma/seed.networks.ts

const SUPPORTED_NETWORKS = {
  // ... existing ...

  'solana': { // 👈 Add this
    code: 'solana',
    name: 'Solana',
    type: NetworkType.SOLANA,
    tatumChainId: 'solana-mainnet',
    nativeAsset: {
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9
    },
    derivationPath: "m/44'/501'/0'/0'",
    blockConfirmations: 32,
    kmsChainCode: 'SOL'
  }
}
```

#### Step 2: Generate Wallet
```bash
echo "PASSWORD" | docker exec -i cryptic-kms \
  node /opt/app/dist/index.js generatemanagedwallet SOL

# Output:
{
  "signatureId": "xyz-789",
  "xpub": "xpub6..."
}
```

#### Step 3: Seed Database
```bash
npm run db:seed:networks

# Creates:
# ✅ Network (Solana)
# ✅ Asset (SOL)
# ✅ AssetNetwork (SOL on Solana)
# ✅ KmsWallet (with xpub)
```

---

## 🎯 Current System State

### Supported Coins (After Setup)
```
✅ Bitcoin (BTC)
✅ Ethereum (ETH)
✅ BNB (BSC native)
✅ Polygon (MATIC)
✅ TRON (TRX)
✅ Litecoin (LTC)
✅ USDT (Ethereum, BSC, Polygon, Tron)
✅ USDC (Ethereum, BSC, Polygon)
```

### How Each Works:

#### Native Coins (BTC, ETH, BNB, etc.)
```
1. One KMS wallet per network
2. Generate addresses from xPub
3. Customer deposits to unique address
4. System detects payment via webhook
```

#### Tokens (USDT, USDC)
```
1. Use native coin's wallet (ETH wallet for ERC-20)
2. Generate same address as native coin
3. Customer deposits token to address
4. System detects via contract address
```

---

## 🔐 Security Model (Simple)

### What's Stored in Database (SAFE)
```
✅ xPub (public key - can't derive private keys)
✅ Addresses (public - customers send here)
✅ Invoice data (public - payment info)
```

### What's NOT in Database (SECURE)
```
❌ Private keys (stored in hardware wallet offline)
❌ Mnemonic (24 words - offline backup)
❌ Passwords (in secure vault, not filesystem)
```

### For Deposits (What You Have Now)
```
xPub in DB → Generate address → Customer pays → Webhook updates

NO PRIVATE KEYS NEEDED ✅
```

### For Withdrawals (Future)
```
Admin dashboard → Review pending → Connect hardware wallet
→ Sign on device → Broadcast transaction

PRIVATE KEYS STAY IN HARDWARE WALLET ✅
```

---

## 📋 File Structure (Simplified)

### Configuration Files
```
prisma/
├── schema.prisma           # Database structure
└── seed.networks.ts        # Coin/network configs ← ADD COINS HERE
```

### Scripts
```
scripts/
├── add-coin.ts            # Interactive tool ← USE THIS
├── generate-kms-wallets.ts
├── extract-kms-xpubs.ts
└── test-address-generation.ts
```

### Core Logic
```
src/lib/
├── kms/
│   └── address-generator.ts  # Generates addresses from xPub
└── trpc/routers/
    └── invoice.ts            # Creates invoices
```

---

## 🎓 Key Concepts Explained

### xPub (Extended Public Key)
```
Think of it as a "master receipt generator"

xPub → Can generate infinite public addresses
      → CANNOT derive private keys
      → Safe to store in database
      → Used for deposits only

Example:
xpub6D4BDPcP2GT577Vvch3R8...
  ↓ derive index 0
0x91D5263f4B3A327FDc67D7921A550EFDB9DA0Cd2
  ↓ derive index 1
0xD9FC154Ae4EbC2A1735d73DcF2D8Ef6633De5815
  ↓ derive index 2
0x619246d5FC02Be6b4147e154f3f5F9b88e207915
```

### Derivation Path
```
Format: m/44'/coin_type'/account'/change/index

Example: m/44'/60'/0'/0/5
         │   │    │   │  │
         │   │    │   │  └─ Address index (unique per invoice)
         │   │    │   └──── Change (always 0 for receiving)
         │   │    └──────── Account (usually 0)
         │   └───────────── Coin type (60 = Ethereum)
         └───────────────── Purpose (44 = BIP44 standard)

Each coin has different number:
- Bitcoin: 0
- Ethereum: 60
- Litecoin: 2
- Dogecoin: 3
- Solana: 501
```

### HD Wallet (Hierarchical Deterministic)
```
One master key → Infinite child keys

Benefits:
✅ Backup once (24 words)
✅ Recover all addresses
✅ No need to backup each address
✅ Deterministic (same seed = same addresses)
```

---

## 🚀 Quick Commands Reference

### Add New Coin
```bash
# Interactive (recommended)
npm run add-coin

# Manual
# 1. Edit prisma/seed.networks.ts
# 2. Run: npm run db:seed:networks
```

### Test System
```bash
# Test address generation
npm run kms:test-addresses

# Create test invoice
curl -X POST http://localhost:3000/api/trpc/invoice.create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"amount":"10","currency":"BTC","network":"bitcoin"}'
```

### Manage KMS
```bash
npm run kms:start          # Start KMS Docker
npm run kms:stop           # Stop KMS
npm run kms:logs           # View logs
npm run kms:backup         # Backup mnemonics
npm run kms:extract-xpubs  # Update database with xPubs
```

---

## 💡 Pro Tips

### Adding EVM Chain (Easy)
```
Ethereum-compatible chains use SAME xPub:
- Arbitrum, Base, Optimism, Avalanche, etc.

Just add network config, no new wallet needed!
```

### Adding Token (Very Easy)
```
Tokens use native coin's wallet:
- USDT on Ethereum = Use ETH wallet
- USDC on BSC = Use BNB wallet

Just add contract address!
```

### Testing New Coin
```bash
# 1. Add coin (npm run add-coin)
# 2. Verify in database (npx prisma studio)
# 3. Create test invoice
# 4. Check address generated
# 5. Send test payment (testnet)
# 6. Verify webhook received
```

---

## ✅ System Health Checklist

### Before Adding Coin:
- [ ] Database seeded with base coins
- [ ] KMS Docker running (if generating wallet)
- [ ] xPubs extracted to database

### After Adding Coin:
- [ ] Coin appears in database (Prisma Studio)
- [ ] Test invoice creates successfully
- [ ] Address generated properly
- [ ] Webhook endpoint configured

---

**Your system is now SIMPLE and ORGANIZED!** 🎉

New coin = 3 steps: Add config → Generate wallet → Seed database → Done!
