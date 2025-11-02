#!/usr/bin/env tsx

/**
 * Generate REAL KMS Wallets in Tatum KMS Docker
 *
 * This script will:
 * 1. Generate actual wallets in Tatum KMS for each network
 * 2. Extract signature IDs and xPubs
 * 3. Update the database with real wallet data
 * 4. Replace placeholder wallets with actual KMS wallets
 */

import { PrismaClient, WalletStatus } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Networks to generate wallets for
const NETWORKS_TO_GENERATE = [
  { code: 'ethereum', chain: 'ETH', name: 'Ethereum', derivationPath: "m/44'/60'/0'/0" },
  { code: 'bsc', chain: 'BSC', name: 'BNB Smart Chain', derivationPath: "m/44'/60'/0'/0" },
  { code: 'polygon', chain: 'MATIC', name: 'Polygon', derivationPath: "m/44'/60'/0'/0" },
  { code: 'bitcoin', chain: 'BTC', name: 'Bitcoin', derivationPath: "m/44'/0'/0'/0" },
  { code: 'tron', chain: 'TRON', name: 'TRON', derivationPath: "m/44'/195'/0'/0" },
  { code: 'litecoin', chain: 'LTC', name: 'Litecoin', derivationPath: "m/44'/2'/0'/0" },
]

interface WalletGenerationResult {
  network: string
  success: boolean
  signatureId?: string
  xpub?: string
  error?: string
}

async function generateKMSWallet(chain: string): Promise<{ signatureId: string; xpub: string }> {
  console.log(`  🔐 Generating ${chain} wallet in KMS...`)

  const password = process.env.TATUM_KMS_PASSWORD || 'dskjfskjdf234324mmxzckljasdjasd^^^%%@'
  const command = `echo "${password}" | docker exec -i cryptic-kms node /opt/app/dist/index.js generatemanagedwallet ${chain}`

  try {
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('Secp256k1') && !stderr.includes('bigint')) {
      throw new Error(`KMS error: ${stderr}`)
    }

    // Parse the JSON response (skip warning lines)
    const lines = stdout.trim().split('\n')
    const jsonLines = lines.filter(line => line.trim().startsWith('{') || line.trim().startsWith('}') || line.trim().startsWith('"'))
    if (jsonLines.length === 0) {
      throw new Error('No JSON response from KMS')
    }
    const jsonText = jsonLines.join('\n')
    const result = JSON.parse(jsonText)

    if (!result.signatureId || !result.xpub) {
      throw new Error('Invalid KMS response: missing signatureId or xpub')
    }

    console.log(`     ✅ Signature ID: ${result.signatureId}`)
    console.log(`     ✅ xPub: ${result.xpub.substring(0, 30)}...`)

    return {
      signatureId: result.signatureId,
      xpub: result.xpub
    }
  } catch (error) {
    console.error(`     ❌ Failed:`, error)
    throw error
  }
}

async function updateDatabaseWallet(
  networkCode: string,
  signatureId: string,
  xpub: string,
  derivationPath: string
): Promise<void> {
  // Find the network
  const network = await prisma.network.findFirst({
    where: { code: networkCode }
  })

  if (!network) {
    throw new Error(`Network ${networkCode} not found in database`)
  }

  // Find existing KMS wallet for this network
  const existingWallet = await prisma.kmsWallet.findFirst({
    where: { networkId: network.id }
  })

  if (existingWallet) {
    // Update existing wallet
    await prisma.kmsWallet.update({
      where: { id: existingWallet.id },
      data: {
        signatureId: signatureId,
        xpub: xpub,
        status: WalletStatus.ACTIVE,
        derivationPath: derivationPath,
        nextAddressIndex: 0
      }
    })
    console.log(`     ✅ Updated existing KMS wallet in database`)
  } else {
    // Create new wallet
    await prisma.kmsWallet.create({
      data: {
        networkId: network.id,
        signatureId: signatureId,
        xpub: xpub,
        derivationPath: derivationPath,
        nextAddressIndex: 0,
        status: WalletStatus.ACTIVE,
        purpose: 'BOTH'
      }
    })
    console.log(`     ✅ Created new KMS wallet in database`)
  }
}

async function generateAllWallets(): Promise<WalletGenerationResult[]> {
  console.log('🚀 Generating Real KMS Wallets\n')

  const results: WalletGenerationResult[] = []

  for (const network of NETWORKS_TO_GENERATE) {
    console.log(`\n📦 ${network.name} (${network.chain})`)
    console.log('━'.repeat(60))

    try {
      // Step 1: Generate wallet in KMS
      const { signatureId, xpub } = await generateKMSWallet(network.chain)

      // Step 2: Update database
      await updateDatabaseWallet(network.code, signatureId, xpub, network.derivationPath)

      results.push({
        network: network.name,
        success: true,
        signatureId,
        xpub: xpub.substring(0, 30) + '...'
      })

      console.log(`     ✅ ${network.name} wallet setup complete!`)

    } catch (error) {
      console.error(`     ❌ Failed to setup ${network.name}:`, error)
      results.push({
        network: network.name,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return results
}

async function printSummary(results: WalletGenerationResult[]) {
  console.log('\n\n' + '═'.repeat(70))
  console.log('📊 WALLET GENERATION SUMMARY')
  console.log('═'.repeat(70))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach(r => {
    console.log(`   ✓ ${r.network}`)
    console.log(`     Signature ID: ${r.signatureId}`)
    console.log(`     xPub: ${r.xpub}`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach(r => {
      console.log(`   ✗ ${r.network}: ${r.error}`)
    })
  }

  // Verify database state
  console.log('\n🔍 Database Verification:')
  const kmsWallets = await prisma.kmsWallet.findMany({
    include: { network: true }
  })

  console.log(`   Total KMS Wallets: ${kmsWallets.length}`)
  kmsWallets.forEach(w => {
    const hasXPub = w.xpub ? '✅' : '❌'
    const isActive = w.status === 'ACTIVE' ? '✅' : '⚠️'
    console.log(`   ${hasXPub} ${isActive} ${w.network.name} - ${w.signatureId}`)
  })
}

async function main() {
  console.log('🔐 Real KMS Wallet Generation Script\n')
  console.log('This will generate REAL wallets in Tatum KMS Docker\n')

  // Check if KMS is running
  try {
    await execAsync('docker ps --filter name=cryptic-kms --format "{{.Status}}"')
  } catch (error) {
    console.error('❌ Error: Tatum KMS Docker container is not running!')
    console.error('   Start it with: npm run kms:start')
    process.exit(1)
  }

  console.log('✅ KMS Docker container is running\n')
  console.log('⚠️  WARNING: This will generate NEW wallets with NEW mnemonics!')
  console.log('   Make sure to backup the master mnemonic after generation.\n')

  // Generate wallets
  const results = await generateAllWallets()

  // Print summary
  await printSummary(results)

  console.log('\n✅ Wallet generation completed!')
  console.log('\n💡 Next Steps:')
  console.log('   1. Backup your master mnemonic: npm run kms:export')
  console.log('   2. Test address generation: npm run kms:test-addresses')
  console.log('   3. Create a test invoice to verify the system')
  console.log('\n🔒 IMPORTANT: Backup your KMS wallet.dat file and mnemonic!')
}

main()
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
