import { hdWalletManager } from '../src/lib/hdwallet/manager.ts'

async function initializeGlobalWallets() {
  console.log('🚀 Starting global HD wallet initialization...')
  
  try {
    await hdWalletManager.initializeGlobalWallets()
    console.log('✅ Global HD wallets initialized successfully!')
  } catch (error) {
    console.error('❌ Failed to initialize global HD wallets:', error)
    process.exit(1)
  }
}

initializeGlobalWallets()