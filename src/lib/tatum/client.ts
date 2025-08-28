/*
DONT USE @tatum/tatum SDK or any external SDK, use the api is at from Archon MCP documentation
*/

// Environment configuration
const TATUM_API_KEY = process.env.TATUM_API_KEY
const TATUM_ENVIRONMENT = process.env.TATUM_ENVIRONMENT as 'testnet' | 'mainnet'
const TATUM_BASE_URL = 'https://api.tatum.io'

if (!TATUM_API_KEY) {
  throw new Error('TATUM_API_KEY environment variable is required')
}

// Tatum API Types
interface TatumApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

interface CreateVirtualAccountRequest {
  currency: string
  customer?: {
    accountingCurrency?: string
    customerCountry?: string
    externalId?: string
    providerCountry?: string
  }
  compliant?: boolean
  accountCode?: string
  accountingCurrency?: string
  accountNumber?: string
}

interface VirtualAccountResponse {
  id: string
  balance: {
    accountBalance: string
    availableBalance: string
  }
  currency: string
  frozen: boolean
  active: boolean
  customerId?: string
  accountCode?: string
  accountingCurrency?: string
  accountNumber?: string
}

interface DepositAddressResponse {
  address: string
  currency: string
  derivationKey?: number
  xpub?: string
  destinationTag?: number
  memo?: string
}

interface WebhookSubscriptionRequest {
  type: 'ADDRESS_TRANSACTION' | 'ACCOUNT_BALANCE_LIMIT' | 'TRANSACTION_IN_THE_BLOCK'
  attr: {
    address?: string
    chain: string
    url: string
  }
}

interface WebhookSubscriptionResponse {
  id: string
  type: string
  attr: {
    address?: string
    chain: string
    url: string
  }
}

interface AccountBalanceResponse {
  accountBalance: string
  availableBalance: string
}

interface AddressAssignmentRequest {
  address: string
}

interface AddressAssignmentResponse {
  address: string
}

// HTTP Client with proper error handling and retry logic
class TatumHttpClient {
  private baseUrl: string
  private apiKey: string
  private maxRetries: number = 3
  private retryDelay: number = 1000 // ms

