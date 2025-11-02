import { PrismaClient } from '@prisma/client'
import { tatumVAManager } from './client'

const prisma = new PrismaClient()

interface TatumSubscriptionRequest {
  address: string
  chain: string
  invoiceId: string
  currency: string  // "ETH", "USDT", "BTC", etc.
  contractAddress?: string  // Required for tokens like USDT
}

interface TatumWebhookPayload {
  address: string
  amount: string
  asset: string  // "ETH", "BTC", etc.
  blockNumber: number
  counterAddress: string  // The sender address
  txId: string
  type: string  // "native" or "token"
  chain: string  // "ethereum-mainnet", etc.
  subscriptionType: string  // "ADDRESS_EVENT"
  metadata?: Record<string, any>
}

export class TatumNotificationService {
  private readonly webhookBaseUrl: string

  constructor() {
    if (!process.env.WEBHOOK_BASE_URL) {
      console.error('❌ WEBHOOK_BASE_URL environment variable is not set!')
      console.error('   Add to .env: WEBHOOK_BASE_URL=https://your-domain.com')
      console.error('   For local dev: Use ngrok and set WEBHOOK_BASE_URL=https://abc123.ngrok.io')
      throw new Error('WEBHOOK_BASE_URL environment variable is required')
    }
    this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL

    console.log(`🌐 [WEBHOOK] Base URL: ${this.webhookBaseUrl}`)

    // Start cleanup process if not already running
    if (process.env.NODE_ENV === 'production') {
      this.startPeriodicCleanup()
    }
  }

  /**
   * Create a Tatum subscription for a derived address
   */
  async createSubscription(request: TatumSubscriptionRequest): Promise<string> {
    try {
      console.log(`📡 Creating Tatum subscription for address: ${request.address} (${request.chain})`)

      // Ensure webhook URL is properly formatted
      let webhookUrl = `${this.webhookBaseUrl}/api/webhook/tatum/payment/${request.invoiceId}`
      
      // Tatum requires a publicly accessible URL
      if (webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1')) {
        console.warn('⚠️ Localhost URL detected. Tatum requires a publicly accessible URL.')
        console.warn('💡 Use ngrok or similar service: ngrok http 3000')
        console.warn('💡 Then update WEBHOOK_BASE_URL in .env with the public URL')
        
        // For testing, use a placeholder URL (webhook won't work but subscription will be created)
        webhookUrl = `https://webhook.site/${request.invoiceId}`
        console.warn(`🔄 Using placeholder URL for testing: ${webhookUrl}`)
      }
      
      // Tatum requires HTTPS
      if (webhookUrl.startsWith('http://')) {
        webhookUrl = webhookUrl.replace('http://', 'https://')
      }
      
      console.log(`🔗 Webhook URL: ${webhookUrl}`)

      const subscription = await tatumVAManager.createWebhookSubscription(
        request.chain,
        request.address,
        webhookUrl,
        request.currency,
        request.contractAddress
      )

      console.log(`✅ Subscription created: ${subscription.id}`)
      return subscription.id

    } catch (error) {
      console.error('❌ Failed to create Tatum subscription:', error)
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Remove a Tatum subscription
   */
  async removeSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log(`🗑️ Removing Tatum subscription: ${subscriptionId}`)
      
      await tatumVAManager.deleteWebhookSubscription(subscriptionId)
      
      console.log(`✅ Subscription removed: ${subscriptionId}`)
    } catch (error) {
      console.error(`❌ Failed to remove subscription ${subscriptionId}:`, error)
      // Don't throw - subscription might already be expired/removed
    }
  }

