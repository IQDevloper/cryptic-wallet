import { TatumSDK, Network } from '@tatum/tatum'

// Environment configuration
const TATUM_API_KEY = process.env.TATUM_API_KEY
const TATUM_ENVIRONMENT = process.env.TATUM_ENVIRONMENT as 'testnet' | 'mainnet'

if (!TATUM_API_KEY) {
  throw new Error('TATUM_API_KEY environment variable is required')
}

// Network mapping for Tatum SDK
const getNetworkConfig = (chainId: string) => {
  const networkMap: Record<string, any> = {
    bitcoin: Network.BITCOIN,
    ethereum: Network.ETHEREUM,
    bsc: Network.BSC,
    tron: Network.TRON,
    polygon: Network.POLYGON,
    dogecoin: Network.DOGECOIN,
    litecoin: Network.LITECOIN,
    bcash: Network.BITCOIN_CASH,
  }

  return networkMap[chainId]
}

// Initialize Tatum SDK clients for different networks
export const createTatumClient = async (chainId: string) => {
  const network = getNetworkConfig(chainId)
  
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  try {
    const tatum = await TatumSDK.init({
      network,
      apiKey: {
        v4: TATUM_API_KEY,
      },
      verbose: process.env.NODE_ENV === 'development',
    })

    return tatum
  } catch (error) {
    console.error(`Failed to initialize Tatum SDK for ${chainId}:`, error)
    throw error
  }
}

// Utility function to get supported chain IDs
export const getSupportedChains = () => [
  'bitcoin',
  'ethereum', 
  'bsc',
  'tron',
  'polygon',
  'dogecoin',
  'litecoin',
  'bcash',
]

// Virtual Account Management
export class TatumVirtualAccountManager {
  private clients: Map<string, any> = new Map()

  async getClient(chainId: string) {
    if (!this.clients.has(chainId)) {
      const client = await createTatumClient(chainId)
      this.clients.set(chainId, client)
    }
    return this.clients.get(chainId)
  }

  async createVirtualAccount(chainId: string, customerId?: string) {
    const client = await this.getClient(chainId)
    
    try {
      const account = await client.virtualAccount.create({
        currency: chainId.toUpperCase(),
        customer: customerId ? { id: customerId } : undefined,
      })
      
      return account
    } catch (error) {
      console.error(`Failed to create virtual account for ${chainId}:`, error)
      throw error
    }
  }

  async generateDepositAddress(accountId: string, chainId: string) {
    const client = await this.getClient(chainId)
    
    try {
      const address = await client.virtualAccount.generateDepositAddress({
        id: accountId,
      })
      
      return address
    } catch (error) {
      console.error(`Failed to generate deposit address for account ${accountId}:`, error)
      throw error
    }
  }

  async getAccountBalance(accountId: string, chainId: string) {
    const client = await this.getClient(chainId)
    
    try {
      const balance = await client.virtualAccount.getBalance({
        id: accountId,
      })
      
      return balance
    } catch (error) {
      console.error(`Failed to get balance for account ${accountId}:`, error)
      throw error
    }
  }

  async cleanup() {
    for (const [chainId, client] of this.clients) {
      try {
        await client.destroy()
      } catch (error) {
        console.error(`Failed to cleanup client for ${chainId}:`, error)
      }
    }
    this.clients.clear()
  }
}

// Singleton instance
export const tatumVAManager = new TatumVirtualAccountManager()
