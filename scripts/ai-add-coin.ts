/**
 * 🤖 AI-Powered Coin Addition Tool
 *
 * This tool uses AI (Claude) to intelligently add new cryptocurrencies to the system.
 * It automatically researches coin details, determines network type, and configures everything.
 *
 * Usage:
 *   npm run ai:add-coin
 *
 * Features:
 * - AI research for coin details (decimals, contract addresses, network type)
 * - Automatic network detection (EVM, UTXO, TRON, SOLANA)
 * - Smart derivation path selection
 * - KMS wallet generation (optional)
 * - Database seeding with full validation
 * - Support for both native coins and tokens
 */

import { PrismaClient, NetworkType, AssetType, WalletStatus, WalletPurpose } from '@prisma/client';
import { spawn } from 'child_process';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const rl = readline.createInterface({ input, output });

// ============================================
// AI-POWERED COIN RESEARCH STRUCTURE
// ============================================

/**
 * This structure defines what the AI needs to research about a coin
 */
interface CoinResearchPrompt {
  symbol: string;           // e.g., "SOL", "AVAX", "DOT"
  userDescription?: string; // Optional user hints
}

/**
 * Expected AI response structure for coin details
 */
interface AIResearchedCoin {
  // Basic Info
  symbol: string;
  name: string;
  description: string;

  // Network Classification
  networkType: 'EVM' | 'UTXO' | 'TRON' | 'SOLANA' | 'POLKADOT' | 'COSMOS';
  isNative: boolean; // true = native coin (BTC, ETH), false = token (USDT, USDC)

  // Technical Details
  decimals: number;
  derivationPath: string;
  coinType: number; // BIP44 coin type (0=BTC, 60=ETH, 501=SOL, etc.)

  // Network Info (for native coins)
  chainName?: string;        // "Solana", "Avalanche", "Polkadot"
  tatumChainId?: string;     // "solana-mainnet", "avalanche-mainnet"
  explorerUrl?: string;      // "https://explorer.solana.com"
  blockConfirmations?: number; // 32 for Solana, 12 for ETH, etc.

  // Token Info (for ERC-20, BEP-20, etc.)
  networks?: Array<{
    networkCode: string;     // "ethereum", "bsc", "polygon"
    contractAddress: string; // "0xabc..."
    tokenStandard: string;   // "ERC-20", "BEP-20", "TRC-20"
  }>;

  // Logos & Branding
  logoUrl?: string;

  // Tatum Support
  tatumSupported: boolean;
  kmsChainCode?: string; // "SOL", "AVAX", "DOT" for KMS
}

/**
 * Network configuration templates
 */
interface NetworkTemplate {
  type: NetworkType;
  derivationPathTemplate: string;
  defaultConfirmations: number;
  tatumChainFormat: (name: string) => string;
}

const NETWORK_TEMPLATES: Record<string, NetworkTemplate> = {
  EVM: {
    type: NetworkType.EVM,
    derivationPathTemplate: "m/44'/60'/0'/0", // All EVM chains use ETH derivation
    defaultConfirmations: 12,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  },
  UTXO: {
    type: NetworkType.UTXO,
    derivationPathTemplate: "m/44'/{coinType}'/0'/0",
    defaultConfirmations: 6,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  },
  TRON: {
    type: NetworkType.TRON,
    derivationPathTemplate: "m/44'/195'/0'/0",
    defaultConfirmations: 19,
    tatumChainFormat: () => 'tron-mainnet',
  },
  SOLANA: {
    type: NetworkType.SOLANA,
    derivationPathTemplate: "m/44'/501'/0'/0'",
    defaultConfirmations: 32,
    tatumChainFormat: () => 'solana-mainnet',
  },
  // Map other blockchain types to closest match
  ALGORAND: {
    type: NetworkType.SOLANA, // Similar architecture: fast finality, native smart contracts
    derivationPathTemplate: "m/44'/283'/0'/0/0",
    defaultConfirmations: 1,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  },
  POLKADOT: {
    type: NetworkType.SOLANA, // Similar: substrate-based, native
    derivationPathTemplate: "m/44'/354'/0'/0/0",
    defaultConfirmations: 2,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  },
  COSMOS: {
    type: NetworkType.SOLANA, // Similar: native blockchain with fast finality
    derivationPathTemplate: "m/44'/118'/0'/0/0",
    defaultConfirmations: 1,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  },
};

