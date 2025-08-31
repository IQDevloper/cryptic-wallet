#!/usr/bin/env node

/**
 * KMS Wallet Generation Script - Supported Chains Only
 *
 * Generates KMS wallets for only the chains that are confirmed to work with Tatum KMS
 * Based on testing: BTC, ETH, BSC, TRON, MATIC, LTC, SOL, DOGE are supported
 *
 * Usage: npm run generate-supported-wallets
 * or: node scripts/generate-supported-kms-wallets.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Confirmed supported KMS chains and their tokens
const SUPPORTED_KMS_CHAINS = [
  // Native cryptocurrencies
  {
    kmsChain: 'BTC',
    currencySymbol: 'BTC',
    networkName: 'Bitcoin',
    isNative: true,
  },
  {
    kmsChain: 'ETH',
    currencySymbol: 'ETH',
    networkName: 'Ethereum',
    isNative: true,
  },
  {
    kmsChain: 'BSC',
    currencySymbol: 'BNB',
    networkName: 'Binance Smart Chain',
    isNative: true,
  },
  {
    kmsChain: 'TRON',
    currencySymbol: 'TRX',
    networkName: 'Tron',
    isNative: true,
  },
  {
    kmsChain: 'MATIC',
    currencySymbol: 'MATIC',
    networkName: 'Polygon',
    isNative: true,
  },
  {
    kmsChain: 'LTC',
    currencySymbol: 'LTC',
    networkName: 'Litecoin',
    isNative: true,
  },
  {
    kmsChain: 'SOL',
    currencySymbol: 'SOL',
    networkName: 'Solana',
    isNative: true,
  },
  {
    kmsChain: 'DOGE',
    currencySymbol: 'DOGE',
    networkName: 'Dogecoin',
    isNative: true,
  },
];

// Token configurations - use the base chain's wallet
const SUPPORTED_TOKENS = [
  // USDT tokens
  {
    kmsChain: 'ETH',
    currencySymbol: 'USDT',
    networkName: 'Ethereum',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    isNative: false,
  },
  {
    kmsChain: 'BSC',
    currencySymbol: 'USDT',
    networkName: 'Binance Smart Chain',
    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
    isNative: false,
  },
  {
    kmsChain: 'TRON',
    currencySymbol: 'USDT',
    networkName: 'Tron',
    contractAddress: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
    isNative: false,
  },
  {
    kmsChain: 'MATIC',
    currencySymbol: 'USDT',
    networkName: 'Polygon',
    contractAddress: '0xc2132D05D31c914a87C6613C10748AaCbA0D5c45',
    isNative: false,
  },

  // USDC tokens
  {
    kmsChain: 'ETH',
    currencySymbol: 'USDC',
    networkName: 'Ethereum',
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    isNative: false,
  },
  {
    kmsChain: 'BSC',
    currencySymbol: 'USDC',
    networkName: 'Binance Smart Chain',
    contractAddress: '0x8ac76a51cc950d9822d68b83fe1adadfb8c9c1a',
    isNative: false,
  },
  {
    kmsChain: 'MATIC',
    currencySymbol: 'USDC',
    networkName: 'Polygon',
    contractAddress: '0x2791Bca1F2de4661ED88A30C99A7a9449Aa84174',
    isNative: false,
  },
];

/**
 * Generate KMS wallet for a specific chain
 * @param {string} kmsChain - The KMS chain identifier (BTC, ETH, etc.)
 * @param {string} currencySymbol - The currency symbol (BTC, ETH, etc.)
 * @param {string} networkName - The network name for logging
 * @returns {Promise<Object>} - Generated wallet data with signatureId and xpub
 */
