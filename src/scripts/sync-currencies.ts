#!/usr/bin/env tsx
/**
 * Sync Currency table with GlobalHDWallet records
 * This creates the missing Currency, BaseCurrency, and Network records
 * needed for merchant creation to work.
 */

import { PrismaClient } from '@prisma/client'
import { CRYPTO_ASSETS } from '../lib/crypto-config'

const prisma = new PrismaClient()

/**
 * Create or update BaseCurrency records
 */
async function syncBaseCurrencies() {
  console.log('📋 Syncing base currencies...')
  
  for (const asset of Object.values(CRYPTO_ASSETS)) {
    await prisma.baseCurrency.upsert({
      where: { code: asset.symbol },
      update: {
        name: asset.name,
        symbol: asset.symbol,
        isActive: true,
        imageUrl: asset.icon
      },
      create: {
        code: asset.symbol,
        name: asset.name,
        symbol: asset.symbol,
        isActive: true,
        imageUrl: asset.icon
      }
    })
    console.log(`  ✓ ${asset.symbol} - ${asset.name}`)
  }
}

/**
 * Create or update Network records
 */
async function syncNetworks() {
  console.log('\n🌐 Syncing networks...')
  
  const networks = new Set<string>()
  
  // Collect all unique networks
  Object.values(CRYPTO_ASSETS).forEach(asset => {
    asset.networks.forEach(network => {
      networks.add(network.network)
    })
  })
  
  for (const networkCode of networks) {
    // Find a matching asset to get tatumChain
    let tatumChain = ''
    let networkName = networkCode.charAt(0).toUpperCase() + networkCode.slice(1)
    
    // Find tatumChain from any asset using this network
    for (const asset of Object.values(CRYPTO_ASSETS)) {
      const network = asset.networks.find(n => n.network === networkCode)
      if (network) {
        tatumChain = network.tatumChain
        break
      }
    }
    
    await prisma.network.upsert({
      where: { code: networkCode },
      update: {
        name: networkName,
        tatumChainId: tatumChain,
        isActive: true,
        isTestnet: false
      },
      create: {
        code: networkCode,
        name: networkName,
        tatumChainId: tatumChain,
        isActive: true,
        isTestnet: false,
        blockConfirmations: 6
      }
    })
    console.log(`  ✓ ${networkCode} (${tatumChain})`)
  }
}

/**
 * Create or update Currency records
 */
async function syncCurrencies() {
  console.log('\n💱 Syncing currencies...')
  
  for (const asset of Object.values(CRYPTO_ASSETS)) {
    const baseCurrency = await prisma.baseCurrency.findUnique({
      where: { code: asset.symbol }
    })
    
    if (!baseCurrency) {
      console.log(`  ❌ BaseCurrency not found for ${asset.symbol}`)
      continue
    }
    
    for (const networkConfig of asset.networks) {
      const network = await prisma.network.findUnique({
        where: { code: networkConfig.network }
      })
      
      if (!network) {
        console.log(`  ❌ Network not found for ${networkConfig.network}`)
        continue
      }
      
      // Determine token standard
      let tokenStandard = null
      if (!networkConfig.isNative && networkConfig.contractAddress) {
        if (networkConfig.network === 'ethereum') tokenStandard = 'ERC-20'
        else if (networkConfig.network === 'bsc') tokenStandard = 'BEP-20'
        else if (networkConfig.network === 'tron') tokenStandard = 'TRC-20'
        else if (networkConfig.network === 'polygon') tokenStandard = 'Polygon'
        else if (networkConfig.network === 'arbitrum') tokenStandard = 'Arbitrum'
      }
      
      await prisma.currency.upsert({
        where: {
          baseCurrencyId_networkId: {
            baseCurrencyId: baseCurrency.id,
            networkId: network.id
          }
        },
        update: {
          contractAddress: networkConfig.contractAddress,
          decimals: asset.decimals,
          isToken: !networkConfig.isNative,
          tokenStandard,
          isActive: true
        },
        create: {
          baseCurrencyId: baseCurrency.id,
          networkId: network.id,
          contractAddress: networkConfig.contractAddress,
          decimals: asset.decimals,
          isToken: !networkConfig.isNative,
          tokenStandard,
          isActive: true,
          minAmount: 0,
          withdrawFee: 0
        }
      })
      
      const displayName = networkConfig.displayName || `${asset.symbol} (${networkConfig.network.toUpperCase()})`
      console.log(`  ✓ ${displayName}`)
    }
  }
}

/**
 * Main sync function
 */
async function syncAll() {
  console.log('🚀 Syncing database with crypto configuration...\n')
  
  try {
    await syncBaseCurrencies()
    await syncNetworks() 
    await syncCurrencies()
    
    // Show summary
    const baseCurrencyCount = await prisma.baseCurrency.count({ where: { isActive: true } })
    const networkCount = await prisma.network.count({ where: { isActive: true } })
    const currencyCount = await prisma.currency.count({ where: { isActive: true } })
    
    console.log('\n✅ Sync completed successfully!')
    console.log(`   📋 Base Currencies: ${baseCurrencyCount}`)
    console.log(`   🌐 Networks: ${networkCount}`)
    console.log(`   💱 Currencies: ${currencyCount}`)
    
    console.log('\n💡 You can now create merchants!')
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the sync
syncAll()