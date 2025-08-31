-- 🧹 Add CryptoAsset table alongside existing schema
-- Run this BEFORE running the migration script

-- Create the unified CryptoAsset table
CREATE TABLE crypto_assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    
    -- Network Info
    network TEXT NOT NULL,
    network_name TEXT NOT NULL,
    
    -- Token Info
    contract_address TEXT,
    decimals INTEGER NOT NULL,
    is_native BOOLEAN DEFAULT true,
    
    -- Display & Integration
    icon_url TEXT,
    explorer_url TEXT,
    tatum_chain TEXT NOT NULL,
    derivation_path TEXT NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(symbol, network, contract_address)
);

-- Add indexes for performance
CREATE INDEX idx_crypto_assets_symbol ON crypto_assets(symbol);
CREATE INDEX idx_crypto_assets_network ON crypto_assets(network);
CREATE INDEX idx_crypto_assets_is_active ON crypto_assets(is_active);
CREATE INDEX idx_crypto_assets_priority ON crypto_assets(priority);

-- Add crypto_asset_id to global_hd_wallets table (for future linking)
ALTER TABLE global_hd_wallets ADD COLUMN crypto_asset_id TEXT;
CREATE INDEX idx_global_hd_wallets_crypto_asset ON global_hd_wallets(crypto_asset_id);

-- Update merchant_balances to use cleaner field names (optional, for consistency)
-- This matches the clean schema field names
ALTER TABLE merchant_balances RENAME COLUMN balance TO available;
ALTER TABLE merchant_balances RENAME COLUMN locked_balance TO locked;

-- Create a view for backward compatibility during transition
CREATE VIEW currency_view AS
SELECT 
    ca.id as currency_id,
    ca.symbol as base_currency_code,
    ca.name as base_currency_name,
    ca.network as network_code,
    ca.network_name,
    ca.contract_address,
    ca.decimals,
    ca.is_native as is_token_inverted,
    ca.icon_url as image_url,
    ca.tatum_chain,
    ca.is_active
FROM crypto_assets ca
WHERE ca.is_active = true;

-- Add updated_at trigger for crypto_assets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crypto_assets_updated_at 
    BEFORE UPDATE ON crypto_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE crypto_assets IS 'Unified cryptocurrency asset configuration - replaces BaseCurrency + Currency + Network';
COMMENT ON COLUMN crypto_assets.symbol IS 'Asset symbol like BTC, ETH, USDT';
COMMENT ON COLUMN crypto_assets.network IS 'Network code like bitcoin, ethereum, bsc';
COMMENT ON COLUMN crypto_assets.network_name IS 'Human readable network name';
COMMENT ON COLUMN crypto_assets.contract_address IS 'Token contract address (null for native coins)';
COMMENT ON COLUMN crypto_assets.is_native IS 'True for native coins, false for tokens';
COMMENT ON COLUMN crypto_assets.tatum_chain IS 'Tatum API chain identifier';
COMMENT ON COLUMN crypto_assets.derivation_path IS 'HD wallet derivation path';
COMMENT ON COLUMN crypto_assets.priority IS 'Display priority (higher = more prominent)';