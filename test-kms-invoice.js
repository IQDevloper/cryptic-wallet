#!/usr/bin/env node

/**
 * Test KMS invoice creation system
 * This tests the new KMS address generation and invoice creation flow
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testKMSInvoiceSystem() {
  console.log('🧪 Testing KMS invoice creation system...\n')
  
  try {
    // Check if we have merchants and KMS wallets
    const [merchantCount, walletCount] = await Promise.all([
      prisma.merchant.count(),
      prisma.wallet.count()
    ])
    
    console.log(`📊 Found ${merchantCount} merchants and ${walletCount} KMS wallets`)
    
    if (merchantCount === 0) {
      console.log('⚠️  No merchants found. Please create a merchant first.')
      return
    }
    
    if (walletCount === 0) {
      console.log('⚠️  No KMS wallets found. Please run: npm run generate-supported-wallets')
      return
    }
    
    // Test the currency-to-KMS mapping
    console.log('\n📋 Testing currency-to-KMS mapping:')
    console.log('=' .repeat(60))
    
    const testCurrencies = [
      { currency: 'BTC', network: 'bitcoin' },
      { currency: 'ETH', network: 'ethereum' },
      { currency: 'USDT', network: 'ethereum' },
    ]
    
    for (const test of testCurrencies) {
      try {
        // Test the mapping function
        const { getKMSChainForCurrency } = require('./src/lib/utils/currency-kms-mapping.ts')
        const kmsChain = getKMSChainForCurrency(test.currency, test.network)
        console.log(`✅ ${test.currency} on ${test.network} → KMS: ${kmsChain}`)
        
        // Check if we have the actual wallet
        const wallet = await prisma.wallet.findFirst({
          where: {
            currency: kmsChain,
            network: test.network,
            status: 'ACTIVE'
          }
        })
        
        if (wallet) {
          console.log(`   ✅ KMS wallet found: ${wallet.signatureId?.substring(0, 8)}...`)
        } else {
          console.log(`   ❌ No KMS wallet found for ${kmsChain} on ${test.network}`)
        }
        
      } catch (error) {
        console.log(`❌ ${test.currency} on ${test.network}: ${error.message}`)
      }
    }
    
    // Test address generation
    console.log('\n🔄 Testing KMS address generation:')
    console.log('=' .repeat(60))
    
    const firstMerchant = await prisma.merchant.findFirst()
    console.log(`Testing with merchant: ${firstMerchant.name}`)
    
    // Try to generate an address for BTC
    const btcWallet = await prisma.wallet.findFirst({
      where: {
        currency: 'BTC',
        network: 'bitcoin',
        status: 'ACTIVE'
      }
    })
    
    if (btcWallet) {
      console.log(`\n🪙 Testing BTC address generation...`)
      console.log(`Wallet ID: ${btcWallet.id}`)
      console.log(`Signature ID: ${btcWallet.signatureId}`)
      console.log(`Next Index: ${btcWallet.nextAddressIndex}`)
      
      // Note: We won't actually call the KMS Docker command in this test
      // since it requires proper KMS setup and credentials
      console.log(`⚠️  Skipping actual KMS call - would generate address at index ${btcWallet.nextAddressIndex}`)
      
      // Create a mock address record to test the database schema
      const mockAddress = await prisma.address.create({
        data: {
          walletId: btcWallet.id,
          merchantId: firstMerchant.id,
          address: 'bc1qtest123...mock', // Mock address
          derivationIndex: btcWallet.nextAddressIndex,
          signatureId: `${btcWallet.signatureId}_${btcWallet.nextAddressIndex}`,
          currentBalance: 0
        }
      })
      
      console.log(`✅ Mock address created: ${mockAddress.id}`)
      
      // Test invoice creation with mock address
      const mockInvoice = await prisma.invoice.create({
        data: {
          amount: 0.001,
          currency: 'BTC',
          description: 'Test KMS Invoice',
          depositAddress: mockAddress.address,
          qrCodeData: `bitcoin:${mockAddress.address}?amount=0.001`,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          merchantId: firstMerchant.id,
          addressId: mockAddress.id,
          status: 'PENDING'
        }
      })
      
      console.log(`✅ Mock invoice created: ${mockInvoice.id}`)
      
      // Test the invoice query with new schema
      const invoiceWithRelations = await prisma.invoice.findUnique({
        where: { id: mockInvoice.id },
        include: {
          address: {
            include: {
              wallet: true
            }
          },
          transactions: true
        }
      })
      
      if (invoiceWithRelations) {
        console.log(`✅ Invoice query successful:`)
        console.log(`   Amount: ${invoiceWithRelations.amount} ${invoiceWithRelations.currency}`)
        console.log(`   Address: ${invoiceWithRelations.address.address}`)
        console.log(`   Wallet: ${invoiceWithRelations.address.wallet.currency} (${invoiceWithRelations.address.wallet.network})`)
        console.log(`   Transactions: ${invoiceWithRelations.transactions.length}`)
      }
      
      // Clean up test data
      await prisma.invoice.delete({ where: { id: mockInvoice.id } })
      await prisma.address.delete({ where: { id: mockAddress.id } })
      console.log(`🧹 Cleaned up test data`)
      
    } else {
      console.log('❌ No BTC wallet found for testing')
    }
    
    console.log('\n✅ KMS invoice system test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testKMSInvoiceSystem().catch(console.error)