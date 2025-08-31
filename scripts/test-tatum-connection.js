const { TatumVirtualAccountManager } = require('../src/lib/tatum/client.ts')

async function testTatumConnection() {
  console.log('🔍 Testing Tatum API connection...')
  
  const tatumVAManager = new TatumVirtualAccountManager()
  
  try {
    console.log('🔄 Attempting to create virtual account for BSC...')
    const account = await tatumVAManager.createVirtualAccount('BSC', 'test-merchant-123')
    console.log('✅ SUCCESS: Virtual account created:', account.id)
    return true
  } catch (error) {
    console.error('❌ FAILED:', error.message)
    return false
  }
}

testTatumConnection()
  .then((success) => {
    if (success) {
      console.log('🎉 Tatum API connection working!')
    } else {
      console.log('💥 Tatum API connection failed - check API key and endpoint')
    }
    process.exit(success ? 0 : 1)
  })