#!/usr/bin/env tsx

/**
 * Test Invoice Creation with Real KMS Wallets
 *
 * This script:
 * 1. Finds or creates a test merchant
 * 2. Creates test invoices for different currencies
 * 3. Verifies address generation
 * 4. Tests the complete payment flow
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findOrCreateTestMerchant() {
  console.log('👤 Finding test merchant...')

  // Try to find existing merchant
  let merchant = await prisma.merchant.findFirst()

  if (!merchant) {
    console.log('   ❌ No merchants found in database!')
    console.log('   Please create a merchant through the dashboard first.')
    throw new Error('No merchants available for testing')
  }

  console.log('   ✅ Using merchant:', merchant.name, `(${merchant.id})`)

  return merchant
}

async function testInvoiceCreation(merchantId: string, currency: string, network: string) {
  console.log(`\n💳 Creating invoice for ${currency} on ${network}...`)

  try {
    // Find asset network
    const asset = await prisma.asset.findFirst({
      where: { symbol: currency }
    })

    if (!asset) {
      console.log(`   ❌ Asset ${currency} not found`)
      return null
    }

    const networkRecord = await prisma.network.findFirst({
      where: { code: network }
    })

    if (!networkRecord) {
      console.log(`   ❌ Network ${network} not found`)
      return null
    }

    const assetNetwork = await prisma.assetNetwork.findFirst({
      where: {
        assetId: asset.id,
        networkId: networkRecord.id
      }
    })

    if (!assetNetwork) {
      console.log(`   ❌ Asset network not found for ${currency} on ${network}`)
      return null
    }

    // Generate payment address FIRST
    const { generateAddressFast } = await import('../src/lib/kms/address-generator')

    const kmsWallet = await prisma.kmsWallet.findFirst({
      where: {
        networkId: networkRecord.id,
        status: 'ACTIVE'
      }
    })

    if (!kmsWallet) {
      console.log(`   ❌ No active KMS wallet found for ${network}`)
      return null
    }

    const addressResult = await generateAddressFast(
      kmsWallet.id,
      assetNetwork.id,
      merchantId,
      currency
    )

    // Create invoice with address
    const invoice = await prisma.invoice.create({
      data: {
        merchantId: merchantId,
        assetNetworkId: assetNetwork.id,
        amount: '10.00',
        currency: currency,
        network: network,
        orderId: `TEST-${Date.now()}`,
        description: `Test invoice for ${currency} on ${network}`,
        status: 'PENDING',
        depositAddress: addressResult.address,
        paymentAddressId: addressResult.addressId,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      }
    })

    console.log(`   ✅ Invoice created: ${invoice.id}`)
    console.log(`   📍 Amount: ${invoice.amount} ${invoice.currency}`)
    console.log(`   🌐 Network: ${invoice.network}`)
    console.log(`   💰 Address: ${addressResult.address}`)
    console.log(`   🔑 Index: ${addressResult.index}`)
    console.log(`   ⏰ Expires: ${invoice.expiresAt.toISOString()}`)

    return invoice

  } catch (error) {
    console.error(`   ❌ Failed to create invoice:`, error)
    return null
  }
}

async function testInvoiceFlow() {
  console.log('🧪 Testing Invoice Creation Flow\n')
  console.log('═'.repeat(70))

  // Step 1: Get or create merchant
  const merchant = await findOrCreateTestMerchant()

  // Step 2: Test multiple currencies
  const testCases = [
    { currency: 'ETH', network: 'ethereum' },
    { currency: 'USDT', network: 'bsc' },
    { currency: 'USDC', network: 'polygon' },
    { currency: 'BTC', network: 'bitcoin' },
  ]

  const results = []

  for (const testCase of testCases) {
    const invoice = await testInvoiceCreation(
      merchant.id,
      testCase.currency,
      testCase.network
    )

    if (invoice) {
      results.push({
        currency: testCase.currency,
        network: testCase.network,
        success: true,
        invoiceId: invoice.id,
        address: invoice.depositAddress
      })
    } else {
      results.push({
        currency: testCase.currency,
        network: testCase.network,
        success: false
      })
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70))
  console.log('📊 TEST SUMMARY')
  console.log('═'.repeat(70))

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach(r => {
    console.log(`   ✓ ${r.currency} on ${r.network}`)
    console.log(`     Invoice: ${r.invoiceId}`)
    console.log(`     Address: ${r.address}`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach(r => {
      console.log(`   ✗ ${r.currency} on ${r.network}`)
    })
  }

  console.log('\n✅ Invoice creation tests completed!')
  console.log('\n💡 Next Steps:')
  console.log('   1. View invoices in dashboard')
  console.log('   2. Send test payments to generated addresses')
  console.log('   3. Monitor webhook notifications')
}

async function main() {
  try {
    await testInvoiceFlow()
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
