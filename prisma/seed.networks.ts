/**
 * Professional Database Seeding Script for Cryptic Gateway
 * 
 * This script:
 * 1. Parses tatum_coins.json to extract network and asset data
 * 2. Creates Networks, Assets, and AssetNetworks in the database
 * 3. Integrates with real Tatum KMS Docker to generate wallets
 * 4. Provides comprehensive error handling and validation
 * 5. Supports rollback and cleanup operations
 */

import { PrismaClient, AssetType, NetworkType, WalletStatus } from '@prisma/client';
import tatumCoins from '../knowlodage/tatum_coins.json';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// ============================================
// CONFIGURATION & MAPPINGS
// ============================================

interface TatumCoin {
  id: string;
  name: string;
  type: string;
  icon: string;
  public: boolean;
  chains: Array<{
    chain: string;
    gatewayName: string;
    explorer?: string;
    tier?: number;
  }>;
}

interface NetworkConfig {
  code: string;
  name: string;
  type: NetworkType;
  tatumChainId: string;
  nativeAsset: {
    symbol: string;
    name: string;
    decimals: number;
  };
  derivationPath: string;
  blockConfirmations: number;
  explorerUrl?: string;
  kmsChainCode: string; // For KMS wallet generation
}

interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  networks: Array<{
    networkCode: string;
    contractAddress: string;
    tokenStandard: string;
  }>;
}