async function generateKMSWallet(kmsChain, currencySymbol, networkName) {
  try {
    console.log(
      `🔄 Generating ${currencySymbol} wallet for ${networkName} (${kmsChain})...`,
    );

    const command = `docker run --rm --env-file .env.kms -v ./kms-data:/home/node/.tatumrc tatumio/tatum-kms generatemanagedwallet ${kmsChain}`;

    const { stdout, stderr } = await execAsync(command);

    // Filter out warnings and only check for actual errors
    const errorLines = stderr
      ? stderr
          .split('\n')
          .filter(
            (line) =>
              !line.includes("WARNING: The requested image's platform") &&
              !line.includes('Secp256k1 bindings are not compiled') &&
              !line.includes('bigint: Failed to load bindings') &&
              !line.includes('pure JS will be used') &&
              line.trim() !== '',
          )
      : [];

    if (errorLines.length > 0) {
      console.error(
        `❌ Error generating ${currencySymbol} wallet:`,
        errorLines.join('\n'),
      );
      return null;
    }

    // Parse the JSON response from KMS
    let response;
    try {
      response = JSON.parse(stdout.trim());
    } catch (parseError) {
      console.error(
        `❌ Failed to parse response for ${currencySymbol}:`,
        stdout,
      );
      return null;
    }

    if (response.signatureId && (response.xpub || response.address)) {
      console.log(
        `✅ Generated ${currencySymbol} wallet - Signature ID: ${response.signatureId}`,
      );
      return {
        signatureId: response.signatureId,
        xpub: response.xpub || response.address, // SOL uses 'address' instead of 'xpub'
        kmsChain,
        currencySymbol,
        networkName,
      };
    } else {
      console.error(
        `❌ Invalid response for ${currencySymbol} wallet:`,
        response,
      );
      return null;
    }
  } catch (error) {
    console.error(
      `❌ Failed to generate ${currencySymbol} wallet:`,
      error.message,
    );
    return null;
  }
}

/**
 * Save KMS wallets to database (one per chain) and show token mapping - prevents duplicates
 * @param {Array} wallets - Array of generated wallet data
 * @param {Array} tokens - Array of token configurations
 */