  /**
   * Process incoming webhook notification
   */
  async processWebhookNotification(
    invoiceId: string, 
    webhookPayload: TatumWebhookPayload
  ): Promise<void> {
    try {
      console.log(`🔔 Processing webhook for invoice: ${invoiceId}`)

      // Find the invoice and its payment address
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          paymentAddress: true,
          merchant: true
        }
      })

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`)
      }

      // Verify the address matches
      if (invoice.paymentAddress.address.toLowerCase() !== webhookPayload.address.toLowerCase()) {
        throw new Error(`Address mismatch: expected ${invoice.paymentAddress.address}, got ${webhookPayload.address}`)
      }

      // Create webhook notification record
      await prisma.webhookNotification.create({
        data: {
          paymentAddressId: invoice.paymentAddressId,
          invoiceId: invoice.id,
          txHash: webhookPayload.txId,
          amount: parseFloat(webhookPayload.amount),
          blockNumber: webhookPayload.blockNumber ? BigInt(webhookPayload.blockNumber) : null,
          confirmations: this.calculateConfirmations(webhookPayload),
          chain: webhookPayload.chain,
          status: webhookPayload.blockNumber ? 'CONFIRMED' : 'PENDING',
          webhookPayload: webhookPayload as any,
          processedAt: new Date()
        }
      })

      // Update payment address activity
      await prisma.paymentAddress.update({
        where: { id: invoice.paymentAddressId },
        data: {
          lastSeenAt: new Date(),
          firstSeenAt: invoice.paymentAddress.firstSeenAt || new Date()
        }
      })

      // Process payment if confirmed (has block number)
      if (webhookPayload.blockNumber && webhookPayload.blockNumber > 0) {
        await this.processConfirmedPayment(invoice, webhookPayload)
      }

      console.log(`✅ Webhook processed successfully for invoice: ${invoiceId}`)

    } catch (error) {
      console.error(`❌ Failed to process webhook for invoice ${invoiceId}:`, error)
      throw error
    }
  }

  /**
   * Process confirmed payment and update balances
   */
  private async processConfirmedPayment(
    invoice: any,
    webhookPayload: TatumWebhookPayload
  ): Promise<void> {
    const paymentAmount = parseFloat(webhookPayload.amount)
    
    await prisma.$transaction(async (tx) => {
      // Update invoice status
      const invoiceStatus = this.determineInvoiceStatus(invoice.amount, paymentAmount)
      
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invoiceStatus,
          amountPaid: { increment: paymentAmount },
          paidAt: invoiceStatus === 'PAID' ? new Date() : invoice.paidAt,
          confirmedAt: new Date()
        }
      })

      // Update merchant wallet balance for this currency/network
      try {
        // Get the asset network associated with this invoice's payment address
        const paymentAddress = await tx.paymentAddress.findUnique({
          where: { id: invoice.paymentAddressId },
          include: { assetNetwork: true }
        })

        if (!paymentAddress) {
          throw new Error(`Payment address not found for invoice ${invoice.id}`)
        }

        // Find existing merchant wallet or create one
        let merchantWallet = await tx.merchantWallet.findFirst({
          where: {
            merchantId: invoice.merchantId,
            assetNetworkId: paymentAddress.assetNetworkId
          }
        })

        if (!merchantWallet) {
          // Create merchant wallet if it doesn't exist
          merchantWallet = await tx.merchantWallet.create({
            data: {
              merchantId: invoice.merchantId,
              assetNetworkId: paymentAddress.assetNetworkId,
              availableBalance: 0,
              pendingBalance: 0,
              lockedBalance: 0
            }
          })
          console.log(`💰 Created new merchant wallet for ${webhookPayload.asset}`)
        }

        // Update merchant wallet balance
        await tx.merchantWallet.update({
          where: { id: merchantWallet.id },
          data: {
            availableBalance: { increment: paymentAmount }
          }
        })

        console.log(`💰 Updated merchant wallet: +${paymentAmount} ${webhookPayload.asset} for merchant ${invoice.merchantId}`)

      } catch (balanceError) {
        console.error(`❌ Failed to update merchant wallet:`, balanceError)
        // Continue with payment processing even if balance update fails
      }

      // Create transaction record
      await tx.transaction.create({
        data: {
          txHash: webhookPayload.txId,
          amount: paymentAmount,
          blockNumber: webhookPayload.blockNumber ? BigInt(webhookPayload.blockNumber) : null,
          confirmations: this.calculateConfirmations(webhookPayload),
          status: 'CONFIRMED',
          invoiceId: invoice.id,
          fromAddress: webhookPayload.counterAddress,
          toAddress: webhookPayload.address,
          processedAt: new Date()
        }
      })
    })

    // Log successful payment processing (subscriptions not needed with KMS system)
    const invoiceStatus = this.determineInvoiceStatus(invoice.amount, invoice.amountPaid + paymentAmount)
    console.log(`✅ Payment processed successfully: ${invoiceStatus} for invoice ${invoice.id}`)

    // Send webhook to merchant if configured
    if (invoice.merchant.webhookUrl) {
      await this.sendMerchantWebhook(invoice, webhookPayload)
    }

    console.log(`💰 Payment processed: ${paymentAmount} ${webhookPayload.asset} for invoice ${invoice.id}`)
  }

  /**
   * Send webhook notification to merchant
   */
  private async sendMerchantWebhook(invoice: any, webhookPayload: TatumWebhookPayload): Promise<void> {
    try {
      const merchantWebhookData = {
        event: 'invoice.payment_received',
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        amount: webhookPayload.amount,
        currency: webhookPayload.asset,
        txHash: webhookPayload.txId,
        blockNumber: webhookPayload.blockNumber,
        confirmed: webhookPayload.blockNumber > 0,
        timestamp: new Date().toISOString()
      }

      const response = await fetch(invoice.merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'cryptic-gateway'
        },
        body: JSON.stringify(merchantWebhookData)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }

      console.log(`📤 Merchant webhook sent successfully to ${invoice.merchant.webhookUrl}`)

    } catch (error) {
      console.error(`❌ Failed to send merchant webhook:`, error)
      // Don't throw - webhook failure shouldn't block payment processing
    }
  }

  /**
   * Calculate confirmation count based on webhook data
   */
  private calculateConfirmations(webhookPayload: TatumWebhookPayload): number {
    // Tatum v4 ADDRESS_EVENT webhooks come with blockNumber when confirmed
    // For EVM chains, 1 confirmation triggers the webhook
    // For UTXO chains, 2 confirmations trigger the webhook
    if (webhookPayload.blockNumber && webhookPayload.blockNumber > 0) {
      const utxoAssets = ['BTC', 'LTC', 'BCH', 'DOGE']
      if (utxoAssets.includes(webhookPayload.asset)) {
        return 2 // UTXO chains have 2 confirmations when webhook fires
      }
      return 1 // EVM chains have 1 confirmation when webhook fires
    }
    return 0 // No block number means unconfirmed/mempool transaction
  }

  /**
   * Determine invoice status based on payment amount
   */
  private determineInvoiceStatus(invoiceAmount: any, paymentAmount: number): 'PAID' | 'UNDERPAID' | 'PENDING' {
    const expectedAmount = parseFloat(invoiceAmount.toString())
    const tolerance = 0.000001 // Small tolerance for floating point precision

    if (paymentAmount >= expectedAmount - tolerance) {
      return 'PAID'
    } else if (paymentAmount > 0) {
      return 'UNDERPAID'
    }
    return 'PENDING'
  }

  /**
   * Cleanup expired invoices (KMS system - no subscriptions needed)
   */
  async cleanupExpiredInvoices(): Promise<void> {
    try {
      console.log('🧹 Cleaning up expired invoices...')

      // Find expired invoices
      const expiredInvoices = await prisma.invoice.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: ['PENDING', 'UNDERPAID'] }
        }
      })

      console.log(`Found ${expiredInvoices.length} expired invoices to cleanup`)

      // Update expired invoices status
      if (expiredInvoices.length > 0) {
        await prisma.invoice.updateMany({
          where: {
            id: { in: expiredInvoices.map(inv => inv.id) }
          },
          data: { status: 'EXPIRED' }
        })
      }

      console.log(`✅ Cleaned up ${expiredInvoices.length} expired invoices`)

    } catch (error) {
      console.error('❌ Failed to cleanup expired invoices:', error)
    }
  }

  /**
   * Get webhook system health status
   */
  async getSystemHealth(): Promise<{
    totalAddresses: number
    totalNotifications: number
    recentActivity: number
  }> {
    const [addressCount, totalNotifications, recentActivity] = await Promise.all([
      prisma.paymentAddress.count(),
      prisma.webhookNotification.count(),
      prisma.webhookNotification.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ])

    return {
      totalAddresses: addressCount,
      totalNotifications,
      recentActivity
    }
  }

  /**
   * Start periodic cleanup process for expired invoices
   * Runs every 4 hours in production
   */
  private startPeriodicCleanup(): void {
    const CLEANUP_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

    setInterval(async () => {
      try {
        console.log('🧹 [CLEANUP] Starting periodic invoice cleanup...')
        await this.cleanupExpiredInvoices()
        console.log('✅ [CLEANUP] Periodic cleanup completed')
      } catch (error) {
        console.error('❌ [CLEANUP] Periodic cleanup failed:', error)
      }
    }, CLEANUP_INTERVAL)

    console.log(`🔄 [CLEANUP] Periodic cleanup started (every ${CLEANUP_INTERVAL / 1000 / 60} minutes)`)
  }

  /**
   * Force cleanup of all expired invoices (manual trigger)
   */
  async forceCleanup(): Promise<{
    cleaned: number
    errors: number
    duration: number
  }> {
    const startTime = Date.now()
    let cleaned = 0
    let errors = 0

    try {
      console.log('🧹 [FORCE-CLEANUP] Starting comprehensive invoice cleanup...')

      // Find all expired invoices
      const expiredInvoices = await prisma.invoice.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: ['PENDING', 'UNDERPAID'] }
        }
      })

      console.log(`Found ${expiredInvoices.length} expired invoices to cleanup`)

      if (expiredInvoices.length > 0) {
        try {
          // Update all expired invoices in batch
          await prisma.invoice.updateMany({
            where: {
              id: { in: expiredInvoices.map(inv => inv.id) }
            },
            data: { status: 'EXPIRED' }
          })
          
          cleaned = expiredInvoices.length
        } catch (error) {
          console.error('Failed to batch update expired invoices:', error)
          errors++
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ [FORCE-CLEANUP] Completed: ${cleaned} cleaned, ${errors} errors, ${duration}ms`)

      return { cleaned, errors, duration }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('❌ [FORCE-CLEANUP] Failed:', error)
      return { cleaned, errors: errors + 1, duration }
    }
  }

  /**
   * Get detailed statistics about KMS webhook system
   */
  async getDetailedStats(): Promise<{
    addresses: {
      total: number
      active: number
    }
    invoices: {
      pending: number
      paid: number
      expired: number
      total: number
    }
    notifications: {
      total: number
      last24h: number
      last7d: number
      last30d: number
    }
    performance: {
      avgProcessingTime: number
      successRate: number
    }
  }> {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalAddresses,
      activeAddresses,
      pendingInvoices,
      paidInvoices,
      expiredInvoices,
      totalInvoices,
      totalNotifications,
      notifications24h,
      notifications7d,
      notifications30d
    ] = await Promise.all([
      prisma.paymentAddress.count(),
      prisma.paymentAddress.count({ where: { invoiceId: { not: null } } }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'EXPIRED' } }),
      prisma.invoice.count(),
      prisma.webhookNotification.count(),
      prisma.webhookNotification.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.webhookNotification.count({ where: { createdAt: { gte: lastWeek } } }),
      prisma.webhookNotification.count({ where: { createdAt: { gte: lastMonth } } })
    ])

    // Calculate performance metrics
    const recentNotifications = await prisma.webhookNotification.findMany({
      where: { createdAt: { gte: lastWeek } },
      select: { createdAt: true, processedAt: true, status: true }
    })

    const processedNotifications = recentNotifications.filter(n => n.processedAt)
    const avgProcessingTime = processedNotifications.length > 0
      ? processedNotifications.reduce((sum, n) => 
          sum + (n.processedAt!.getTime() - n.createdAt.getTime()), 0
        ) / processedNotifications.length
      : 0

    const successfulNotifications = recentNotifications.filter(n => n.status === 'CONFIRMED')
    const successRate = recentNotifications.length > 0
      ? successfulNotifications.length / recentNotifications.length
      : 0

    return {
      addresses: {
        total: totalAddresses,
        active: activeAddresses
      },
      invoices: {
        pending: pendingInvoices,
        paid: paidInvoices,
        expired: expiredInvoices,
        total: totalInvoices
      },
      notifications: {
        total: totalNotifications,
        last24h: notifications24h,
        last7d: notifications7d,
        last30d: notifications30d
      },
      performance: {
        avgProcessingTime: Math.round(avgProcessingTime),
        successRate: Math.round(successRate * 100) / 100
      }
    }
  }
}

export const tatumNotificationService = new TatumNotificationService()
