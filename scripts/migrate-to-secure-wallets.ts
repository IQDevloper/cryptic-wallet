#!/usr/bin/env tsx
/**
 * Secure Wallet Migration Script
 * 
 * This script safely migrates from the insecure Tatum API wallet generation
 * to secure local wallet generation using KMS principles.
 * 
 * IMPORTANT: Run this script in a secure environment
 * 
 * Usage: npx tsx scripts/migrate-to-secure-wallets.ts [--dry-run] [--backup-only]
 */

import { PrismaClient } from '@prisma/client'
import { secureWalletManager } from '../src/lib/hdwallet/secure-manager'
import { walletRecoveryUtils } from '../src/lib/hdwallet/recovery-utils'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

interface MigrationOptions {
  dryRun: boolean
  backupOnly: boolean
  force: boolean
}

class SecureWalletMigration {
  private options: MigrationOptions

  constructor(options: MigrationOptions) {
    this.options = options
  }

  /**
   * Main migration process
   */
  async migrate(): Promise<void> {
    console.log('🔐 Starting Secure Wallet Migration')
    console.log('=====================================')
    
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made')
    }
    
    try {
      // Step 1: Pre-migration validation
      await this.validateEnvironment()
      
      // Step 2: Create backup of current state
      const backupPath = await this.createBackup()
      
      if (this.options.backupOnly) {
        console.log('📦 Backup-only mode - stopping here')
        return
      }
      
      // Step 3: Analyze current wallets
      const analysis = await this.analyzeCurrentWallets()
      
      // Step 4: Confirm migration
      if (!this.options.force) {
        await this.confirmMigration(analysis)
      }
      
      if (!this.options.dryRun) {
        // Step 5: Clear insecure wallets
        await this.cleanupInsecureWallets()
        
        // Step 6: Generate secure wallets
        await this.generateSecureWallets()
        
        // Step 7: Verify new wallets
        await this.verifyNewWallets()
      }
      
      console.log('🎉 Migration completed successfully!')
      console.log(`📦 Backup stored at: ${backupPath}`)
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * Validate environment and prerequisites
   */
  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating environment...')
    
    // Check encryption key
    const encryptionKey = process.env.HD_WALLET_ENCRYPTION_KEY
    if (!encryptionKey || encryptionKey.length === 0) {
      throw new Error('HD_WALLET_ENCRYPTION_KEY environment variable is required')
    }
    
    if (encryptionKey.length < 32) {
      throw new Error('HD_WALLET_ENCRYPTION_KEY must be at least 32 characters long')
    }
    
    // Check database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Database connection verified')
    } catch (error) {
      throw new Error(`Database connection failed: ${(error as Error).message}`)
    }
    
    // Check existing wallets
    const existingWallets = await prisma.globalHDWallet.count({
      where: { status: 'ACTIVE' }
    })
    
    console.log(`📊 Found ${existingWallets} active wallets to migrate`)
    
