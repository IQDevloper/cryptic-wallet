import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NetworkSeed {
  code: string
  name: string
  tatumChainId: string
  blockConfirmations: number
  isTestnet: boolean
}

interface CurrencySeed {
  code: string
  name: string
  symbol: string
  decimals: number
  isToken: boolean
  contractAddress?: string
  imageUrl: string
  networkCode: string
}

const networks: NetworkSeed[] = [
  { code: 'BTC', name: 'Bitcoin', tatumChainId: 'bitcoin', blockConfirmations: 6, isTestnet: false },
  { code: 'ETH', name: 'Ethereum', tatumChainId: 'ethereum', blockConfirmations: 12, isTestnet: false },
  { code: 'BSC', name: 'Binance Smart Chain', tatumChainId: 'bsc', blockConfirmations: 15, isTestnet: false },
  { code: 'TRX', name: 'TRON', tatumChainId: 'tron', blockConfirmations: 19, isTestnet: false },
  { code: 'MATIC', name: 'Polygon', tatumChainId: 'polygon', blockConfirmations: 30, isTestnet: false },
  { code: 'DOGE', name: 'Dogecoin', tatumChainId: 'dogecoin', blockConfirmations: 6, isTestnet: false },
  { code: 'LTC', name: 'Litecoin', tatumChainId: 'litecoin', blockConfirmations: 6, isTestnet: false },
  { code: 'BCH', name: 'Bitcoin Cash', tatumChainId: 'bcash', blockConfirmations: 6, isTestnet: false },
]

const currencies: CurrencySeed[] = [
  // Native Coins
  { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', decimals: 8, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/BTC.svg', networkCode: 'BTC' },
  { code: 'ETH', name: 'Ethereum', symbol: 'ETH', decimals: 18, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/ETH.svg', networkCode: 'ETH' },
  { code: 'BNB', name: 'Binance Coin', symbol: 'BNB', decimals: 18, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/BNB.svg', networkCode: 'BSC' },
  { code: 'TRX', name: 'TRON', symbol: 'TRX', decimals: 6, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/TRX.svg', networkCode: 'TRX' },
  { code: 'MATIC', name: 'Polygon', symbol: 'MATIC', decimals: 18, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/MATIC.svg', networkCode: 'MATIC' },
  { code: 'DOGE', name: 'Dogecoin', symbol: 'DOGE', decimals: 8, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/DOGE.svg', networkCode: 'DOGE' },
  { code: 'LTC', name: 'Litecoin', symbol: 'LTC', decimals: 8, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/LTC.svg', networkCode: 'LTC' },
  { code: 'BCH', name: 'Bitcoin Cash', symbol: 'BCH', decimals: 8, isToken: false, imageUrl: 'https://storage.cryptomus.com/currencies/BCH.svg', networkCode: 'BCH' },

  // Tokens
  { code: 'USDT_ERC20', name: 'USDT (ERC20)', symbol: 'USDT', decimals: 6, isToken: true, contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', networkCode: 'ETH' },
  { code: 'USDC_ERC20', name: 'USDC (ERC20)', symbol: 'USDC', decimals: 6, isToken: true, contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', imageUrl: 'https://storage.cryptomus.com/currencies/USDC.svg', networkCode: 'ETH' },
  { code: 'USDT_TRC20', name: 'USDT (TRC20)', symbol: 'USDT', decimals: 6, isToken: true, contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', networkCode: 'TRX' },
  { code: 'USDC_TRC20', name: 'USDC (TRC20)', symbol: 'USDC', decimals: 6, isToken: true, contractAddress: 'TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL', imageUrl: 'https://storage.cryptomus.com/currencies/USDC.svg', networkCode: 'TRX' },
  { code: 'USDT_BEP20', name: 'USDT (BEP20)', symbol: 'USDT', decimals: 6, isToken: true, contractAddress: '0x55d398326f99059fF775485246999027B3197955', imageUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', networkCode: 'BSC' },
]

async function main() {
  console.log('🌱 Starting database seed...')

  // Seed Networks
  console.log('📡 Seeding networks...')
  for (const networkData of networks) {
    await prisma.network.upsert({
      where: { code: networkData.code },
      update: networkData,
      create: networkData,
    })
  }

  // Seed Currencies
  console.log('💰 Seeding currencies...')
  for (const currencyData of currencies) {
    const network = await prisma.network.findUnique({
      where: { code: currencyData.networkCode }
    })

    if (!network) {
      throw new Error(`Network ${currencyData.networkCode} not found for currency ${currencyData.code}`)
    }

    await prisma.currency.upsert({
      where: { code: currencyData.code },
      update: {
        ...currencyData,
        networkId: network.id,
      },
      create: {
        ...currencyData,
        networkId: network.id,
      },
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`📊 Seeded ${networks.length} networks and ${currencies.length} currencies`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
