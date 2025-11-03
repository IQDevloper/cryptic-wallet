# 🪙 Coin Management Guide

Complete guide for adding and deleting cryptocurrencies in Cryptic Gateway.

---

## 📝 Table of Contents

1. [Adding New Coins](#adding-new-coins)
2. [Deleting Coins](#deleting-coins)
3. [Troubleshooting](#troubleshooting)
4. [Database Relationships](#database-relationships)

---

## ➕ Adding New Coins

### Method 1: AI-Powered Addition (Recommended)

The AI tool automatically researches coin details, creates database entries, generates KMS wallets, and sets up merchant wallets.

```bash
npm run ai:add-coin
```

**Interactive Prompts:**
1. Enter cryptocurrency symbol (e.g., SOL, AVAX, DOT)
2. Optional: Provide hints for AI research
3. Review AI research results
4. Confirm configuration
5. Choose to generate KMS wallets (y/n)
6. Choose to create merchant wallets (y/n)

**What It Does:**
- ✅ AI researches coin specifications (decimals, contract addresses, networks)
- ✅ Creates Asset entry in database
- ✅ Creates Network entries (if new blockchain)
- ✅ Creates AssetNetwork relationships
- ✅ Generates KMS wallets for all networks
- ✅ Creates merchant wallets for ALL existing merchants
- ✅ Ready for payments immediately!

**Example: Adding USDC (Token)**
```
🪙 Enter cryptocurrency symbol: USDC
💡 Any hints for AI?: Stablecoin on multiple networks

AI will research and configure:
- Asset: USDC (USD Coin)
- Networks: Ethereum, BSC, Polygon, Tron
- KMS wallets: ETH, BSC, MATIC, TRON
- Merchant wallets: Created for all merchants on all networks
```

**Example: Adding SOL (Native Coin)**
```
🪙 Enter cryptocurrency symbol: SOL
💡 Any hints for AI?: Solana blockchain

AI will research and configure:
- Asset: SOL (Solana)
- Network: Solana (new blockchain)
- KMS wallet: SOL
- Merchant wallets: Created for all merchants
```

### Method 2: Manual Addition

For advanced users who want full control.

```bash
npm run add-coin
```

Follow the manual prompts to enter all coin details yourself.

---

## 🗑️ Deleting Coins

### Safe Deletion Script

Use the safe deletion script to remove a coin and all related data without foreign key errors.

```bash
npm run delete-coin
```

**Interactive Prompts:**
1. Enter cryptocurrency symbol to delete (e.g., DOGE)
2. Review deletion preview
3. Confirm deletion (type "yes")
4. Final confirmation (type coin symbol)

**What Gets Deleted (in order):**

```
📊 Deletion Order:
  [1/9] Transactions (if any invoices exist)
  [2/9] Webhook notifications
  [3/9] Webhook deliveries
  [4/9] Invoices using this asset
  [5/9] Payment addresses
  [6/9] Merchant wallets
  [7/9] Asset-network relationships
  [8/9] KMS wallets (if network only used by this asset)
  [9/9] Asset itself
  [Cleanup] Orphaned networks (if network only used by this asset)
```

**Example: Deleting DOGE**

```bash
$ npm run delete-coin

🪙 Enter cryptocurrency symbol to delete: DOGE

🔍 Searching for DOGE...
✅ Found: Dogecoin (DOGE)
   Type: NATIVE
   Status: Active

📊 Deletion Preview:

  Networks: 1
    - Dogecoin (dogecoin)
      Merchant Wallets: 5
      Payment Addresses: 0
      Invoices: 0
      Transactions: 0

  📝 Total Summary:
    Asset Networks: 1
    Merchant Wallets: 5
    Payment Addresses: 0
    Invoices: 0
    Transactions: 0

⚠️  Are you sure you want to delete DOGE? (yes/no): yes
⚠️  This action CANNOT be undone! Type "DOGE" to confirm: DOGE

🗑️  Starting deletion process for DOGE...

  [1/9] Deleting transactions...
        ✅ Deleted 0 transactions
  [2/9] Deleting webhook notifications...
        ✅ Deleted 0 webhook notifications
  [3/9] Deleting webhook deliveries...
        ✅ Deleted webhook deliveries
  [4/9] Deleting invoices...
        ✅ Deleted 0 invoices
  [5/9] Deleting payment addresses...
        ✅ Deleted 0 payment addresses
  [6/9] Deleting merchant wallets...
        ✅ Deleted 5 merchant wallets
  [7/9] Deleting asset-network relationships...
        ✅ Deleted 1 asset-network relationships
  [8/9] Checking for orphaned KMS wallets...
        ℹ️  Deleted 1 KMS wallet(s) for dogecoin
        ✅ Deleted 1 KMS wallets
  [9/9] Deleting asset...
        ✅ Deleted asset: DOGE
  [Cleanup] Checking for orphaned networks...
        ℹ️  Deleted orphaned network: dogecoin
        ✅ Deleted 1 orphaned networks

✅ Successfully deleted DOGE!

📊 Deletion Summary:
   Assets: 1
   Asset Networks: 1
   Networks: 1
   Merchant Wallets: 5
   Payment Addresses: 0
   Invoices: 0
   Transactions: 0
   Webhook Notifications: 0
   KMS Wallets: 1
```

---

## ⚠️ Important Warnings

### Deleting Coins with Transaction History

If you try to delete a coin that has invoices/transactions:

```
⚠️  WARNING: This asset has 15 invoices with transaction history!
    Deleting will remove all payment records for these invoices.
```

**This will delete:**
- All payment records
- All transaction history
- All merchant balances for this coin

**Consider instead:**
1. **Deactivate** the coin (set `isActive = false`) instead of deleting
2. Export transaction data for records
3. Wait until all invoices expire/complete

### Shared Networks

If deleting a token on a network used by other assets:

```
ℹ️  Network "ethereum" is used by other assets
    KMS wallet will NOT be deleted
```

The script is smart enough to:
- Keep KMS wallets if network is used by other assets
- Keep networks if other assets use them
- Only delete orphaned resources

---

## 🔧 Troubleshooting

### Error: Foreign Key Constraint Violation

**Problem:** Trying to delete directly in Prisma Studio or MySQL

```sql
ERROR: delete on table "assets" violates foreign key constraint
```

**Solution:** Use the safe deletion script

```bash
npm run delete-coin
```

### Error: Asset Not Found

**Problem:** Coin symbol doesn't exist

```
❌ Asset "XYZ" not found in database

Available assets:
  - BTC (Bitcoin)
  - ETH (Ethereum)
  - USDT (Tether USD)
  - USDC (USD Coin)
```

**Solution:** Check spelling or use one of the available symbols

### Error: Cannot Delete (Prisma Studio)

**Problem:** Prisma Studio prevents deletion due to relations

**Solution:** Never delete from Prisma Studio. Always use:

```bash
npm run delete-coin
```

---

## 📊 Database Relationships

Understanding the foreign key chain:

```
Asset
  ↓ (one-to-many)
AssetNetwork
  ↓ (one-to-many)
├─ MerchantWallet → Merchant
├─ PaymentAddress → Invoice → Transaction
└─ Network → KmsWallet
```

**Deletion must follow reverse order:**
1. Transactions (leaf)
2. Invoices
3. PaymentAddresses
4. MerchantWallets
5. AssetNetworks
6. Assets (root)
7. Networks (if orphaned)
8. KmsWallets (if orphaned)

---

## 💡 Best Practices

### Adding Coins

1. ✅ Use `ai:add-coin` for automatic setup
2. ✅ Always generate KMS wallets when prompted
3. ✅ Always create merchant wallets for existing merchants
4. ✅ Test with a small transaction before announcing
5. ✅ Document custom contract addresses if token

### Deleting Coins

1. ✅ Export transaction history first (if needed)
2. ✅ Consider deactivating instead of deleting
3. ✅ Review deletion preview carefully
4. ✅ Backup database before major deletions
5. ✅ Use the safe deletion script, never manual SQL

### Maintenance

1. ✅ Regularly audit unused coins
2. ✅ Keep KMS wallets backed up
3. ✅ Monitor merchant wallet balances before deletion
4. ✅ Test coin addition/deletion in staging first

---

## 🚀 Quick Reference

| Task | Command | Time | Difficulty |
|------|---------|------|------------|
| Add coin (AI) | `npm run ai:add-coin` | 2-3 min | Easy |
| Add coin (Manual) | `npm run add-coin` | 5-10 min | Medium |
| Delete coin | `npm run delete-coin` | 1-2 min | Easy |
| List coins | Prisma Studio | - | Easy |
| Generate KMS | `npm run kms:generate` | 5 min | Medium |

---

## 📞 Support

If you encounter issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review database logs: `docker logs cryptic-postgres`
3. Check KMS logs: `npm run kms:logs`
4. Open an issue with error details

---

**Remember:** The safe deletion script handles all foreign key constraints automatically. Never attempt manual deletion via SQL or Prisma Studio! 🛡️
