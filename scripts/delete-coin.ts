#!/usr/bin/env tsx

/**
 * 🗑️  Safe Coin/Asset Deletion Script
 *
 * This script safely deletes a cryptocurrency/asset from the database
 * by handling all foreign key constraints in the correct order.
 *
 * Usage:
 *   npm run delete-coin
 *   or
 *   npx tsx scripts/delete-coin.ts
 *
 * What gets deleted:
 * 1. Transactions (if any invoices use this asset)
 * 2. Invoices using this asset
 * 3. Webhook notifications for this asset
 * 4. Payment addresses for this asset
 * 5. Merchant wallets for this asset
 * 6. KMS wallets for networks used only by this asset
 * 7. AssetNetwork relationships
 * 8. The Asset itself
 * 9. Networks (if they're only used by this asset)
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const prisma = new PrismaClient();
const rl = readline.createInterface({ input, output });

interface DeletionStats {
  transactions: number;
  invoices: number;
  webhookNotifications: number;
  paymentAddresses: number;
  merchantWallets: number;
  kmsWallets: number;
  assetNetworks: number;
  networks: number;
  assets: number;
}

/**
 * Find an asset by symbol
 */
async function findAsset(symbol: string) {
  const asset = await prisma.asset.findFirst({
    where: {
      symbol: {
        equals: symbol,
        mode: 'insensitive'
      }
    },
    include: {
      assetOnNetworks: {
        include: {
          network: true,
          merchantWallets: true,
          paymentAddresses: {
            include: {
              invoice: true,
            }
          }
        }
      }
    }
  });

  return asset;
}

/**
 * Show what will be deleted
 */
async function showDeletionPreview(assetId: string) {
  console.log(`\n📊 Deletion Preview:\n`);

  // Count AssetNetworks
  const assetNetworks = await prisma.assetNetwork.findMany({
    where: { assetId },
    include: {
      network: true,
      merchantWallets: true,
      paymentAddresses: {
        include: {
          invoice: {
            include: {
              transactions: true
            }
          }
        }
      }
    }
  });

  let totalMerchantWallets = 0;
  let totalPaymentAddresses = 0;
  let totalInvoices = 0;
  let totalTransactions = 0;

  console.log(`  Networks: ${assetNetworks.length}`);
  for (const an of assetNetworks) {
    console.log(`    - ${an.network.name} (${an.network.code})`);
    console.log(`      Merchant Wallets: ${an.merchantWallets.length}`);
    console.log(`      Payment Addresses: ${an.paymentAddresses.length}`);

    const invoicesCount = an.paymentAddresses.filter(pa => pa.invoice).length;
    console.log(`      Invoices: ${invoicesCount}`);

    const transactionsCount = an.paymentAddresses
      .filter(pa => pa.invoice)
      .reduce((sum, pa) => sum + (pa.invoice?.transactions?.length || 0), 0);
    console.log(`      Transactions: ${transactionsCount}`);

    totalMerchantWallets += an.merchantWallets.length;
    totalPaymentAddresses += an.paymentAddresses.length;
    totalInvoices += invoicesCount;
    totalTransactions += transactionsCount;
  }

  console.log(`\n  📝 Total Summary:`);
  console.log(`    Asset Networks: ${assetNetworks.length}`);
  console.log(`    Merchant Wallets: ${totalMerchantWallets}`);
  console.log(`    Payment Addresses: ${totalPaymentAddresses}`);
  console.log(`    Invoices: ${totalInvoices}`);
  console.log(`    Transactions: ${totalTransactions}`);

  if (totalInvoices > 0) {
    console.log(`\n  ⚠️  WARNING: This asset has ${totalInvoices} invoices with transaction history!`);
    console.log(`      Deleting will remove all payment records for these invoices.`);
  }

  return {
    assetNetworks: assetNetworks.length,
    merchantWallets: totalMerchantWallets,
    paymentAddresses: totalPaymentAddresses,
    invoices: totalInvoices,
    transactions: totalTransactions,
  };
}

/**
 * Delete coin and all related data
 */
