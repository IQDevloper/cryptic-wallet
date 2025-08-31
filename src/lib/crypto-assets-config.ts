/**
 * CRYPTOCURRENCY ASSETS CONFIGURATION
 * 
 * This file contains all supported cryptocurrency configurations with standardized naming.
 * All components should use this as the single source of truth for currency/network info.
 * 
 * To add a new cryptocurrency:
 * 1. Add a new entry to CRYPTO_ASSETS_CONFIG
 * 2. Make sure the icon exists in /public/icons/
 * 3. Run the wallet initialization script if needed
 * 4. Update database wallets if needed
 */

export interface CryptoAssetConfig {
  symbol: string                    // Short symbol (BTC, ETH, USDT)
  name: string                     // Full name (Bitcoin, Ethereum, Tether USD)
  displayName: string              // UI display name (Bitcoin, Tether USD, etc.)
  decimals: number                 // Decimal places for this asset
  networks: NetworkConfig[]        // Supported networks for this asset
  icon: string                    // Path to icon in /public/icons/
  coinGeckoId?: string            // CoinGecko API ID for price data
  coinMarketCapId?: string        // CoinMarketCap ID for price data
  category: CryptoCategory        // Asset category
}

export interface NetworkConfig {
  network: string                  // Database storage key (bsc, ethereum, tron, bitcoin)
  networkName: string             // Human-readable network name (Binance Smart Chain, Ethereum)
  shortName: string               // Short network name (BSC, ETH, TRON, BTC)
  tokenStandard?: string          // Token standard (BEP20, ERC20, TRC20, null for native)
  displayName: string             // Full display name (Binance Smart Chain (BEP20))
  isNative: boolean               // Is this the native coin of the network?
  contractAddress?: string        // Token contract address (null for native coins)
  tatumChain: string             // Tatum API chain identifier
  kmsChain: string               // KMS chain identifier for address generation
  explorerUrl: string            // Block explorer base URL
  explorerTxUrl: string          // Transaction URL template (use {txHash})
  explorerAddressUrl: string     // Address URL template (use {address})
  color?: string                 // Brand color for UI
}

export enum CryptoCategory {
  STABLECOIN = 'stablecoin',
  CRYPTOCURRENCY = 'cryptocurrency', 
  TOKEN = 'token',
  DEFI = 'defi',
  MEME = 'meme',
  LAYER1 = 'layer1',
  LAYER2 = 'layer2'
}

/**
 * MAIN CRYPTOCURRENCY CONFIGURATION
 * 
 * Comprehensive configuration with standardized naming for all components.
 * This is the single source of truth for currency/network information.
 */
export const CRYPTO_ASSETS_CONFIG: Record<string, CryptoAssetConfig> = {
  // USDT - Tether USD (Stablecoin)
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    displayName: 'Tether USD',
    decimals: 6,
    category: CryptoCategory.STABLECOIN,
    coinGeckoId: 'tether',
    coinMarketCapId: '825',
    networks: [
      {
        network: 'binance_smart_chain',
        networkName: 'Binance Smart Chain',
        shortName: 'BSC',
        tokenStandard: 'BEP20',
        displayName: 'Binance Smart Chain (BEP20)',
        isNative: false,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955',
        tatumChain: 'bsc',
        kmsChain: 'BSC',
        explorerUrl: 'https://bscscan.com',
        explorerTxUrl: 'https://bscscan.com/tx/{txHash}',
        explorerAddressUrl: 'https://bscscan.com/address/{address}',
        color: '#F3BA2F'
      },
      {
        network: 'tron',
        networkName: 'Tron',
        shortName: 'TRON',
        tokenStandard: 'TRC20',
        displayName: 'Tron (TRC20)',
        isNative: false,
        contractAddress: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
        tatumChain: 'tron',
        kmsChain: 'TRON',
        explorerUrl: 'https://tronscan.org',
        explorerTxUrl: 'https://tronscan.org/#/transaction/{txHash}',
        explorerAddressUrl: 'https://tronscan.org/#/address/{address}',
        color: '#FF060A'
      },
      {
        network: 'ethereum',
        networkName: 'Ethereum',
        shortName: 'ETH',
        tokenStandard: 'ERC20',
        displayName: 'Ethereum (ERC20)',
        isNative: false,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        tatumChain: 'ethereum',
        kmsChain: 'ETH',
        explorerUrl: 'https://etherscan.io',
        explorerTxUrl: 'https://etherscan.io/tx/{txHash}',
        explorerAddressUrl: 'https://etherscan.io/address/{address}',
        color: '#627EEA'
      },
      {
        network: 'polygon',
        networkName: 'Polygon',
        shortName: 'MATIC',
        tokenStandard: 'Polygon',
        displayName: 'Polygon',
        isNative: false,
        contractAddress: '0xc2132D05D31c914a87C6613C10748AaCbA0D5c45',
        tatumChain: 'polygon',
        kmsChain: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        explorerTxUrl: 'https://polygonscan.com/tx/{txHash}',
        explorerAddressUrl: 'https://polygonscan.com/address/{address}',
        color: '#8247E5'
      }
    ],
    icon: '/icons/usdt.svg'
  },

  // USDC - USD Coin (Stablecoin)
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    displayName: 'USD Coin',
    decimals: 6,
    category: CryptoCategory.STABLECOIN,
    coinGeckoId: 'usd-coin',
    coinMarketCapId: '3408',
    networks: [
      {
        network: 'ethereum',
        networkName: 'Ethereum',
        shortName: 'ETH',
        tokenStandard: 'ERC20',
        displayName: 'Ethereum (ERC20)',
        isNative: false,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        tatumChain: 'ethereum',
        kmsChain: 'ETH',
        explorerUrl: 'https://etherscan.io',
        explorerTxUrl: 'https://etherscan.io/tx/{txHash}',
        explorerAddressUrl: 'https://etherscan.io/address/{address}',
        color: '#627EEA'
      },
      {
        network: 'binance_smart_chain',
        networkName: 'Binance Smart Chain',
        shortName: 'BSC',
        tokenStandard: 'BEP20',
        displayName: 'Binance Smart Chain (BEP20)',
        isNative: false,
        contractAddress: '0x8ac76a51cc950d9822d68b83fe1adadfb8c9c1a',
        tatumChain: 'bsc',
        kmsChain: 'BSC',
        explorerUrl: 'https://bscscan.com',
        explorerTxUrl: 'https://bscscan.com/tx/{txHash}',
        explorerAddressUrl: 'https://bscscan.com/address/{address}',
        color: '#F3BA2F'
      },
      {
        network: 'polygon',
        networkName: 'Polygon',
        shortName: 'MATIC',
        tokenStandard: 'Polygon',
        displayName: 'Polygon',
        isNative: false,
        contractAddress: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174',
        tatumChain: 'polygon',
        kmsChain: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        explorerTxUrl: 'https://polygonscan.com/tx/{txHash}',
        explorerAddressUrl: 'https://polygonscan.com/address/{address}',
        color: '#8247E5'
      }
    ],
    icon: '/icons/usdc.svg'
  },

  // ETH - Ethereum (Native Cryptocurrency)
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    displayName: 'Ethereum',
    decimals: 18,
    category: CryptoCategory.LAYER1,
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027',
    networks: [
      {
        network: 'ethereum',
        networkName: 'Ethereum',
        shortName: 'ETH',
        displayName: 'Ethereum Mainnet',
        isNative: true,
        tatumChain: 'ethereum',
        kmsChain: 'ETH',
        explorerUrl: 'https://etherscan.io',
        explorerTxUrl: 'https://etherscan.io/tx/{txHash}',
        explorerAddressUrl: 'https://etherscan.io/address/{address}',
        color: '#627EEA'
      }
    ],
    icon: '/icons/eth.svg'
  },

  // BTC - Bitcoin (Original Cryptocurrency)
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    displayName: 'Bitcoin',
    decimals: 8,
    category: CryptoCategory.LAYER1,
    coinGeckoId: 'bitcoin',
    coinMarketCapId: '1',
    networks: [
      {
        network: 'bitcoin',
        networkName: 'Bitcoin',
        shortName: 'BTC',
        displayName: 'Bitcoin Network',
        isNative: true,
        tatumChain: 'bitcoin',
        kmsChain: 'BTC',
        explorerUrl: 'https://blockchair.com/bitcoin',
        explorerTxUrl: 'https://blockchair.com/bitcoin/transaction/{txHash}',
        explorerAddressUrl: 'https://blockchair.com/bitcoin/address/{address}',
        color: '#F7931A'
      }
    ],
    icon: '/icons/btc.svg'
  },

  // TRX - Tron Native
  TRX: {
    symbol: 'TRX',
    name: 'Tron',
    displayName: 'Tron',
    decimals: 6,
    category: CryptoCategory.LAYER1,
    coinGeckoId: 'tron',
    coinMarketCapId: '1958',
    networks: [
      {
        network: 'tron',
        networkName: 'Tron',
        shortName: 'TRON',
        displayName: 'Tron Network',
        isNative: true,
        tatumChain: 'tron',
        kmsChain: 'TRON',
        explorerUrl: 'https://tronscan.org',
        explorerTxUrl: 'https://tronscan.org/#/transaction/{txHash}',
        explorerAddressUrl: 'https://tronscan.org/#/address/{address}',
        color: '#FF060A'
      }
    ],
    icon: '/icons/trx.svg'
  },

  // BNB - Binance Coin
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    displayName: 'BNB',
    decimals: 18,
    category: CryptoCategory.LAYER1,
    coinGeckoId: 'binancecoin',
    coinMarketCapId: '1839',
    networks: [
      {
        network: 'binance_smart_chain',
        networkName: 'Binance Smart Chain',
        shortName: 'BSC',
        displayName: 'Binance Smart Chain',
        isNative: true,
        tatumChain: 'bsc',
        kmsChain: 'BSC',
        explorerUrl: 'https://bscscan.com',
        explorerTxUrl: 'https://bscscan.com/tx/{txHash}',
        explorerAddressUrl: 'https://bscscan.com/address/{address}',
        color: '#F3BA2F'
      }
    ],
    icon: '/icons/bnb.svg'
  },

  // SOL - Solana (High-Speed Blockchain)
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    displayName: 'Solana',
    decimals: 9,
    category: CryptoCategory.LAYER1,
    coinGeckoId: 'solana',
    coinMarketCapId: '5426',
    networks: [
      {
        network: 'solana',
        networkName: 'Solana',
        shortName: 'SOL',
        displayName: 'Solana Network',
        isNative: true,
        tatumChain: 'solana',
        kmsChain: 'SOL',
        explorerUrl: 'https://solscan.io',
        explorerTxUrl: 'https://solscan.io/tx/{txHash}',
        explorerAddressUrl: 'https://solscan.io/account/{address}',
        color: '#00FFA3'
      }
    ],
    icon: '/icons/sol.svg'
  },

  // LTC - Litecoin (Bitcoin Fork)
  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    displayName: 'Litecoin',
    decimals: 8,
    category: CryptoCategory.CRYPTOCURRENCY,
    coinGeckoId: 'litecoin',
    coinMarketCapId: '2',
    networks: [
      {
        network: 'litecoin',
        networkName: 'Litecoin',
        shortName: 'LTC',
        displayName: 'Litecoin Network',
        isNative: true,
        tatumChain: 'litecoin',
        kmsChain: 'LTC',
        explorerUrl: 'https://blockchair.com/litecoin',
        explorerTxUrl: 'https://blockchair.com/litecoin/transaction/{txHash}',
        explorerAddressUrl: 'https://blockchair.com/litecoin/address/{address}',
        color: '#BFBBBB'
      }
    ],
    icon: '/icons/ltc.svg'
  },

  // DOGE - Dogecoin (Meme Cryptocurrency)
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    displayName: 'Dogecoin',
    decimals: 8,
    category: CryptoCategory.MEME,
    coinGeckoId: 'dogecoin',
    coinMarketCapId: '74',
    networks: [
      {
        network: 'dogecoin',
        networkName: 'Dogecoin',
        shortName: 'DOGE',
        displayName: 'Dogecoin Network',
        isNative: true,
        tatumChain: 'dogecoin',
        kmsChain: 'DOGE',
        explorerUrl: 'https://blockchair.com/dogecoin',
        explorerTxUrl: 'https://blockchair.com/dogecoin/transaction/{txHash}',
        explorerAddressUrl: 'https://blockchair.com/dogecoin/address/{address}',
        color: '#C2A633'
      }
    ],
    icon: '/icons/doge.svg'
  }
}

/**
 * HELPER FUNCTIONS AND UTILITIES
 * 
 * These functions provide easy access to the configuration data
 * and standardized ways to handle currency/network information.
 */

// Main export - use this in your application
export const CRYPTO_ASSETS = CRYPTO_ASSETS_CONFIG

// Re-export types for backwards compatibility
export type CryptoAsset = CryptoAssetConfig

/**
 * Get all supported currencies as a list for UI dropdowns
 */
export function getSupportedCurrencies(): Array<{
  code: string
  name: string
  displayName: string
  icon: string
  networks: NetworkConfig[]
  category: CryptoCategory
}> {
  return Object.entries(CRYPTO_ASSETS_CONFIG).map(([code, config]) => ({
    code,
    name: config.name,
    displayName: config.displayName,
    icon: config.icon,
    networks: config.networks,
    category: config.category
  }))
}

/**
 * Get currency configuration by symbol
 */
export function getCurrencyConfig(symbol: string): CryptoAssetConfig | null {
  return CRYPTO_ASSETS_CONFIG[symbol.toUpperCase()] || null
}

/**
 * Get network configuration for a specific currency and network
 */
export function getNetworkConfig(currency: string, network: string): NetworkConfig | null {
  const currencyConfig = getCurrencyConfig(currency)
  if (!currencyConfig) return null
  
  return currencyConfig.networks.find(n => 
    n.network === network || 
    n.shortName.toLowerCase() === network.toLowerCase() ||
    n.networkName.toLowerCase() === network.toLowerCase()
  ) || null
}

