#!/usr/bin/env node

/**
 * Test invoice creation speed via API to measure address generation performance
 */

async function testAPISpeed() {
  console.log('⚡ Testing invoice creation speed via API...\n')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Get any active merchant
    const merchant = await prisma.merchant.findFirst({
      where: { isActive: true },
      select: { id: true, apiKey: true, name: true }
    })
    
    if (!merchant || !merchant.apiKey) {
      console.log('❌ No merchant with API key found')
      return
    }
    
    console.log(`📋 Testing with merchant: ${merchant.name}`)
    console.log(`🔗 Server running on: http://localhost:3002`)
    
    const times = []
    
    console.log('\n🚀 Creating invoices to test address generation speed:')
    console.log('=' .repeat(60))
    
    // Test multiple invoice creations
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      const invoiceData = {
        merchantId: merchant.id,
        amount: 10.0 + i, // Different amounts to avoid duplicates
        currency: 'USDT',
        network: 'bsc',
        description: `Speed test invoice ${i + 1}`,
        orderId: `SPEED-TEST-${Date.now()}-${i}`
      }
      
      try {
        const response = await fetch('http://localhost:3002/api/trpc/invoice.create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${merchant.apiKey}`
          },
          body: JSON.stringify(invoiceData)
        })
        
        const duration = Date.now() - startTime
        times.push(duration)
        
        if (response.ok) {
          const result = await response.json()
          console.log(`Test ${i + 1}: ✅ Invoice created in ${duration}ms`)
          console.log(`         Address: ${result.depositAddress}`)
        } else {
          const errorText = await response.text()
          console.log(`Test ${i + 1}: ❌ Failed in ${duration}ms - ${errorText.substring(0, 100)}...`)
        }
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(`Test ${i + 1}: ❌ Error in ${duration}ms - ${error.message}`)
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const maxTime = Math.max(...times)
      const minTime = Math.min(...times)
      
      console.log(`\n📊 PERFORMANCE RESULTS:`)
      console.log(`   Average: ${avgTime.toFixed(1)}ms per invoice`)
      console.log(`   Min: ${minTime}ms`)
      console.log(`   Max: ${maxTime}ms`)
      
      console.log(`\n🎯 Performance vs Previous (7+ seconds):`)
      if (avgTime < 1000) {
        const improvement = ((7000 / avgTime) * 100).toFixed(0)
        console.log(`   ✅ MASSIVE IMPROVEMENT: ${improvement}% faster!`)
        console.log(`   ✅ Time saved: ${(7000 - avgTime).toFixed(0)}ms per invoice`)
      } else if (avgTime < 3000) {
        console.log(`   ✅ GOOD IMPROVEMENT: ${avgTime.toFixed(0)}ms is much better than 7000ms`)
      } else {
        console.log(`   ⚠️ Still slower than expected`)
      }
      
      const invoicesPerSecond = Math.round(1000 / avgTime)
      console.log(`   🔥 Throughput: ~${invoicesPerSecond} invoices per second`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAPISpeed().catch(console.error)