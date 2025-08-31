const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Populating multi-network currencies...')

  // 1. Create base currencies
  const baseCurrencies = [
    {
      id: 'usdt_base',
      code: 'USDT',
      name: 'Tether USD',
      symbol: 'USDT',
      imageUrl: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
      coinGeckoId: 'tether',
      coinMarketCapId: '825',
      priority: 1
    },
    {
      id: 'btc_base',
      code: 'BTC',
      name: 'Bitcoin',
      symbol: 'BTC',
      imageUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
      coinGeckoId: 'bitcoin',
      coinMarketCapId: '1',
      priority: 2
    },
    {
      id: 'eth_base',
      code: 'ETH',
      name: 'Ethereum',
      symbol: 'ETH',
      imageUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
      coinGeckoId: 'ethereum',
      coinMarketCapId: '1027',
      priority: 3
    },
    {
      id: 'bnb_base',
      code: 'BNB',
      name: 'BNB',
      symbol: 'BNB',
      imageUrl: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      coinGeckoId: 'binancecoin',
      coinMarketCapId: '1839',
      priority: 4
    },
    {
      id: 'trx_base',
      code: 'TRX',
      name: 'TRON',
      symbol: 'TRX',
      imageUrl: 'https://cryptologos.cc/logos/tron-trx-logo.png',
      coinGeckoId: 'tron',
      coinMarketCapId: '1958',
      priority: 5
    },
    {
      id: 'matic_base',
      code: 'MATIC',
      name: 'Polygon',
      symbol: 'MATIC',
      imageUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
      coinGeckoId: 'matic-network',
      coinMarketCapId: '3890',
      priority: 6
    }
  ]

  console.log('📦 Creating base currencies...')
  for (const baseCurrency of baseCurrencies) {
    await prisma.baseCurrency.upsert({
      where: { id: baseCurrency.id },
      update: baseCurrency,
      create: baseCurrency
    })
    console.log(`✅ Created/Updated base currency: ${baseCurrency.code}`)
  }

  // 2. Ensure required networks exist
  const networks = [
    {
      id: 'bsc_network',
      code: 'BSC',
      name: 'BNB Smart Chain',
      tatumChainId: 'BSC',
      blockConfirmations: 12
    },
    {
      id: 'tron_network',
      code: 'TRON',
      name: 'TRON Network',
      tatumChainId: 'TRON',
      blockConfirmations: 19
    },
    {
      id: 'eth_network',
      code: 'ETH',
      name: 'Ethereum',
      tatumChainId: 'ETH',
      blockConfirmations: 12
    },
    {
      id: 'polygon_network',
      code: 'POLYGON',
      name: 'Polygon',
      tatumChainId: 'POLYGON',
      blockConfirmations: 30
    }
  ]

  console.log('🌐 Creating networks...')
  for (const network of networks) {
    await prisma.network.upsert({
      where: { id: network.id },
      update: network,
      create: network
    })
    console.log(`✅ Created/Updated network: ${network.name}`)
  }

  // 3. Create multi-network currencies
  const currencies = [
    // USDT variants
    {
      id: 'usdt_bsc',
      baseCurrencyId: 'usdt_base',
      networkId: 'bsc_network',
      contractAddress: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      isToken: true,
      tokenStandard: 'BEP-20',
      withdrawFee: 1.0
    },
    {
      id: 'usdt_tron',
      baseCurrencyId: 'usdt_base',
      networkId: 'tron_network',
      contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      decimals: 6,
      isToken: true,
      tokenStandard: 'TRC-20',
      withdrawFee: 1.0
    },
    {
      id: 'usdt_eth',
      baseCurrencyId: 'usdt_base',
      networkId: 'eth_network',
      contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      isToken: true,
      tokenStandard: 'ERC-20',
      withdrawFee: 10.0
    },
    {
      id: 'usdt_polygon',
      baseCurrencyId: 'usdt_base',
      networkId: 'polygon_network',
      contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
      isToken: true,
      tokenStandard: 'ERC-20',
      withdrawFee: 0.1
    },
    // Native coins
    {
      id: 'bnb_bsc',
      baseCurrencyId: 'bnb_base',
      networkId: 'bsc_network',
      contractAddress: null,
      decimals: 18,
      isToken: false,
      tokenStandard: null,
      withdrawFee: 0.0005
    },
    {
      id: 'trx_tron',
      baseCurrencyId: 'trx_base',
      networkId: 'tron_network',
      contractAddress: null,
      decimals: 6,
      isToken: false,
      tokenStandard: null,
      withdrawFee: 1.0
    },
    {
      id: 'eth_eth',
      baseCurrencyId: 'eth_base',
      networkId: 'eth_network',
      contractAddress: null,
      decimals: 18,
      isToken: false,
      tokenStandard: null,
      withdrawFee: 0.005
    },
    {
      id: 'matic_polygon',
      baseCurrencyId: 'matic_base',
      networkId: 'polygon_network',
      contractAddress: null,
      decimals: 18,
      isToken: false,
      tokenStandard: null,
      withdrawFee: 0.001
    }
  ]

  console.log('💰 Creating network-specific currencies...')
  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { id: currency.id },
      update: currency,
      create: currency
    })
    console.log(`✅ Created/Updated currency: ${currency.id}`)
  }

  // 4. Check final counts
  const baseCurrencyCount = await prisma.baseCurrency.count()
  const currencyCount = await prisma.currency.count()
  const networkCount = await prisma.network.count()

  console.log('📊 Final Summary:')
  console.log(`   Base Currencies: ${baseCurrencyCount}`)
  console.log(`   Network Currencies: ${currencyCount}`)
  console.log(`   Networks: ${networkCount}`)
  console.log('✨ Currency population completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error populating currencies:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })