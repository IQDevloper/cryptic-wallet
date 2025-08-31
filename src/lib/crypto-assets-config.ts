/**
 * CRYPTOCURRENCY ASSETS CONFIGURATION
 * 
 * This file contains all supported cryptocurrency configurations.
 * Edit this file to add, remove, or modify supported cryptocurrencies.
 * 
 * To add a new cryptocurrency:
 * 1. Add a new entry to CRYPTO_ASSETS_CONFIG
 * 2. Make sure the icon exists in /public/icons/
 * 3. Run the wallet initialization script if needed
 * 
 * Network Standards:
 * - ERC20: Ethereum-based tokens
 * - BEP20: Binance Smart Chain tokens  
 * - TRC20: Tron-based tokens
 * - Native: Blockchain's native coin
 */

export interface CryptoAssetConfig {
  symbol: string
  name: string
  decimals: number
  networks: NetworkConfig[]
  icon: string // Path to icon in /public/icons/
}

export interface NetworkConfig {
  network: string
  isNative: boolean
  contractAddress?: string
  derivationPath: string
  tatumChain: string // Tatum API chain identifier
  displayName?: string // Human-readable network name for UI
}

/**
 * MAIN CRYPTOCURRENCY CONFIGURATION
 * 
 * Add or remove cryptocurrencies here.
 * Each asset can support multiple networks.
 */
export const CRYPTO_ASSETS_CONFIG: Record<string, CryptoAssetConfig> = {
  // USDT - Tether USD (Stablecoin)
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    networks: [
      {
        network: 'bsc',
        isNative: false,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BSC',
        displayName: 'Binance Smart Chain (BEP20)'
      },
      {
        network: 'tron',
        isNative: false,
        contractAddress: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
        derivationPath: "m/44'/195'/0'/0",
        tatumChain: 'TRON',
        displayName: 'Tron (TRC20)'
      },
      {
        network: 'ethereum',
        isNative: false,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
        displayName: 'Ethereum (ERC20)'
      },
      {
        network: 'polygon',
        isNative: false,
        contractAddress: '0xc2132D05D31c914a87C6613C10748AaCbA0D5c45',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'MATIC',
        displayName: 'Polygon'
      },
      {
        network: 'arbitrum',
        isNative: false,
        contractAddress: '0xfd086bC7CD5C481DCC9C85ebE0cE3606eB48',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ARBITRUM',
        displayName: 'Arbitrum'
      }
    ],
    icon: '/icons/usdt.svg'
  },

  // USDC - USD Coin (Stablecoin)
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    networks: [
      {
        network: 'ethereum',
        isNative: false,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
        displayName: 'USDC (ERC20)'
      },
      {
        network: 'bsc',
        isNative: false,
        contractAddress: '0x8ac76a51cc950d9822d68b83fe1adadfb8c9c1a',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BSC',
        displayName: 'Binance Smart Chain (BEP20)'
      },
      {
        network: 'polygon',
        isNative: false,
        contractAddress: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'MATIC',
        displayName: 'Polygon'
      },
      {
        network: 'arbitrum',
        isNative: false,
        contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ARBITRUM',
        displayName: 'Arbitrum'
      }
    ],
    icon: '/icons/usdc.svg'
  },

  // ETH - Ethereum (Native Cryptocurrency)
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    networks: [
      {
        network: 'ethereum',
        isNative: true,
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
        displayName: 'Ethereum'
      },
      {
        network: 'base',
        isNative: true,
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BASE',
        displayName: 'Base'
      }
    ],
    icon: '/icons/eth.svg'
  },

  // BTC - Bitcoin (Original Cryptocurrency)
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    networks: [
      {
        network: 'bitcoin',
        isNative: true,
        derivationPath: "m/44'/0'/0'/0",
        tatumChain: 'BTC',
        displayName: 'Bitcoin'
      }
    ],
    icon: '/icons/btc.svg'
  },

  // SOL - Solana (High-Speed Blockchain)
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    networks: [
      {
        network: 'solana',
        isNative: true,
        derivationPath: "m/44'/501'/0'/0'",
        tatumChain: 'SOL',
        displayName: 'Solana'
      }
    ],
    icon: '/icons/sol.svg'
  },

  // SUI - Sui (Move-Based Blockchain)
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    decimals: 9,
    networks: [
      {
        network: 'sui',
        isNative: true,
        derivationPath: "m/44'/784'/0'/0/0'",
        tatumChain: 'SUI',
        displayName: 'Sui'
      }
    ],
    icon: '/icons/sui.svg'
  },

  // LTC - Litecoin (Bitcoin Fork)
  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    decimals: 8,
    networks: [
      {
        network: 'litecoin',
        isNative: true,
        derivationPath: "m/44'/2'/0'/0",
        tatumChain: 'LTC',
        displayName: 'Litecoin'
      }
    ],
    icon: '/icons/ltc.svg'
  },

  // DOGE - Dogecoin (Meme Cryptocurrency)
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    decimals: 8,
    networks: [
      {
        network: 'dogecoin',
        isNative: true,
        derivationPath: "m/44'/3'/0'/0",
        tatumChain: 'DOGE',
        displayName: 'Dogecoin'
      }
    ],
    icon: '/icons/doge.svg'
  },

  // DASH - Dash (Privacy-Focused)
  DASH: {
    symbol: 'DASH',
    name: 'Dash',
    decimals: 8,
    networks: [
      {
        network: 'dash',
        isNative: true,
        derivationPath: "m/44'/5'/0'/0",
        tatumChain: 'DASH',
        displayName: 'Dash'
      }
    ],
    icon: '/icons/dash.svg'
  }
}

/**
 * HELPER FUNCTIONS
 * 
 * These functions provide easy access to the configuration data
 */

// Re-export types for backwards compatibility
export type CryptoAsset = CryptoAssetConfig

// Main export - use this in your application
export const CRYPTO_ASSETS = CRYPTO_ASSETS_CONFIG
