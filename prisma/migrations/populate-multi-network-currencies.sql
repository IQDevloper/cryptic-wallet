-- Multi-Network Currency Migration Script
-- This script migrates from single-network currencies to multi-network support

-- 1. Create base currencies (parent currencies like USDT, BTC, ETH)
INSERT INTO base_currencies (id, code, name, symbol, "imageUrl", "coinGeckoId", "coinMarketCapId", priority)
VALUES 
  ('usdt_base', 'USDT', 'Tether USD', 'USDT', 'https://cryptologos.cc/logos/tether-usdt-logo.png', 'tether', '825', 1),
  ('btc_base', 'BTC', 'Bitcoin', 'BTC', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 'bitcoin', '1', 2),
  ('eth_base', 'ETH', 'Ethereum', 'ETH', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 'ethereum', '1027', 3),
  ('bnb_base', 'BNB', 'BNB', 'BNB', 'https://cryptologos.cc/logos/bnb-bnb-logo.png', 'binancecoin', '1839', 4),
  ('trx_base', 'TRX', 'TRON', 'TRX', 'https://cryptologos.cc/logos/tron-trx-logo.png', 'tron', '1958', 5),
  ('matic_base', 'MATIC', 'Polygon', 'MATIC', 'https://cryptologos.cc/logos/polygon-matic-logo.png', 'matic-network', '3890', 6);

-- 2. Ensure required networks exist
INSERT INTO networks (id, code, name, "tatumChainId", "blockConfirmations") 
VALUES 
  ('bsc_network', 'BSC', 'BNB Smart Chain', 'BSC', 12),
  ('tron_network', 'TRON', 'TRON Network', 'TRON', 19),
  ('eth_network', 'ETH', 'Ethereum', 'ETH', 12),
  ('polygon_network', 'POLYGON', 'Polygon', 'POLYGON', 30)
ON CONFLICT (code) DO NOTHING;

-- 3. Create multi-network currencies
-- USDT variants
INSERT INTO currencies (id, "baseCurrencyId", "networkId", "contractAddress", decimals, "isToken", "tokenStandard", "withdrawFee")
VALUES 
  -- USDT on BSC (BEP-20)
  ('usdt_bsc', 'usdt_base', 'bsc_network', '0x55d398326f99059fF775485246999027B3197955', 18, true, 'BEP-20', 1.0),
  -- USDT on TRON (TRC-20)
  ('usdt_tron', 'usdt_base', 'tron_network', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 6, true, 'TRC-20', 1.0),
  -- USDT on Ethereum (ERC-20)
  ('usdt_eth', 'usdt_base', 'eth_network', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, true, 'ERC-20', 10.0),
  -- USDT on Polygon (ERC-20)
  ('usdt_polygon', 'usdt_base', 'polygon_network', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6, true, 'ERC-20', 0.1);

-- Native coins
INSERT INTO currencies (id, "baseCurrencyId", "networkId", "contractAddress", decimals, "isToken", "tokenStandard", "withdrawFee")
VALUES 
  -- BNB (native coin on BSC)
  ('bnb_bsc', 'bnb_base', 'bsc_network', NULL, 18, false, NULL, 0.0005),
  -- TRX (native coin on TRON)
  ('trx_tron', 'trx_base', 'tron_network', NULL, 6, false, NULL, 1.0),
  -- ETH (native coin on Ethereum)
  ('eth_eth', 'eth_base', 'eth_network', NULL, 18, false, NULL, 0.005),
  -- MATIC (native coin on Polygon)
  ('matic_polygon', 'matic_base', 'polygon_network', NULL, 18, false, NULL, 0.001);

-- Other popular tokens
INSERT INTO currencies (id, "baseCurrencyId", "networkId", "contractAddress", decimals, "isToken", "tokenStandard", "withdrawFee")
VALUES 
  -- BTC variants (wrapped tokens)
  ('btc_bsc', 'btc_base', 'bsc_network', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', 18, true, 'BEP-20', 0.0001),
  ('btc_eth', 'btc_base', 'eth_network', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8, true, 'ERC-20', 0.0005),
  ('btc_polygon', 'btc_base', 'polygon_network', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 8, true, 'ERC-20', 0.0001),
  
  -- ETH variants (wrapped tokens)
  ('eth_bsc', 'eth_base', 'bsc_network', '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', 18, true, 'BEP-20', 0.001),
  ('eth_polygon', 'eth_base', 'polygon_network', '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 18, true, 'ERC-20', 0.001);