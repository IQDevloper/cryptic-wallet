import { hdWalletManager } from '../lib/hdwallet/manager'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function initializeGlobalWallets() {
  console.log('🚀 Starting global HD wallet initialization...')
  
  try {
    // Check if any global wallets already exist
    const existingWallets = await prisma.globalHDWallet.count()
    
    if (existingWallets > 0) {
      console.log(`✅ Found ${existingWallets} existing global wallets, skipping initialization`)
      return
    }
    
    await hdWalletManager.initializeGlobalWallets()
    console.log('✅ Global HD wallets initialized successfully!')
    
    // Show created wallets
    const wallets = await prisma.globalHDWallet.findMany({
      select: {
        currency: true,
        network: true,
        contractAddress: true,
        status: true
      }
    })
    
    console.log('\n📊 Created Global HD Wallets:')
    wallets.forEach(wallet => {
      const displayName = wallet.contractAddress 
        ? `${wallet.currency} (${wallet.network.toUpperCase()})` 
        : wallet.currency
      console.log(`   - ${displayName}`)
    })
    
  } catch (error) {
    console.error('❌ Failed to initialize global HD wallets:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

initializeGlobalWallets()
