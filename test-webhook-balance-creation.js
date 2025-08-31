#!/usr/bin/env node

/**
 * Test script for dynamic merchant balance creation via webhook
 * 
 * This tests the new approach where merchant balances are created
 * dynamically when payments are received, rather than at merchant creation time.
 */

const { PrismaClient } = require('@prisma/client')
const { findOrCreateMerchantBalance, getKMSChainForCurrency } = require('./src/lib/utils/currency-kms-mapping.ts')

const prisma = new PrismaClient()

async function testDynamicBalanceCreation() {
  console.log('🧪 Testing dynamic merchant balance creation...\n')
  
  try {
    // Test different currency/network combinations
    const testCases = [
      { currency: 'BTC', network: 'bitcoin' },
      { currency: 'ETH', network: 'ethereum' },
      { currency: 'USDT', network: 'ethereum', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { currency: 'USDT', network: 'tron', contractAddress: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj' },
      { currency: 'BNB', network: 'binance_smart_chain' },
      { currency: 'USDC', network: 'polygon', contractAddress: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174' },
    ]

    console.log('📋 Testing KMS chain mapping:')
    console.log('=' .repeat(60))
    
    for (const testCase of testCases) {
      try {
        const kmsChain = getKMSChainForCurrency(testCase.currency, testCase.network)
        console.log(`✅ ${testCase.currency} on ${testCase.network} → KMS: ${kmsChain}`)
      } catch (error) {
        console.log(`❌ ${testCase.currency} on ${testCase.network} → Error: ${error.message}`)
      }
    }

    // Check existing merchants and wallets
    console.log('\n📊 Checking existing data:')
    console.log('=' .repeat(60))
    
    const [merchantCount, walletCount] = await Promise.all([
      prisma.merchant.count(),
      prisma.wallet.count()
    ])
    
    console.log(`Merchants: ${merchantCount}`)
    console.log(`KMS Wallets: ${walletCount}`)
    
    if (walletCount === 0) {
      console.log('\n⚠️  No KMS wallets found! Please run:')
      console.log('   npm run generate-supported-wallets')
      return
    }
    
    if (merchantCount === 0) {
      console.log('\n⚠️  No merchants found! Please create a merchant first.')
      return  
    }

    // Test balance creation for first merchant
    const firstMerchant = await prisma.merchant.findFirst()
    console.log(`\n🧪 Testing balance creation for merchant: ${firstMerchant.name}`)
    console.log('=' .repeat(60))
    
    // Test creating balances for different currencies
    for (const testCase of testCases.slice(0, 3)) { // Test first 3 cases
      try {
        console.log(`\n🔄 Creating balance for ${testCase.currency} on ${testCase.network}...`)
        
        const balance = await findOrCreateMerchantBalance(
          prisma,
          firstMerchant.id,
          testCase.currency,
          testCase.network,
          testCase.contractAddress
        )
        
        console.log(`✅ Balance created/found:`)
        console.log(`   Balance ID: ${balance.id}`)
        console.log(`   Wallet ID: ${balance.walletId}`) 
        console.log(`   Current Balance: ${balance.balance}`)
        console.log(`   Total Received: ${balance.totalReceived}`)
        
      } catch (error) {
        console.log(`❌ Failed to create balance for ${testCase.currency}: ${error.message}`)
      }
    }

    // Show final merchant balance summary
    console.log('\n📊 Final Balance Summary:')
    console.log('=' .repeat(60))
    
    const merchantBalances = await prisma.merchantBalance.findMany({
      where: { merchantId: firstMerchant.id },
      include: {
        wallet: true
      }
    })
    
    console.log(`Total balances for ${firstMerchant.name}: ${merchantBalances.length}`)
    
    merchantBalances.forEach((balance, index) => {
      console.log(`${index + 1}. ${balance.wallet.currency} - Balance: ${balance.balance} - Wallet: ${balance.wallet.signatureId?.substring(0, 8)}...`)
    })
    
    console.log('\n✅ Dynamic balance creation test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDynamicBalanceCreation().catch(console.error)