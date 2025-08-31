import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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

    const { networkCode, ...currencyWithoutNetworkCode } = currencyData
    await prisma.currency.upsert({
      where: { 
        baseCurrencyId_networkId: {
          baseCurrencyId: currencyWithoutNetworkCode.baseCurrencyId,
          networkId: network.id
        }
      },
      update: {
        ...currencyWithoutNetworkCode,
        networkId: network.id,
      },
      create: {
        ...currencyWithoutNetworkCode,
        networkId: network.id,
      },
    })
  }

  // Seed Test Admin User
  console.log('👤 Seeding admin user...')
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@crypticgateway.com' },
    update: {
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
    },
    create: {
      email: 'admin@crypticgateway.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  // Seed Test Merchant User and Merchant
  console.log('🏪 Seeding test merchant...')
  const merchantPassword = await bcrypt.hash('merchant123', 10)
  const merchantUser = await prisma.user.upsert({
    where: { email: 'test@merchant.com' },
    update: {
      name: 'Test Merchant',
      role: 'MERCHANT',
      emailVerified: true,
    },
    create: {
      email: 'test@merchant.com',
      name: 'Test Merchant',
      password: merchantPassword,
      role: 'MERCHANT',
      emailVerified: true,
    },
  })

  // Generate API key for merchant
  const apiKey = crypto.randomBytes(32).toString('hex')
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  const testMerchant = await prisma.merchant.upsert({
    where: { email: 'test@merchant.com' },
    update: {
      name: 'Test Merchant Account',
      businessName: 'Test Business Inc.',
      businessAddress: '123 Business St, City, State 12345',
      taxId: 'TAX123456789',
      apiKey: apiKey,
      apiKeyHash: apiKeyHash,
      webhookUrl: 'https://webhook.test-merchant.com/crypto-payments',
      webhookSecret: crypto.randomBytes(32).toString('hex'),
      isVerified: true,
    },
    create: {
      name: 'Test Merchant Account',
      email: 'test@merchant.com',
      businessName: 'Test Business Inc.',
      businessAddress: '123 Business St, City, State 12345',
      taxId: 'TAX123456789',
      apiKey: apiKey,
      apiKeyHash: apiKeyHash,
      webhookUrl: 'https://webhook.test-merchant.com/crypto-payments',
      webhookSecret: crypto.randomBytes(32).toString('hex'),
      isVerified: true,
      userId: merchantUser.id,
    },
  })

  // Create merchant settings
  console.log('⚙️ Creating merchant settings...')
  await prisma.merchantSettings.upsert({
    where: { merchantId: testMerchant.id },
    update: {
      emailNotifications: true,
      webhookNotifications: true,
      allowPartialPayments: true,
      autoConfirmPayments: true,
      minimumConfirmations: 3,
      brandColor: '#3B82F6',
      companyName: 'Test Business Inc.',
      supportEmail: 'support@test-merchant.com',
      businessType: 'e-commerce',
      businessCountry: 'US',
    },
    create: {
      merchantId: testMerchant.id,
      emailNotifications: true,
      webhookNotifications: true,
      allowPartialPayments: true,
      autoConfirmPayments: true,
      minimumConfirmations: 3,
      brandColor: '#3B82F6',
      companyName: 'Test Business Inc.',
      supportEmail: 'support@test-merchant.com',
      businessType: 'e-commerce',
      businessCountry: 'US',
    },
  })

  // Create wallets for the merchant for major currencies
  console.log('👛 Creating test merchant wallets...')
  const majorCurrencies = await prisma.currency.findMany({
    where: {
      code: {
        in: ['BTC', 'ETH', 'USDT_ERC20', 'USDT_TRC20', 'BNB']
      }
    }
  })

  for (const currency of majorCurrencies) {
    await prisma.wallet.upsert({
      where: {
        merchantId_currencyId: {
          merchantId: testMerchant.id,
          currencyId: currency.id,
        }
      },
      update: {
        tatumAccountId: `TATUM_${currency.code}_${testMerchant.id}`,
        balance: 0,
      },
      create: {
        merchantId: testMerchant.id,
        currencyId: currency.id,
        tatumAccountId: `TATUM_${currency.code}_${testMerchant.id}`,
        balance: 0,
      },
    })
  }

  // Create some sample address pools
  console.log('🏠 Creating sample address pools...')
  const btcNetwork = await prisma.network.findUnique({ where: { code: 'BTC' } })
  const ethNetwork = await prisma.network.findUnique({ where: { code: 'ETH' } })

  if (btcNetwork) {
    // Create some sample BTC addresses
    const btcAddresses = [
      'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      'bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c',
    ]

    for (let i = 0; i < btcAddresses.length; i++) {
      await prisma.addressPool.create({
        data: {
          address: btcAddresses[i],
          merchantId: testMerchant.id,
          networkId: btcNetwork.id,
          addressIndex: i,
          derivationPath: `m/44'/0'/0'/0/${i}`,
          status: 'AVAILABLE',
        },
      })
    }
  }

  if (ethNetwork) {
    // Create some sample ETH addresses
    const ethAddresses = [
      '0x742d35Cc7554C4c262B4C8e88e1e3A6b83e0C9B7',
      '0x8ba1f109551bD432803012645Hac136c7C0B1eB8',
      '0xE9C2b3C1E2C7C8A9e8E1B1F0F0D0E0F0A0B0C0D0',
    ]

    for (let i = 0; i < ethAddresses.length; i++) {
      await prisma.addressPool.create({
        data: {
          address: ethAddresses[i],
          merchantId: testMerchant.id,
          networkId: ethNetwork.id,
          addressIndex: i,
          derivationPath: `m/44'/60'/0'/0/${i}`,
          status: 'AVAILABLE',
        },
      })
    }
  }

  console.log('✅ Database seeded successfully!')
  console.log(`📊 Seeded ${networks.length} networks and ${currencies.length} currencies`)
  console.log(`👤 Created admin user: admin@crypticgateway.com (password: admin123)`)
  console.log(`🏪 Created test merchant: test@merchant.com (password: merchant123)`)
  console.log(`🔑 Test merchant API key: ${apiKey}`)
  console.log(`👛 Created ${majorCurrencies.length} wallets for test merchant`)
  console.log(`🏠 Created sample address pools for BTC and ETH networks`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
