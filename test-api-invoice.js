#!/usr/bin/env node

/**
 * Test invoice creation via API to verify address parsing fix
 */

async function testInvoiceAPI() {
  console.log('🧪 Testing invoice creation via API...\n')
  
  try {
    // First, get a merchant API key from the database
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const merchant = await prisma.merchant.findFirst({
      where: { isActive: true },
      select: { id: true, apiKey: true, name: true }
    })
    
    if (!merchant || !merchant.apiKey) {
      console.log('❌ No active merchant with API key found')
      await prisma.$disconnect()
      return
    }
    
    console.log(`📋 Testing with merchant: ${merchant.name} (${merchant.id})`)
    
    // Test invoice creation
    const invoiceData = {
      merchantId: merchant.id,
      amount: 99.99,
      currency: 'USDT',
      network: 'bsc',
      description: 'Test invoice for address parsing',
      orderId: `TEST-${Date.now()}`
    }
    
    console.log('\n🔄 Creating invoice via tRPC...')
    console.log(`   Amount: ${invoiceData.amount} ${invoiceData.currency}`)
    console.log(`   Network: ${invoiceData.network}`)
    
    // Use fetch to call the tRPC endpoint
    const response = await fetch('http://localhost:3002/api/trpc/invoice.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchant.apiKey}`
      },
      body: JSON.stringify(invoiceData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ API request failed: ${response.status}`)
      console.log(`   Response: ${errorText}`)
      await prisma.$disconnect()
      return
    }
    
    const result = await response.json()
    console.log('\n✅ Invoice created successfully!')
    console.log(`   Invoice ID: ${result.id}`)
    console.log(`   Deposit Address: "${result.depositAddress}"`)
    console.log(`   QR Code Data: ${result.qrCodeData}`)
    console.log(`   Status: ${result.status}`)
    
    // Verify the deposit address format
    if (typeof result.depositAddress === 'string' && 
        result.depositAddress.startsWith('0x') && 
        result.depositAddress.length === 42 &&
        !result.depositAddress.includes('{') &&
        !result.depositAddress.includes('\n')) {
      console.log('\n✅ DEPOSIT ADDRESS FORMAT IS CORRECT!')
      console.log('   - Clean string format')
      console.log('   - Proper Ethereum address length (42 chars)')
      console.log('   - No JSON artifacts')
    } else {
      console.log('\n❌ DEPOSIT ADDRESS FORMAT ISSUE:')
      console.log(`   - Type: ${typeof result.depositAddress}`)
      console.log(`   - Length: ${result.depositAddress.length}`)
      console.log(`   - Contains braces: ${result.depositAddress.includes('{')}`)
      console.log(`   - Contains newlines: ${result.depositAddress.includes('\n')}`)
      console.log(`   - Raw value: "${result.depositAddress}"`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testInvoiceAPI().catch(console.error)