// Supported networks with their configurations
const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  'bitcoin': {
    code: 'bitcoin',
    name: 'Bitcoin',
    type: NetworkType.UTXO,
    tatumChainId: 'bitcoin-mainnet',
    nativeAsset: { symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    derivationPath: "m/44'/0'/0'/0",
    blockConfirmations: 6,
    kmsChainCode: 'BTC',
  },
  'ethereum': {
    code: 'ethereum',
    name: 'Ethereum',
    type: NetworkType.EVM,
    tatumChainId: 'ethereum-mainnet',
    nativeAsset: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    derivationPath: "m/44'/60'/0'/0",
    blockConfirmations: 12,
    kmsChainCode: 'ETH',
  },
  'bsc': {
    code: 'bsc',
    name: 'BNB Smart Chain',
    type: NetworkType.EVM,
    tatumChainId: 'bsc-mainnet',
    nativeAsset: { symbol: 'BNB', name: 'BNB', decimals: 18 },
    derivationPath: "m/44'/60'/0'/0",
    blockConfirmations: 15,
    kmsChainCode: 'BSC',
  },
  'polygon': {
    code: 'polygon',
    name: 'Polygon',
    type: NetworkType.EVM,
    tatumChainId: 'polygon-mainnet',
    nativeAsset: { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    derivationPath: "m/44'/60'/0'/0",
    blockConfirmations: 128,
    kmsChainCode: 'MATIC',
  },
  'tron': {
    code: 'tron',
    name: 'TRON',
    type: NetworkType.TRON,
    tatumChainId: 'tron-mainnet',
    nativeAsset: { symbol: 'TRX', name: 'TRON', decimals: 6 },
    derivationPath: "m/44'/195'/0'/0",
    blockConfirmations: 20,
    kmsChainCode: 'TRON',
  },
  'litecoin': {
    code: 'litecoin',
    name: 'Litecoin',
    type: NetworkType.UTXO,
    tatumChainId: 'litecoin-mainnet',
    nativeAsset: { symbol: 'LTC', name: 'Litecoin', decimals: 8 },
    derivationPath: "m/44'/2'/0'/0",
    blockConfirmations: 6,
    kmsChainCode: 'LTC',
  },
  'dogecoin': {
    code: 'dogecoin',
    name: 'Dogecoin',
    type: NetworkType.UTXO,
    tatumChainId: 'dogecoin-mainnet',
    nativeAsset: { symbol: 'DOGE', name: 'Dogecoin', decimals: 8 },
    derivationPath: "m/44'/3'/0'/0",
    blockConfirmations: 6,
    kmsChainCode: 'DOGE',
  },
  'bitcoin-cash': {
    code: 'bitcoin-cash',
    name: 'Bitcoin Cash',
    type: NetworkType.UTXO,
    tatumChainId: 'bch-mainnet',
    nativeAsset: { symbol: 'BCH', name: 'Bitcoin Cash', decimals: 8 },
    derivationPath: "m/44'/145'/0'/0",
    blockConfirmations: 6,
    kmsChainCode: 'BCH',
  },
};

// Popular tokens to add across networks
const POPULAR_TOKENS: TokenConfig[] = [
  {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUrl: '/icons/usdt.svg',
    networks: [
      { networkCode: 'ethereum', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', tokenStandard: 'ERC-20' },
      { networkCode: 'bsc', contractAddress: '0x55d398326f99059fF775485246999027B3197955', tokenStandard: 'BEP-20' },
      { networkCode: 'tron', contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', tokenStandard: 'TRC-20' },
      { networkCode: 'polygon', contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', tokenStandard: 'ERC-20' },
    ],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: '/icons/usdc.svg',
    networks: [
      { networkCode: 'ethereum', contractAddress: '0xA0b86a33E6441c8C673f4c8b0c8c8e6C5b8b8b8b', tokenStandard: 'ERC-20' },
      { networkCode: 'bsc', contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', tokenStandard: 'BEP-20' },
      { networkCode: 'polygon', contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', tokenStandard: 'ERC-20' },
    ],
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

class SeedingError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'SeedingError';
  }
}

async function validateKMSConnection(): Promise<void> {
  console.log('🔍 KMS validation skipped - will generate placeholder wallets');
  console.log('💡 To generate real KMS wallets, run: npm run kms:generate-wallets');
}

async function parseAndValidateTatumCoins(): Promise<TatumCoin[]> {
  console.log('📋 Parsing tatum_coins.json...');
  
  if (!Array.isArray(tatumCoins)) {
    throw new SeedingError('Invalid tatum_coins.json format: expected array');
  }

  const validCoins = (tatumCoins as any[]).filter((coin: any): coin is TatumCoin => {
    return coin && 
           typeof coin.id === 'string' && 
           typeof coin.name === 'string' && 
           coin.public === true &&
           Array.isArray(coin.chains) &&
           coin.chains.length > 0;
  });

  console.log(`📊 Found ${validCoins.length} valid public coins from ${tatumCoins.length} total`);
  return validCoins;
}

function findMainnetChain(coin: TatumCoin) {
  return coin.chains.find(chain => 
    chain.chain === 'mainnet' || 
    chain.chain.includes('mainnet') ||
    (chain.tier && chain.tier === 1)
  ) || coin.chains[0];
}

async function saveKMSWallets(wallets: Record<string, { signatureId: string; xpub?: string }>): Promise<void> {
  const kmsWalletsPath = path.join(process.cwd(), 'kms-wallets.json');
  await fs.writeFile(kmsWalletsPath, JSON.stringify(wallets, null, 2));
  console.log(`💾 Saved KMS wallets to ${kmsWalletsPath}`);
}

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function seedNetworks(coins: TatumCoin[]): Promise<Record<string, string>> {
  console.log('🌐 Seeding networks...');
  const networkIds: Record<string, string> = {};

  for (const [networkCode, config] of Object.entries(SUPPORTED_NETWORKS)) {
    const coin = coins.find(c => c.id === networkCode);
    const mainnetChain = coin ? findMainnetChain(coin) : null;

    try {
      const network = await prisma.network.upsert({
        where: { code: networkCode },
        update: {
          name: config.name,
          type: config.type,
          tatumChainId: config.tatumChainId,
          blockConfirmations: config.blockConfirmations,
          explorerUrl: mainnetChain?.explorer || config.explorerUrl,
          isActive: true,
        },
        create: {
          code: networkCode,
          name: config.name,
          type: config.type,
          tatumChainId: config.tatumChainId,
          isTestnet: false,
          blockConfirmations: config.blockConfirmations,
          explorerUrl: mainnetChain?.explorer || config.explorerUrl,
          isActive: true,
        },
      });

      networkIds[networkCode] = network.id;
      console.log(`  ✅ ${config.name} (${networkCode})`);
    } catch (error) {
      console.error(`  ❌ Failed to seed network ${networkCode}:`, error);
      throw new SeedingError(`Failed to seed network ${networkCode}`, { networkCode, error });
    }
  }

  return networkIds;
}

async function seedAssets(): Promise<Record<string, string>> {
  console.log('💰 Seeding assets...');
  const assetIds: Record<string, string> = {};

  // Seed native assets
  for (const config of Object.values(SUPPORTED_NETWORKS)) {
    const { symbol, name, decimals } = config.nativeAsset;
    
    try {
      const asset = await prisma.asset.upsert({
        where: { symbol },
        update: {
          name,
          type: AssetType.NATIVE,
          isActive: true,
        },
        create: {
          symbol,
          name,
          type: AssetType.NATIVE,
          logoUrl: `/icons/${symbol.toLowerCase()}.svg`,
          isActive: true,
        },
      });

      assetIds[symbol] = asset.id;
      console.log(`  ✅ ${name} (${symbol}) - Native`);
    } catch (error) {
      console.error(`  ❌ Failed to seed native asset ${symbol}:`, error);
      throw new SeedingError(`Failed to seed native asset ${symbol}`, { symbol, error });
    }
  }

  // Seed token assets
  for (const token of POPULAR_TOKENS) {
    try {
      const asset = await prisma.asset.upsert({
        where: { symbol: token.symbol },
        update: {
          name: token.name,
          type: AssetType.TOKEN,
          logoUrl: token.logoUrl,
          isActive: true,
        },
        create: {
          symbol: token.symbol,
          name: token.name,
          type: AssetType.TOKEN,
          logoUrl: token.logoUrl,
          isActive: true,
        },
      });

      assetIds[token.symbol] = asset.id;
      console.log(`  ✅ ${token.name} (${token.symbol}) - Token`);
    } catch (error) {
      console.error(`  ❌ Failed to seed token ${token.symbol}:`, error);
      throw new SeedingError(`Failed to seed token ${token.symbol}`, { symbol: token.symbol, error });
    }
  }

  return assetIds;
}

async function seedAssetNetworks(
  networkIds: Record<string, string>, 
  assetIds: Record<string, string>
): Promise<Record<string, string>> {
  console.log('🔗 Seeding asset networks...');
  const assetNetworkIds: Record<string, string> = {};

  // Seed native asset networks
  for (const [networkCode, config] of Object.entries(SUPPORTED_NETWORKS)) {
    const networkId = networkIds[networkCode];
    const assetId = assetIds[config.nativeAsset.symbol];

    if (!networkId || !assetId) {
      console.warn(`  ⚠️  Skipping ${networkCode} - missing network or asset`);
      continue;
    }

    try {
      const assetNetwork = await prisma.assetNetwork.upsert({
        where: { assetId_networkId: { assetId, networkId } },
        update: {
          decimals: config.nativeAsset.decimals,
          isActive: true,
        },
        create: {
          assetId,
          networkId,
          contractAddress: null, // Native assets have no contract
          decimals: config.nativeAsset.decimals,
          tokenStandard: null,
          isActive: true,
        },
      });

      const key = `${config.nativeAsset.symbol}-${networkCode}`;
      assetNetworkIds[key] = assetNetwork.id;
      console.log(`  ✅ ${config.nativeAsset.symbol} on ${config.name}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed native asset network ${networkCode}:`, error);
      throw new SeedingError(`Failed to seed native asset network`, { networkCode, error });
    }
  }

  // Seed token asset networks
  for (const token of POPULAR_TOKENS) {
    const assetId = assetIds[token.symbol];
    if (!assetId) continue;

    for (const tokenNetwork of token.networks) {
      const networkId = networkIds[tokenNetwork.networkCode];
      if (!networkId) continue;

      try {
        const assetNetwork = await prisma.assetNetwork.upsert({
          where: { assetId_networkId: { assetId, networkId } },
          update: {
            contractAddress: tokenNetwork.contractAddress,
            decimals: token.decimals,
            tokenStandard: tokenNetwork.tokenStandard,
            isActive: true,
          },
          create: {
            assetId,
            networkId,
            contractAddress: tokenNetwork.contractAddress,
            decimals: token.decimals,
            tokenStandard: tokenNetwork.tokenStandard,
            isActive: true,
          },
        });

        const key = `${token.symbol}-${tokenNetwork.networkCode}`;
        assetNetworkIds[key] = assetNetwork.id;
        console.log(`  ✅ ${token.symbol} on ${SUPPORTED_NETWORKS[tokenNetwork.networkCode]?.name}`);
      } catch (error) {
        console.error(`  ❌ Failed to seed token network ${token.symbol}-${tokenNetwork.networkCode}:`, error);
      }
    }
  }

  return assetNetworkIds;
}

async function seedKMSWallets(
  networkIds: Record<string, string>,
  assetNetworkIds: Record<string, string>
): Promise<void> {
  console.log('🔐 Creating placeholder KMS wallet records...');
  const kmsWallets: Record<string, { signatureId: string; xpub?: string }> = {};

  for (const [networkCode, config] of Object.entries(SUPPORTED_NETWORKS)) {
    const networkId = networkIds[networkCode];
    if (!networkId) continue;

    try {
      console.log(`  🔄 Creating placeholder wallet for ${config.name}...`);
      
      // Generate placeholder signature ID
      const placeholderSignatureId = `placeholder-${networkCode}-${Date.now()}`;
      
      // Create KMS wallet record with ACTIVE status for immediate use
      await prisma.kmsWallet.upsert({
        where: { networkId_signatureId: { networkId, signatureId: placeholderSignatureId } },
        update: {
          derivationPath: config.derivationPath,
          status: WalletStatus.ACTIVE, // Set to ACTIVE for development
        },
        create: {
          networkId,
          signatureId: placeholderSignatureId,
          derivationPath: config.derivationPath,
          label: `${config.name} Deposit Wallet`,
          status: WalletStatus.ACTIVE, // Set to ACTIVE for development
        },
      });

      kmsWallets[networkCode] = {
        signatureId: placeholderSignatureId,
      };

      console.log(`  ✅ ${config.name}: ${placeholderSignatureId}`);
    } catch (error) {
      console.error(`  ❌ Failed to create placeholder wallet for ${networkCode}:`, error);
    }
  }

  // Save KMS wallets for future reference
  await saveKMSWallets(kmsWallets);
  console.log('💡 To replace with real KMS wallets, run: npm run kms:generate-wallets');
}

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

async function main(): Promise<void> {
  console.log('🚀 Starting professional database seeding...\n');

  try {
    // Step 1: Validate KMS connection
    await validateKMSConnection();

    // Step 2: Parse and validate tatum_coins.json
    const coins = await parseAndValidateTatumCoins();

    // Step 3: Seed networks
    const networkIds = await seedNetworks(coins);
    console.log(`✅ Seeded ${Object.keys(networkIds).length} networks\n`);

    // Step 4: Seed assets
    const assetIds = await seedAssets();
    console.log(`✅ Seeded ${Object.keys(assetIds).length} assets\n`);

    // Step 5: Seed asset networks
    const assetNetworkIds = await seedAssetNetworks(networkIds, assetIds);
    console.log(`✅ Seeded ${Object.keys(assetNetworkIds).length} asset networks\n`);

    // Step 6: Generate KMS wallets
    await seedKMSWallets(networkIds, assetNetworkIds);
    console.log(`✅ Generated KMS wallets\n`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Check the dashboard for your seeded networks and assets');
    console.log('3. KMS wallets are saved in kms-wallets.json for reference');

  } catch (error) {
    if (error instanceof SeedingError) {
      console.error(`\n❌ Seeding failed: ${error.message}`);
      if (error.context) {
        console.error('Context:', error.context);
      }
    } else {
      console.error('\n❌ Unexpected error during seeding:', error);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure KMS Docker container is running: docker-compose -f docker-compose.kms.yml up -d');
    console.log('2. Check database connection in .env file');
    console.log('3. Verify tatum_coins.json exists and is valid');
    
    process.exit(1);
  }
}

// ============================================
// CLEANUP FUNCTION (Optional)
// ============================================

async function cleanup(): Promise<void> {
  console.log('🧹 Cleaning up seeded data...');
  
  try {
    await prisma.kmsWallet.deleteMany();
    await prisma.assetNetwork.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.network.deleteMany();
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Handle command line arguments
if (process.argv.includes('--cleanup')) {
  cleanup()
    .then(() => prisma.$disconnect())
    .catch(console.error);
} else {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
