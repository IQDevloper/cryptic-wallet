# Database Schema Migration Guide
## From Current to Unified Wallet Architecture

### Overview
This guide details the migration from the current database schema to the new unified wallet architecture with improved KMS integration.

## Key Changes

### 1. Renamed Models
- `MerchantBalance` → `MerchantWallet` (clearer purpose)
- `Address` → `PaymentAddress` (more descriptive)
- `Wallet` → `SystemWallet` (indicates platform-level)

### 2. New Models
- `Asset` - Unified cryptocurrency definition
- `AssetNetwork` - Network-specific asset configuration
- Removed `BaseCurrency` and `Currency` (replaced by unified models)

### 3. Improved Structure
- Single `Asset` model for all cryptocurrencies
- `AssetNetwork` handles network-specific details
- Better KMS integration with `signatureId` fields
- Clearer separation of system vs merchant data

## Migration Steps

### Step 1: Backup Current Database
```bash
pg_dump -h localhost -U postgres -d cryptic_wallet > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Create New Tables
```sql
-- Create Asset table from BaseCurrency
CREATE TABLE assets AS
SELECT 
  id,
  code as symbol,
  name,
  'TOKEN' as type, -- Will update based on currency data
  "imageUrl" as logo_url,
  "coinGeckoId" as coin_gecko_id,
  "coinMarketCapId" as coin_market_cap_id,
  "isActive" as is_active,
  priority,
  "createdAt" as created_at,
  "updatedAt" as updated_at
FROM base_currencies;

-- Update asset types (native vs token)
UPDATE assets 
SET type = 'NATIVE' 
WHERE symbol IN ('BTC', 'ETH', 'BNB', 'MATIC', 'TRX');

-- Create AssetNetwork from Currency
CREATE TABLE asset_networks AS
SELECT 
  c.id,
  c."baseCurrencyId" as asset_id,
  c."networkId" as network_id,
  c."contractAddress" as contract_address,
  c.decimals,
  c."tokenStandard" as token_standard,
  c."minAmount" as min_amount,
  c."maxAmount" as max_amount,
  c."withdrawFee" as withdrawal_fee,
  0 as deposit_fee,
  c."isActive" as is_active,
  c."createdAt" as created_at,
  c."updatedAt" as updated_at
FROM currencies c;

-- Rename Wallet to SystemWallet
ALTER TABLE wallets RENAME TO system_wallets;

-- Add new columns to SystemWallet
ALTER TABLE system_wallets 
ADD COLUMN asset_network_id VARCHAR(30),
ADD COLUMN derivation_path VARCHAR(100) DEFAULT 'm/44''/60''/0''/0',
ADD COLUMN metadata JSONB;

-- Update SystemWallet with asset_network_id
UPDATE system_wallets sw
SET asset_network_id = (
  SELECT an.id 
  FROM asset_networks an
  JOIN assets a ON an.asset_id = a.id
  WHERE a.symbol = sw.currency
  AND an.network_id = (
    SELECT id FROM networks WHERE code = sw.network
  )
  LIMIT 1
);

-- Rename MerchantBalance to MerchantWallet
ALTER TABLE merchant_balances RENAME TO merchant_wallets;

-- Add new columns to MerchantWallet
ALTER TABLE merchant_wallets
ADD COLUMN system_wallet_id VARCHAR(30),
ADD COLUMN available_balance DECIMAL(36,18) DEFAULT 0,
ADD COLUMN pending_balance DECIMAL(36,18) DEFAULT 0,
ADD COLUMN auto_withdraw_enabled BOOLEAN DEFAULT false,
ADD COLUMN auto_withdraw_address VARCHAR(255),
ADD COLUMN auto_withdraw_threshold DECIMAL(36,18),
ADD COLUMN last_activity_at TIMESTAMP,
ADD COLUMN statistics JSONB;

-- Update MerchantWallet columns
UPDATE merchant_wallets 
SET 
  system_wallet_id = wallet_id,
  available_balance = balance,
  pending_balance = 0;

