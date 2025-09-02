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
  xpub?: string // Required for cryptocurrency accounts
}

interface CreateVirtualAccountBatchRequest {
  accounts: CreateVirtualAccountRequest[]
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
  type: 'INCOMING_NATIVE_TX' | 'OUTGOING_NATIVE_TX' | 'INCOMING_FUNGIBLE_TX' | 'OUTGOING_FUNGIBLE_TX'
  attr: {
    address: string
    chain: string
    url: string
    contractAddress?: string  // Required for fungible tokens
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

  constructor(baseUrl: string = TATUM_BASE_URL, apiKey: string = TATUM_API_KEY!) {
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

        // Log full error details for debugging
        console.error(`[Tatum API] Error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorData,
          endpoint,
          method: options.method || 'GET'
        })

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

        // Include more detail in error message
        const errorMessage = errorData.data 
          ? `${errorData.message || response.statusText}. Details: ${JSON.stringify(errorData.data)}`
          : errorData.message || response.statusText

        throw new Error(`Tatum API error (${response.status}): ${errorMessage}`)
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
    bsc: 'BNB',  // BSC native currency is BNB
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
   * Check if currency is the native currency for a given chain
   */
  private isNativeCurrency(currency: string, chainId: string): boolean {
    const nativeMap: Record<string, string> = {
      // Mainnet
      bitcoin: 'BTC',
      'bitcoin-omni': 'BTC',
      ethereum: 'ETH', 
      bsc: 'BNB',
      tron: 'TRX',
      polygon: 'MATIC',
      arbitrum: 'ETH', // Arbitrum's native currency is ETH
      solana: 'SOL',
      sui: 'SUI',
      dogecoin: 'DOGE',
      litecoin: 'LTC',
      dash: 'DASH',
      bcash: 'BCH',
      // Testnet
      'bitcoin-testnet': 'BTC',
      'ethereum-sepolia': 'ETH',
      'ethereum-testnet': 'ETH',
      'bsc-testnet': 'BNB',
      'polygon-amoy': 'MATIC',
      'arbitrum-sepolia': 'ETH',
      'tron-testnet': 'TRX',
      'tron-shasta': 'TRX',
      'solana-devnet': 'SOL',
      'sui-testnet': 'SUI',
    }
    
    return nativeMap[chainId.toLowerCase()] === currency.toUpperCase()
  }

  /**
   * Check if the provided string is already a standard currency code
   */
  private isStandardCurrencyCode(code: string): boolean {
    const standardCurrencies = ['BTC', 'ETH', 'USDT', 'MATIC', 'TRX', 'BNB', 'DOGE', 'LTC', 'BCH']
    return standardCurrencies.includes(code.toUpperCase())
  }

  /**
   * Check if the currency is supported by Tatum virtual accounts
   * Based on Tatum API documentation and testing
   */
  private isSupportedVirtualAccountCurrency(code: string): boolean {
    // From Tatum docs: Native blockchain assets, digital assets, and virtual currencies are supported
    // These are the currencies that work with virtual accounts based on documentation
    const supportedCurrencies = [
      // Native blockchain assets
      'BTC', 'ETH', 'LTC', 'DOGE', 'BCH', 'ADA', 'XRP', 'ALGO',
      // Digital assets / Stablecoins
      'USDT', 'USDC', 'BUSD', 'DAI',
      // Some other supported tokens
      'LINK', 'UNI', 'AAVE'
    ]
    return supportedCurrencies.includes(code.toUpperCase())
  }

  /**
   * Get additional parameters required for specific currencies
   */
  private getCurrencySpecificParams(currency: string): Partial<CreateVirtualAccountRequest> {
    const params: Partial<CreateVirtualAccountRequest> = {}
    
    // For cryptocurrencies that need special handling
    switch (currency.toUpperCase()) {
      case 'BTC':
      case 'LTC':
      case 'DOGE':
      case 'BCH':
        // Bitcoin-like currencies might need xpub for HD wallets
        // For now, we'll create accounts without xpub (custodial accounts)
        params.compliant = false
        break
      case 'ETH':
      case 'USDT':
      case 'USDC':
        // Ethereum-based currencies
        params.compliant = false
        break
      default:
        params.compliant = false
    }
    
    return params
  }

  /**
   * Create a virtual account using POST /v3/ledger/account
   * Creates a new virtual account for the specified currency and customer
   */
  async createVirtualAccount(currencyCode: string, customerId?: string): Promise<VirtualAccountResponse> {
    // If it's a standard currency code (USDT, BTC, ETH), use it directly
    // If it's a chain ID, map it to currency code
    const currency = this.isStandardCurrencyCode(currencyCode) 
      ? currencyCode 
      : getCurrencyCode(currencyCode)

    // Check if currency is supported for virtual accounts
    if (!this.isSupportedVirtualAccountCurrency(currency)) {
      const supportedList = ['BTC', 'ETH', 'LTC', 'DOGE', 'BCH', 'ADA', 'XRP', 'ALGO', 'USDT', 'USDC', 'BUSD', 'DAI', 'LINK', 'UNI', 'AAVE']
      throw new Error(`Currency ${currency} is not supported for Tatum virtual accounts. Supported currencies: ${supportedList.join(', ')}`)
    }
    
    // Get currency-specific parameters
    const currencyParams = this.getCurrencySpecificParams(currency)
    
    const requestData: CreateVirtualAccountRequest = {
      currency,
      customer: customerId ? { 
        externalId: customerId,
        accountingCurrency: 'USD' 
      } : undefined,
      accountingCurrency: 'USD',
      ...currencyParams
    }

    try {
      console.log(`[Tatum VA] Creating virtual account for ${currency}`)
      const response = await this.httpClient.post<VirtualAccountResponse>(
        '/v3/ledger/account',
        requestData
      )

      console.log(`[Tatum VA] Virtual account created: ${response.id}`)
      return response
    } catch (error) {
      console.error(`Failed to create virtual account for ${currency}:`, error)
      throw new Error(`Failed to create virtual account: ${(error as Error).message}`)
    }
  }

  /**
   * Create multiple virtual accounts in batch using POST /v3/ledger/account/batch
   * More efficient than creating accounts one by one
   */
  async createVirtualAccountsBatch(
    currencies: { currency: string, customerId?: string }[]
  ): Promise<{ successful: VirtualAccountResponse[], failed: { currency: string, error: string }[] }> {
    const accounts: CreateVirtualAccountRequest[] = []
    const unsupportedCurrencies: { currency: string, error: string }[] = []
    
    // Prepare accounts for supported currencies
    for (const { currency: currencyCode, customerId } of currencies) {
      const currency = this.isStandardCurrencyCode(currencyCode) 
        ? currencyCode 
        : getCurrencyCode(currencyCode)
        
      if (!this.isSupportedVirtualAccountCurrency(currency)) {
        const supportedList = ['BTC', 'ETH', 'LTC', 'DOGE', 'BCH', 'ADA', 'XRP', 'ALGO', 'USDT', 'USDC', 'BUSD', 'DAI', 'LINK', 'UNI', 'AAVE']
        unsupportedCurrencies.push({
          currency,
          error: `Currency ${currency} is not supported for Tatum virtual accounts. Supported: ${supportedList.join(', ')}`
        })
        continue
      }
      
      const currencyParams = this.getCurrencySpecificParams(currency)
      
      accounts.push({
        currency,
        customer: customerId ? { 
          externalId: customerId,
          accountingCurrency: 'USD' 
        } : undefined,
        accountingCurrency: 'USD',
        ...currencyParams
      })
    }
    
    if (accounts.length === 0) {
      return { successful: [], failed: unsupportedCurrencies }
    }
    
    try {
      console.log(`[Tatum VA] Creating ${accounts.length} virtual accounts in batch`)
      
      const response = await this.httpClient.post<VirtualAccountResponse[]>(
        '/v3/ledger/account/batch',
        { accounts }
      )
      
      console.log(`[Tatum VA] Batch created ${response.length} virtual accounts`)
      return { 
        successful: response, 
        failed: unsupportedCurrencies 
      }
    } catch (error) {
      console.error('Failed to create virtual accounts in batch:', error)
      // If batch fails, fall back to individual creation for debugging
      const successful: VirtualAccountResponse[] = []
      const failed = [...unsupportedCurrencies]
      
      for (const accountData of accounts) {
        try {
          const account = await this.createVirtualAccount(accountData.currency, accountData.customer?.externalId)
          successful.push(account)
        } catch (individualError) {
          failed.push({
            currency: accountData.currency,
            error: (individualError as Error).message
          })
        }
      }
      
      return { successful, failed }
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
    webhookUrl: string,
    currency: string,
    contractAddress?: string
  ): Promise<WebhookSubscriptionResponse> {
    // Map chain to Tatum v4 format
    const chainMap: Record<string, string> = {
      // Mainnet chains - use short format
      bitcoin: 'BTC',
      'bitcoin-omni': 'BTC', // Bitcoin Omni layer
      ethereum: 'ETH',
      bsc: 'BSC',
      tron: 'TRON',
      polygon: 'MATIC',
      arbitrum: 'ARBITRUM',
      solana: 'SOL',
      sui: 'SUI',
      dogecoin: 'DOGE',
      litecoin: 'LTC',
      dash: 'DASH',
      bcash: 'BCH',
      // Testnet chains - use full format
      'bitcoin-testnet': 'bitcoin-testnet',
      'ethereum-sepolia': 'ethereum-sepolia',
      'ethereum-testnet': 'ethereum-sepolia',
      'bsc-testnet': 'bsc-testnet',
      'polygon-amoy': 'polygon-amoy',
      'arbitrum-sepolia': 'arbitrum-sepolia',
      'tron-testnet': 'tron-testnet',
      'tron-shasta': 'tron-testnet',
      'solana-devnet': 'solana-devnet',
      'sui-testnet': 'sui-testnet',
    }

    const chain = chainMap[chainId.toLowerCase()]
    if (!chain) {
      console.error(`[Tatum Webhook] Unsupported chain: ${chainId}`)
      console.error(`[Tatum Webhook] Available chains:`, Object.keys(chainMap))
      throw new Error(`Unsupported chain for webhooks: ${chainId}. Supported: ${Object.keys(chainMap).join(', ')}`)
    }

    // Determine subscription type based on currency and chain
    let subscriptionType: WebhookSubscriptionRequest['type']
    const isNativeToken = this.isNativeCurrency(currency, chainId)
    
    if (isNativeToken) {
      // Monitor native token transfers (ETH, BTC, BNB, etc.)
      subscriptionType = 'INCOMING_NATIVE_TX'
    } else {
      // Monitor token transfers (USDT, USDC, etc.)
      subscriptionType = 'INCOMING_FUNGIBLE_TX'
    }

    // Build the request data differently based on subscription type
    const requestData: WebhookSubscriptionRequest = {
      type: subscriptionType,
      attr: {
        address,
        chain,
        url: webhookUrl,
        // For INCOMING_FUNGIBLE_TX, contractAddress should NOT be included in attr
        // Tatum monitors all ERC-20 tokens on the address automatically
      }
    }

    try {
      console.log(`[Tatum Webhook] Creating ${subscriptionType} subscription for ${address} on ${chain}`, {
        currency,
        contractAddress,
        isNative: isNativeToken
      })
      
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
