import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/trpc';

async function testMerchantCreation() {
  console.log('🔍 Testing merchant creation with multi-network wallets...');
  
  try {
    // First, we need to create a user and get a session token
    console.log('📝 Creating test user...');
    
    const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'testpassword123',
        name: 'Test User'
      })
    });
    
    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.statusText}`);
    }
    
    const { token } = await registerResponse.json();
    console.log('✅ User created and logged in');
    
    // Now test merchant creation
    console.log('🏢 Creating merchant with multi-network wallets...');
    
    const merchantData = {
      name: 'Test Crypto Merchant',
      businessAddress: '123 Crypto Street',
      webhookUrl: 'https://example.com/webhook',
      isActive: true
    };
    
    const createResponse = await fetch(`${API_BASE}/merchant.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(merchantData)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Merchant creation failed: ${errorText}`);
    }
    
    const result = await createResponse.json();
    console.log('🎉 Merchant creation result:', JSON.stringify(result, null, 2));
    
    // Analyze the results
    const { walletsCreated, walletDetails } = result;
    
    console.log('\n📊 WALLET CREATION SUMMARY:');
    console.log(`Total wallets created: ${walletsCreated}`);
    
    const supportedWallets = walletDetails.filter(w => w.hasVirtualAccount);
    const unsupportedWallets = walletDetails.filter(w => !w.hasVirtualAccount);
    
    console.log(`✅ Supported currencies with Tatum virtual accounts: ${supportedWallets.length}`);
    supportedWallets.forEach(w => {
      console.log(`   - ${w.currency} on ${w.network} (Account: ${w.tatumAccountId})`);
    });
    
    console.log(`⚠️  Unsupported currencies with placeholder accounts: ${unsupportedWallets.length}`);
    unsupportedWallets.forEach(w => {
      console.log(`   - ${w.currency} on ${w.network} (Placeholder: ${w.tatumAccountId})`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testMerchantCreation()
  .then(success => {
    if (success) {
      console.log('\n🎉 Merchant creation test completed successfully!');
    } else {
      console.log('\n💥 Merchant creation test failed');
    }
    process.exit(success ? 0 : 1);
  });