/**
 * Get network template with fallback
 */
function getNetworkTemplate(networkType: string): NetworkTemplate {
  // Try exact match first
  if (NETWORK_TEMPLATES[networkType]) {
    return NETWORK_TEMPLATES[networkType];
  }

  // Check if it's an EVM-compatible chain
  const evmChains = ['ETHEREUM', 'BSC', 'POLYGON', 'AVALANCHE', 'ARBITRUM', 'OPTIMISM', 'BASE', 'FANTOM', 'CRONOS'];
  if (evmChains.includes(networkType.toUpperCase())) {
    return NETWORK_TEMPLATES.EVM;
  }

  // Check if it's a UTXO-based chain
  const utxoChains = ['BITCOIN', 'LITECOIN', 'DOGECOIN', 'BITCOINCASH', 'DASH', 'ZCASH'];
  if (utxoChains.includes(networkType.toUpperCase())) {
    return NETWORK_TEMPLATES.UTXO;
  }

  // Default fallback to SOLANA template for unknown native blockchains
  console.log(`⚠️  Unknown network type "${networkType}", using SOLANA template as fallback`);
  return {
    type: NetworkType.SOLANA,
    derivationPathTemplate: "m/44'/0'/0'/0/0", // Generic BIP44 path
    defaultConfirmations: 6,
    tatumChainFormat: (name) => `${name.toLowerCase()}-mainnet`,
  };
}

// ============================================
// AI RESEARCH FUNCTION (SIMULATED)
// ============================================

/**
 * Call Claude AI to research coin details
 */
