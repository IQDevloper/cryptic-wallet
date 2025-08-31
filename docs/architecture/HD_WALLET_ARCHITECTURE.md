# HD Wallet Payment Gateway Architecture Design

## 🎯 Overview
Replace Tatum Virtual Accounts with HD (Hierarchical Deterministic) Wallets for a simpler, more scalable payment gateway.

## 🏛️ **CRITICAL ARCHITECTURAL DECISION**

### **Option 1: HD Wallet Per Merchant (Decentralized)**
Each merchant gets their own HD wallet - they control their own funds.

### **Option 2: Global HD Wallet + Database Balances (Centralized)** ⭐ **RECOMMENDED**
One master wallet per currency, track merchant balances in database only.

---

## 📊 **COMPARISON: Per-Merchant vs Global HD Wallet**

| Aspect | Per-Merchant HD Wallet | Global HD Wallet + DB Balances |
|--------|------------------------|--------------------------------|
| **Complexity** | High - manage 1000s of wallets | Low - manage ~10 global wallets |
| **Security Risk** | Distributed risk | Centralized risk |
| **Gas Efficiency** | Poor - scattered funds | Excellent - pooled liquidity |
| **Withdrawal Speed** | Depends on address balance | Instant from pool |
| **Industry Standard** | Self-custodial wallets | **Coinbase, Binance, BitPay** |
| **Regulatory** | Non-custodial | Custodial (may need licenses) |
| **Trust Model** | Merchant controls funds | **Platform controls funds** |
| **Database Criticality** | Backup only | **Core business data** |

---

## 🎯 **GLOBAL HD WALLET ARCHITECTURE** (Recommended)

**This is exactly how Coinbase Commerce, BitPay, and most crypto payment processors work!**

### 🏗️ **Simplified Architecture**

#### **1. Global Master Wallets (One per Currency/Network)**
```typescript
interface GlobalHDWallet {
  id: string
  currency: string           // "BTC", "ETH", "USDT"  
  network: string           // "bitcoin", "ethereum", "bsc", "tron"
  contractAddress?: string  // For tokens like USDT
  xpub: string             // Master public key for address derivation
  encryptedPrivateKey: string // HIGHLY SECURED master private key
  derivationPath: string   // e.g., "m/44'/60'/0'/0" 
  nextAddressIndex: number // Global counter across all merchants
  totalPoolBalance: number // Total balance across all derived addresses
  createdAt: DateTime
}

// Example: Only ~10 global wallets total
// - BTC Global Wallet
// - ETH Global Wallet  
// - USDT-ETH Global Wallet
// - USDT-BSC Global Wallet
// - USDT-TRON Global Wallet
// etc.
```

#### **2. Merchant Balance Tracking (Database Only)**
```typescript
interface MerchantBalance {
  id: string
  merchantId: string
  globalWalletId: string    // References GlobalHDWallet
  balance: number          // Their share of the global pool
  lockedBalance: number    // For pending withdrawals
  totalReceived: number    // Lifetime received amount
  totalWithdrawn: number   // Lifetime withdrawn amount
  lastUpdated: DateTime
  
  // Derived field: availableBalance = balance - lockedBalance
}
```

#### **3. Address Assignment (Same derivation, different tracking)**
```typescript
interface DerivedAddress {
  id: string
  globalWalletId: string   // Which master wallet derived this
  merchantId: string       // Who "owns" this address
  address: string         // The actual blockchain address
  derivationIndex: number // Index used to derive this address
  currentBalance: number  // Current blockchain balance
  assignedToInvoice?: string // If assigned to specific invoice
  createdAt: DateTime
}
```

### 🔄 **Payment Flow with Global Wallets**

#### **Invoice Creation**
```typescript
async function createInvoice(merchantId: string, amount: number, currency: string) {
  // 1. Get global wallet for this currency
  const globalWallet = await getGlobalWallet(currency, network)
  
  // 2. Derive next available address from GLOBAL wallet
  const addressIndex = globalWallet.nextAddressIndex
  const depositAddress = deriveAddressFromXpub(globalWallet.xpub, addressIndex)
  
  // 3. Assign this address to the merchant
  await db.derivedAddress.create({
    globalWalletId: globalWallet.id,
    merchantId,                    // 🔑 This merchant "owns" this address
    address: depositAddress,
    derivationIndex: addressIndex,
    assignedToInvoice: invoiceId
  })
  
  // 4. Increment global counter
  await db.globalWallet.update({
    where: { id: globalWallet.id },
    data: { nextAddressIndex: addressIndex + 1 }
  })
  
  return { invoiceId, depositAddress }
}
```