async function deleteCoin(symbol: string): Promise<DeletionStats> {
  const stats: DeletionStats = {
    transactions: 0,
    invoices: 0,
    webhookNotifications: 0,
    paymentAddresses: 0,
    merchantWallets: 0,
    kmsWallets: 0,
    assetNetworks: 0,
    networks: 0,
    assets: 0,
  };

  console.log(`\n🗑️  Starting deletion process for ${symbol}...\n`);

  // Find the asset
  const asset = await findAsset(symbol);
  if (!asset) {
    throw new Error(`Asset ${symbol} not found`);
  }

  // Use transaction to ensure atomic deletion
  await prisma.$transaction(async (tx) => {
    // Get all asset networks for this asset
    const assetNetworks = await tx.assetNetwork.findMany({
      where: { assetId: asset.id },
      include: {
        network: true,
        paymentAddresses: {
          include: {
            invoice: true,
          }
        }
      }
    });

    // Step 1: Delete Transactions (if invoices exist)
    console.log(`  [1/9] Deleting transactions...`);
    for (const assetNetwork of assetNetworks) {
      for (const paymentAddress of assetNetwork.paymentAddresses) {
        if (paymentAddress.invoice) {
          const deletedTransactions = await tx.transaction.deleteMany({
            where: { invoiceId: paymentAddress.invoice.id }
          });
          stats.transactions += deletedTransactions.count;
        }
      }
    }
    console.log(`        ✅ Deleted ${stats.transactions} transactions`);

    // Step 2: Delete Webhook Notifications
    console.log(`  [2/9] Deleting webhook notifications...`);
    for (const assetNetwork of assetNetworks) {
      const addressIds = assetNetwork.paymentAddresses.map(pa => pa.id);
      if (addressIds.length > 0) {
        const deletedWebhooks = await tx.webhookNotification.deleteMany({
          where: { paymentAddressId: { in: addressIds } }
        });
        stats.webhookNotifications += deletedWebhooks.count;
      }
    }
    console.log(`        ✅ Deleted ${stats.webhookNotifications} webhook notifications`);

    // Step 3: Delete Webhook Deliveries (for invoices)
    console.log(`  [3/9] Deleting webhook deliveries...`);
    for (const assetNetwork of assetNetworks) {
      for (const paymentAddress of assetNetwork.paymentAddresses) {
        if (paymentAddress.invoice) {
          await tx.webhookDelivery.deleteMany({
            where: { invoiceId: paymentAddress.invoice.id }
          });
        }
      }
    }
    console.log(`        ✅ Deleted webhook deliveries`);

    // Step 4: Delete Invoices
    console.log(`  [4/9] Deleting invoices...`);
    for (const assetNetwork of assetNetworks) {
      for (const paymentAddress of assetNetwork.paymentAddresses) {
        if (paymentAddress.invoice) {
          await tx.invoice.delete({
            where: { id: paymentAddress.invoice.id }
          });
          stats.invoices++;
        }
      }
    }
    console.log(`        ✅ Deleted ${stats.invoices} invoices`);

    // Step 5: Delete Payment Addresses
    console.log(`  [5/9] Deleting payment addresses...`);
    for (const assetNetwork of assetNetworks) {
      const deletedAddresses = await tx.paymentAddress.deleteMany({
        where: { assetNetworkId: assetNetwork.id }
      });
      stats.paymentAddresses += deletedAddresses.count;
    }
    console.log(`        ✅ Deleted ${stats.paymentAddresses} payment addresses`);

    // Step 6: Delete Merchant Wallets
    console.log(`  [6/9] Deleting merchant wallets...`);
    const deletedWallets = await tx.merchantWallet.deleteMany({
      where: {
        assetNetworkId: {
          in: assetNetworks.map(an => an.id)
        }
      }
    });
    stats.merchantWallets = deletedWallets.count;
    console.log(`        ✅ Deleted ${stats.merchantWallets} merchant wallets`);

    // Step 7: Delete AssetNetwork relationships
    console.log(`  [7/9] Deleting asset-network relationships...`);
    const deletedAssetNetworks = await tx.assetNetwork.deleteMany({
      where: { assetId: asset.id }
    });
    stats.assetNetworks = deletedAssetNetworks.count;
    console.log(`        ✅ Deleted ${stats.assetNetworks} asset-network relationships`);

    // Step 8: Check and delete orphaned KMS wallets
    console.log(`  [8/9] Checking for orphaned KMS wallets...`);
    for (const assetNetwork of assetNetworks) {
      // Check if this network is used by any other assets
      const otherAssets = await tx.assetNetwork.count({
        where: {
          networkId: assetNetwork.network.id,
          assetId: { not: asset.id }
        }
      });

      if (otherAssets === 0) {
        // This network is only used by this asset, safe to delete KMS wallet
        const deletedKmsWallets = await tx.kmsWallet.deleteMany({
          where: { networkId: assetNetwork.network.id }
        });
        stats.kmsWallets += deletedKmsWallets.count;
        console.log(`        ℹ️  Deleted ${deletedKmsWallets.count} KMS wallet(s) for ${assetNetwork.network.code}`);
      }
    }
    console.log(`        ✅ Deleted ${stats.kmsWallets} KMS wallets`);

    // Step 9: Delete the Asset
    console.log(`  [9/9] Deleting asset...`);
    await tx.asset.delete({
      where: { id: asset.id }
    });
    stats.assets = 1;
    console.log(`        ✅ Deleted asset: ${asset.symbol}`);

    // Step 10: Check and delete orphaned networks
    console.log(`  [Cleanup] Checking for orphaned networks...`);
    for (const assetNetwork of assetNetworks) {
      const remainingAssets = await tx.assetNetwork.count({
        where: { networkId: assetNetwork.network.id }
      });

      if (remainingAssets === 0) {
        await tx.network.delete({
          where: { id: assetNetwork.network.id }
        });
        stats.networks++;
        console.log(`        ℹ️  Deleted orphaned network: ${assetNetwork.network.code}`);
      }
    }
    if (stats.networks > 0) {
      console.log(`        ✅ Deleted ${stats.networks} orphaned networks`);
    } else {
      console.log(`        ℹ️  No orphaned networks found`);
    }
  });

  return stats;
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║             🗑️  Safe Coin/Asset Deletion Tool                  ║
║                                                                ║
║  This tool safely removes a cryptocurrency from the system     ║
║  by handling all database relationships correctly.             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Get coin symbol
    const symbol = await rl.question(`\n🪙 Enter cryptocurrency symbol to delete (e.g., DOGE, USDC): `);

    if (!symbol || symbol.trim().length === 0) {
      console.log(`❌ Invalid symbol`);
      process.exit(1);
    }

    // Step 2: Find the asset
    console.log(`\n🔍 Searching for ${symbol.toUpperCase()}...`);
    const asset = await findAsset(symbol.toUpperCase());

    if (!asset) {
      console.log(`\n❌ Asset "${symbol.toUpperCase()}" not found in database`);
      console.log(`\nAvailable assets:`);

      const allAssets = await prisma.asset.findMany({
        select: { symbol: true, name: true }
      });

      allAssets.forEach(a => {
        console.log(`  - ${a.symbol} (${a.name})`);
      });

      process.exit(1);
    }

    console.log(`\n✅ Found: ${asset.name} (${asset.symbol})`);
    console.log(`   Type: ${asset.type}`);
    console.log(`   Status: ${asset.isActive ? 'Active' : 'Inactive'}`);

    // Step 3: Show deletion preview
    await showDeletionPreview(asset.id);

    // Step 4: Confirm deletion
    const confirm1 = await rl.question(`\n⚠️  Are you sure you want to delete ${asset.symbol}? (yes/no): `);
    if (confirm1.toLowerCase() !== 'yes') {
      console.log(`❌ Deletion cancelled`);
      process.exit(0);
    }

    const confirm2 = await rl.question(`\n⚠️  This action CANNOT be undone! Type "${asset.symbol}" to confirm: `);
    if (confirm2.toUpperCase() !== asset.symbol) {
      console.log(`❌ Confirmation failed. Deletion cancelled.`);
      process.exit(0);
    }

    // Step 5: Delete the coin
    const stats = await deleteCoin(asset.symbol);

    // Step 6: Show results
    console.log(`\n✅ Successfully deleted ${asset.symbol}!\n`);
    console.log(`📊 Deletion Summary:`);
    console.log(`   Assets: ${stats.assets}`);
    console.log(`   Asset Networks: ${stats.assetNetworks}`);
    console.log(`   Networks: ${stats.networks}`);
    console.log(`   Merchant Wallets: ${stats.merchantWallets}`);
    console.log(`   Payment Addresses: ${stats.paymentAddresses}`);
    console.log(`   Invoices: ${stats.invoices}`);
    console.log(`   Transactions: ${stats.transactions}`);
    console.log(`   Webhook Notifications: ${stats.webhookNotifications}`);
    console.log(`   KMS Wallets: ${stats.kmsWallets}`);

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
