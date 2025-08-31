#!/usr/bin/env node

/**
 * Test fast HD wallet address generation for invoice creation
 */

async function testFastInvoiceCreation() {
  console.log('🚀 Testing fast HD wallet address generation...\n')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Check if we have HD wallets
    const hdWallets = await prisma.globalHDWallet.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        currency: true, 
        network: true, 
        nextAddressIndex: true,
        derivationPath: true 
      }
    })
    
    console.log(`📊 Found ${hdWallets.length} active HD wallets:`)
    hdWallets.forEach(wallet => {
      console.log(`   - ${wallet.currency} on ${wallet.network} (index: ${wallet.nextAddressIndex})`)
    })
    
    if (hdWallets.length === 0) {
      console.log('\n❌ No HD wallets found. You need to create global HD wallets first.')
      console.log('   Run the wallet creation script to set up HD wallets for each currency.')
      await prisma.$disconnect()
      return
    }
    
    // Test address generation speed
    const testWallet = hdWallets.find(w => w.currency === 'USDT' && w.network === 'binance_smart_chain') || hdWallets[0]
    console.log(`\n⚡ Speed test with ${testWallet.currency} on ${testWallet.network}...`)
    
    // Test HD wallet address generation
    const { generateAddress } = require('./src/lib/hdwallet/address-generator.ts')
    
    const startTime = Date.now()
    
    // Generate 3 addresses to test speed
    for (let i = 0; i < 3; i++) {
      const addressResult = await generateAddress(testWallet.id, 'test-merchant-speed')
      const duration = Date.now() - startTime
      
      console.log(`✅ Address ${i + 1}: ${addressResult.address} (${duration}ms total)`)
    }
    
    const totalDuration = Date.now() - startTime
    const avgDuration = totalDuration / 3
    
    console.log(`\n🎯 PERFORMANCE RESULTS:`)
    console.log(`   Total time for 3 addresses: ${totalDuration}ms`)
    console.log(`   Average time per address: ${avgDuration.toFixed(1)}ms`)
    console.log(`   Speed improvement: ${((7000 / avgDuration) * 100).toFixed(0)}% faster than KMS Docker!`)
    
    if (avgDuration < 100) {
      console.log(`✅ EXCELLENT! Sub-100ms generation is production-ready`)
    } else if (avgDuration < 500) {
      console.log(`✅ GOOD! Sub-500ms generation is acceptable`)
    } else {
      console.log(`⚠️  Still slower than expected. Consider optimizations.`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testFastInvoiceCreation().catch(console.error)