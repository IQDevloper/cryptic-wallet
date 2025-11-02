#!/usr/bin/env tsx

/**
 * Extract Extended Public Keys (xPubs) from Tatum KMS and store them in the database
 *
 * This script:
 * 1. Exports wallet data from Tatum KMS Docker container
 * 2. Extracts xPub for each network
 * 3. Updates the database with xPubs for secure address derivation
 *
 * Usage:
 *   npx tsx scripts/extract-kms-xpubs.ts
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// Network to chain mapping
const NETWORK_CHAINS: Record<string, string> = {
  'ethereum': 'ETH',
  'bsc': 'BSC',
  'polygon': 'MATIC',
  'bitcoin': 'BTC',
  'litecoin': 'LTC',
  'dogecoin': 'DOGE',
  'bitcoin-cash': 'BCH',
  'tron': 'TRON',
}

async function extractXPubsFromKMS(): Promise<Record<string, string>> {
  console.log('🔐 Extracting xPubs from Tatum KMS...')

  try {
    // Export wallets from KMS Docker container
    const password = process.env.TATUM_KMS_PASSWORD || 'dskjfskjdf234324mmxzckljasdjasd^^^%%@'
    const command = `echo "${password}" | docker exec -i cryptic-kms node /opt/app/dist/index.js export`

    console.log('📤 Running KMS export command...')
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('Secp256k1') && !stderr.includes('bigint')) {
      console.error('❌ KMS export error:', stderr)
      throw new Error(`KMS export failed: ${stderr}`)
    }

    // Parse JSON from output (skip warning lines)
    const lines = stdout.trim().split('\n')
    const jsonLines = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.startsWith('"') || trimmed.includes(':')
    })
    if (jsonLines.length === 0) {
      throw new Error('No JSON response from KMS')
    }
    const jsonText = jsonLines.join('\n')
    const wallets = JSON.parse(jsonText)
    console.log(`✅ Retrieved ${Object.keys(wallets).length} wallets from KMS`)

    const xPubs: Record<string, string> = {}

    // Extract xPub for each network
    for (const [chain, walletData] of Object.entries(wallets)) {
      if (typeof walletData === 'object' && walletData !== null && 'xpub' in walletData) {
        const xpub = (walletData as any).xpub
        if (xpub) {
          xPubs[chain.toLowerCase()] = xpub
          console.log(`  ✓ ${chain}: ${xpub.substring(0, 20)}...`)
        }
      }
    }

    return xPubs
  } catch (error) {
    console.error('❌ Failed to extract xPubs from KMS:', error)
    throw error
  }
}

async function updateDatabaseWithXPubs(xPubs: Record<string, string>) {
  console.log('\n💾 Updating database with xPubs...')

  let updated = 0
  let skipped = 0

  for (const [chain, xpub] of Object.entries(xPubs)) {
    try {
      // Find the network in database
      const network = await prisma.network.findFirst({
        where: {
          code: chain
        }
      })

      if (!network) {
        console.log(`  ⚠️  Network not found for ${chain}, skipping...`)
        skipped++
        continue
      }

      // Update KMS wallet with xPub
      const result = await prisma.kmsWallet.updateMany({
        where: {
          networkId: network.id
        },
        data: {
          xpub: xpub
        }
      })

      if (result.count > 0) {
        console.log(`  ✓ Updated ${result.count} KMS wallet(s) for ${chain}`)
        updated += result.count
      } else {
        console.log(`  ⚠️  No KMS wallets found for ${chain}`)
        skipped++
      }
    } catch (error) {
      console.error(`  ❌ Failed to update ${chain}:`, error)
      skipped++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated} wallets`)
  console.log(`   Skipped: ${skipped} networks`)

  return { updated, skipped }
}

async function verifyXPubs() {
  console.log('\n🔍 Verifying stored xPubs...')

  const kmsWallets = await prisma.kmsWallet.findMany({
    include: {
      network: true
    }
  })

  console.log(`\n📋 KMS Wallets Status:`)
  console.log(`${'Network'.padEnd(20)} ${'Status'.padEnd(15)} ${'xPub Preview'}`)
  console.log('-'.repeat(70))

  for (const wallet of kmsWallets) {
    const status = wallet.xpub ? '✅ Has xPub' : '❌ Missing xPub'
    const preview = wallet.xpub ? wallet.xpub.substring(0, 30) + '...' : 'N/A'
    console.log(`${wallet.network.name.padEnd(20)} ${status.padEnd(15)} ${preview}`)
  }

  const withXPub = kmsWallets.filter(w => w.xpub).length
  const total = kmsWallets.length

  console.log(`\n✅ ${withXPub}/${total} wallets have xPubs stored`)

  if (withXPub < total) {
    console.log('\n⚠️  Some wallets are missing xPubs!')
    console.log('   These wallets will fall back to Docker KMS for address generation.')
    console.log('   To fix: Ensure wallets are created in Tatum KMS first.')
  }
}

async function main() {
  console.log('🚀 KMS xPub Extraction Tool\n')

  try {
    // Step 1: Extract xPubs from KMS
    const xPubs = await extractXPubsFromKMS()

    if (Object.keys(xPubs).length === 0) {
      console.log('\n⚠️  No xPubs found in KMS!')
      console.log('   Make sure you have created wallets in Tatum KMS first.')
      console.log('\n   To create wallets, run:')
      console.log('   docker exec -it cryptic-kms tatum-kms generatemanagedwallet ETH')
      console.log('   docker exec -it cryptic-kms tatum-kms generatemanagedwallet BTC')
      process.exit(1)
    }

    // Step 2: Update database
    await updateDatabaseWithXPubs(xPubs)

    // Step 3: Verify
    await verifyXPubs()

    console.log('\n✅ xPub extraction completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Test address generation: npm run test:addresses')
    console.log('   2. All new addresses will be derived from these xPubs')
    console.log('   3. You can now recover all addresses from the master mnemonic')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
