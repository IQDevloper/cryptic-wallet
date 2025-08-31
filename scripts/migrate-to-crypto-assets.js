/**
 * 🧹 MIGRATION SCRIPT: Populate CryptoAsset Table from Existing Data
 * 
 * This script migrates data from the complex BaseCurrency + Currency + Network model
 * to the simplified CryptoAsset model.
 * 
 * Run this script AFTER creating the crypto_assets table but BEFORE switching to new schema.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Asset configuration mapping (from your crypto-config.ts)
const CRYPTO_ASSETS_CONFIG = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    networks: [
      {
        network: 'bsc',
        networkName: 'Binance Smart Chain (BEP20)',
        isNative: false,
        contractAddress: '0x55d398326f99059fF775485246999027B3197955',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BSC',
      },
      {
        network: 'tron',
        networkName: 'Tron (TRC20)',
        isNative: false,
        contractAddress: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
        derivationPath: "m/44'/195'/0'/0",
        tatumChain: 'TRON',
      },
      {
        network: 'ethereum',
        networkName: 'Ethereum (ERC20)',
        isNative: false,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
      },
      {
        network: 'polygon',
        networkName: 'Polygon',
        isNative: false,
        contractAddress: '0xc2132D05D31c914a87C6613C10748AaCbA0D5c45',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'MATIC',
      },
      {
        network: 'arbitrum',
        networkName: 'Arbitrum',
        isNative: false,
        contractAddress: '0xfd086bC7CD5C481DCC9C85ebE0cE3606eB48',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ARBITRUM',
      }
    ],
    iconUrl: '/icons/usdt.svg'
  },

  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    networks: [
      {
        network: 'ethereum',
        networkName: 'USDC (ERC20)',
        isNative: false,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
      },
      {
        network: 'bsc',
        networkName: 'Binance Smart Chain (BEP20)',
        isNative: false,
        contractAddress: '0x8ac76a51cc950d9822d68b83fe1adadfb8c9c1a',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BSC',
      },
      {
        network: 'polygon',
        networkName: 'Polygon',
        isNative: false,
        contractAddress: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'MATIC',
      },
      {
        network: 'arbitrum',
        networkName: 'Arbitrum',
        isNative: false,
        contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ARBITRUM',
      }
    ],
    iconUrl: '/icons/usdc.svg'
  },

  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    networks: [
      {
        network: 'ethereum',
        networkName: 'Ethereum',
        isNative: true,
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'ETH',
      },
      {
        network: 'base',
        networkName: 'Base',
        isNative: true,
        derivationPath: "m/44'/60'/0'/0",
        tatumChain: 'BASE',
      }
    ],
    iconUrl: '/icons/eth.svg'
  },

  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    networks: [
      {
        network: 'bitcoin',
        networkName: 'Bitcoin',
        isNative: true,
        derivationPath: "m/44'/0'/0'/0",
        tatumChain: 'BTC',
      }
    ],
    iconUrl: '/icons/btc.svg'
  },

  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    networks: [
      {
        network: 'solana',
        networkName: 'Solana',
        isNative: true,
        derivationPath: "m/44'/501'/0'/0'",
        tatumChain: 'SOL',
      }
    ],
    iconUrl: '/icons/sol.svg'
  },

  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    decimals: 9,
    networks: [
      {
        network: 'sui',
        networkName: 'Sui',
        isNative: true,
        derivationPath: "m/44'/784'/0'/0/0'",
        tatumChain: 'SUI',
      }
    ],
    iconUrl: '/icons/sui.svg'
  },

  LTC: {
    symbol: 'LTC',
    name: 'Litecoin',
    decimals: 8,
    networks: [
      {
        network: 'litecoin',
        networkName: 'Litecoin',
        isNative: true,
        derivationPath: "m/44'/2'/0'/0",
        tatumChain: 'LTC',
      }
    ],
    iconUrl: '/icons/ltc.svg'
  },

  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    decimals: 8,
    networks: [
      {
        network: 'dogecoin',
        networkName: 'Dogecoin',
        isNative: true,
        derivationPath: "m/44'/3'/0'/0",
        tatumChain: 'DOGE',
      }
    ],
    iconUrl: '/icons/doge.svg'
  },

  DASH: {
    symbol: 'DASH',
    name: 'Dash',
    decimals: 8,
    networks: [
      {
        network: 'dash',
        networkName: 'Dash',
        isNative: true,
        derivationPath: "m/44'/5'/0'/0",
        tatumChain: 'DASH',
      }
    ],
    iconUrl: '/icons/dash.svg'
  }
}

async function migrateCryptoAssets() {
  console.log('🧹 Starting migration to CryptoAsset model...')
  
  try {
    // First, check if crypto_assets table exists
    const tableExists = await checkTableExists()
    if (!tableExists) {
      console.error('❌ crypto_assets table does not exist. Please run the schema migration first.')
      process.exit(1)
    }

    // Clear existing crypto assets (if any)
    console.log('🗑️ Clearing existing crypto assets...')
    await prisma.cryptoAsset.deleteMany({})

    let createdCount = 0
    let skippedCount = 0

    // Create crypto assets from configuration
    for (const [symbol, config] of Object.entries(CRYPTO_ASSETS_CONFIG)) {
      for (const network of config.networks) {
        try {
          const cryptoAsset = await prisma.cryptoAsset.create({
            data: {
              symbol: config.symbol,
              name: config.name,
              network: network.network,
              networkName: network.networkName,
              contractAddress: network.contractAddress || null,
              decimals: config.decimals,
              isNative: network.isNative,
              iconUrl: config.iconUrl,
              tatumChain: network.tatumChain,
              derivationPath: network.derivationPath,
              isActive: true,
              priority: getPriority(config.symbol), // Higher priority for major coins
            }
          })
          
          console.log(`✅ Created: ${cryptoAsset.symbol} on ${cryptoAsset.networkName}`)
          createdCount++
        } catch (error) {
          console.error(`❌ Failed to create ${config.symbol} on ${network.network}:`, error.message)
          skippedCount++
        }
      }
    }

    console.log(`\n🎉 Migration completed!`)
    console.log(`✅ Created: ${createdCount} crypto assets`)
    console.log(`⚠️ Skipped: ${skippedCount} crypto assets`)

    // Now update GlobalHDWallets to reference CryptoAssets
    console.log('\n🔗 Updating GlobalHDWallet references...')
    await updateGlobalWalletReferences()

    console.log('\n✨ Migration successful! You can now switch to the clean schema.')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function checkTableExists() {
  try {
    await prisma.cryptoAsset.count()
    return true
  } catch (error) {
    return false
  }
}

async function updateGlobalWalletReferences() {
  const globalWallets = await prisma.globalHDWallet.findMany()
  
  for (const wallet of globalWallets) {
    try {
      // Find matching crypto asset
      const cryptoAsset = await prisma.cryptoAsset.findFirst({
        where: {
          symbol: wallet.currency,
          network: wallet.network,
          contractAddress: wallet.contractAddress || null
        }
      })

      if (cryptoAsset) {
        // Add cryptoAssetId to global wallet (assuming you added this column)
        // Note: You'll need to add this migration separately
        console.log(`🔗 Would link ${wallet.currency} on ${wallet.network} to crypto asset ${cryptoAsset.id}`)
      } else {
        console.warn(`⚠️ No matching crypto asset found for ${wallet.currency} on ${wallet.network}`)
      }
    } catch (error) {
      console.error(`❌ Failed to update global wallet ${wallet.id}:`, error.message)
    }
  }
}

function getPriority(symbol) {
  // Assign priorities for UI ordering
  const priorities = {
    'BTC': 100,
    'ETH': 90,
    'USDT': 80,
    'USDC': 70,
    'SOL': 60,
    'LTC': 50,
    'DOGE': 40,
    'DASH': 30,
    'SUI': 20,
  }
  return priorities[symbol] || 0
}

// Run migration
migrateCryptoAssets()
  .catch(console.error)