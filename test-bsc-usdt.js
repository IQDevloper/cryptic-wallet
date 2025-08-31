#!/usr/bin/env node

/**
 * Test BSC USDT mapping fix
 */

async function testBSCUSDTMapping() {
  console.log('🧪 Testing BSC USDT mapping...\n')
  
  try {
    // Test currency mapping
    const { getKMSChainForCurrency } = require('./src/lib/utils/currency-kms-mapping.ts')
    
    console.log('📋 Testing currency-to-KMS mapping:')
    console.log('=' .repeat(50))
    
    const testCases = [
      { currency: 'USDT', network: 'bsc' },
      { currency: 'USDT', network: 'BSC' },
      { currency: 'USDT', network: 'binance' },
      { currency: 'USDT', network: 'ethereum' },
      { currency: 'BNB', network: 'bsc' },
    ]
    
    for (const test of testCases) {
      try {
        const kmsChain = getKMSChainForCurrency(test.currency, test.network)
        console.log(`✅ ${test.currency} on ${test.network} → KMS: ${kmsChain}`)
      } catch (error) {
        console.log(`❌ ${test.currency} on ${test.network}: ${error.message}`)
      }
    }
    
    // Test network name mapping
    console.log('\n🔗 Testing network name mapping:')
    console.log('=' .repeat(50))
    
    const networkNameMap = {
      'ethereum': 'ethereum',
      'eth': 'ethereum', 
      'bsc': 'binance_smart_chain',
      'binance': 'binance_smart_chain',
      'bnb': 'binance_smart_chain',
      'tron': 'tron',
      'polygon': 'polygon', 
      'matic': 'polygon',
    }
    
    const networkTests = ['bsc', 'BSC', 'binance', 'ethereum', 'eth', 'tron', 'polygon']
    
    for (const network of networkTests) {
      const normalizedInputNetwork = network.toLowerCase()
      const dbNetworkName = networkNameMap[normalizedInputNetwork] || normalizedInputNetwork
      console.log(`${network} → ${dbNetworkName}`)
    }
    
    // Check actual database wallets
    console.log('\n💾 Checking database wallets:')
    console.log('=' .repeat(50))
    
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    try {
      const wallets = await prisma.wallet.findMany({
        where: { status: 'ACTIVE' },
        select: { currency: true, network: true, signatureId: true }
      })
      
      console.log('Available wallets:')
      wallets.forEach(w => {
        console.log(`- ${w.currency} on '${w.network}' (${w.signatureId.substring(0, 8)}...)`)
      })
      
      // Test specific BSC lookup
      const bscWallet = await prisma.wallet.findFirst({
        where: {
          currency: 'BSC',
          network: 'binance_smart_chain',
          status: 'ACTIVE'
        }
      })
      
      if (bscWallet) {
        console.log(`\n✅ BSC wallet found for USDT: ${bscWallet.signatureId.substring(0, 8)}...`)
      } else {
        console.log('\n❌ No BSC wallet found with currency: BSC, network: binance_smart_chain')
      }
      
    } finally {
      await prisma.$disconnect()
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testBSCUSDTMapping().catch(console.error)