/**
 * Get standardized network display name (e.g., "BEP20", "ERC20", "TRC20")
 */
export function getNetworkDisplayStandard(currency: string, network: string, tokenStandard: boolean=false ): string {
  const networkConfig = getNetworkConfig(currency, network)
  if (!networkConfig) return network.toUpperCase()
  
  return tokenStandard ? networkConfig.tokenStandard || networkConfig.shortName : networkConfig.displayName || networkConfig.shortName
}

/**
 * Get full network display name (e.g., "Binance Smart Chain (BEP20)")
 */
export function getNetworkDisplayName(currency: string, network: string): string {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.displayName || network.toUpperCase()
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerTxUrl(currency: string, network: string, txHash: string): string | null {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig ? networkConfig.explorerTxUrl.replace('{txHash}', txHash) : null
}

/**
 * Get explorer URL for an address
 */
export function getExplorerAddressUrl(currency: string, network: string, address: string): string | null {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig ? networkConfig.explorerAddressUrl.replace('{address}', address) : null
}

/**
 * Get currency icon path
 */
export function getCurrencyIcon(currency: string): string | null {
  const config = getCurrencyConfig(currency)
  return config?.icon || null
}

/**
 * Get network color for UI theming
 */
export function getNetworkColor(currency: string, network: string): string | null {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.color || null
}

/**
 * Format currency amount with proper decimals
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const config = getCurrencyConfig(currency)
  const decimals = config?.decimals || 8
  
  return amount.toFixed(Math.min(decimals, 8)) // Cap at 8 decimal places for display
}

/**
 * Get all networks for a specific currency
 */
export function getCurrencyNetworks(currency: string): NetworkConfig[] {
  const config = getCurrencyConfig(currency)
  return config?.networks || []
}

/**
 * Check if a currency is a stablecoin
 */
export function isStablecoin(currency: string): boolean {
  const config = getCurrencyConfig(currency)
  return config?.category === CryptoCategory.STABLECOIN
}

/**
 * Check if currency/network combination is native coin (not a token)
 */
export function isNativeCoin(currency: string, network: string): boolean {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.isNative || false
}

/**
 * Get contract address for token (returns null for native coins)
 */
export function getContractAddress(currency: string, network: string): string | undefined {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.contractAddress || undefined
}

/**
 * Get Tatum chain identifier for API calls
 */
export function getTatumChain(currency: string, network: string): string | null {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.tatumChain || null
}

/**
 * Get KMS chain identifier for address generation
 */
export function getKMSChain(currency: string, network: string): string | null {
  const networkConfig = getNetworkConfig(currency, network)
  return networkConfig?.kmsChain || null
}

/**
 * Normalize network name for database storage
 * Maps common input variations to standardized database values
 */
export function normalizeNetworkName(network: string): string {
  const networkMap: Record<string, string> = {
    // Binance Smart Chain variations
    'bsc': 'binance_smart_chain',
    'bnb': 'binance_smart_chain', 
    'binance': 'binance_smart_chain',
    'binance_smart_chain': 'binance_smart_chain',
    
    // Ethereum variations
    'eth': 'ethereum',
    'ethereum': 'ethereum',
    
    // Tron variations
    'tron': 'tron',
    'trx': 'tron',
    
    // Bitcoin variations
    'btc': 'bitcoin',
    'bitcoin': 'bitcoin',
    
    // Other networks
    'polygon': 'polygon',
    'matic': 'polygon',
    'solana': 'solana',
    'sol': 'solana',
    'litecoin': 'litecoin',
    'ltc': 'litecoin',
    'dogecoin': 'dogecoin',
    'doge': 'dogecoin'
  }
  
  return networkMap[network.toLowerCase()] || network.toLowerCase()
}

/**
 * Get supported currencies grouped by category
 */
export function getCurrenciesByCategory(): Record<CryptoCategory, CryptoAssetConfig[]> {
  const grouped: Record<CryptoCategory, CryptoAssetConfig[]> = {
    [CryptoCategory.STABLECOIN]: [],
    [CryptoCategory.CRYPTOCURRENCY]: [],
    [CryptoCategory.TOKEN]: [],
    [CryptoCategory.DEFI]: [],
    [CryptoCategory.MEME]: [],
    [CryptoCategory.LAYER1]: [],
    [CryptoCategory.LAYER2]: []
  }
  
  Object.values(CRYPTO_ASSETS_CONFIG).forEach(config => {
    grouped[config.category].push(config)
  })
  
  return grouped
}