-- Rename Address to PaymentAddress
ALTER TABLE addresses RENAME TO payment_addresses;

-- Add new columns to PaymentAddress
ALTER TABLE payment_addresses
ADD COLUMN system_wallet_id VARCHAR(30),
ADD COLUMN merchant_wallet_id VARCHAR(30),
ADD COLUMN address_signature_id VARCHAR(255),
ADD COLUMN invoice_id VARCHAR(30),
ADD COLUMN balance DECIMAL(36,18) DEFAULT 0,
ADD COLUMN first_seen_at TIMESTAMP,
ADD COLUMN last_seen_at TIMESTAMP,
ADD COLUMN metadata JSONB;

-- Update PaymentAddress with proper relations
UPDATE payment_addresses pa
SET 
  system_wallet_id = wallet_id,
  merchant_wallet_id = (
    SELECT id FROM merchant_wallets 
    WHERE merchant_id = pa.merchant_id 
    AND system_wallet_id = pa.wallet_id
    LIMIT 1
  ),
  invoice_id = assigned_to_invoice,
  balance = current_balance,
  first_seen_at = first_used_at,
  last_seen_at = last_activity_at;
```

### Step 3: Update Invoice Relations
```sql
-- Add payment_address_id to invoices
ALTER TABLE invoices 
ADD COLUMN payment_address_id VARCHAR(30);

-- Update invoice with payment address
UPDATE invoices i
SET payment_address_id = (
  SELECT id FROM payment_addresses 
  WHERE address = i.deposit_address
  LIMIT 1
);

-- Add network column to invoices
ALTER TABLE invoices 
ADD COLUMN network VARCHAR(50);

-- Update network from currency
UPDATE invoices i
SET network = (
  SELECT n.code 
  FROM payment_addresses pa
  JOIN system_wallets sw ON pa.system_wallet_id = sw.id
  JOIN asset_networks an ON sw.asset_network_id = an.id
  JOIN networks n ON an.network_id = n.id
  WHERE pa.id = i.payment_address_id
  LIMIT 1
);
```

### Step 4: Clean Up Old Columns
```sql
-- Remove old columns from system_wallets
ALTER TABLE system_wallets 
DROP COLUMN currency,
DROP COLUMN network,
DROP COLUMN contract_address,
DROP COLUMN next_address_index,
DROP COLUMN total_pool_balance;

-- Remove old columns from merchant_wallets
ALTER TABLE merchant_wallets
DROP COLUMN wallet_id,
DROP COLUMN balance,
DROP COLUMN locked_balance;

-- Remove old columns from payment_addresses
ALTER TABLE payment_addresses
DROP COLUMN wallet_id,
DROP COLUMN current_balance,
DROP COLUMN assigned_to_invoice,
DROP COLUMN first_used_at,
DROP COLUMN last_activity_at;

-- Drop old tables
DROP TABLE IF EXISTS base_currencies CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
```

### Step 5: Add Indexes and Constraints
```sql
-- Asset indexes
CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_is_active ON assets(is_active);
CREATE INDEX idx_assets_priority ON assets(priority);

-- AssetNetwork indexes and constraints
CREATE UNIQUE INDEX idx_asset_networks_unique ON asset_networks(asset_id, network_id);
CREATE INDEX idx_asset_networks_asset_id ON asset_networks(asset_id);
CREATE INDEX idx_asset_networks_network_id ON asset_networks(network_id);
CREATE INDEX idx_asset_networks_contract_address ON asset_networks(contract_address);
CREATE INDEX idx_asset_networks_is_active ON asset_networks(is_active);

-- SystemWallet indexes
CREATE INDEX idx_system_wallets_status ON system_wallets(status);
CREATE INDEX idx_system_wallets_asset_network_id ON system_wallets(asset_network_id);
CREATE INDEX idx_system_wallets_signature_id ON system_wallets(signature_id);

