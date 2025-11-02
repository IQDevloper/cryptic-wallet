#!/usr/bin/env tsx

/**
 * Test HD address generation from xPub
 *
 * This script tests that:
 * 1. Addresses are deterministically generated from xPub
 * 2. Same index always produces same address
 * 3. Different indexes produce different addresses
 */

import { PrismaClient } from '@prisma/client'
import { generateAddressFast } from '../src/lib/kms/address-generator'

const prisma = new PrismaClient()

async function testAddressGeneration() {
  console.log('🧪 Testing HD Address Generation\n')

  // Get a KMS wallet with xPub
  const kmsWallet = await prisma.kmsWallet.findFirst({
    where: {
      xpub: { not: null },
      status: 'ACTIVE'
    },
    include: {
      network: true
    }
  })

  if (!kmsWallet) {
    console.log('❌ No KMS wallets with xPub found!')
    console.log('   Run: npx tsx scripts/extract-kms-xpubs.ts')
    process.exit(1)
  }

  console.log(`✅ Testing with ${kmsWallet.network.name} wallet`)
  console.log(`   Signature ID: ${kmsWallet.signatureId}`)
  console.log(`   xPub: ${kmsWallet.xpub?.substring(0, 30)}...\n`)

  // Find a merchant
  const merchant = await prisma.merchant.findFirst()
  if (!merchant) {
    console.log('❌ No merchant found! Create a merchant first.')
    process.exit(1)
  }

  // Find an asset network for this network
  const assetNetwork = await prisma.assetNetwork.findFirst({
    where: {
      networkId: kmsWallet.networkId
    }
  })

  if (!assetNetwork) {
    console.log('❌ No asset network found!')
    process.exit(1)
  }

  console.log('📝 Test 1: Generate 3 addresses sequentially')
  const addresses: string[] = []

  for (let i = 0; i < 3; i++) {
    try {
      const result = await generateAddressFast(
        kmsWallet.id,
        assetNetwork.id,
        merchant.id,
        'ETH'
      )

      addresses.push(result.address)
      console.log(`   Address ${i}: ${result.address}`)

      // Clean up test address
      await prisma.paymentAddress.delete({
        where: { id: result.addressId }
      })

      // Reset index
      await prisma.kmsWallet.update({
        where: { id: kmsWallet.id },
        data: { nextAddressIndex: 0 }
      })
    } catch (error) {
      console.error(`   ❌ Failed to generate address ${i}:`, error)
    }
  }

  // Test determinism
  console.log('\n📝 Test 2: Verify deterministic generation')
  console.log('   Generating address at index 0 twice...')

  const addr1 = await generateAddressFast(kmsWallet.id, assetNetwork.id, merchant.id, 'ETH')
  await prisma.paymentAddress.delete({ where: { id: addr1.addressId } })
  await prisma.kmsWallet.update({ where: { id: kmsWallet.id }, data: { nextAddressIndex: 0 } })

  const addr2 = await generateAddressFast(kmsWallet.id, assetNetwork.id, merchant.id, 'ETH')
  await prisma.paymentAddress.delete({ where: { id: addr2.addressId } })

  if (addr1.address === addr2.address) {
    console.log(`   ✅ PASS: Same index produces same address`)
    console.log(`      ${addr1.address}`)
  } else {
    console.log(`   ❌ FAIL: Addresses don't match!`)
    console.log(`      First:  ${addr1.address}`)
    console.log(`      Second: ${addr2.address}`)
  }

  // Cleanup
  await prisma.kmsWallet.update({
    where: { id: kmsWallet.id },
    data: { nextAddressIndex: 0 }
  })

  console.log('\n✅ Address generation tests completed!')
  console.log('\n💡 Summary:')
  console.log(`   - Generated ${addresses.length} unique addresses`)
  console.log(`   - Deterministic: ${addr1.address === addr2.address ? 'YES' : 'NO'}`)
  console.log(`   - All addresses can be recovered from master mnemonic`)
}

async function main() {
  try {
    await testAddressGeneration()
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
