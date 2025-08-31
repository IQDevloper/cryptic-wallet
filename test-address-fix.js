#!/usr/bin/env node

/**
 * Test the address parsing fix directly
 */

const { spawn } = require('child_process')
const path = require('path')

async function testAddressParsingFix() {
  console.log('🧪 Testing address parsing fix by compiling and running TS directly...\n')
  
  try {
    // Get a BSC wallet signature ID first
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    const bscWallet = await prisma.wallet.findFirst({
      where: {
        currency: 'BSC',
        network: 'binance_smart_chain',
        status: 'ACTIVE'
      }
    })
    
    if (!bscWallet) {
      console.log('❌ No BSC wallet found for testing')
      await prisma.$disconnect()
      return
    }
    
    console.log(`📋 Found BSC wallet: ${bscWallet.signatureId}`)
    await prisma.$disconnect()
    
    // Create a test script that directly calls the KMS function
    const testScript = `
import { generateKMSAddress } from './src/lib/kms/address-generator'

async function test() {
  try {
    const result = await generateKMSAddress('${bscWallet.signatureId}', 'BSC', 'binance_smart_chain', BigInt(0))
    console.log('\\n✅ Address generation result:')
    console.log('   Address:', result.address)
    console.log('   Signature ID:', result.signatureId)
    console.log('   Address Type:', typeof result.address)
    console.log('   Address Length:', result.address.length)
    
    if (typeof result.address === 'string' && 
        result.address.startsWith('0x') && 
        result.address.length === 42 &&
        !result.address.includes('{') &&
        !result.address.includes('\\n')) {
      console.log('\\n✅ ADDRESS FORMAT IS CORRECT!')
    } else {
      console.log('\\n❌ Address format issue detected')
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

test()
`
    
    // Write the test script
    require('fs').writeFileSync('/tmp/test-address-parsing.ts', testScript)
    
    // Run with npx tsx
    console.log('🔄 Running TypeScript test with npx tsx...')
    
    const tsxProcess = spawn('npx', ['tsx', '/tmp/test-address-parsing.ts'], {
      cwd: '/Users/bahramchlaib/cryptic-wallet',
      stdio: 'inherit'
    })
    
    tsxProcess.on('close', (code) => {
      console.log(`\nProcess exited with code ${code}`)
    })
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message)
  }
}

testAddressParsingFix().catch(console.error)