# 🏗️ Database Schema Redesign Plan

## Overview
This document outlines the strategic redesign of the database schema to create a unified, scalable system for cryptocurrency asset management.

## 🎯 Goals
1. **Simplify relationships**: Eliminate complex BaseCurrency → Currency → Network chains
2. **Unify configuration**: Single source of truth between code and database
3. **Improve scalability**: Easy addition of new currencies/networks
4. **Enhance performance**: Better indexing and query optimization
5. **Future-proof design**: Support for upcoming features

## 📊 Current vs Proposed Schema

### **Current (Complex)**
```
BaseCurrency (BTC, ETH, USDT)
    ↓
Currency (USDT-BSC, USDT-ETH, USDT-TRON)  
    ↓
Network (BSC, Ethereum, Tron)
    ↓
Wallet → MerchantBalance
```

### **Proposed (Unified)**
```
SupportedAsset (USDT-BSC, ETH-Ethereum, BTC-Bitcoin)
    ↓
GlobalWallet (ETH-wallet, BTC-wallet, TRON-wallet)
    ↓
MerchantAssetBalance (per merchant, per asset)
```

## 🚀 Migration Strategy

### **Phase 1: Create New Tables** ⏱️ 1-2 hours
```sql
-- 1. Create SupportedAsset table
CREATE TABLE supported_assets (...);

-- 2. Create GlobalWallet table (renamed from Wallet)  
CREATE TABLE global_wallets (...);

-- 3. Create MerchantAssetBalance table (renamed from MerchantBalance)
CREATE TABLE merchant_asset_balances (...);
```

### **Phase 2: Data Migration** ⏱️ 2-3 hours
```sql
-- Migrate existing data with proper mapping
INSERT INTO supported_assets 
SELECT 
  bc.code as symbol,
  bc.name,
  n.code as network,
  CASE n.code 
    WHEN 'bsc' THEN 'ETH'  -- BSC uses ETH wallet
    WHEN 'ethereum' THEN 'ETH'
    WHEN 'bitcoin' THEN 'BTC'
    ELSE UPPER(n.code)
  END as kms_chain,
  ...
FROM base_currencies bc
JOIN currencies c ON bc.id = c.base_currency_id
JOIN networks n ON c.network_id = n.id;
```

### **Phase 3: Update Application Code** ⏱️ 3-4 hours
- Update tRPC procedures to use new schema
- Modify invoice creation logic
- Update balance tracking functions
- Update dashboard queries

### **Phase 4: Remove Old Tables** ⏱️ 30 minutes
```sql
DROP TABLE currencies;
DROP TABLE base_currencies;  
DROP TABLE networks;
-- Keep merchant_balances temporarily for comparison
```

## 🔧 Implementation Scripts

### **1. Schema Population Script**
```typescript
// scripts/populate-supported-assets.ts
import { CRYPTO_ASSETS_CONFIG } from '../src/lib/crypto-assets-config';
import { PrismaClient } from '@prisma/client';

async function populateSupportedAssets() {
  const prisma = new PrismaClient();
  
  for (const [symbol, config] of Object.entries(CRYPTO_ASSETS_CONFIG)) {
    for (const network of config.networks) {
      await prisma.supportedAsset.create({
        data: {
          symbol,
          name: config.name,
          displayName: config.displayName,
          decimals: config.decimals,
          category: config.category,
          iconPath: config.icon,
          
          network: network.network,
          networkName: network.networkName,
          shortName: network.shortName,
          networkDisplayName: network.displayName,
          
          isNative: network.isNative,
          tokenStandard: network.tokenStandard,
          contractAddress: network.contractAddress,
          
          tatumChain: network.tatumChain,
          kmsChain: network.kmsChain,
          
          explorerUrl: network.explorerUrl,
          explorerTxUrl: network.explorerTxUrl,
          explorerAddrUrl: network.explorerAddressUrl,
          
          color: network.color,
        }
      });
    }
  }
}
```

### **2. Data Migration Script**
```typescript
// scripts/migrate-to-new-schema.ts
async function migrateData() {
  // 1. Migrate Wallets to GlobalWallets
  const existingWallets = await prisma.wallet.findMany();
  
  for (const wallet of existingWallets) {
    await prisma.globalWallet.create({
      data: {
        kmsChain: wallet.currency,
        networkName: getNetworkName(wallet.network),
        signatureId: wallet.signatureId,
        xpub: wallet.xpub,
        nextAddressIndex: wallet.nextAddressIndex,
        status: wallet.status,
      }
    });
  }
  
  // 2. Migrate MerchantBalance to MerchantAssetBalance
  const existingBalances = await prisma.merchantBalance.findMany({
    include: { wallet: true }
  });
  
  for (const balance of existingBalances) {
    const supportedAsset = await prisma.supportedAsset.findFirst({
      where: { 
        kmsChain: balance.wallet.currency,
        network: balance.wallet.network 
      }
    });
    
    await prisma.merchantAssetBalance.create({
      data: {
        merchantId: balance.merchantId,
        globalWalletId: newGlobalWallet.id,
        supportedAssetId: supportedAsset.id,
        symbol: supportedAsset.symbol,
        network: supportedAsset.network,
        availableBalance: balance.balance,
        lockedBalance: balance.lockedBalance,
        totalReceived: balance.totalReceived,
        totalWithdrawn: balance.totalWithdrawn,
      }
    });
  }
}
```