#### **Payment Processing**
```typescript
async function processPayment(webhookData: TatumWebhook) {
  // 1. Find which merchant owns this address
  const derivedAddress = await db.derivedAddress.findUnique({
    where: { address: webhookData.address }
  })
  
  // 2. Credit the merchant's balance (DATABASE ONLY)
  await db.merchantBalance.update({
    where: { 
      merchantId: derivedAddress.merchantId,
      globalWalletId: derivedAddress.globalWalletId 
    },
    data: { 
      balance: { increment: webhookData.amount },
      totalReceived: { increment: webhookData.amount }
    }
  })
  
  // 3. Update address balance (for reconciliation)
  await db.derivedAddress.update({
    where: { id: derivedAddress.id },
    data: { currentBalance: webhookData.amount }
  })
  
  // 4. Mark invoice as paid
  await db.invoice.update({
    where: { id: derivedAddress.assignedToInvoice },
    data: { status: 'PAID', paidAt: new Date() }
  })
}
```

#### **Merchant Withdrawal**
```typescript
async function withdrawMerchantFunds(
  merchantId: string, 
  currency: string, 
  amount: number, 
  withdrawalAddress: string
) {
  // 1. Check merchant's database balance
  const merchantBalance = await db.merchantBalance.findFirst({
    where: { merchantId, globalWallet: { currency } }
  })
  
  if (merchantBalance.balance < amount) {
    throw new Error('Insufficient balance')
  }
  
  // 2. Lock the withdrawal amount
  await db.merchantBalance.update({
    where: { id: merchantBalance.id },
    data: { lockedBalance: { increment: amount } }
  })
  
  // 3. Send from global wallet (you control the private key)
  const globalWallet = await getGlobalWallet(currency)
  const privateKey = decrypt(globalWallet.encryptedPrivateKey)
  
  await sendTransactionFromGlobalWallet(
    privateKey,
    withdrawalAddress, 
    amount,
    currency
  )
  
  // 4. Update balances after successful withdrawal
  await db.merchantBalance.update({
    where: { id: merchantBalance.id },
    data: { 
      balance: { decrement: amount },
      lockedBalance: { decrement: amount },
      totalWithdrawn: { increment: amount }
    }
  })
}
```

---

## 🎯 **KEY ADVANTAGES OF GLOBAL HD WALLET**

### ✅ **Operational Benefits**
1. **Liquidity Pool** - All funds in one pot, can pay any withdrawal instantly
2. **Gas Efficiency** - Batch multiple withdrawals in one transaction  
3. **Simplified Accounting** - Track balances in database, not blockchain
4. **No "Insufficient Balance"** - Pool can cover any individual withdrawal
5. **Easier Compliance** - One entity controlling all funds

### ✅ **Technical Benefits**  
1. **Only ~10 wallets to manage** instead of thousands
2. **Simple backup** - secure just the master private keys
3. **Atomic operations** - database transactions for balance updates
4. **Better monitoring** - centralized fund tracking
5. **Scalable** - works for millions of merchants

### ✅ **Business Benefits**
1. **Industry Standard** - how all major processors work
2. **Lower operational costs** - less complexity
3. **Better user experience** - instant balance updates
4. **Revenue opportunities** - can earn interest on pooled funds

---

## ⚠️ **RISKS & MITIGATIONS**

