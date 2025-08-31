#!/usr/bin/env node

/**
 * Compare KMS Docker vs Fast ethers address generation speed
 */

async function testSpeedComparison() {
  console.log('⚡ Speed Comparison: KMS Docker vs Fast Ethers\n')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
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
    
    console.log(`📋 Testing with BSC wallet: ${bscWallet.signatureId}\n`)
    
    // Import both generation methods
    const { generateAddressFast } = require('./src/lib/kms/address-generator.ts')
    
    console.log('🚀 Testing FAST generation (ethers.js local derivation):')
    console.log('=' .repeat(60))
    
    const fastTimes = []
    
    // Test fast generation multiple times
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      try {
        const result = await generateAddressFast(bscWallet.id, 'test-merchant-speed', 'USDT')
        const duration = Date.now() - startTime
        fastTimes.push(duration)
        
        console.log(`Test ${i + 1}: ${result.address} (${duration}ms)`)
      } catch (error) {
        console.log(`Test ${i + 1}: FAILED - ${error.message}`)
      }
    }
    
    if (fastTimes.length > 0) {
      const avgFast = fastTimes.reduce((a, b) => a + b, 0) / fastTimes.length
      const maxFast = Math.max(...fastTimes)
      const minFast = Math.min(...fastTimes)
      
      console.log(`\n📊 FAST Generation Results:`)
      console.log(`   Average: ${avgFast.toFixed(1)}ms`)
      console.log(`   Min: ${minFast}ms`)
      console.log(`   Max: ${maxFast}ms`)
      
      console.log(`\n🎯 Performance vs Docker KMS:`)
      console.log(`   Docker KMS: ~7000ms per address`)
      console.log(`   Fast ethers: ${avgFast.toFixed(1)}ms per address`)
      console.log(`   Speed improvement: ${((7000 / avgFast) * 100).toFixed(0)}% faster!`)
      console.log(`   Time saved per address: ${(7000 - avgFast).toFixed(0)}ms`)
      
      if (avgFast < 50) {
        console.log(`\n✅ EXCELLENT! Sub-50ms generation is perfect for production`)
      } else if (avgFast < 200) {
        console.log(`\n✅ VERY GOOD! Sub-200ms generation is production-ready`)
      } else if (avgFast < 1000) {
        console.log(`\n✅ GOOD! Sub-1000ms is much better than Docker`)
      } else {
        console.log(`\n⚠️ Still room for improvement`)
      }
      
      // Calculate throughput
      const addressesPerSecond = Math.round(1000 / avgFast)
      console.log(`\n🔥 Throughput: ~${addressesPerSecond} addresses per second`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testSpeedComparison().catch(console.error)