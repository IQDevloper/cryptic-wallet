#!/usr/bin/env node

/**
 * Test invoice creation to verify address parsing fix
 */

async function testInvoiceCreation() {
  console.log('🧪 Testing invoice creation with address parsing fix...\n')
  
  try {
    // Import required modules
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Import the address generator to test directly
    const { generateAddress } = require('./src/lib/kms/address-generator.ts')
    
    // Get a BSC wallet for testing
    const bscWallet = await prisma.wallet.findFirst({
      where: {
        currency: 'BSC',
        network: 'binance_smart_chain',
        status: 'ACTIVE'
      }
    })
    
    if (!bscWallet) {
      console.log('❌ No BSC wallet found for testing')
      return
    }
    
    console.log(`📋 Testing with BSC wallet:`)
    console.log(`   Signature ID: ${bscWallet.signatureId}`)
    console.log(`   Current Index: ${bscWallet.nextAddressIndex}`)
    
    // Test direct address generation
    console.log('\n🔄 Testing direct address generation...')
    const addressResult = await generateAddress(bscWallet.id, 'test-merchant', 'USDT')
    
    console.log(`✅ Address generation result:`)
    console.log(`   Address ID: ${addressResult.addressId}`)
    console.log(`   Address: ${addressResult.address}`)
    console.log(`   Derivation Index: ${addressResult.derivationIndex}`)
    
    // Verify the address is a clean string
    if (typeof addressResult.address === 'string' && 
        addressResult.address.startsWith('0x') && 
        addressResult.address.length === 42 &&
        !addressResult.address.includes('{') &&
        !addressResult.address.includes('\n')) {
      console.log(`✅ Address format is correct - clean string`)
    } else {
      console.log(`❌ Address format issue:`)
      console.log(`   Type: ${typeof addressResult.address}`)
      console.log(`   Length: ${addressResult.address.length}`)
      console.log(`   Contains braces: ${addressResult.address.includes('{')}`)
      console.log(`   Contains newlines: ${addressResult.address.includes('\n')}`)
    }
    
    // Test QR code data formation
    const amount = 99.99
    const qrData = `usdt:${addressResult.address}?amount=${amount}`
    console.log(`\n📱 QR Code Data: ${qrData}`)
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testInvoiceCreation().catch(console.error)