| Risk | Mitigation |
|------|------------|
| **Database corruption** | Multiple backups, point-in-time recovery |
| **Private key compromise** | Hardware security modules (HSM) |
| **Accounting errors** | Daily reconciliation jobs |
| **Regulatory issues** | Proper licensing as money transmitter |
| **Internal fraud** | Multi-signature withdrawals, audit logs |

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Database Schema**
```sql
-- Global master wallets (one per currency/network)
CREATE TABLE global_hd_wallets (
  id TEXT PRIMARY KEY,
  currency TEXT NOT NULL,        -- BTC, ETH, USDT
  network TEXT NOT NULL,         -- bitcoin, ethereum, bsc, tron  
  contract_address TEXT,         -- for tokens
  xpub TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  derivation_path TEXT NOT NULL,
  next_address_index BIGINT DEFAULT 0,
  total_pool_balance DECIMAL(36,18) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(currency, network, contract_address)
);

-- Merchant balances (database-only tracking)
-- ONE RECORD PER MERCHANT PER CURRENCY/NETWORK COMBINATION
CREATE TABLE merchant_balances (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  global_wallet_id TEXT NOT NULL,  -- Links to specific currency/network wallet
  
  -- Balance tracking for this specific currency
  balance DECIMAL(36,18) DEFAULT 0,         -- Available balance
  locked_balance DECIMAL(36,18) DEFAULT 0,  -- Locked for pending withdrawals
  total_received DECIMAL(36,18) DEFAULT 0,  -- Lifetime received
  total_withdrawn DECIMAL(36,18) DEFAULT 0, -- Lifetime withdrawn
  
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (global_wallet_id) REFERENCES global_hd_wallets(id),
  UNIQUE(merchant_id, global_wallet_id)  -- One balance per merchant per currency
);

-- Example records for Merchant ABC123:
-- merchant_id='ABC123', global_wallet_id='btc-wallet'     -> BTC balance: 0.05
-- merchant_id='ABC123', global_wallet_id='eth-wallet'     -> ETH balance: 2.1  
-- merchant_id='ABC123', global_wallet_id='usdt-eth-wallet' -> USDT-ETH balance: 1500.00
-- merchant_id='ABC123', global_wallet_id='usdt-bsc-wallet' -> USDT-BSC balance: 750.00
-- merchant_id='ABC123', global_wallet_id='usdt-tron-wallet' -> USDT-TRON balance: 0.00

-- Derived addresses (who owns which address)
CREATE TABLE derived_addresses (
  id TEXT PRIMARY KEY,
  global_wallet_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  derivation_index BIGINT NOT NULL,
  current_balance DECIMAL(36,18) DEFAULT 0,
  assigned_to_invoice TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (global_wallet_id) REFERENCES global_hd_wallets(id)
);
```

### **Phase 2: Merchant Balance Management**

#### **Merchant Onboarding Process:**
```typescript
async function createMerchant(merchantData: CreateMerchantRequest) {
  const merchant = await db.merchant.create({ data: merchantData })
  
  // Get all available global wallets (BTC, ETH, USDT-ETH, USDT-BSC, etc.)
  const globalWallets = await db.globalHDWallet.findMany({
    where: { isActive: true }
  })
  
  // Create balance record for each supported currency
  for (const globalWallet of globalWallets) {
    await db.merchantBalance.create({
      data: {
        merchantId: merchant.id,
        globalWalletId: globalWallet.id,
        balance: 0,                    // Start with zero balance
        lockedBalance: 0,
        totalReceived: 0,
        totalWithdrawn: 0
      }
    })
  }
  
  // Result: Merchant now has balance records for all currencies
  // - BTC balance: 0.00000000
  // - ETH balance: 0.000000000000000000  
  // - USDT-ETH balance: 0.000000000000000000
  // - USDT-BSC balance: 0.000000000000000000
  // - USDT-TRON balance: 0.000000000000000000
  
  return merchant
}
```

