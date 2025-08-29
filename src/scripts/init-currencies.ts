import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Base currencies configuration
const BASE_CURRENCIES = [
  {
    code: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    coinGeckoId: 'bitcoin',
    coinMarketCapId: '1',
    priority: 1,
  },
  {
    code: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    coinGeckoId: 'ethereum',
    coinMarketCapId: '1027',
    priority: 2,
  },
  {
    code: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    coinGeckoId: 'tether',
    coinMarketCapId: '825',
    priority: 3,
  },
]

// Networks configuration
const NETWORKS = [
  { id: 'bitcoin', name: 'Bitcoin', code: 'BTC', tatumChainId: 'BTC', isTestnet: false },
  { id: 'ethereum', name: 'Ethereum', code: 'ETH', tatumChainId: 'ETH', isTestnet: false },
  { id: 'bsc', name: 'BNB Smart Chain', code: 'BSC', tatumChainId: 'BSC', isTestnet: false },
  { id: 'tron', name: 'TRON', code: 'TRON', tatumChainId: 'TRON', isTestnet: false },
  { id: 'polygon', name: 'Polygon', code: 'MATIC', tatumChainId: 'MATIC', isTestnet: false },
]

// Currency variants configuration (matches Global HD Wallets)
const CURRENCY_VARIANTS = [
  // Bitcoin (native)
  {
    baseCurrencyCode: 'BTC',
    networkId: 'bitcoin',
    contractAddress: null,
    decimals: 8,
    isToken: false,
    tokenStandard: null,
    withdrawFee: 0.0005,
    minAmount: 0.00001,
    maxAmount: 100,
  },
  
  // Ethereum (native)
  {
    baseCurrencyCode: 'ETH',
    networkId: 'ethereum',
    contractAddress: null,
    decimals: 18,
    isToken: false,
    tokenStandard: null,
    withdrawFee: 0.005,
    minAmount: 0.001,
    maxAmount: 1000,
  },
  
  // USDT on Ethereum (ERC-20)
  {
    baseCurrencyCode: 'USDT',
    networkId: 'ethereum',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    isToken: true,
    tokenStandard: 'ERC-20',
    withdrawFee: 10.0,
    minAmount: 1.0,
    maxAmount: 100000,
  },
  
  // USDT on BSC (BEP-20)
  {
    baseCurrencyCode: 'USDT',
    networkId: 'bsc',
    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    isToken: true,
    tokenStandard: 'BEP-20',
    withdrawFee: 1.0,
    minAmount: 1.0,
    maxAmount: 100000,
  },
  
  // USDT on TRON (TRC-20)
  {
    baseCurrencyCode: 'USDT',
    networkId: 'tron',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    isToken: true,
    tokenStandard: 'TRC-20',
    withdrawFee: 1.0,
    minAmount: 1.0,
    maxAmount: 100000,
  },
  
  // USDT on Polygon (Polygon USDT)
  {
    baseCurrencyCode: 'USDT',
    networkId: 'polygon',
    contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    isToken: true,
    tokenStandard: 'ERC-20',
    withdrawFee: 0.1,
    minAmount: 1.0,
    maxAmount: 100000,
  },
]

async function initializeCurrencies() {
  console.log('🚀 Starting currency initialization...')
  
  try {
    // Check if currencies already exist
    const existingCurrencies = await prisma.currency.count()
    const existingBaseCurrencies = await prisma.baseCurrency.count()
    
    if (existingCurrencies > 0 || existingBaseCurrencies > 0) {
      console.log(`✅ Found ${existingBaseCurrencies} base currencies and ${existingCurrencies} currency variants`)
      console.log('   Skipping initialization to avoid duplicates')
      return
    }

    // 1. Create networks first (if they don't exist)
    console.log('📡 Creating networks...')
    for (const network of NETWORKS) {
      await prisma.network.upsert({
        where: { id: network.id },
        create: network,
        update: {},
      })
      console.log(`   ✅ ${network.name} (${network.code})`)
    }

    // 2. Create base currencies
    console.log('💰 Creating base currencies...')
    const baseCurrencyMap: Record<string, string> = {}
    
    for (const baseCurrency of BASE_CURRENCIES) {
      const created = await prisma.baseCurrency.create({
        data: baseCurrency,
      })
      baseCurrencyMap[baseCurrency.code] = created.id
      console.log(`   ✅ ${baseCurrency.name} (${baseCurrency.code})`)
    }

    // 3. Create currency variants
    console.log('🌐 Creating currency variants...')
    for (const variant of CURRENCY_VARIANTS) {
      const baseCurrencyId = baseCurrencyMap[variant.baseCurrencyCode]
      if (!baseCurrencyId) {
        console.error(`❌ Base currency not found: ${variant.baseCurrencyCode}`)
        continue
      }

      const currency = await prisma.currency.create({
        data: {
          baseCurrencyId,
          networkId: variant.networkId,
          contractAddress: variant.contractAddress,
          decimals: variant.decimals,
          isToken: variant.isToken,
          tokenStandard: variant.tokenStandard,
          withdrawFee: variant.withdrawFee,
          minAmount: variant.minAmount,
          maxAmount: variant.maxAmount,
          isActive: true,
        },
      })

      const displayName = variant.contractAddress 
        ? `${variant.baseCurrencyCode} (${variant.tokenStandard})`
        : variant.baseCurrencyCode
      
      console.log(`   ✅ ${displayName} on ${variant.networkId}`)
    }

    // 4. Verify creation
    const finalCurrencyCount = await prisma.currency.count({ where: { isActive: true } })
    const finalBaseCurrencyCount = await prisma.baseCurrency.count({ where: { isActive: true } })
    
    console.log(`\n🎉 Currency initialization complete!`)
    console.log(`   📊 Created ${finalBaseCurrencyCount} base currencies`)
    console.log(`   📊 Created ${finalCurrencyCount} currency variants`)
    console.log(`   ✅ Ready for merchant creation`)

    // 5. Show summary
    const currenciesWithDetails = await prisma.currency.findMany({
      include: {
        baseCurrency: true,
        network: true,
      },
      where: { isActive: true },
    })

    console.log('\n📋 Available currencies:')
    currenciesWithDetails.forEach(currency => {
      const displayName = currency.contractAddress 
        ? `${currency.baseCurrency.code} (${currency.network.name})`
        : currency.baseCurrency.code
      console.log(`   - ${displayName}`)
    })
    
  } catch (error) {
    console.error('❌ Failed to initialize currencies:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  initializeCurrencies()
}

export { initializeCurrencies }