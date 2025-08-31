import { PrismaClient } from '@prisma/client'
// Removed unused Tatum SDK import since we're doing local generation
import * as bip39 from 'bip39'
import * as bip32 from 'bip32'
import * as ecc from '@bitcoinerlab/secp256k1'
import crypto from 'crypto'
import { CRYPTO_ASSETS_CONFIG } from '../crypto-assets-config'

const prisma = new PrismaClient()
const bip32Factory = bip32.BIP32Factory(ecc)

interface NetworkConfig {
  currency: string
  network: string
  contractAddress?: string
  derivationPath: string
  tatumChain: string
  displayName?: string
}

/**
 * Secure HD Wallet Manager using local key generation
 * NEVER sends private keys or mnemonics to external services
 */
export class SecureHDWalletManager {
  private encryptionKey: string

  constructor() {
    const key = process.env.HD_WALLET_ENCRYPTION_KEY
    if (!key) {
      throw new Error('HD_WALLET_ENCRYPTION_KEY environment variable is required')
    }
    this.encryptionKey = key
  }

  /**
   * Get all supported network configurations from crypto assets config
   */
  private getSupportedNetworks(): NetworkConfig[] {
    const networks: NetworkConfig[] = []
    
    for (const [symbol, asset] of Object.entries(CRYPTO_ASSETS_CONFIG)) {
      for (const networkConfig of asset.networks) {
        networks.push({
          currency: symbol,
          network: networkConfig.network,
          contractAddress: networkConfig.contractAddress,
          derivationPath: networkConfig.derivationPath,
          tatumChain: networkConfig.tatumChain,
          displayName: networkConfig.displayName
        })
      }
    }
    
    return networks
  }

  /**
   * Encrypt sensitive data using AES-256-CBC
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Generate wallet data locally - NEVER sends to external services
   */
  private async generateWalletLocally(derivationPath: string): Promise<{
    mnemonic: string
    xpub: string
    privateKey: string
    address: string
  }> {
    try {
      console.log(`🔐 Generating wallet locally with derivation path: ${derivationPath}`)
      
      // Generate 24-word mnemonic locally
      const mnemonic = bip39.generateMnemonic(256)
      
      // Generate seed from mnemonic
      const seed = await bip39.mnemonicToSeed(mnemonic)
      
      // Create root HD node from seed
      const root = bip32Factory.fromSeed(seed)
      
      // Derive account using the specified derivation path
      const account = root.derivePath(derivationPath)
      
      // Get xpub for address derivation
      const xpub = account.neutered().toBase58()
      
      // Get master private key
      const privateKey = account.toWIF()
      
      // Generate first address (index 0)
      const firstAddressNode = account.derive(0).derive(0)
      const address = this.getAddressFromPublicKey(Buffer.from(firstAddressNode.publicKey), derivationPath)
      
      console.log(`✅ Successfully generated wallet locally`)
      
      return {
        mnemonic,
        xpub,
        privateKey,
        address
      }
    } catch (error) {
      console.error('❌ Failed to generate wallet locally:', error)
      throw new Error(`Local wallet generation failed: ${(error as Error).message}`)
    }
  }

  /**
   * Get address from public key based on derivation path
   */
  private getAddressFromPublicKey(publicKey: Buffer, _derivationPath: string): string {
    // For now, return a placeholder - this will be handled by the address-generator.ts
    // which already has the proper implementation for all networks
    const publicKeyHex = publicKey.toString('hex')
    return `addr_${publicKeyHex.slice(0, 40)}`
  }

