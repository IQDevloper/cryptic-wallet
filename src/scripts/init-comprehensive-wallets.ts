#!/usr/bin/env tsx
/**
 * Initialize global HD wallets for all supported crypto assets
 */

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as bip39 from 'bip39'
import { CRYPTO_ASSETS, NetworkConfig } from '../lib/crypto-config'
const HDKey = require('hdkey')

const prisma = new PrismaClient()

interface WalletConfig {
  currency: string
  name: string
  network: string
  contractAddress?: string
  derivationPath: string
  environment: 'mainnet'
}

/**
 * Generate a secure mnemonic phrase
 */
function generateMnemonic(): string {
  const entropy = crypto.randomBytes(32)
  return bip39.generateMnemonic(256, () => entropy)
}

/**
 * Derive extended public key from mnemonic and derivation path
 */
function deriveXpub(mnemonic: string, derivationPath: string): string {
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const hdKey = HDKey.fromMasterSeed(seed)
  const derivedKey = hdKey.derive(derivationPath)
  return derivedKey.publicExtendedKey
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
function encrypt(text: string): string {
  const key = crypto.scryptSync(process.env.JWT_SECRET || 'fallback-key', 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

/**
 * Create a mainnet global HD wallet
 */
async function createMainnetWallet(config: WalletConfig): Promise<void> {
  console.log(`📝 Creating ${config.currency} wallet on ${config.network}...`)

  // Generate new mnemonic for this wallet
  const mnemonic = generateMnemonic()
  const xpub = deriveXpub(mnemonic, config.derivationPath)
  
  // Create a master private key (encrypted, for HD wallet reconstruction if needed)
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const masterPrivateKey = HDKey.fromMasterSeed(seed).privateExtendedKey
  
  try {
    const wallet = await prisma.globalHDWallet.create({
      data: {
        currency: config.currency,
        network: config.network,
        contractAddress: config.contractAddress,
        mnemonicEncrypted: encrypt(mnemonic),
        xpub: xpub,
        encryptedPrivateKey: encrypt(masterPrivateKey),
        derivationPath: config.derivationPath,
        nextAddressIndex: BigInt(0),
        totalPoolBalance: 0,
        status: 'ACTIVE'
      }
    })

    console.log(`✅ Created ${config.currency} wallet: ${wallet.id}`)
    console.log(`   Network: ${config.network}`)
    console.log(`   Contract: ${config.contractAddress || 'Native token'}`)
    console.log(`   Derivation: ${config.derivationPath}`)
    
  } catch (error) {
    console.error(`❌ Failed to create ${config.currency} wallet:`, error)
    throw error
  }
}

/**
 * Generate wallet configurations from crypto assets config
 */
function generateWalletConfigs(): WalletConfig[] {
  const configs: WalletConfig[] = []
  
  Object.values(CRYPTO_ASSETS).forEach(asset => {
    asset.networks.forEach(network => {
      configs.push({
        currency: asset.symbol,
        name: asset.name,
        network: network.network,
        contractAddress: network.contractAddress,
        derivationPath: network.derivationPath,
        environment: 'mainnet'
      })
    })
  })
  
  return configs
}

/**
 * Check if mainnet wallets already exist
 */
async function checkExistingMainnetWallets(): Promise<boolean> {
  const mainnetWallets = await prisma.globalHDWallet.findMany({
    where: {
      AND: [
        { network: { not: { contains: 'testnet' } } },
        { network: { not: { contains: 'sepolia' } } },
        { network: { not: { contains: 'devnet' } } }
      ]
    }
  })
  
  return mainnetWallets.length > 0
}

/**
 * Initialize all mainnet wallets
 */
async function initializeMainnetWallets() {
  console.log('🚀 Initializing mainnet HD wallets for all supported crypto assets...\n')
  
  try {
    // Check environment
    if (process.env.TATUM_ENVIRONMENT === 'testnet') {
      console.warn('⚠️  TATUM_ENVIRONMENT is set to "testnet" but initializing mainnet wallets')
      console.warn('   Consider setting TATUM_ENVIRONMENT="mainnet" for production')
    }
    
    // Check for existing mainnet wallets
    const hasMainnetWallets = await checkExistingMainnetWallets()
    if (hasMainnetWallets) {
      console.log('✅ Mainnet wallets already exist. Skipping initialization.')
      console.log('   If you want to add new wallets, they will be created individually.\n')
      
      // Show existing mainnet wallets
      const existing = await prisma.globalHDWallet.findMany({
        where: {
          AND: [
            { network: { not: { contains: 'testnet' } } },
            { network: { not: { contains: 'sepolia' } } },
            { network: { not: { contains: 'devnet' } } }
          ]
        },
        select: {
          currency: true,
          network: true,
          contractAddress: true,
          status: true
        },
        orderBy: [
          { currency: 'asc' },
          { network: 'asc' }
        ]
      })
      
      console.log('📊 Existing mainnet wallets:')
      existing.forEach(wallet => {
        const tokenInfo = wallet.contractAddress ? ' (Token)' : ' (Native)'
        console.log(`   - ${wallet.currency} on ${wallet.network}${tokenInfo}`)
      })
      
      return
    }
    
    // Generate wallet configurations
    const walletConfigs = generateWalletConfigs()
    
    console.log(`🔨 Creating ${walletConfigs.length} mainnet wallets...\n`)
    
    let successCount = 0
    let failureCount = 0
    
    for (const config of walletConfigs) {
      try {
        await createMainnetWallet(config)
        successCount++
        console.log('') // Add spacing
      } catch (error) {
        failureCount++
        console.error(`Failed to create wallet for ${config.currency} on ${config.network}:`, error)
      }
    }
    
    console.log(`✅ Wallet creation completed!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Failures: ${failureCount}`)
    
    if (successCount > 0) {
      // Show summary
      const createdWallets = await prisma.globalHDWallet.findMany({
        where: {
          AND: [
            { network: { not: { contains: 'testnet' } } },
            { network: { not: { contains: 'sepolia' } } },
            { network: { not: { contains: 'devnet' } } }
          ]
        },
        select: {
          currency: true,
          network: true,
          contractAddress: true,
          status: true
        },
        orderBy: [
          { currency: 'asc' },
          { network: 'asc' }
        ]
      })
      
      console.log('\n📊 Created mainnet wallets:')
      createdWallets.forEach(wallet => {
        const tokenInfo = wallet.contractAddress ? ' (Token)' : ' (Native)'
        console.log(`   ✓ ${wallet.currency} on ${wallet.network}${tokenInfo}`)
      })
    }
    
    console.log('\n💡 Next steps:')
    console.log('   1. Create merchant accounts')
    console.log('   2. Start accepting payments in all supported cryptocurrencies')
    console.log('   3. Monitor transactions via webhooks')
    
  } catch (error) {
    console.error('❌ Failed to initialize mainnet wallets:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Add CLI options
const args = process.argv.slice(2)
if (args.includes('--force') || args.includes('-f')) {
  console.log('🔥 Force mode: Will delete existing mainnet wallets first')
  
  prisma.globalHDWallet.deleteMany({
    where: {
      AND: [
        { network: { not: { contains: 'testnet' } } },
        { network: { not: { contains: 'sepolia' } } },
        { network: { not: { contains: 'devnet' } } }
      ]
    }
  }).then(() => {
    console.log('🗑️ Deleted existing mainnet wallets\n')
    return initializeMainnetWallets()
  }).catch(console.error)
} else {
  initializeMainnetWallets()
}