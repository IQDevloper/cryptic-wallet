#!/usr/bin/env tsx
/**
 * Initialize testnet HD wallets for testing webhook functionality
 */

import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import * as bip39 from 'bip39'
const HDKey = require('hdkey')

const prisma = new PrismaClient()

// Testnet network configurations
interface TestnetConfig {
  currency: string
  network: string
  contractAddress?: string
  derivationPath: string
  environment: 'testnet'
}

const TESTNET_NETWORKS: TestnetConfig[] = [
  // Bitcoin Testnet
  {
    currency: 'BTC',
    network: 'bitcoin-testnet',
    derivationPath: "m/44'/1'/0'/0", // Bitcoin testnet uses coin type 1
    environment: 'testnet'
  },
  
  // Ethereum Sepolia Testnet
  {
    currency: 'ETH',
    network: 'ethereum-sepolia', 
    derivationPath: "m/44'/60'/0'/0", // Same as mainnet
    environment: 'testnet'
  },
  
  // USDT on Ethereum Sepolia (you'll need to deploy or find testnet USDT)
  {
    currency: 'USDT',
    network: 'ethereum-sepolia',
    contractAddress: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Example testnet USDT
    derivationPath: "m/44'/60'/0'/0",
    environment: 'testnet'
  },
  
  // BSC Testnet
  {
    currency: 'BNB',
    network: 'bsc-testnet',
    derivationPath: "m/44'/60'/0'/0", // BSC uses Ethereum derivation
    environment: 'testnet'
  },
  
  // USDT on BSC Testnet
  {
    currency: 'USDT',
    network: 'bsc-testnet', 
    contractAddress: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC testnet USDT
    derivationPath: "m/44'/60'/0'/0",
    environment: 'testnet'
  },

  // TRX on TRON Testnet (Shasta)
  {
    currency: 'TRX',
    network: 'tron-testnet',
    derivationPath: "m/44'/195'/0'/0", // TRON derivation path
    environment: 'testnet'
  },

  // USDT on TRON Testnet (TRC20)
  {
    currency: 'USDT',
    network: 'tron-testnet',
    contractAddress: 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', // TRON testnet USDT TRC20
    derivationPath: "m/44'/195'/0'/0", // TRON derivation path
    environment: 'testnet'
  }
]

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
 * Create a testnet global HD wallet
 */
async function createTestnetWallet(config: TestnetConfig): Promise<void> {
  console.log(`📝 Creating ${config.currency} testnet wallet on ${config.network}...`)

  // Generate new mnemonic for this wallet
  const mnemonic = generateMnemonic()
  const xpub = deriveXpub(mnemonic, config.derivationPath)
  
  // Create a dummy private key (encrypted, for HD wallet reconstruction if needed)
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

    console.log(`✅ Created ${config.currency} testnet wallet: ${wallet.id}`)
    console.log(`   Network: ${config.network}`)
    console.log(`   Contract: ${config.contractAddress || 'Native token'}`)
    console.log(`   Derivation: ${config.derivationPath}`)
    
  } catch (error) {
    console.error(`❌ Failed to create ${config.currency} testnet wallet:`, error)
    throw error
  }
}

/**
 * Check if testnet wallets already exist
 */
async function checkExistingTestnetWallets(): Promise<boolean> {
  const testnetWallets = await prisma.globalHDWallet.findMany({
    where: {
      network: {
        contains: 'testnet'
      }
    }
  })
  
  return testnetWallets.length > 0
}

/**
 * Initialize all testnet wallets
 */
async function initializeTestnetWallets() {
  console.log('🧪 Initializing testnet HD wallets for webhook testing...\n')
  
  try {
    // Check environment
    if (process.env.TATUM_ENVIRONMENT !== 'testnet') {
      console.warn('⚠️  TATUM_ENVIRONMENT is not set to "testnet"')
      console.warn('   Consider setting TATUM_ENVIRONMENT="testnet" in your .env file')
    }
    
    // Check for existing testnet wallets
    const hasTestnetWallets = await checkExistingTestnetWallets()
    if (hasTestnetWallets) {
      console.log('✅ Testnet wallets already exist. Skipping initialization.')
      console.log('   If you want to recreate them, delete existing testnet wallets first.\n')
      
      // Show existing testnet wallets
      const existing = await prisma.globalHDWallet.findMany({
        where: {
          OR: [
            { network: { contains: 'testnet' } },
            { network: { contains: 'sepolia' } }
          ]
        },
        select: {
          currency: true,
          network: true,
          contractAddress: true,
          status: true
        }
      })
      
      console.log('📊 Existing testnet wallets:')
      existing.forEach(wallet => {
        const tokenInfo = wallet.contractAddress ? ' (Token)' : ' (Native)'
        console.log(`   - ${wallet.currency} on ${wallet.network}${tokenInfo}`)
      })
      
      return
    }
    
    // Create testnet wallets
    console.log('🔨 Creating testnet wallets...\n')
    
    for (const config of TESTNET_NETWORKS) {
      await createTestnetWallet(config)
      console.log('') // Add spacing
    }
    
    console.log('✅ All testnet HD wallets created successfully!\n')
    
    // Show summary
    const createdWallets = await prisma.globalHDWallet.findMany({
      where: {
        OR: [
          { network: { contains: 'testnet' } },
          { network: { contains: 'sepolia' } }
        ]
      },
      select: {
        currency: true,
        network: true,
        contractAddress: true,
        status: true
      }
    })
    
    console.log('📊 Created testnet wallets:')
    createdWallets.forEach(wallet => {
      const tokenInfo = wallet.contractAddress ? ' (Token)' : ' (Native)'
      console.log(`   ✓ ${wallet.currency} on ${wallet.network}${tokenInfo}`)
    })
    
    console.log('\n💡 Next steps:')
    console.log('   1. Run: npx tsx src/scripts/test-webhook.ts')
    console.log('   2. Get testnet coins from faucets')
    console.log('   3. Send test transactions to generated addresses')
    console.log('   4. Monitor webhooks: npx tsx src/scripts/monitor-webhooks.ts')
    
  } catch (error) {
    console.error('❌ Failed to initialize testnet wallets:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Add CLI options
const args = process.argv.slice(2)
if (args.includes('--force') || args.includes('-f')) {
  console.log('🔥 Force mode: Will delete existing testnet wallets first')
  
  prisma.globalHDWallet.deleteMany({
    where: {
      OR: [
        { network: { contains: 'testnet' } },
        { network: { contains: 'sepolia' } }
      ]
    }
  }).then(() => {
    console.log('🗑️ Deleted existing testnet wallets\n')
    return initializeTestnetWallets()
  }).catch(console.error)
} else {
  initializeTestnetWallets()
}