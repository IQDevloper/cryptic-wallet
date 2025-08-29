import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
import { tatumHttpClient } from '../tatum/client'

// Network configuration for supported chains
export interface NetworkConfig {
  currency: string
  network: string
  contractAddress?: string // for tokens
  derivationPath: string
  tatumChain: string // Tatum's chain identifier
}

// Supported networks configuration
export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  // Native cryptocurrencies
  {
    currency: 'BTC',
    network: 'bitcoin',
    derivationPath: "m/44'/0'/0'/0",
    tatumChain: 'bitcoin'
  },
  {
    currency: 'ETH', 
    network: 'ethereum',
    derivationPath: "m/44'/60'/0'/0",
    tatumChain: 'ethereum'
  },
  // USDT on different networks
  {
    currency: 'USDT',
    network: 'ethereum',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    derivationPath: "m/44'/60'/0'/0",
    tatumChain: 'ethereum'
  },
  {
    currency: 'USDT',
    network: 'bsc',
    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
    derivationPath: "m/44'/60'/0'/0", // BSC uses Ethereum derivation
    tatumChain: 'bsc'
  },
  {
    currency: 'USDT',
    network: 'tron',
    contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    derivationPath: "m/44'/195'/0'/0",
    tatumChain: 'tron'
  },
  {
    currency: 'USDT',
    network: 'polygon',
    contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    derivationPath: "m/44'/60'/0'/0", // Polygon uses Ethereum derivation
    tatumChain: 'polygon'
  }
]

// Encryption utilities
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.HD_WALLET_ENCRYPTION_KEY || 'fallback-key-change-in-production'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// HD Wallet Manager Class
export class HDWalletManager {
  private httpClient = tatumHttpClient

  /**
   * Initialize global HD wallets for all supported networks
   * This should be run once during system setup
   */
  async initializeGlobalWallets(): Promise<void> {
    console.log('🔐 Initializing global HD wallets for all supported networks...')
    
    for (const networkConfig of SUPPORTED_NETWORKS) {
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
      
      console.log(`🔄 Creating global wallet for ${networkConfig.currency} on ${networkConfig.network}`)
      
      try {
        // Generate wallet using Tatum API
        const walletData = await this.generateWalletFromTatum(networkConfig.tatumChain)
        
        // Create global HD wallet record
        const globalWallet = await prisma.globalHDWallet.create({
          data: {
            currency: networkConfig.currency,
            network: networkConfig.network,
            contractAddress: networkConfig.contractAddress || null,
            mnemonicEncrypted: encrypt(walletData.mnemonic),
            xpub: walletData.xpub,
            encryptedPrivateKey: encrypt(walletData.privateKey),
            derivationPath: networkConfig.derivationPath,
            nextAddressIndex: 0,
            totalPoolBalance: 0,
            status: 'ACTIVE'
          }
        })
        
        console.log(`✅ Created global wallet ${globalWallet.id} for ${networkConfig.currency} on ${networkConfig.network}`)
      } catch (error) {
        console.error(`❌ Failed to create global wallet for ${networkConfig.currency} on ${networkConfig.network}:`, error)
        throw error
      }
    }
    
    console.log('🎉 All global HD wallets initialized successfully!')
  }

  /**
   * Generate a new wallet using Tatum API
   */
  private async generateWalletFromTatum(chain: string): Promise<{
    mnemonic: string
    xpub: string  
    privateKey: string
  }> {
    try {
      console.log(`[Tatum] Generating wallet for ${chain}`)
      
      // Generate wallet using Tatum's wallet generation endpoint
      const walletResponse = await this.httpClient.get<{
        mnemonic: string
        xpub: string
      }>(`/v3/${chain}/wallet`)
      
      // Generate private key for index 0 (master key)
      const privateKeyResponse = await this.httpClient.post<{
        key: string
      }>(`/v3/${chain}/wallet/priv`, {
        index: 0,
        mnemonic: walletResponse.mnemonic
      })
      
      return {
        mnemonic: walletResponse.mnemonic,
        xpub: walletResponse.xpub,
        privateKey: privateKeyResponse.key
      }
    } catch (error) {
      console.error(`[Tatum] Failed to generate wallet for ${chain}:`, error)
      throw new Error(`Failed to generate ${chain} wallet: ${(error as Error).message}`)
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
      throw new Error(`No active global wallet found for ${currency} on ${network}`)
    }
    
    return globalWallet
  }

  /**
   * Derive a new address from a global wallet
   */
  async deriveAddressForMerchant(
    merchantId: string,
    currency: string,
    network: string,
    contractAddress?: string,
    invoiceId?: string
  ): Promise<{
    address: string
    derivationIndex: bigint
    globalWalletId: string
  }> {
    const globalWallet = await this.getGlobalWallet(currency, network, contractAddress)
    
    // Get next available index and increment
    const currentIndex = globalWallet.nextAddressIndex
    
    // Generate address using Tatum API
    const addressResponse = await this.httpClient.get<{
      address: string
    }>(`/v3/${this.getNetworkConfig(currency, network)?.tatumChain}/address/${globalWallet.xpub}/${currentIndex}`)
    
    // Update global wallet index atomically
    await prisma.$transaction(async (tx) => {
      // Increment the global index
      await tx.globalHDWallet.update({
        where: { id: globalWallet.id },
        data: { nextAddressIndex: currentIndex + BigInt(1) }
      })
      
      // Create derived address record
      await tx.derivedAddress.create({
        data: {
          globalWalletId: globalWallet.id,
          merchantId,
          address: addressResponse.address,
          derivationIndex: currentIndex,
          assignedToInvoice: invoiceId || null
        }
      })
    })
    
    console.log(`🔑 Derived new address ${addressResponse.address} for merchant ${merchantId} (${currency} on ${network})`)
    
    return {
      address: addressResponse.address,
      derivationIndex: currentIndex,
      globalWalletId: globalWallet.id
    }
  }

  /**
   * Get network configuration for a currency/network combination
   */
  private getNetworkConfig(currency: string, network: string): NetworkConfig | undefined {
    return SUPPORTED_NETWORKS.find(config => 
      config.currency === currency && config.network === network
    )
  }

  /**
   * Initialize merchant balances for all supported currencies
   */
  async initializeMerchantBalances(merchantId: string): Promise<void> {
    console.log(`💰 Initializing balances for merchant ${merchantId}`)
    
    const globalWallets = await prisma.globalHDWallet.findMany({
      where: { status: 'ACTIVE' }
    })
    
    for (const globalWallet of globalWallets) {
      // Check if balance already exists
      const existingBalance = await prisma.merchantBalance.findFirst({
        where: {
          merchantId,
          globalWalletId: globalWallet.id
        }
      })
      
      if (!existingBalance) {
        await prisma.merchantBalance.create({
          data: {
            merchantId,
            globalWalletId: globalWallet.id,
            balance: 0,
            lockedBalance: 0,
            totalReceived: 0,
            totalWithdrawn: 0
          }
        })
        
        console.log(`✅ Created balance for ${globalWallet.currency} on ${globalWallet.network}`)
      }
    }
    
    console.log(`🎉 Merchant ${merchantId} balances initialized`)
  }

  /**
   * Get all balances for a merchant
   */
  async getMerchantBalances(merchantId: string) {
    return prisma.merchantBalance.findMany({
      where: { merchantId },
      include: {
        globalWallet: {
          select: {
            currency: true,
            network: true,
            contractAddress: true
          }
        }
      }
    })
  }
}

// Export singleton instance
export const hdWalletManager = new HDWalletManager()