  /**
   * Initialize all global HD wallets securely
   */
  async initializeGlobalWallets(): Promise<void> {
    console.log('🔐 Initializing secure global HD wallets (local generation)...')
    
    const supportedNetworks = this.getSupportedNetworks()
    console.log(`📋 Found ${supportedNetworks.length} network configurations to initialize`)
    
    let successCount = 0
    let failureCount = 0
    
    for (const networkConfig of supportedNetworks) {
      const existingWallet = await prisma.globalHDWallet.findFirst({
        where: {
          currency: networkConfig.currency,
          network: networkConfig.network,
          contractAddress: networkConfig.contractAddress || null
        }
      })
      
      if (existingWallet) {
        console.log(`✅ Global wallet already exists for ${networkConfig.currency} on ${networkConfig.network}`)
        continue
      }
      
      console.log(`🔄 Creating secure wallet for ${networkConfig.currency} on ${networkConfig.network}`)
      
      try {
        // Generate wallet locally (never sends to external service)
        const walletData = await this.generateWalletLocally(networkConfig.derivationPath)
        
        // Create global HD wallet record with encrypted sensitive data
        const globalWallet = await prisma.globalHDWallet.create({
          data: {
            currency: networkConfig.currency,
            network: networkConfig.network,
            contractAddress: networkConfig.contractAddress || null,
            mnemonicEncrypted: this.encrypt(walletData.mnemonic),
            xpub: walletData.xpub, // xpub is safe to store unencrypted
            encryptedPrivateKey: this.encrypt(walletData.privateKey),
            derivationPath: networkConfig.derivationPath,
            nextAddressIndex: 0,
            totalPoolBalance: 0,
            status: 'ACTIVE'
          }
        })
        
        console.log(`✅ Created secure global wallet ${globalWallet.id} for ${networkConfig.currency} on ${networkConfig.network}`)
        successCount++
      } catch (error) {
        console.error(`❌ Failed to create global wallet for ${networkConfig.currency} on ${networkConfig.network}:`, error)
        failureCount++
      }
    }
    
    console.log(`🎉 Global HD wallet initialization complete!`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Failures: ${failureCount}`)
    
    if (failureCount > 0) {
      throw new Error(`Failed to initialize ${failureCount} wallet(s)`)
    }
  }

  /**
   * Get or create a global wallet for a specific currency/network
   */
  async getGlobalWallet(currency: string, network: string, contractAddress?: string) {
    const globalWallet = await prisma.globalHDWallet.findFirst({
      where: {
        currency,
        network,
        contractAddress: contractAddress || null,
        status: 'ACTIVE'
      }
    })
    
    if (!globalWallet) {
      throw new Error(`No global wallet found for ${currency} on ${network}`)
    }
    
    return globalWallet
  }

  /**
   * Get decrypted mnemonic for wallet recovery (use with extreme caution)
   */
  async getDecryptedMnemonic(walletId: string): Promise<string> {
    const wallet = await prisma.globalHDWallet.findUnique({
      where: { id: walletId }
    })
    
    if (!wallet || !wallet.mnemonicEncrypted) {
      throw new Error('Wallet not found or has no encrypted mnemonic')
    }
    
    return this.decrypt(wallet.mnemonicEncrypted)
  }

  /**
   * Verify wallet integrity by checking if mnemonic can be decrypted
   */
  async verifyWalletIntegrity(walletId: string): Promise<boolean> {
    try {
      const mnemonic = await this.getDecryptedMnemonic(walletId)
      return bip39.validateMnemonic(mnemonic)
    } catch {
      return false
    }
  }

  /**
   * Create a backup of all wallet data (encrypted)
   */
  async createWalletBackup(): Promise<any> {
    const wallets = await prisma.globalHDWallet.findMany({
      where: { status: 'ACTIVE' }
    })
    
    return {
      timestamp: new Date().toISOString(),
      walletCount: wallets.length,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        currency: wallet.currency,
        network: wallet.network,
        contractAddress: wallet.contractAddress,
        xpub: wallet.xpub,
        derivationPath: wallet.derivationPath,
        nextAddressIndex: wallet.nextAddressIndex.toString(),
        // Note: We don't include encrypted data in backup for security
        // Recovery should be done using mnemonic phrases
      }))
    }
  }

  /**
   * Clean up and remove all existing wallets (for migration)
   */
  async cleanupExistingWallets(): Promise<void> {
    console.log('🧹 Cleaning up existing insecure wallets...')
    
    const deletedWallets = await prisma.globalHDWallet.updateMany({
      data: {
        status: 'DELETED',
        deletedAt: new Date()
      }
    })
    
    console.log(`🗑️ Marked ${deletedWallets.count} wallets as deleted`)
    
    // Also clean up derived addresses
    const deletedAddresses = await prisma.derivedAddress.deleteMany({})
    console.log(`🗑️ Deleted ${deletedAddresses.count} derived addresses`)
    
    console.log('✅ Cleanup complete - ready for secure wallet regeneration')
  }
}

// Export singleton instance
export const secureWalletManager = new SecureHDWalletManager()