#### **Get Merchant Balances (Dashboard View):**
```typescript
async function getMerchantBalances(merchantId: string) {
  const balances = await db.merchantBalance.findMany({
    where: { merchantId },
    include: {
      globalWallet: {
        select: {
          currency: true,    // "BTC", "ETH", "USDT"
          network: true,     // "bitcoin", "ethereum", "bsc", "tron"
          contractAddress: true
        }
      }
    }
  })
  
  // Transform to UI format
  return balances.map(balance => ({
    currency: balance.globalWallet.currency,
    network: balance.globalWallet.network,
    displayName: balance.globalWallet.contractAddress 
      ? `${balance.globalWallet.currency}-${balance.globalWallet.network.toUpperCase()}`
      : balance.globalWallet.currency,
    balance: balance.balance,
    availableBalance: balance.balance - balance.lockedBalance,
    totalReceived: balance.totalReceived,
    totalWithdrawn: balance.totalWithdrawn
  }))
  
  // Example output:
  // [
  //   { currency: "BTC", network: "bitcoin", displayName: "BTC", balance: "0.05000000" },
  //   { currency: "ETH", network: "ethereum", displayName: "ETH", balance: "2.100000000000000000" },
  //   { currency: "USDT", network: "ethereum", displayName: "USDT-ETH", balance: "1500.000000000000000000" },
  //   { currency: "USDT", network: "bsc", displayName: "USDT-BSC", balance: "750.000000000000000000" },
  //   { currency: "USDT", network: "tron", displayName: "USDT-TRON", balance: "0.000000000000000000" }
  // ]
}
```

#### **Payment Processing (Credit Specific Currency Balance):**
```typescript
async function processPayment(webhookData: TatumWebhook) {
  // 1. Find which merchant owns this address and which currency it is
  const derivedAddress = await db.derivedAddress.findUnique({
    where: { address: webhookData.address },
    include: {
      globalWallet: true  // Get currency/network info
    }
  })
  
  // 2. Credit the merchant's balance for THIS SPECIFIC CURRENCY
  await db.merchantBalance.update({
    where: {
      merchantId: derivedAddress.merchantId,
      globalWalletId: derivedAddress.globalWalletId  // Specific currency wallet
    },
    data: {
      balance: { increment: parseFloat(webhookData.amount) },
      totalReceived: { increment: parseFloat(webhookData.amount) },
      lastUpdated: new Date()
    }
  })
  
  // Example: Customer pays 100 USDT on BSC network
  // -> Only the merchant's USDT-BSC balance increases by 100
  // -> Their BTC, ETH, USDT-ETH, USDT-TRON balances remain unchanged
}
```

#### **Currency-Specific Withdrawal:**
```typescript
async function withdrawMerchantFunds(
  merchantId: string,
  currency: string,
  network: string,
  amount: number,
  withdrawalAddress: string
) {
  // 1. Find the specific currency balance
  const globalWallet = await db.globalHDWallet.findFirst({
    where: { currency, network }
  })
  
  const merchantBalance = await db.merchantBalance.findFirst({
    where: { 
      merchantId, 
      globalWalletId: globalWallet.id 
    }
  })
  
  if (merchantBalance.balance < amount) {
    throw new Error(`Insufficient ${currency}-${network.toUpperCase()} balance`)
  }
  
  // 2. Lock the specific currency balance
  await db.merchantBalance.update({
    where: { id: merchantBalance.id },
    data: { 
      lockedBalance: { increment: amount } 
    }
  })
  
  // 3. Send from the global wallet for this currency
  const privateKey = decrypt(globalWallet.encryptedPrivateKey)
  await sendTransaction(privateKey, withdrawalAddress, amount, currency, network)
  
  // 4. Update only this currency balance
  await db.merchantBalance.update({
    where: { id: merchantBalance.id },
    data: {
      balance: { decrement: amount },
      lockedBalance: { decrement: amount },
      totalWithdrawn: { increment: amount }
    }
  })
}
```

### **Phase 3: Update Existing Code**
1. Replace current `Wallet` table with `merchant_balances` 
2. Update invoice creation to derive from global wallets
3. Modify webhook processing to credit specific currency balances
4. Add currency-specific withdrawal functionality

---

## 💡 **FINAL RECOMMENDATION**

**YES, use the Global HD Wallet approach!** 

This is exactly what you suggested and it's brilliant because:

1. **Much simpler** - manage 10 wallets instead of 10,000
2. **Industry standard** - proven by Coinbase Commerce, BitPay
3. **Better economics** - pooled liquidity, lower gas costs
4. **Scales infinitely** - database balances are fast

The trade-off is you become custodial (you control the funds), but that's standard for payment processors and gives you much more control over the user experience.

**Should we proceed with this architecture?**
