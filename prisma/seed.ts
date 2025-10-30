import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface NetworkSeed {
  code: string
  name: string
  tatumChainId: string
  type: 'EVM' | 'UTXO' | 'TRON'
  chainId?: number
  blockConfirmations: number
  isTestnet: boolean
}

interface AssetSeed {
  symbol: string
  name: string
  type: 'NATIVE' | 'TOKEN'
  logoUrl: string
  decimals: number
  coinGeckoId?: string
  priority: number
}

interface AssetNetworkSeed {
  assetSymbol: string
  networkCode: string
  contractAddress?: string
  decimals: number
  tokenStandard?: string
  minAmount: number
  withdrawalFee: number
}

const networks: NetworkSeed[] = [
  { code: 'bitcoin', name: 'Bitcoin', tatumChainId: 'bitcoin', type: 'UTXO', blockConfirmations: 6, isTestnet: false },
  { code: 'ethereum', name: 'Ethereum', tatumChainId: 'ethereum', type: 'EVM', chainId: 1, blockConfirmations: 12, isTestnet: false },
  { code: 'bsc', name: 'Binance Smart Chain', tatumChainId: 'bsc', type: 'EVM', chainId: 56, blockConfirmations: 15, isTestnet: false },
  { code: 'tron', name: 'TRON', tatumChainId: 'tron', type: 'TRON', blockConfirmations: 19, isTestnet: false },
  { code: 'polygon', name: 'Polygon', tatumChainId: 'polygon', type: 'EVM', chainId: 137, blockConfirmations: 30, isTestnet: false },
  { code: 'dogecoin', name: 'Dogecoin', tatumChainId: 'dogecoin', type: 'UTXO', blockConfirmations: 6, isTestnet: false },
  { code: 'litecoin', name: 'Litecoin', tatumChainId: 'litecoin', type: 'UTXO', blockConfirmations: 6, isTestnet: false },
  { code: 'bcash', name: 'Bitcoin Cash', tatumChainId: 'bcash', type: 'UTXO', blockConfirmations: 6, isTestnet: false },
]

const assets: AssetSeed[] = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/BTC.svg', decimals: 8, coinGeckoId: 'bitcoin', priority: 1 },
  { symbol: 'ETH', name: 'Ethereum', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/ETH.svg', decimals: 18, coinGeckoId: 'ethereum', priority: 2 },
  { symbol: 'USDT', name: 'Tether USD', type: 'TOKEN', logoUrl: 'https://storage.cryptomus.com/currencies/USDT.svg', decimals: 6, coinGeckoId: 'tether', priority: 3 },
  { symbol: 'USDC', name: 'USD Coin', type: 'TOKEN', logoUrl: 'https://storage.cryptomus.com/currencies/USDC.svg', decimals: 6, coinGeckoId: 'usd-coin', priority: 4 },
  { symbol: 'BNB', name: 'Binance Coin', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/BNB.svg', decimals: 18, coinGeckoId: 'binancecoin', priority: 5 },
  { symbol: 'TRX', name: 'TRON', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/TRX.svg', decimals: 6, coinGeckoId: 'tron', priority: 6 },
  { symbol: 'MATIC', name: 'Polygon', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/MATIC.svg', decimals: 18, coinGeckoId: 'matic-network', priority: 7 },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/DOGE.svg', decimals: 8, coinGeckoId: 'dogecoin', priority: 8 },
  { symbol: 'LTC', name: 'Litecoin', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/LTC.svg', decimals: 8, coinGeckoId: 'litecoin', priority: 9 },
  { symbol: 'BCH', name: 'Bitcoin Cash', type: 'NATIVE', logoUrl: 'https://storage.cryptomus.com/currencies/BCH.svg', decimals: 8, coinGeckoId: 'bitcoin-cash', priority: 10 },
]

const assetNetworks: AssetNetworkSeed[] = [
  // Native coins
  { assetSymbol: 'BTC', networkCode: 'bitcoin', decimals: 8, minAmount: 0.00001, withdrawalFee: 0.0005 },
  { assetSymbol: 'ETH', networkCode: 'ethereum', decimals: 18, minAmount: 0.01, withdrawalFee: 0.005 },
  { assetSymbol: 'BNB', networkCode: 'bsc', decimals: 18, minAmount: 0.01, withdrawalFee: 0.001 },
  { assetSymbol: 'TRX', networkCode: 'tron', decimals: 6, minAmount: 1, withdrawalFee: 1 },
  { assetSymbol: 'MATIC', networkCode: 'polygon', decimals: 18, minAmount: 0.1, withdrawalFee: 0.01 },
  { assetSymbol: 'DOGE', networkCode: 'dogecoin', decimals: 8, minAmount: 1, withdrawalFee: 1 },
  { assetSymbol: 'LTC', networkCode: 'litecoin', decimals: 8, minAmount: 0.001, withdrawalFee: 0.001 },
  { assetSymbol: 'BCH', networkCode: 'bcash', decimals: 8, minAmount: 0.001, withdrawalFee: 0.001 },
  // Tokens
  { assetSymbol: 'USDT', networkCode: 'ethereum', contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, tokenStandard: 'ERC-20', minAmount: 1, withdrawalFee: 5 },
  { assetSymbol: 'USDT', networkCode: 'tron', contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6, tokenStandard: 'TRC-20', minAmount: 1, withdrawalFee: 1 },
  { assetSymbol: 'USDT', networkCode: 'bsc', contractAddress: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, tokenStandard: 'BEP-20', minAmount: 1, withdrawalFee: 1 },
  { assetSymbol: 'USDC', networkCode: 'ethereum', contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, tokenStandard: 'ERC-20', minAmount: 1, withdrawalFee: 5 },
  { assetSymbol: 'USDC', networkCode: 'tron', contractAddress: 'TLBaRhANQoJFTqre9Nf1mjuwNWjCJeYqUL', decimals: 6, tokenStandard: 'TRC-20', minAmount: 1, withdrawalFee: 1 },
]

async function main() {
  console.log('🌱 Starting database seed...');

  // Delete in correct order to avoid foreign key constraints
  await prisma.paymentAddress.deleteMany()
  await prisma.merchantWallet.deleteMany()
  await prisma.systemWallet.deleteMany()
  await prisma.assetNetwork.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.network.deleteMany()

  console.log('🌱 Database cleared successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
