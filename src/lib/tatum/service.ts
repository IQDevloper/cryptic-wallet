/*
High-level Tatum service that provides business logic integration
with virtual accounts, webhooks, and payment processing
*/

import { PrismaClient, Merchant, Currency, Network, Wallet, Invoice } from '@prisma/client'
import { tatumVAManager, getCurrencyCode, getChainId } from './client'

// Extended types with relations
type MerchantWithWallets = Merchant & {
  wallets: (Wallet & {
    currency: Currency & {
      network: Network
    }
  })[]
}

type CurrencyWithNetwork = Currency & {
  network: Network
}

interface InvoiceSetupRequest {
  merchantId: string
  currency: string
  amount: string
  description?: string
  orderId?: string
  customData?: any
  expiresIn?: number // seconds
  notifyUrl?: string
  redirectUrl?: string
  returnUrl?: string
}

interface InvoiceSetupResult {
  invoice: Invoice
  depositAddress: string
  qrCodeData: string
  webhookSubscriptionId?: string
}

interface WebhookSetupOptions {
  address: string
  chainId: string
  webhookUrl: string
}

export class TatumPaymentService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Setup merchant wallets for all supported currencies
   * This creates virtual accounts for each currency the merchant wants to accept
   */
  async setupMerchantWallets(merchantId: string, currencyCodes: string[]): Promise<Wallet[]> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { wallets: true }
    })

    if (!merchant) {
      throw new Error(`Merchant ${merchantId} not found`)
    }

    const currencies = await this.prisma.currency.findMany({
      where: {
        code: { in: currencyCodes },
        isActive: true
      },
      include: { network: true }
    })

    const createdWallets: Wallet[] = []

    for (const currency of currencies) {
      // Skip if wallet already exists
      const existingWallet = merchant.wallets.find(w => w.currencyId === currency.id)
      if (existingWallet) {
        console.log(`[Tatum Service] Wallet for ${currency.code} already exists`)
        continue
      }

      try {
        console.log(`[Tatum Service] Creating wallet for ${currency.code} (${currency.network.tatumChainId})`)

        // Create virtual account with Tatum
        const account = await tatumVAManager.createVirtualAccount(
          currency.network.tatumChainId,
          merchantId
        )

        // Store wallet in database
        const wallet = await this.prisma.wallet.create({
          data: {
            tatumAccountId: account.id,
            merchantId,
            currencyId: currency.id,
            balance: 0,
            pendingBalance: 0,
            lockedBalance: 0
          }
        })

        createdWallets.push(wallet)
        console.log(`[Tatum Service] Wallet created: ${wallet.id} for ${currency.code}`)
      } catch (error) {
        console.error(`[Tatum Service] Failed to create wallet for ${currency.code}:`, error)
        throw error
      }
    }

    return createdWallets
  }

  /**
   * Setup a complete invoice with Tatum integration
   * This handles virtual account creation, address generation, and webhook setup
   */
  async setupInvoicePayment(request: InvoiceSetupRequest): Promise<InvoiceSetupResult> {
    // Find currency with network
    const currency = await this.prisma.currency.findFirst({
      where: {
        OR: [
          { code: request.currency.toUpperCase() },
          { symbol: request.currency.toUpperCase() }
        ],
        isActive: true
      },
      include: { network: true }
    })

    if (!currency) {
      throw new Error(`Unsupported currency: ${request.currency}`)
    }

    // Ensure merchant has a wallet for this currency
    let wallet = await this.prisma.wallet.findFirst({
      where: {
        merchantId: request.merchantId,
        currencyId: currency.id
      }
    })

    if (!wallet) {
      console.log(`[Tatum Service] Creating new wallet for merchant ${request.merchantId}, currency ${currency.code}`)
      
      const account = await tatumVAManager.createVirtualAccount(
        currency.network.tatumChainId,
        request.merchantId
      )

      wallet = await this.prisma.wallet.create({
        data: {
          tatumAccountId: account.id,
          merchantId: request.merchantId,
          currencyId: currency.id
        }
      })
    }

    // Generate unique deposit address for this invoice
    const addressResult = await tatumVAManager.generateDepositAddress(wallet.tatumAccountId)

    // Create QR code data with amount
    const qrCodeData = this.generateQRCodeData(currency, addressResult.address, request.amount)

    // Calculate expiration
    const expiresAt = new Date(Date.now() + (request.expiresIn || 3600) * 1000)

    // Create invoice in database
    const invoice = await this.prisma.invoice.create({
      data: {
        amount: parseFloat(request.amount),
        currency: request.currency.toUpperCase(),
        description: request.description,
        orderId: request.orderId,
        customData: request.customData,
        depositAddress: addressResult.address,
        memo: addressResult.memo, // For chains that require memo/tag
        qrCodeData,
        expiresAt,
        notifyUrl: request.notifyUrl,
        redirectUrl: request.redirectUrl,
        returnUrl: request.returnUrl,
        merchantId: request.merchantId,
        walletId: wallet.id
      }
    })

    // Setup webhook subscription for real-time notifications
    let webhookSubscriptionId: string | undefined
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhook/tatum'
      if (webhookUrl && !webhookUrl.includes('localhost')) {
        const subscription = await tatumVAManager.createWebhookSubscription(
          currency.network.tatumChainId,
          addressResult.address,
          webhookUrl
        )
        webhookSubscriptionId = subscription.id

        // Store subscription ID in database for cleanup later
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            customData: {
              ...invoice.customData as object,
              tatumSubscriptionId: webhookSubscriptionId
            }
          }
        })
        
        console.log(`[Tatum Service] Webhook subscription created: ${webhookSubscriptionId}`)
      }
    } catch (error) {
      console.error('[Tatum Service] Failed to setup webhook subscription:', error)
      // Don't fail invoice creation if webhook setup fails
    }

    return {
      invoice,
      depositAddress: addressResult.address,
      qrCodeData,
      webhookSubscriptionId
    }
  }

  /**
   * Synchronize wallet balance with Tatum virtual account
   */
  async syncWalletBalance(walletId: string): Promise<{ previous: number, current: number, difference: number }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId }
    })

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`)
    }

    try {
      // Get current balance from Tatum
      const tatumBalance = await tatumVAManager.getAccountBalance(wallet.tatumAccountId)
      const currentBalance = parseFloat(tatumBalance.accountBalance)
      const previousBalance = parseFloat(wallet.balance.toString())

      // Update local balance if different
      if (currentBalance !== previousBalance) {
        await this.prisma.wallet.update({
          where: { id: walletId },
          data: { 
            balance: currentBalance,
            lastBalanceUpdate: new Date()
          }
        })

        // Create balance history record
        await this.prisma.balanceHistory.create({
          data: {
            walletId,
            balanceBefore: previousBalance,
            balanceAfter: currentBalance,
            amountChange: currentBalance - previousBalance,
            changeType: currentBalance > previousBalance ? 'DEPOSIT' : 'WITHDRAWAL',
            description: 'Tatum balance synchronization',
            reference: `sync-${Date.now()}`
          }
        })

        console.log(`[Tatum Service] Balance synced for wallet ${walletId}: ${previousBalance} → ${currentBalance}`)
      }

      return {
        previous: previousBalance,
        current: currentBalance,
        difference: currentBalance - previousBalance
      }
    } catch (error) {
      console.error(`[Tatum Service] Failed to sync balance for wallet ${walletId}:`, error)
      throw error
    }
  }

  /**
   * Cleanup webhook subscription when invoice expires or is cancelled
   */
  async cleanupInvoiceWebhook(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice || !invoice.customData) {
      return
    }

    const customData = invoice.customData as any
    const subscriptionId = customData.tatumSubscriptionId

    if (subscriptionId) {
      try {
        await tatumVAManager.deleteWebhookSubscription(subscriptionId)
        console.log(`[Tatum Service] Cleaned up webhook subscription: ${subscriptionId}`)

        // Remove subscription ID from custom data
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            customData: {
              ...customData,
              tatumSubscriptionId: undefined
            }
          }
        })
      } catch (error) {
        console.error(`[Tatum Service] Failed to cleanup webhook subscription ${subscriptionId}:`, error)
      }
    }
  }

  /**
   * Get account information by deposit address
   */
  async getAccountByAddress(address: string, currency: string): Promise<any> {
    try {
      const currencyCode = getCurrencyCode(currency)
      return await tatumVAManager.getAccountByAddress(address, currencyCode)
    } catch (error) {
      console.error(`[Tatum Service] Failed to get account for address ${address}:`, error)
      return null
    }
  }

  /**
   * Bulk synchronize all merchant wallet balances
   */
  async syncAllMerchantWallets(merchantId: string): Promise<Array<{walletId: string, currency: string, syncResult: any}>> {
    const wallets = await this.prisma.wallet.findMany({
      where: { merchantId },
      include: {
        currency: {
          include: { network: true }
        }
      }
    })

    const results = []

    for (const wallet of wallets) {
      try {
        const syncResult = await this.syncWalletBalance(wallet.id)
        results.push({
          walletId: wallet.id,
          currency: wallet.currency.code,
          syncResult
        })
      } catch (error) {
        console.error(`[Tatum Service] Failed to sync wallet ${wallet.id}:`, error)
        results.push({
          walletId: wallet.id,
          currency: wallet.currency.code,
          syncResult: { error: (error as Error).message }
        })
      }
    }

    return results
  }

  /**
   * Generate QR code data for payment
   */
  private generateQRCodeData(currency: CurrencyWithNetwork, address: string, amount: string): string {
    const symbol = currency.symbol.toLowerCase()
    
    // Different chains have different URI formats
    switch (currency.network.tatumChainId) {
      case 'bitcoin':
      case 'bitcoin-cash':
      case 'litecoin':
      case 'dogecoin':
        return `${symbol}:${address}?amount=${amount}`
      case 'ethereum':
      case 'bsc':
      case 'polygon':
        return `${symbol}:${address}?value=${amount}`
      case 'tron':
        return `${symbol}:${address}?amount=${amount}`
      default:
        return `${symbol}:${address}?amount=${amount}`
    }
  }

  /**
   * Health check for Tatum service connectivity
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy',
    details: any
  }> {
    try {
      // Try to get webhook subscriptions as a connectivity test
      const subscriptions = await tatumVAManager.getWebhookSubscriptions()
      
      return {
        status: 'healthy',
        details: {
          subscriptionCount: subscriptions.length,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('[Tatum Service] Health check failed:', error)
      
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}

// Export singleton instance
export const tatumPaymentService = (prisma: PrismaClient) => new TatumPaymentService(prisma)