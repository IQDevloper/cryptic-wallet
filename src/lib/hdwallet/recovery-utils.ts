import { PrismaClient } from '@prisma/client'
import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import * as ecc from '@bitcoinerlab/secp256k1'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()
const bip32Factory = bip32.BIP32Factory(ecc)

interface WalletBackupData {
  timestamp: string
  encryptionVersion: string
  wallets: Array<{
    id: string
    currency: string
    network: string
    contractAddress: string | null
    mnemonicEncrypted: string
    xpub: string
    derivationPath: string
    nextAddressIndex: string
    status: string
  }>
}

interface RecoveryOptions {
  mnemonic?: string
  backupFile?: string
  encryptionKey?: string
  outputPath?: string
}

/**
 * Wallet Recovery and Backup Utilities
 * Provides secure backup and recovery functionality for HD wallets
 */
export class WalletRecoveryUtils {
  private encryptionKey: string

  constructor() {
    const key = process.env.HD_WALLET_ENCRYPTION_KEY
    if (!key) {
      throw new Error('HD_WALLET_ENCRYPTION_KEY environment variable is required')
    }
    this.encryptionKey = key
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }
      
      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = parts[2]
      
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${(error as Error).message}`)
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey)
    cipher.setAutoPadding(true)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  /**
   * Create a complete encrypted backup of all wallet data
   */
  async createSecureBackup(outputPath?: string): Promise<string> {
    console.log('📦 Creating secure wallet backup...')
    
    try {
      // Fetch all active wallets
      const wallets = await prisma.globalHDWallet.findMany({
        where: { status: 'ACTIVE' }
      })
      
      if (wallets.length === 0) {
        throw new Error('No active wallets found to backup')
      }
      
      const backupData: WalletBackupData = {
        timestamp: new Date().toISOString(),
        encryptionVersion: '1.0.0',
        wallets: wallets.map(wallet => ({
          id: wallet.id,
          currency: wallet.currency,
          network: wallet.network,
          contractAddress: wallet.contractAddress,
          mnemonicEncrypted: wallet.mnemonicEncrypted,
          xpub: wallet.xpub,
          derivationPath: wallet.derivationPath,
          nextAddressIndex: wallet.nextAddressIndex.toString(),
          status: wallet.status
        }))
      }
      
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `wallet-backup-${timestamp}.json`
      const backupPath = outputPath || path.join(process.cwd(), 'backups', filename)
      
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true })
      
      // Write encrypted backup file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2))
      
      console.log(`✅ Secure backup created: ${backupPath}`)
      console.log(`📊 Backed up ${wallets.length} wallets`)
      
      return backupPath
    } catch (error) {
      console.error('❌ Failed to create backup:', error)
      throw error
    }
  }

  /**
   * Recover wallets from a master mnemonic phrase
   */
  async recoverFromMnemonic(
    mnemonic: string, 
    derivationPaths: string[],
    dryRun: boolean = true
  ): Promise<any[]> {
    console.log('🔄 Recovering wallets from mnemonic...')
    
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }
    
    const recoveredWallets = []
    const seed = await bip39.mnemonicToSeed(mnemonic)
    const root = bip32Factory.fromSeed(seed)
    
    for (const derivationPath of derivationPaths) {
      try {
        console.log(`🔐 Deriving wallet for path: ${derivationPath}`)
        
        // Derive account
        const account = root.derivePath(derivationPath)
        const xpub = account.neutered().toBase58()
        const privateKey = account.toWIF()
        
        // Generate first address for verification
        const firstAddressNode = account.derive(0).derive(0)
        const firstAddress = firstAddressNode.publicKey.toString('hex').slice(0, 40)
        
        const walletInfo = {
          derivationPath,
          xpub,
          privateKey: dryRun ? '[HIDDEN]' : privateKey,
          firstAddress: `addr_${firstAddress}`,
          mnemonic: dryRun ? '[HIDDEN]' : mnemonic
        }
        
        recoveredWallets.push(walletInfo)
        console.log(`✅ Successfully recovered wallet for ${derivationPath}`)
        
      } catch (error) {
        console.error(`❌ Failed to recover wallet for ${derivationPath}:`, error)
      }
    }
    
    if (dryRun) {
      console.log('🔍 Dry run completed - no data was modified')
    }
    
    return recoveredWallets
  }

  /**
   * Restore wallets from backup file
   */
  async restoreFromBackup(backupFilePath: string, dryRun: boolean = true): Promise<void> {
    console.log(`📥 Restoring wallets from backup: ${backupFilePath}`)
    
    try {
      // Read backup file
      const backupData = await fs.readFile(backupFilePath, 'utf-8')
      const backup: WalletBackupData = JSON.parse(backupData)
      
      console.log(`📋 Backup contains ${backup.wallets.length} wallets`)
      console.log(`📅 Backup timestamp: ${backup.timestamp}`)
      
      if (dryRun) {
        console.log('🔍 Dry run mode - no data will be modified')
        
        // Validate each wallet in backup
        for (const walletData of backup.wallets) {
          try {
            // Test decryption
            const mnemonic = this.decrypt(walletData.mnemonicEncrypted)
            const isValid = bip39.validateMnemonic(mnemonic)
            
            console.log(`${isValid ? '✅' : '❌'} Wallet ${walletData.currency}/${walletData.network}: ${isValid ? 'Valid' : 'Invalid'}`)
          } catch (error) {
            console.log(`❌ Wallet ${walletData.currency}/${walletData.network}: Decryption failed`)
          }
        }
        
        return
      }
      
      // Restore wallets to database
      for (const walletData of backup.wallets) {
        try {
          // Check if wallet already exists
          const existing = await prisma.globalHDWallet.findFirst({
            where: {
              currency: walletData.currency,
              network: walletData.network,
              contractAddress: walletData.contractAddress
            }
          })
          
          if (existing) {
            console.log(`⚠️  Wallet ${walletData.currency}/${walletData.network} already exists - skipping`)
            continue
          }
          
          // Restore wallet
          await prisma.globalHDWallet.create({
            data: {
              currency: walletData.currency,
              network: walletData.network,
              contractAddress: walletData.contractAddress,
              mnemonicEncrypted: walletData.mnemonicEncrypted,
              xpub: walletData.xpub,
              encryptedPrivateKey: '', // Will be regenerated if needed
              derivationPath: walletData.derivationPath,
              nextAddressIndex: BigInt(walletData.nextAddressIndex),
              totalPoolBalance: 0,
              status: 'ACTIVE'
            }
          })
          
          console.log(`✅ Restored wallet ${walletData.currency}/${walletData.network}`)
        } catch (error) {
          console.error(`❌ Failed to restore wallet ${walletData.currency}/${walletData.network}:`, error)
        }
      }
      
      console.log('🎉 Wallet restoration completed')
      
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error)
      throw error
    }
  }

  /**
   * Verify wallet integrity by checking mnemonic and generating test addresses
   */
  async verifyWalletIntegrity(walletId?: string): Promise<any> {
    console.log('🔍 Verifying wallet integrity...')
    
    const whereClause = walletId 
      ? { id: walletId }
      : { status: 'ACTIVE' }
    
    const wallets = await prisma.globalHDWallet.findMany({
      where: whereClause
    })
    
    const results = []
    
    for (const wallet of wallets) {
      try {
        // Test mnemonic decryption and validation
        const mnemonic = this.decrypt(wallet.mnemonicEncrypted)
        const mnemonicValid = bip39.validateMnemonic(mnemonic)
        
        // Test address generation
        const seed = await bip39.mnemonicToSeed(mnemonic)
        const root = bip32Factory.fromSeed(seed)
        const account = root.derivePath(wallet.derivationPath)
        const derivedXpub = account.neutered().toBase58()
        
        // Verify xpub matches
        const xpubMatches = derivedXpub === wallet.xpub
        
        const result = {
          walletId: wallet.id,
          currency: wallet.currency,
          network: wallet.network,
          mnemonicValid,
          xpubMatches,
          derivationPath: wallet.derivationPath,
          status: mnemonicValid && xpubMatches ? 'HEALTHY' : 'CORRUPTED'
        }
        
        results.push(result)
        console.log(`${result.status === 'HEALTHY' ? '✅' : '❌'} ${wallet.currency}/${wallet.network}: ${result.status}`)
        
      } catch (error) {
        results.push({
          walletId: wallet.id,
          currency: wallet.currency,
          network: wallet.network,
          error: (error as Error).message,
          status: 'ERROR'
        })
        console.log(`❌ ${wallet.currency}/${wallet.network}: ERROR - ${(error as Error).message}`)
      }
    }
    
    const healthyCount = results.filter(r => r.status === 'HEALTHY').length
    const totalCount = results.length
    
    console.log(`📊 Wallet Integrity Summary: ${healthyCount}/${totalCount} wallets healthy`)
    
    return {
      summary: {
        total: totalCount,
        healthy: healthyCount,
        corrupted: results.filter(r => r.status === 'CORRUPTED').length,
        errors: results.filter(r => r.status === 'ERROR').length
      },
      details: results
    }
  }

  /**
   * Export wallet mnemonics (use with extreme caution!)
   */
  async exportMnemonics(walletIds?: string[]): Promise<any[]> {
    console.warn('⚠️  WARNING: Exporting sensitive mnemonic data!')
    
    const whereClause = walletIds 
      ? { id: { in: walletIds } }
      : { status: 'ACTIVE' }
    
    const wallets = await prisma.globalHDWallet.findMany({
      where: whereClause
    })
    
    const exportedData = []
    
    for (const wallet of wallets) {
      try {
        const mnemonic = this.decrypt(wallet.mnemonicEncrypted)
        
        exportedData.push({
          walletId: wallet.id,
          currency: wallet.currency,
          network: wallet.network,
          derivationPath: wallet.derivationPath,
          mnemonic: mnemonic,
          xpub: wallet.xpub
        })
      } catch (error) {
        console.error(`Failed to decrypt mnemonic for wallet ${wallet.id}:`, error)
      }
    }
    
    return exportedData
  }
}

// Export singleton instance
export const walletRecoveryUtils = new WalletRecoveryUtils()