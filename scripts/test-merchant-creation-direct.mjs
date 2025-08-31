import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api/trpc';

async function testMerchantCreation() {
  console.log('🔍 Testing improved merchant creation with batch virtual account creation...');
  
  try {
    // Test the merchant creation directly via tRPC
    console.log('🏢 Creating merchant with multi-network wallets...');
    
    const merchantData = {
      name: 'Test Crypto Merchant Batch',
      businessAddress: '123 Crypto Street',
      webhookUrl: 'https://example.com/webhook',
      isActive: true
    };
    
    // Create merchant via tRPC endpoint
    const createResponse = await fetch(`${API_BASE}/merchant.create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: merchantData
      })
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ HTTP Error Response:', errorText);
      throw new Error(`Merchant creation failed: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const responseData = await createResponse.json();
    console.log('🎉 Raw API Response:', JSON.stringify(responseData, null, 2));
    
    // Extract the actual result from tRPC format
    const result = responseData.result?.data?.json || responseData.result?.data;
    
    if (!result) {
      console.error('❌ No result data in response');
      return false;
    }
    
    // Analyze the results
    const { walletsCreated, walletDetails, message } = result;
    
    console.log('\n📊 WALLET CREATION SUMMARY:');
    console.log(`Message: ${message}`);
    console.log(`Total wallets created: ${walletsCreated}`);
    
    const supportedWallets = walletDetails.filter(w => w.hasVirtualAccount);
    const unsupportedWallets = walletDetails.filter(w => !w.hasVirtualAccount);
    
    console.log(`\n✅ SUPPORTED CURRENCIES with Tatum virtual accounts: ${supportedWallets.length}`);
    supportedWallets.forEach(w => {
      console.log(`   - ${w.currency} on ${w.network} (Account: ${w.tatumAccountId})`);
    });
    
    console.log(`\n⚠️  UNSUPPORTED CURRENCIES with placeholder accounts: ${unsupportedWallets.length}`);
    unsupportedWallets.forEach(w => {
      console.log(`   - ${w.currency} on ${w.network} (Placeholder: ${w.tatumAccountId})`);
    });
    
    // Success criteria
    const hasRealAccounts = supportedWallets.length > 0;
    const handledUnsupported = unsupportedWallets.every(w => w.tatumAccountId.startsWith('unsupported_'));
    const totalExpected = supportedWallets.length + unsupportedWallets.length;
    
    console.log('\n🔍 VALIDATION:');
    console.log(`✓ Has real Tatum accounts: ${hasRealAccounts}`);
    console.log(`✓ Properly handled unsupported: ${handledUnsupported}`);
    console.log(`✓ Total wallets match expected: ${walletsCreated === totalExpected}`);
    
    const isSuccess = hasRealAccounts && handledUnsupported && walletsCreated === totalExpected;
    
    if (isSuccess) {
      console.log('\n🎉 SUCCESS: Improved merchant creation working perfectly!');
      console.log('   - Batch creation of virtual accounts is working');
      console.log('   - Proper handling of unsupported currencies');
      console.log('   - All wallet records created successfully');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some issues detected');
    }
    
    return isSuccess;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testMerchantCreation()
  .then(success => {
    if (success) {
      console.log('\n🎉 Merchant creation test completed successfully!');
    } else {
      console.log('\n💥 Merchant creation test failed or had issues');
    }
    process.exit(success ? 0 : 1);
  });