-- MerchantWallet indexes and constraints
CREATE UNIQUE INDEX idx_merchant_wallets_unique ON merchant_wallets(merchant_id, system_wallet_id);
CREATE INDEX idx_merchant_wallets_merchant_id ON merchant_wallets(merchant_id);
CREATE INDEX idx_merchant_wallets_system_wallet_id ON merchant_wallets(system_wallet_id);
CREATE INDEX idx_merchant_wallets_available_balance ON merchant_wallets(available_balance);

-- PaymentAddress indexes and constraints
CREATE UNIQUE INDEX idx_payment_addresses_address ON payment_addresses(address);
CREATE UNIQUE INDEX idx_payment_addresses_invoice_id ON payment_addresses(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_payment_addresses_system_wallet_id ON payment_addresses(system_wallet_id);
CREATE INDEX idx_payment_addresses_merchant_wallet_id ON payment_addresses(merchant_wallet_id);
CREATE INDEX idx_payment_addresses_merchant_id ON payment_addresses(merchant_id);
CREATE INDEX idx_payment_addresses_derivation_index ON payment_addresses(derivation_index);
```

### Step 6: Update Application Code
1. Update Prisma schema to `schema.new.prisma`
2. Generate new Prisma client: `npx prisma generate`
3. Update all tRPC procedures to use new model names
4. Update wallet service to work with SystemWallet
5. Update balance calculations to use MerchantWallet

## Rollback Plan
If migration fails:
```bash
# Restore from backup
psql -h localhost -U postgres -d cryptic_wallet < backup_YYYYMMDD_HHMMSS.sql
```

## Testing Checklist
- [ ] All assets migrated correctly
- [ ] Asset-network relationships preserved
- [ ] System wallets have correct KMS signature IDs
- [ ] Merchant wallets show correct balances
- [ ] Payment addresses linked to correct invoices
- [ ] Invoice queries work with new structure
- [ ] Balance calculations accurate
- [ ] Withdrawal process functional
- [ ] API endpoints return expected data

## Benefits After Migration
1. **Clearer Architecture**: Better naming conventions make code self-documenting
2. **Unified Assets**: Single source of truth for each cryptocurrency
3. **Flexible Networks**: Easy to add new networks for existing assets
4. **Better KMS Integration**: Clear signature ID tracking at appropriate levels
5. **Improved Queries**: Simpler queries for multi-network balances
6. **Scalability**: Architecture supports future features like bridging, swaps

## Support Queries After Migration

### Get Total Balance for Merchant (All Assets)
```sql
SELECT 
  a.symbol,
  a.name,
  SUM(mw.available_balance) as total_balance,
  SUM(mw.pending_balance) as pending_balance
FROM merchant_wallets mw
JOIN system_wallets sw ON mw.system_wallet_id = sw.id
JOIN asset_networks an ON sw.asset_network_id = an.id
JOIN assets a ON an.asset_id = a.id
WHERE mw.merchant_id = ?
GROUP BY a.id, a.symbol, a.name;
```

### Get Asset Across All Networks
```sql
SELECT 
  n.name as network_name,
  an.contract_address,
  an.token_standard,
  sw.status as wallet_status,
  sw.total_balance
FROM asset_networks an
JOIN networks n ON an.network_id = n.id
LEFT JOIN system_wallets sw ON sw.asset_network_id = an.id
WHERE an.asset_id = ? AND an.is_active = true;
```

### Create New Payment Address
```typescript
// Using KMS to derive new address
const systemWallet = await prisma.systemWallet.findUnique({
  where: { id: systemWalletId }
});

const addressIndex = systemWallet.nextAddressIndex;
const newAddress = await kmsService.deriveAddress(
  systemWallet.signatureId,
  addressIndex
);

const paymentAddress = await prisma.paymentAddress.create({
  data: {
    systemWalletId,
    merchantWalletId,
    merchantId,
    address: newAddress.address,
    derivationIndex: addressIndex,
    addressSignatureId: newAddress.signatureId
  }
});

// Update next index
await prisma.systemWallet.update({
  where: { id: systemWalletId },
  data: { nextAddressIndex: addressIndex + 1n }
});
```