/**
 * Comprehensive cryptocurrency configuration for Cryptic Gateway
 * 
 * ⚠️  IMPORTANT: To manage cryptocurrencies, edit /src/lib/crypto-assets-config.ts
 * 
 * This file re-exports the standardized configuration and utilities.
 * All components should use these functions for consistent currency/network handling.
 */

// Import and re-export everything from the main config
export {
  CRYPTO_ASSETS_CONFIG as CRYPTO_ASSETS,
  type CryptoAssetConfig as CryptoAsset,
  type NetworkConfig,
  type CryptoCategory,
  
  // Utility functions
  getSupportedCurrencies,
  getCurrencyConfig,
  getNetworkConfig,
  getNetworkDisplayStandard,
  getNetworkDisplayName,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getCurrencyIcon,
  getNetworkColor,
  formatCurrencyAmount,
  getCurrencyNetworks,
  isStablecoin,
  isNativeCoin,
  getContractAddress,
  getTatumChain,
  getKMSChain,
  normalizeNetworkName,
  getCurrenciesByCategory
} from './crypto-assets-config'

// Backwards compatibility aliases
export { isNativeCoin as isNativeCurrency } from './crypto-assets-config'