async function aiResearchCoin(prompt: CoinResearchPrompt): Promise<AIResearchedCoin> {
  console.log(`\n🤖 AI Research Mode Activated...`);
  console.log(`📊 Researching: ${prompt.symbol}`);
  console.log(`💡 Hint: ${prompt.userDescription || 'None provided'}\n`);

  // ============================================
  // CLAUDE AI INTEGRATION
  // ============================================

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const aiPrompt = `You are a cryptocurrency expert assistant. Research the following cryptocurrency and provide complete technical details.

Cryptocurrency Symbol: ${prompt.symbol}
User Description: ${prompt.userDescription || 'Not provided'}

Please research and provide:

1. **Basic Information**:
   - Full name of the cryptocurrency
   - Brief description (1-2 sentences)
   - Is it a native blockchain coin or a token on another chain?

2. **Network Classification**:
   - Network type: EVM, UTXO, TRON, SOLANA, POLKADOT, or COSMOS
   - If it's a token, which networks is it available on? (Ethereum, BSC, Polygon, etc.)

3. **Technical Specifications**:
   - Number of decimals (precision)
   - BIP44 coin type number (if native coin)
   - Derivation path
   - Block confirmation requirements

4. **Contract Addresses** (if token):
   - Ethereum (ERC-20): contract address
   - BSC (BEP-20): contract address
   - Polygon (Polygon): contract address
   - Tron (TRC-20): contract address
   - Token standard for each network

5. **Blockchain Details** (if native):
   - Chain name
   - Explorer URL
   - Tatum chain ID format

6. **Tatum Support**:
   - Is this coin/token supported by Tatum API?
   - What's the KMS chain code for wallet generation?

Return the data in this exact JSON format (respond ONLY with the JSON, no markdown or explanation):

For native coins:
{
  "symbol": "SOL",
  "name": "Solana",
  "description": "High-performance blockchain supporting smart contracts",
  "networkType": "SOLANA",
  "isNative": true,
  "decimals": 9,
  "derivationPath": "m/44'/501'/0'/0'",
  "coinType": 501,
  "chainName": "Solana",
  "tatumChainId": "solana-mainnet",
  "explorerUrl": "https://explorer.solana.com",
  "blockConfirmations": 32,
  "logoUrl": "https://cryptologos.cc/logos/solana-sol-logo.png",
  "tatumSupported": true,
  "kmsChainCode": "SOL"
}

For tokens:
{
  "symbol": "USDC",
  "name": "USD Coin",
  "description": "Fully-backed dollar stablecoin",
  "networkType": "EVM",
  "isNative": false,
  "decimals": 6,
  "networks": [
    {
      "networkCode": "ethereum",
      "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "tokenStandard": "ERC-20"
    },
    {
      "networkCode": "bsc",
      "contractAddress": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      "tokenStandard": "BEP-20"
    }
  ],
  "logoUrl": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  "tatumSupported": true
}`;

  console.log(`🔍 Calling Claude AI...`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: aiPrompt
      }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    console.log(`\n✅ AI Response received!\n`);
    console.log(`${'='.repeat(80)}`);
    console.log(responseText);
    console.log(`${'='.repeat(80)}\n`);

    // Parse JSON response (remove markdown code blocks if present)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const coinData = JSON.parse(jsonText) as AIResearchedCoin;

    // Validate required fields
    if (!coinData.symbol || !coinData.name || !coinData.networkType || typeof coinData.isNative !== 'boolean') {
      throw new Error('AI response missing required fields');
    }

    return coinData;

  } catch (error) {
    console.error(`\n❌ AI Research Failed:`, error);
    console.log(`\n⚠️  Falling back to manual input...\n`);

    // Manual input fallback
    const symbol = await rl.question(`Coin Symbol (${prompt.symbol}): `) || prompt.symbol;
    const name = await rl.question(`Full Name: `);
    const isNativeStr = await rl.question(`Is this a native coin? (y/n): `);
    const isNative = isNativeStr.toLowerCase() === 'y';

    console.log(`\nNetwork Types:`);
    console.log(`  1. EVM (Ethereum, BSC, Polygon, Arbitrum, Avalanche)`);
    console.log(`  2. UTXO (Bitcoin, Litecoin, Dogecoin, Bitcoin Cash)`);
    console.log(`  3. TRON`);
    console.log(`  4. SOLANA`);

    const networkTypeNum = await rl.question(`\nSelect network type (1-4): `);
    const networkTypeMap: Record<string, AIResearchedCoin['networkType']> = {
      '1': 'EVM',
      '2': 'UTXO',
      '3': 'TRON',
      '4': 'SOLANA',
    };

    const networkType = networkTypeMap[networkTypeNum] || 'EVM';
    const template = getNetworkTemplate(networkType);

    let result: AIResearchedCoin = {
      symbol: symbol.toUpperCase(),
      name,
      description: await rl.question(`Description: `),
      networkType,
      isNative,
      decimals: parseInt(await rl.question(`Decimals (default 18): `) || '18'),
      derivationPath: '',
      coinType: 0,
      tatumSupported: true,
    };

    if (isNative) {
      // Native coin configuration
      const coinType = parseInt(await rl.question(`BIP44 Coin Type (e.g., 501 for Solana): `) || '0');
      result.coinType = coinType;
      result.derivationPath = template.derivationPathTemplate.replace('{coinType}', coinType.toString());
      result.chainName = name;
      result.tatumChainId = template.tatumChainFormat(name);
      result.explorerUrl = await rl.question(`Explorer URL: `);
      result.blockConfirmations = parseInt(await rl.question(`Block Confirmations (default ${template.defaultConfirmations}): `) || template.defaultConfirmations.toString());
      result.kmsChainCode = await rl.question(`KMS Chain Code (e.g., SOL, AVAX): `);
    } else {
      // Token configuration
      console.log(`\n📍 Enter contract addresses for each network:`);
      const networks: AIResearchedCoin['networks'] = [];

      const addNetwork = await rl.question(`Add Ethereum (ERC-20) contract? (y/n): `);
      if (addNetwork.toLowerCase() === 'y') {
        const address = await rl.question(`  Contract Address: `);
        networks.push({
          networkCode: 'ethereum',
          contractAddress: address,
          tokenStandard: 'ERC-20',
        });
      }

      const addBsc = await rl.question(`Add BSC (BEP-20) contract? (y/n): `);
      if (addBsc.toLowerCase() === 'y') {
        const address = await rl.question(`  Contract Address: `);
        networks.push({
          networkCode: 'bsc',
          contractAddress: address,
          tokenStandard: 'BEP-20',
        });
      }

      const addPolygon = await rl.question(`Add Polygon contract? (y/n): `);
      if (addPolygon.toLowerCase() === 'y') {
        const address = await rl.question(`  Contract Address: `);
        networks.push({
          networkCode: 'polygon',
          contractAddress: address,
          tokenStandard: 'Polygon',
        });
      }

      result.networks = networks;
    }

    result.logoUrl = await rl.question(`Logo URL (optional): `) || undefined;

    return result;
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Create or update network in database
 */
async function upsertNetwork(coin: AIResearchedCoin) {
  if (!coin.isNative || !coin.chainName) {
    return null;
  }

  const networkCode = coin.chainName.toLowerCase().replace(/\s+/g, '-');
  const template = getNetworkTemplate(coin.networkType);

  console.log(`\n📊 Creating Network: ${coin.chainName}`);
  console.log(`   Type: ${coin.networkType} (mapped to ${template.type})`);

  const network = await prisma.network.upsert({
    where: { code: networkCode },
    create: {
      code: networkCode,
      name: coin.chainName,
      type: template.type,
      tatumChainId: coin.tatumChainId!,
      explorerUrl: coin.explorerUrl,
      blockConfirmations: coin.blockConfirmations || template.defaultConfirmations,
      isActive: true,
    },
    update: {
      name: coin.chainName,
      explorerUrl: coin.explorerUrl,
      blockConfirmations: coin.blockConfirmations || template.defaultConfirmations,
    },
  });

  console.log(`✅ Network created/updated: ${network.id}`);
  return network;
}

/**
 * Create or update asset in database
 */
async function upsertAsset(coin: AIResearchedCoin) {
  console.log(`\n💰 Creating Asset: ${coin.symbol}`);

  const asset = await prisma.asset.upsert({
    where: { symbol: coin.symbol },
    create: {
      symbol: coin.symbol,
      name: coin.name,
      type: coin.isNative ? AssetType.NATIVE : AssetType.TOKEN,
      logoUrl: coin.logoUrl,
      isActive: true,
    },
    update: {
      name: coin.name,
      logoUrl: coin.logoUrl,
    },
  });

  console.log(`✅ Asset created/updated: ${asset.id}`);
  return asset;
}

/**
 * Create asset-network relationships
 */
async function createAssetNetworks(coin: AIResearchedCoin, assetId: string) {
  console.log(`\n🔗 Creating Asset-Network Relationships...`);

  if (coin.isNative && coin.chainName) {
    // Native coin - single network
    const network = await prisma.network.findFirst({
      where: { code: coin.chainName.toLowerCase().replace(/\s+/g, '-') }
    });

    if (!network) {
      throw new Error(`Network not found for ${coin.chainName}`);
    }

    const assetNetwork = await prisma.assetNetwork.upsert({
      where: {
        assetId_networkId: {
          assetId,
          networkId: network.id,
        },
      },
      create: {
        assetId,
        networkId: network.id,
        contractAddress: null, // Native coin has no contract
        tokenStandard: null,
        decimals: coin.decimals,
        isActive: true,
      },
      update: {
        decimals: coin.decimals,
        isActive: true,
      },
    });

    console.log(`✅ Native asset-network created: ${assetNetwork.id}`);
  } else if (coin.networks) {
    // Token - multiple networks
    for (const tokenNetwork of coin.networks) {
      const network = await prisma.network.findFirst({
        where: { code: tokenNetwork.networkCode }
      });

      if (!network) {
        console.warn(`⚠️  Network not found: ${tokenNetwork.networkCode}, skipping...`);
        continue;
      }

      const assetNetwork = await prisma.assetNetwork.upsert({
        where: {
          assetId_networkId: {
            assetId,
            networkId: network.id,
          },
        },
        create: {
          assetId,
          networkId: network.id,
          contractAddress: tokenNetwork.contractAddress,
          tokenStandard: tokenNetwork.tokenStandard,
          decimals: coin.decimals,
          isActive: true,
        },
        update: {
          contractAddress: tokenNetwork.contractAddress,
          tokenStandard: tokenNetwork.tokenStandard,
          decimals: coin.decimals,
          isActive: true,
        },
      });

      console.log(`✅ Token on ${tokenNetwork.networkCode}: ${assetNetwork.id}`);
    }
  }
}

/**
 * Generate KMS wallet for a network
 */
async function generateKmsWalletForNetwork(networkId: string, networkCode: string, kmsChainCode: string, derivationPath: string) {
  console.log(`\n🔐 Generating KMS Wallet for ${networkCode}...`);

  // Check if KMS wallet already exists for this network
  const existingWallet = await prisma.kmsWallet.findFirst({
    where: { networkId }
  });

  if (existingWallet) {
    console.log(`ℹ️  KMS wallet already exists for ${networkCode}: ${existingWallet.signatureId}`);
    return existingWallet;
  }

  const password = process.env.TATUM_KMS_PASSWORD || await rl.question(`Enter KMS password: `);

  return new Promise<any>((resolve) => {
    console.log(`🔧 Running: echo "***" | docker exec -i cryptic-kms node /opt/app/dist/index.js generatemanagedwallet ${kmsChainCode}`);

    const kmsProcess = spawn('docker', [
      'exec',
      '-i',
      'cryptic-kms',
      'node',
      '/opt/app/dist/index.js',
      'generatemanagedwallet',
      kmsChainCode
    ]);

    // Send password to stdin
    kmsProcess.stdin.write(password + '\n');
    kmsProcess.stdin.end();

    let output = '';
    let errorOutput = '';

    kmsProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString());
    });

    kmsProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(data.toString());
    });

    kmsProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ KMS wallet generation failed`);
        resolve(null);
        return;
      }

      try {
        // Parse KMS output to get signatureId
        const signatureIdMatch = output.match(/"signatureId":\s*"([^"]+)"/);

        if (!signatureIdMatch) {
          console.error(`❌ Could not parse KMS output - missing signatureId`);
          console.log(`Output received:`, output);
          resolve(null);
          return;
        }

        const signatureId = signatureIdMatch[1];

        // Try to get xpub (for HD wallets like BTC, ETH)
        const xpubMatch = output.match(/"xpub":\s*"([^"]+)"/);
        // Try to get address (for non-HD wallets like Algorand, Solana)
        const addressMatch = output.match(/"address":\s*"([^"]+)"/);

        // Some chains use xpub (HD wallets), others use address (single-key wallets)
        const xpub = xpubMatch ? xpubMatch[1] : (addressMatch ? addressMatch[1] : null);

        if (!xpub) {
          console.error(`❌ Could not parse KMS output - missing xpub/address`);
          console.log(`Output received:`, output);
          resolve(null);
          return;
        }

        // Save to database
        const kmsWallet = await prisma.kmsWallet.create({
          data: {
            networkId,
            signatureId,
            xpub,
            derivationPath,
            purpose: WalletPurpose.DEPOSIT,
            label: `${networkCode} Deposit Wallet`,
            nextAddressIndex: 0,
            status: WalletStatus.ACTIVE,
          },
        });

        console.log(`✅ KMS Wallet created: ${kmsWallet.id}`);
        console.log(`   Signature ID: ${signatureId}`);
        console.log(`   ${xpubMatch ? 'xPub' : 'Address'}: ${xpub.substring(0, 20)}...`);

        resolve(kmsWallet);
      } catch (error) {
        console.error(`❌ Failed to save KMS wallet:`, error);
        resolve(null);
      }
    });
  });
}


/**
 * Get KMS chain code mapping for common networks
 */
function getKMSChainCode(networkCode: string, networkType: string): string | null {
  const chainCodeMap: Record<string, string> = {
    'ethereum': 'ETH',
    'bsc': 'BSC',
    'polygon': 'MATIC',
    'bitcoin': 'BTC',
    'tron': 'TRON',
    'litecoin': 'LTC',
    'dogecoin': 'DOGE',
    'solana': 'SOL',
    'avalanche': 'AVAX',
    'algorand': 'ALGO',
    'polkadot': 'DOT',
    'cosmos': 'ATOM',
  };

  return chainCodeMap[networkCode] || null;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║             🤖 AI-Powered Coin Addition Tool                   ║
║                                                                ║
║  This tool uses AI to intelligently research and add new       ║
║  cryptocurrencies to your payment gateway system.              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Get coin symbol
    const symbol = await rl.question(`\n🪙 Enter cryptocurrency symbol (e.g., SOL, AVAX, DOT): `);
    const hint = await rl.question(`💡 Any hints for AI? (optional): `);

    // Step 2: AI Research
    const coinData = await aiResearchCoin({
      symbol: symbol.toUpperCase(),
      userDescription: hint || undefined,
    });

    console.log(`\n📋 AI Research Results:`);
    console.log(JSON.stringify(coinData, null, 2));

    const confirm = await rl.question(`\n✅ Proceed with this configuration? (y/n): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log(`❌ Cancelled by user`);
      process.exit(0);
    }

    // Step 3: Create Database Entries
    console.log(`\n🚀 Creating database entries...`);

    const network = await upsertNetwork(coinData);
    const asset = await upsertAsset(coinData);
    await createAssetNetworks(coinData, asset.id);

    // Step 4: Generate KMS Wallets for Networks
    console.log(`\n🔐 Setting up KMS wallets for networks...`);
    const shouldGenerateKMS = await rl.question(`Generate KMS wallets? (y/n): `);

    if (shouldGenerateKMS.toLowerCase() === 'y') {
      if (coinData.isNative && network) {
        // Native coin - generate for its own network
        const kmsChainCode = coinData.kmsChainCode || getKMSChainCode(network.code, coinData.networkType);
        if (kmsChainCode) {
          await generateKmsWalletForNetwork(
            network.id,
            network.code,
            kmsChainCode,
            coinData.derivationPath
          );
        } else {
          console.log(`⚠️  No KMS chain code found for ${network.code}`);
        }
      } else if (coinData.networks) {
        // Token - generate for each network it's deployed on
        for (const tokenNetwork of coinData.networks) {
          const dbNetwork = await prisma.network.findFirst({
            where: { code: tokenNetwork.networkCode }
          });

          if (dbNetwork) {
            const kmsChainCode = getKMSChainCode(dbNetwork.code, dbNetwork.type);
            if (kmsChainCode) {
              const template = getNetworkTemplate(dbNetwork.type);
              await generateKmsWalletForNetwork(
                dbNetwork.id,
                dbNetwork.code,
                kmsChainCode,
                template.derivationPathTemplate || "m/44'/60'/0'/0"
              );
            } else {
              console.log(`⚠️  No KMS chain code found for ${dbNetwork.code}`);
            }
          }
        }
      }
    }


    console.log(`\n✅ Successfully added ${coinData.symbol} to the system!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Symbol: ${coinData.symbol}`);
    console.log(`   Name: ${coinData.name}`);
    console.log(`   Type: ${coinData.isNative ? 'Native Coin' : 'Token'}`);
    console.log(`   Network: ${coinData.networkType}`);
    console.log(`   Decimals: ${coinData.decimals}`);

    if (coinData.isNative) {
      console.log(`   Derivation Path: ${coinData.derivationPath}`);
      console.log(`   Block Confirmations: ${coinData.blockConfirmations}`);
    } else {
      console.log(`   Available on ${coinData.networks?.length || 0} networks`);
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
