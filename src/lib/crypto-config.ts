/**
 * Comprehensive cryptocurrency configuration for Cryptic Gateway
 * 
 * ⚠️  IMPORTANT: To manage cryptocurrencies, edit /src/lib/crypto-assets-config.ts
 * 
 * This file provides helper functions and exports the configuration.
 * The actual cryptocurrency definitions are in crypto-assets-config.ts
 * for easier management and future additions.
 */

// Import the main configuration
import { CRYPTO_ASSETS_CONFIG, type CryptoAssetConfig, type NetworkConfig } from './crypto-assets-config'

// Re-export types for backwards compatibility
export type CryptoAsset = CryptoAssetConfig
export { type NetworkConfig }

// Main export - the cryptocurrency configuration
export const CRYPTO_ASSETS = CRYPTO_ASSETS_CONFIG

/**
 * Get all supported currencies for UI display
 */
export function getSupportedCurrencies(): Array<{code: string, name: string, networks: NetworkConfig[], icon: string}> {
  return Object.values(CRYPTO_ASSETS).map(asset => ({
    code: asset.symbol,
    name: asset.name,
    networks: asset.networks,
    icon: asset.icon
  }))
}

/**
 * Get network configuration for a specific currency and network
 */
export function getNetworkConfig(currency: string, network: string): NetworkConfig | null {
  const asset = CRYPTO_ASSETS[currency.toUpperCase()]
  if (!asset) return null
  
  return asset.networks.find(n => n.network.toLowerCase() === network.toLowerCase()) || null
}

/**
 * Check if a currency is native on a given network
 */
export function isNativeCurrency(currency: string, network: string): boolean {
  const config = getNetworkConfig(currency, network)
  return config?.isNative || false
}

/**
 * Get contract address for a token on a specific network
 */
export function getContractAddress(currency: string, network: string): string | null {
  const config = getNetworkConfig(currency, network)
  return config?.contractAddress || null
}

/**
 * Get Tatum chain identifier for a network
 */
export function getTatumChain(currency: string, network: string): string | null {
  const config = getNetworkConfig(currency, network)
  return config?.tatumChain || null
}

/**
 * Get derivation path for a currency/network combination
 */
export function getDerivationPath(currency: string, network: string): string | null {
  const config = getNetworkConfig(currency, network)
  return config?.derivationPath || null
}