#!/usr/bin/env node

/**
 * Test KMS address generation with correct command
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function testKMSAddressGeneration() {
  console.log('🧪 Testing KMS address generation...\n')
  
  try {
    // Get a BSC wallet signature ID for testing
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
      return
    }
    
    console.log(`📋 Testing with BSC wallet:`)
    console.log(`   Signature ID: ${bscWallet.signatureId}`)
    console.log(`   Next Index: ${bscWallet.nextAddressIndex}`)
    
    // Test the correct KMS command
    const derivationIndex = 0
    const command = `docker run --rm --env-file .env.kms -v ./kms-data:/home/node/.tatumrc tatumio/tatum-kms getaddress ${bscWallet.signatureId} ${derivationIndex}`
    
    console.log(`\n🔄 Running command:`)
    console.log(`   ${command}`)
    
    const { stdout, stderr } = await execAsync(command)
    
    // Filter out warnings
    const errorLines = stderr
      ? stderr
          .split('\n')
          .filter(
            (line) =>
              !line.includes("WARNING: The requested image's platform") &&
              !line.includes('Secp256k1 bindings are not compiled') &&
              !line.includes('bigint: Failed to load bindings') &&
              !line.includes('pure JS will be used') &&
              line.trim() !== '',
          )
      : []

    if (errorLines.length > 0) {
      console.log(`❌ Errors:`, errorLines.join('\n'))
      return
    }
    
    const address = stdout.trim()
    console.log(`\n✅ Generated address: ${address}`)
    console.log(`   Address length: ${address.length}`)
    console.log(`   Signature ID: ${bscWallet.signatureId}_${derivationIndex}`)
    
    // Test if it looks like a valid BSC address
    if (address.startsWith('0x') && address.length === 42) {
      console.log(`✅ Valid BSC/Ethereum format address`)
    } else {
      console.log(`⚠️  Unexpected address format`)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.message.includes('Command failed:')) {
      console.log('\n💡 If you see "Unsupported command", make sure you have the latest Tatum KMS image')
      console.log('   Try: docker pull tatumio/tatum-kms:latest')
    }
  }
}

testKMSAddressGeneration().catch(console.error)