  constructor(baseUrl: string = TATUM_BASE_URL, apiKey: string = TATUM_API_KEY) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    }

    try {
      console.log(`[Tatum API] ${options.method || 'GET'} ${url} (attempt ${attempt})`)
      
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        // Handle rate limiting with exponential backoff
        if (response.status === 429 && attempt <= this.maxRetries) {
          const delayMs = this.retryDelay * Math.pow(2, attempt - 1)
          console.log(`[Tatum API] Rate limited, retrying in ${delayMs}ms...`)
          await this.delay(delayMs)
          return this.makeRequest<T>(endpoint, options, attempt + 1)
        }

        // Handle temporary server errors with retry
        if (response.status >= 500 && attempt <= this.maxRetries) {
          const delayMs = this.retryDelay * Math.pow(2, attempt - 1)
          console.log(`[Tatum API] Server error ${response.status}, retrying in ${delayMs}ms...`)
          await this.delay(delayMs)
          return this.makeRequest<T>(endpoint, options, attempt + 1)
        }

        throw new Error(`Tatum API error (${response.status}): ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      console.log(`[Tatum API] Request successful`)
      return data
    } catch (error) {
      // Retry on network errors
      if (attempt <= this.maxRetries && (error as Error).name === 'TypeError') {
        const delayMs = this.retryDelay * Math.pow(2, attempt - 1)
        console.log(`[Tatum API] Network error, retrying in ${delayMs}ms...`)
        await this.delay(delayMs)
        return this.makeRequest<T>(endpoint, options, attempt + 1)
      }

      console.error(`[Tatum API] Request failed:`, error)
      throw error
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET', headers })
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    })
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    })
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', headers })
  }
}

// Network mapping for Tatum API chain identifiers  
const getChainId = (chainId: string): string => {
  const chainMap: Record<string, string> = {
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    bsc: 'bsc',
    tron: 'tron',
    polygon: 'polygon',
    dogecoin: 'dogecoin',
    litecoin: 'litecoin',
    bcash: 'bitcoin-cash',
  }

  const tatumChainId = chainMap[chainId.toLowerCase()]
  if (!tatumChainId) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  return tatumChainId
}

// Currency mapping for Tatum API
const getCurrencyCode = (chainId: string): string => {
  const currencyMap: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH', 
    bsc: 'BSC',
    tron: 'TRX',
    polygon: 'MATIC',
    dogecoin: 'DOGE',
    litecoin: 'LTC',
    bcash: 'BCH',
  }

  const currency = currencyMap[chainId.toLowerCase()]
  if (!currency) {
    throw new Error(`Unsupported currency for chain: ${chainId}`)
  }

  return currency
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

// Virtual Account Management using raw Tatum API
export class TatumVirtualAccountManager {
  private httpClient: TatumHttpClient

  constructor() {
    this.httpClient = new TatumHttpClient()
  }

  /**
   * Create a virtual account using POST /v3/offchain/account
   */
  async createVirtualAccount(chainId: string, customerId?: string): Promise<VirtualAccountResponse> {
    const currency = getCurrencyCode(chainId)
    
    const requestData: CreateVirtualAccountRequest = {
      currency,
      customer: customerId ? { 
        externalId: customerId,
        accountingCurrency: 'USD' 
      } : undefined,
      compliant: false,
      accountingCurrency: 'USD'
    }

    try {
      console.log(`[Tatum VA] Creating virtual account for ${currency} (${chainId})`)
      const response = await this.httpClient.post<VirtualAccountResponse>(
        '/v3/offchain/account',
        requestData
      )

      console.log(`[Tatum VA] Virtual account created: ${response.id}`)
      return response
    } catch (error) {
      console.error(`Failed to create virtual account for ${chainId}:`, error)
      throw new Error(`Failed to create virtual account: ${(error as Error).message}`)
    }
  }

  /**
   * Generate deposit address using GET /v3/offchain/account/{id}/address
   */
  async generateDepositAddress(accountId: string, addressIndex?: number): Promise<DepositAddressResponse> {
    try {
      console.log(`[Tatum VA] Generating deposit address for account ${accountId}`)
      
      let endpoint = `/v3/offchain/account/${accountId}/address`
      if (addressIndex !== undefined) {
        endpoint += `?index=${addressIndex}`
      }

      const response = await this.httpClient.get<DepositAddressResponse>(endpoint)

      console.log(`[Tatum VA] Deposit address generated: ${response.address}`)
      return response
    } catch (error) {
      console.error(`Failed to generate deposit address for account ${accountId}:`, error)
      throw new Error(`Failed to generate deposit address: ${(error as Error).message}`)
    }
  }

  /**
   * Get account balance using GET /v3/offchain/account/{id}/balance
   */
  async getAccountBalance(accountId: string): Promise<AccountBalanceResponse> {
    try {
      console.log(`[Tatum VA] Getting balance for account ${accountId}`)
      
      const response = await this.httpClient.get<AccountBalanceResponse>(
        `/v3/offchain/account/${accountId}/balance`
      )

      console.log(`[Tatum VA] Account balance: ${response.accountBalance}`)
      return response
    } catch (error) {
      console.error(`Failed to get balance for account ${accountId}:`, error)
      throw new Error(`Failed to get account balance: ${(error as Error).message}`)
    }
  }

  /**
   * Assign external address to account using POST /v3/offchain/account/{id}/address
   */
  async assignAddress(accountId: string, address: string): Promise<AddressAssignmentResponse> {
    try {
      console.log(`[Tatum VA] Assigning address ${address} to account ${accountId}`)
      
      const response = await this.httpClient.post<AddressAssignmentResponse>(
        `/v3/offchain/account/${accountId}/address`,
        { address }
      )

      console.log(`[Tatum VA] Address assigned successfully`)
      return response
    } catch (error) {
      console.error(`Failed to assign address to account ${accountId}:`, error)
      throw new Error(`Failed to assign address: ${(error as Error).message}`)
    }
  }

  /**
   * Get account by address using GET /v3/offchain/account/address/{address}/{currency}
   */
  async getAccountByAddress(address: string, currency: string): Promise<VirtualAccountResponse | null> {
    try {
      console.log(`[Tatum VA] Getting account for address ${address} (${currency})`)
      
      const response = await this.httpClient.get<VirtualAccountResponse>(
        `/v3/offchain/account/address/${address}/${currency}`
      )

      return response
    } catch (error) {
      // Address not assigned to any account returns 404
      if ((error as Error).message.includes('404')) {
        return null
      }
      
      console.error(`Failed to get account for address ${address}:`, error)
      throw new Error(`Failed to get account by address: ${(error as Error).message}`)
    }
  }

  /**
   * Create webhook subscription using POST /v4/subscription
   */
  async createWebhookSubscription(
    chainId: string, 
    address: string, 
    webhookUrl: string
  ): Promise<WebhookSubscriptionResponse> {
    const chain = getChainId(chainId)

    const requestData: WebhookSubscriptionRequest = {
      type: 'ADDRESS_TRANSACTION',
      attr: {
        address,
        chain,
        url: webhookUrl
      }
    }

    try {
      console.log(`[Tatum Webhook] Creating subscription for ${address} on ${chain}`)
      
      const response = await this.httpClient.post<WebhookSubscriptionResponse>(
        '/v4/subscription',
        requestData
      )

      console.log(`[Tatum Webhook] Subscription created: ${response.id}`)
      return response
    } catch (error) {
      console.error(`Failed to create webhook subscription for ${address}:`, error)
      throw new Error(`Failed to create webhook subscription: ${(error as Error).message}`)
    }
  }

  /**
   * Delete webhook subscription using DELETE /v4/subscription/{id}
   */
  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log(`[Tatum Webhook] Deleting subscription ${subscriptionId}`)
      
      await this.httpClient.delete(`/v4/subscription/${subscriptionId}`)

      console.log(`[Tatum Webhook] Subscription deleted successfully`)
    } catch (error) {
      console.error(`Failed to delete webhook subscription ${subscriptionId}:`, error)
      throw new Error(`Failed to delete webhook subscription: ${(error as Error).message}`)
    }
  }

  /**
   * Get all webhook subscriptions using GET /v4/subscription
   */
  async getWebhookSubscriptions(): Promise<WebhookSubscriptionResponse[]> {
    try {
      console.log(`[Tatum Webhook] Getting all subscriptions`)
      
      const response = await this.httpClient.get<WebhookSubscriptionResponse[]>('/v4/subscription')

      console.log(`[Tatum Webhook] Found ${response.length} subscriptions`)
      return response
    } catch (error) {
      console.error(`Failed to get webhook subscriptions:`, error)
      throw new Error(`Failed to get webhook subscriptions: ${(error as Error).message}`)
    }
  }
}

// Singleton instance
export const tatumVAManager = new TatumVirtualAccountManager()

// Export HTTP client for advanced usage
export const tatumHttpClient = new TatumHttpClient()

// Export utility functions
export { getChainId, getCurrencyCode }