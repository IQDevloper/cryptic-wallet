#!/usr/bin/env node

/**
 * Test multi-currency fast address generation
 */

async function testMultiCurrencyGeneration() {
  console.log('🚀 Testing Multi-Currency Fast Address Generation\n')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Get wallets for different currencies
    const wallets = await prisma.wallet.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, 
        currency: true, 
        network: true, 
        signatureId: true,
        nextAddressIndex: true
      },
      take: 10
    })
    
    if (wallets.length === 0) {
      console.log('❌ No active wallets found for testing')
      return
    }
    
    console.log(`📊 Found ${wallets.length} active wallets to test:`)
    wallets.forEach((wallet, i) => {
      console.log(`   ${i + 1}. ${wallet.currency} on ${wallet.network} (index: ${wallet.nextAddressIndex})`)
    })
    
    // Test currencies that should be fast
    const testCurrencies = [
      { name: 'USDT/BSC', currency: 'USDT', network: 'binance_smart_chain' },
      { name: 'ETH', currency: 'ETH', network: 'ethereum' }, 
      { name: 'BTC', currency: 'BTC', network: 'bitcoin' },
      { name: 'TRX', currency: 'TRX', network: 'tron' },
      { name: 'LTC', currency: 'LTC', network: 'litecoin' },
      { name: 'DOGE', currency: 'DOGE', network: 'dogecoin' },
      { name: 'DASH', currency: 'DASH', network: 'dash' }
    ]
    
    console.log('\n⚡ MULTI-CURRENCY SPEED TEST:')
    console.log('=' .repeat(70))
    
    const results = []
    
    for (const test of testCurrencies) {
      const wallet = wallets.find(w => 
        w.currency.toUpperCase() === test.currency.toUpperCase() && 
        w.network.toLowerCase().includes(test.network.toLowerCase().split('_')[0])
      )
      
      if (!wallet) {
        console.log(`⚠️  ${test.name}: No wallet found`)
        continue
      }
      
      const startTime = Date.now()
      
      try {
        // Import the fast generation function
        const { generateAddressFast } = require('./src/lib/kms/address-generator.ts')
        
        const result = await generateAddressFast(wallet.id, 'test-multi-currency', test.currency)
        const duration = Date.now() - startTime
        
        console.log(`✅ ${test.name.padEnd(12)}: ${result.address} (${duration}ms)`)
        results.push({ currency: test.name, duration, success: true, address: result.address })
        
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(`❌ ${test.name.padEnd(12)}: FAILED - ${error.message.substring(0, 50)}... (${duration}ms)`)
        results.push({ currency: test.name, duration, success: false, error: error.message })
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Results summary
    console.log('\n📊 PERFORMANCE SUMMARY:')
    console.log('=' .repeat(70))
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
      const maxDuration = Math.max(...successful.map(r => r.duration))
      const minDuration = Math.min(...successful.map(r => r.duration))
      
      console.log(`✅ Successful generations: ${successful.length}/${results.length}`)
      console.log(`   Average time: ${avgDuration.toFixed(1)}ms`)
      console.log(`   Range: ${minDuration}ms - ${maxDuration}ms`)
      console.log(`   Improvement vs Docker: ${((7000 / avgDuration) * 100).toFixed(0)}% faster`)
      
      const throughput = Math.round(1000 / avgDuration)
      console.log(`   Throughput: ~${throughput} addresses/second`)
    }
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed generations: ${failed.length}`)
      failed.forEach(f => {
        console.log(`   ${f.currency}: ${f.error.substring(0, 60)}...`)
      })
    }
    
    console.log('\n🎯 SUPPORTED CURRENCIES (Fast Generation):')
    successful.forEach(s => {
      console.log(`   ✅ ${s.currency} - ${s.address.substring(0, 20)}...`)
    })
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testMultiCurrencyGeneration().catch(console.error)