async function saveWalletsAndTokensToDatabase(wallets, tokens) {
  console.log('\n📊 Saving KMS wallets to database...');

  // Import Prisma client
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const savedWallets = [];
    const skippedWallets = [];

    // Save one wallet per KMS chain (native currency)
    for (const wallet of wallets) {
      if (!wallet) continue;

      try {
        // Check if wallet already exists by signatureId
        const existingWallet = await prisma.wallet.findUnique({
          where: { signatureId: wallet.signatureId },
        });

        if (existingWallet) {
          console.log(
            `⚠️  ${wallet.kmsChain} wallet already exists (SignatureId: ${wallet.signatureId})`,
          );
          skippedWallets.push(existingWallet);
          savedWallets.push(existingWallet); // Add to saved list for token mapping
          continue;
        }

        // Create wallet record in database (one per KMS chain)
        const savedWallet = await prisma.wallet.create({
          data: {
            currency: wallet.kmsChain, // Use KMS chain as currency (BTC, ETH, BSC, etc.)
            network: wallet.networkName.toLowerCase().replace(/\s+/g, '_'),
            signatureId: wallet.signatureId,
            xpub: wallet.xpub,
            status: 'ACTIVE',
          },
        });

        console.log(
          `💾 Saved ${wallet.kmsChain} KMS wallet to database (SignatureId: ${wallet.signatureId})`,
        );
        savedWallets.push(savedWallet);
      } catch (dbError) {
        console.error(
          `❌ Failed to save ${wallet.currencySymbol} wallet to database:`,
          dbError.message,
        );
      }
    }

    // Show token mapping (tokens will be handled at merchant balance level)
    console.log('\n🪙 TOKEN MAPPING (handled at merchant balance level):');
    const walletMap = new Map();
    wallets.forEach((w) => walletMap.set(w.kmsChain, w.signatureId));

    for (const token of tokens) {
      const signatureId = walletMap.get(token.kmsChain);
      console.log(
        `  • ${token.currencySymbol} on ${token.networkName} → uses ${token.kmsChain} wallet (${signatureId?.substring(0, 8)}...)`,
      );
    }

    console.log(
      `\n✅ Successfully processed ${savedWallets.length} KMS wallets (${savedWallets.length - skippedWallets.length} new, ${skippedWallets.length} existing)`,
    );
    console.log(
      `📝 Token support: ${tokens.length} tokens can be handled using the above KMS wallets`,
    );

    return { savedWallets, tokens };
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return { savedWallets: [], tokens: [] };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting KMS Wallet Generation (Native + Tokens)...\n');

  // Import Prisma client to check existing wallets
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Check which wallets already exist in database
    const existingWallets = await prisma.wallet.findMany({
      where: {
        currency: {
          in: SUPPORTED_KMS_CHAINS.map((chain) => chain.kmsChain),
        },
      },
    });

    const existingChains = new Set(existingWallets.map((w) => w.currency));
    const missingChains = SUPPORTED_KMS_CHAINS.filter(
      (chain) => !existingChains.has(chain.kmsChain),
    );

    console.log(
      `📊 Found ${existingWallets.length} existing KMS wallets in database`,
    );
    console.log(
      `🔍 Need to generate ${missingChains.length} missing KMS wallets\n`,
    );

    if (existingWallets.length > 0) {
      console.log('✅ EXISTING KMS WALLETS:');
      existingWallets.forEach((wallet) => {
        console.log(
          `  • ${wallet.currency} - ${wallet.signatureId.substring(0, 8)}...`,
        );
      });
      console.log('');
    }

    // Generate only missing KMS wallets
    const generatedWallets = [];
    if (missingChains.length > 0) {
      console.log('🔄 GENERATING MISSING KMS WALLETS:');
      for (const walletConfig of missingChains) {
        const wallet = await generateKMSWallet(
          walletConfig.kmsChain,
          walletConfig.currencySymbol,
          walletConfig.networkName,
        );

        if (wallet) {
          generatedWallets.push(wallet);
        }

        // Add small delay between generations to avoid overwhelming KMS
        if (missingChains.indexOf(walletConfig) < missingChains.length - 1) {
          console.log('⏱️  Waiting 2 seconds before next generation...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } else {
      console.log('✅ All KMS wallets already exist - no generation needed!');
    }

    if (generatedWallets.length > 0) {
      console.log(`\n🎉 Generated ${generatedWallets.length} new KMS wallets!`);
    }

    // Save newly generated wallets to database and show complete token mapping
    if (generatedWallets.length > 0) {
      const { savedWallets, tokens } = await saveWalletsAndTokensToDatabase(
        generatedWallets,
        SUPPORTED_TOKENS,
      );
      console.log(`💾 Saved ${savedWallets.length} new wallets to database`);
    }

    // Get all wallets (existing + new) for token mapping
    const allWallets = await prisma.wallet.findMany({
      where: {
        currency: {
          in: SUPPORTED_KMS_CHAINS.map((chain) => chain.kmsChain),
        },
      },
    });

    // Show complete token mapping
    console.log('\n🪙 COMPLETE TOKEN MAPPING:');
    const walletMap = new Map();
    allWallets.forEach((w) => walletMap.set(w.currency, w.signatureId));

    for (const token of SUPPORTED_TOKENS) {
      const signatureId = walletMap.get(token.kmsChain);
      console.log(
        `  • ${token.currencySymbol} on ${token.networkName} → uses ${token.kmsChain} wallet (${signatureId?.substring(0, 8)}...)`,
      );
    }

    // Summary
    console.log('\n📊 COMPLETE SUMMARY:');
    console.log('─'.repeat(70));
    console.log(`Total KMS chains: ${SUPPORTED_KMS_CHAINS.length}`);
    console.log(`Existing wallets: ${existingWallets.length}`);
    console.log(`New wallets generated: ${generatedWallets.length}`);
    console.log(`Total wallets available: ${allWallets.length}`);
    console.log(`Supported tokens: ${SUPPORTED_TOKENS.length}`);

    console.log('\n✅ ALL AVAILABLE KMS WALLETS:');
    allWallets.forEach((wallet) => {
      console.log(
        `  • ${wallet.currency} - ${wallet.signatureId.substring(0, 8)}... (${existingChains.has(wallet.currency) ? 'existing' : 'new'})`,
      );
    });
  } catch (error) {
    console.error('❌ Error in main function:', error.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n🏁 KMS wallet management complete!');
}

// Run the script
main().catch(console.error);