    console.log('✅ Environment validation passed')
  }

  /**
   * Create backup of current wallet state
   */
  private async createBackup(): Promise<string> {
    console.log('📦 Creating pre-migration backup...')
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = path.join(process.cwd(), 'migration-backups')
      await fs.mkdir(backupDir, { recursive: true })
      
      const backupPath = path.join(backupDir, `pre-migration-backup-${timestamp}.json`)
      
      // Create comprehensive backup
      const wallets = await prisma.globalHDWallet.findMany({
        where: { status: 'ACTIVE' }
      })
      
      const derivedAddresses = await prisma.derivedAddress.findMany({
        include: {
          globalWallet: true
        }
      })
      
      const backupData = {
        timestamp: new Date().toISOString(),
        migration: {
          from: 'insecure-tatum-api',
          to: 'secure-local-generation',
          version: '1.0.0'
        },
        wallets: wallets.map(w => ({
          id: w.id,
          currency: w.currency,
          network: w.network,
          contractAddress: w.contractAddress,
          xpub: w.xpub,
          derivationPath: w.derivationPath,
          nextAddressIndex: w.nextAddressIndex.toString(),
          totalPoolBalance: w.totalPoolBalance.toString(),
          status: w.status,
          createdAt: w.createdAt.toISOString(),
          // Note: We intentionally exclude encrypted sensitive data
          // for security reasons in the backup
        })),
        derivedAddresses: derivedAddresses.map(da => ({
          id: da.id,
          globalWalletId: da.globalWalletId,
          merchantId: da.merchantId,
          address: da.address,
          derivationIndex: da.derivationIndex.toString(),
          assignedToInvoice: da.assignedToInvoice,
          createdAt: da.createdAt.toISOString(),
          currency: da.globalWallet.currency,
          network: da.globalWallet.network
        })),
        statistics: {
          totalWallets: wallets.length,
          totalAddresses: derivedAddresses.length,
          networkBreakdown: wallets.reduce((acc, w) => {
            const key = `${w.currency}-${w.network}`
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      }
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
      
      console.log(`✅ Backup created: ${backupPath}`)
      console.log(`📊 Backed up ${wallets.length} wallets and ${derivedAddresses.length} addresses`)
      
      return backupPath
    } catch (error) {
      console.error('❌ Failed to create backup:', error)
      throw error
    }
  }

  /**
   * Analyze current wallet state
   */
  private async analyzeCurrentWallets(): Promise<any> {
    console.log('📊 Analyzing current wallet state...')
    
    const wallets = await prisma.globalHDWallet.findMany({
      where: { status: 'ACTIVE' }
    })
    
    const addresses = await prisma.derivedAddress.count()
    const activeAddresses = await prisma.derivedAddress.count({
      where: { assignedToInvoice: { not: null } }
    })
    
    const currencyBreakdown = wallets.reduce((acc, w) => {
      acc[w.currency] = (acc[w.currency] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const networkBreakdown = wallets.reduce((acc, w) => {
      acc[w.network] = (acc[w.network] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const analysis = {
      totalWallets: wallets.length,
      totalAddresses: addresses,
      activeAddresses,
      currencyBreakdown,
      networkBreakdown,
      oldestWallet: wallets.length > 0 ? Math.min(...wallets.map(w => w.createdAt.getTime())) : null,
      newestWallet: wallets.length > 0 ? Math.max(...wallets.map(w => w.createdAt.getTime())) : null
    }
    
    console.log('📈 Current State Analysis:')
    console.log(`   Total Wallets: ${analysis.totalWallets}`)
    console.log(`   Total Addresses: ${analysis.totalAddresses}`)
    console.log(`   Active Addresses: ${analysis.activeAddresses}`)
    console.log(`   Currency Breakdown:`, analysis.currencyBreakdown)
    console.log(`   Network Breakdown:`, analysis.networkBreakdown)
    
    return analysis
  }

  /**
   * Confirm migration with user
   */
  private async confirmMigration(analysis: any): Promise<void> {
    console.log('\n⚠️  MIGRATION CONFIRMATION')
    console.log('=========================')
    console.log('This migration will:')
    console.log(`1. DELETE ${analysis.totalWallets} existing wallets from database`)
    console.log(`2. DELETE ${analysis.totalAddresses} existing derived addresses`)
    console.log('3. Generate NEW secure wallets using local key generation')
    console.log('4. All existing wallet data will be LOST (except backups)')
    console.log('\n🔴 THIS ACTION IS IRREVERSIBLE!')
    console.log('\nTo proceed with migration, restart with --force flag')
    
    if (!this.options.force) {
      throw new Error('Migration cancelled - use --force flag to proceed')
    }
  }

  /**
   * Clean up insecure wallets
   */
  private async cleanupInsecureWallets(): Promise<void> {
    console.log('🧹 Cleaning up insecure wallets...')
    
    // First, mark all wallets as inactive for safety
    const inactiveWallets = await prisma.globalHDWallet.updateMany({
      where: { status: 'ACTIVE' },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date()
      }
    })
    
    // Then delete them completely (we have backups)
    const deletedWallets = await prisma.globalHDWallet.deleteMany({
      where: { status: 'INACTIVE' }
    })
    
    // Delete derived addresses (they will be regenerated)
    const deletedAddresses = await prisma.derivedAddress.deleteMany({})
    
    console.log(`🗑️  Deleted ${deletedWallets.count} insecure wallets`)
    console.log(`🗑️  Deleted ${deletedAddresses.count} derived addresses`)
    
    console.log('✅ Cleanup completed')
  }

  /**
   * Generate new secure wallets
   */
  private async generateSecureWallets(): Promise<void> {
    console.log('🔐 Generating new secure wallets...')
    
    await secureWalletManager.initializeGlobalWallets()
    
    console.log('✅ Secure wallet generation completed')
  }

  /**
   * Verify new wallets
   */
  private async verifyNewWallets(): Promise<void> {
    console.log('🔍 Verifying new secure wallets...')
    
    const verification = await walletRecoveryUtils.verifyWalletIntegrity()
    
    if (verification.summary.healthy !== verification.summary.total) {
      throw new Error(`Wallet verification failed: ${verification.summary.healthy}/${verification.summary.total} wallets are healthy`)
    }
    
    console.log(`✅ All ${verification.summary.total} wallets verified successfully`)
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  
  return {
    dryRun: args.includes('--dry-run'),
    backupOnly: args.includes('--backup-only'),
    force: args.includes('--force')
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs()
  
  console.log('🔐 Cryptic Gateway - Secure Wallet Migration')
  console.log('===========================================')
  
  if (options.dryRun) {
    console.log('🔍 Running in DRY RUN mode')
  }
  
  if (options.backupOnly) {
    console.log('📦 Running in BACKUP ONLY mode')
  }
  
  const migration = new SecureWalletMigration(options)
  
  try {
    await migration.migrate()
    process.exit(0)
  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}