### **3. Application Code Updates**

#### **Updated tRPC Invoice Creation**
```typescript
// src/lib/trpc/routers/invoice.ts
export const invoiceRouter = createTRPCRouter({
  create: userAuthenticatedProcedure
    .mutation(async ({ ctx, input }) => {
      // NEW: Get supported asset configuration
      const supportedAsset = await ctx.prisma.supportedAsset.findFirst({
        where: {
          symbol: input.currency.toUpperCase(),
          network: normalizeNetworkName(input.network),
          isActive: true
        }
      });

      if (!supportedAsset) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency/network: ${input.currency}/${input.network}`
        });
      }

      // NEW: Find global wallet by KMS chain
      const globalWallet = await ctx.prisma.globalWallet.findFirst({
        where: {
          kmsChain: supportedAsset.kmsChain,
          status: 'ACTIVE'
        }
      });

      if (!globalWallet) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No active wallet found for ${supportedAsset.kmsChain}`
        });
      }

      // Generate address using global wallet
      const addressResult = await generateAddressFast(
        globalWallet.id,
        merchant.id,
        input.currency
      );

      // ... rest of invoice creation
    });
});
```

#### **Updated Balance Queries**
```typescript
// src/lib/trpc/routers/merchant.ts
export const merchantRouter = createTRPCRouter({
  getBalances: userOwnsMerchantProcedure
    .query(async ({ ctx }) => {
      // NEW: Query using MerchantAssetBalance
      const balances = await ctx.prisma.merchantAssetBalance.findMany({
        where: {
          merchantId: ctx.merchant.id,
          availableBalance: { gt: 0 }
        },
        include: {
          supportedAsset: true,
          globalWallet: true
        },
        orderBy: [
          { supportedAsset: { priority: 'desc' } },
          { availableBalance: 'desc' }
        ]
      });

      return balances.map(balance => ({
        currency: balance.symbol,
        network: balance.network,
        networkDisplayName: balance.supportedAsset.networkDisplayName,
        availableBalance: balance.availableBalance.toString(),
        lockedBalance: balance.lockedBalance.toString(),
        totalReceived: balance.totalReceived.toString(),
        icon: balance.supportedAsset.iconPath,
        color: balance.supportedAsset.color,
      }));
    });
});
```

## ✅ Benefits of New Design

### **1. Simplified Relationships**
- **Before**: 3 tables (BaseCurrency + Currency + Network) with complex joins
- **After**: 1 table (SupportedAsset) with all information

### **2. Better Performance**
- **Fewer JOINs**: Most queries need only 1-2 tables
- **Better Indexing**: Targeted indexes on commonly queried fields
- **Denormalized Data**: Key information stored together for fast access

### **3. Improved Maintainability**
- **Single Source**: `crypto-assets-config.ts` drives database population
- **Clear Naming**: `MerchantAssetBalance` vs confusing `MerchantBalance`
- **Logical Organization**: Related data grouped together

### **4. Future-Proof Scalability**
- **Easy Addition**: New currencies added via config file + migration script
- **Flexible Relationships**: Can support complex multi-network tokens
- **Version Control**: All changes tracked through migrations

## 🚨 Migration Risks & Mitigation

### **Risk 1: Data Loss During Migration**
**Mitigation**: 
- Full database backup before migration
- Parallel table approach (keep old tables during migration)
- Comprehensive data validation scripts

### **Risk 2: Application Downtime**
**Mitigation**:
- Blue-green deployment strategy
- Feature flags for gradual rollout
- Rollback plan with old schema

### **Risk 3: Performance Impact**
**Mitigation**:
- Load testing with new schema
- Index optimization before go-live
- Monitoring dashboard for performance metrics

## 📋 Migration Checklist

- [ ] **Phase 1**: Create new tables with proper indexes
- [ ] **Phase 2**: Populate SupportedAsset from crypto-assets-config.ts
- [ ] **Phase 3**: Migrate Wallet → GlobalWallet data  
- [ ] **Phase 4**: Migrate MerchantBalance → MerchantAssetBalance data
- [ ] **Phase 5**: Update all tRPC procedures
- [ ] **Phase 6**: Update dashboard components
- [ ] **Phase 7**: Update address generation logic
- [ ] **Phase 8**: Full system testing
- [ ] **Phase 9**: Deploy with feature flags
- [ ] **Phase 10**: Remove old tables after validation

## 🎯 Success Metrics

1. **Performance**: Query response times improved by >30%
2. **Maintainability**: New currency addition time reduced to <15 minutes
3. **Reliability**: Zero data inconsistencies between config and database
4. **User Experience**: Dashboard load times <500ms for balance queries

This redesign will create a robust, scalable foundation for your cryptocurrency payment system that can easily adapt to future requirements.