# 🧹 Database Schema Migration Plan

## Overview
Transition from the current complex 22-model schema to a simplified 10-model schema that's easier to understand and maintain.

## 📊 Migration Steps

### Phase 1: Create New Models
```sql
-- 1. Create CryptoAsset (consolidates BaseCurrency + Currency + Network)
CREATE TABLE crypto_assets (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  network TEXT NOT NULL,
  network_name TEXT NOT NULL,
  contract_address TEXT,
  decimals INTEGER NOT NULL,
  is_native BOOLEAN DEFAULT true,
  icon_url TEXT,
  explorer_url TEXT,
  tatum_chain TEXT NOT NULL,
  derivation_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create PaymentAddress (consolidates DerivedAddress + AddressPool)
CREATE TABLE payment_addresses (
  id TEXT PRIMARY KEY,
  global_wallet_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  address TEXT UNIQUE NOT NULL,
  derivation_index BIGINT NOT NULL,
  current_balance DECIMAL(36,18) DEFAULT 0,
  is_assigned BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP,
  first_used_at TIMESTAMP,
  last_activity_at TIMESTAMP,
  webhook_subscription_id TEXT,
  is_monitored BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: Data Migration
```javascript
// Migration script to move data from old to new models
async function migrateCryptoAssets() {
  const currencies = await prisma.currency.findMany({
    include: {
      baseCurrency: true,
      network: true
    }
  })

  for (const currency of currencies) {
    await prisma.cryptoAsset.create({
      data: {
        symbol: currency.baseCurrency.code,
        name: currency.baseCurrency.name,
        network: currency.network.code,
        networkName: currency.network.name,
        contractAddress: currency.contractAddress,
        decimals: currency.decimals,
        isNative: !currency.isToken,
        iconUrl: currency.baseCurrency.imageUrl,
        tatumChain: currency.network.tatumChainId,
        derivationPath: getDerivationPath(currency.baseCurrency.code, currency.network.code),
        isActive: currency.isActive && currency.baseCurrency.isActive && currency.network.isActive,
        priority: currency.baseCurrency.priority
      }
    })
  }
}
```

### Phase 3: Update Relations
```sql
-- Update GlobalHDWallet to reference CryptoAsset
ALTER TABLE global_hd_wallets ADD COLUMN crypto_asset_id TEXT;

-- Populate crypto_asset_id based on existing currency/network/contract
UPDATE global_hd_wallets 
SET crypto_asset_id = (
  SELECT ca.id FROM crypto_assets ca 
  WHERE ca.symbol = global_hd_wallets.currency 
  AND ca.network = global_hd_wallets.network 
  AND (ca.contract_address = global_hd_wallets.contract_address OR (ca.contract_address IS NULL AND global_hd_wallets.contract_address IS NULL))
);

-- Add foreign key constraint
ALTER TABLE global_hd_wallets 
ADD CONSTRAINT fk_crypto_asset 
FOREIGN KEY (crypto_asset_id) REFERENCES crypto_assets(id);
```

### Phase 4: Clean Up Merchant Model
```sql
-- Remove unused fields from merchants table
ALTER TABLE merchants 
DROP COLUMN default_currency,
DROP COLUMN invoice_expiry,  -- moved to merchant settings
DROP COLUMN is_verified,
DROP COLUMN rate_limit,
DROP COLUMN rate_limit_window,
DROP COLUMN webhook_retry_count,  -- simplified to webhook_retries
DROP COLUMN webhook_secret,
DROP COLUMN webhook_timeout;

-- Add simplified fields
ALTER TABLE merchants 
ADD COLUMN invoice_expiry INTEGER DEFAULT 3600,
ADD COLUMN webhook_retries INTEGER DEFAULT 3;
```

### Phase 5: Remove Deprecated Models
```sql
-- Remove old models (after data migration is complete)
DROP TABLE currencies;
DROP TABLE base_currencies;
DROP TABLE networks;
DROP TABLE derived_addresses;  -- replaced by payment_addresses
DROP TABLE address_pools;      -- replaced by payment_addresses
DROP TABLE merchant_settings;  -- fields moved to merchants table
DROP TABLE api_usage_stats;    -- remove if not needed
DROP TABLE webhook_deliveries; -- simplify webhook handling
DROP TABLE webhook_notifications; -- consolidate notifications
DROP TABLE audit_logs;         -- remove if not needed
DROP TABLE withdrawals;        -- implement later if needed
```

## 🔄 Rollback Plan

If migration fails:
1. Keep old schema alongside new schema
2. Use feature flags to switch between old/new systems
3. Rollback by dropping new tables and re-enabling old code

## 🧪 Testing Strategy

1. **Unit Tests**: Update all Prisma queries to use new schema
2. **Integration Tests**: Test merchant creation, invoice generation, payment processing
3. **Performance Tests**: Verify new schema performs better (fewer joins)
4. **Data Integrity**: Verify all data migrated correctly

## 📈 Expected Benefits

- **55% fewer database models** (22 → 10)
- **Simpler queries** (no 3-table joins for currencies)
- **Faster development** (less complex relationships)
- **Better performance** (fewer tables to join)
- **Easier maintenance** (clear single responsibility per model)