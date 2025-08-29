import { PrismaClient } from '@prisma/client'
import { tatumVAManager } from './client'

const prisma = new PrismaClient()

interface TatumSubscriptionRequest {
  address: string
  chain: string
  invoiceId: string
}

interface TatumWebhookPayload {
  subscriptionType: string
  txId: string
  blockNumber?: number
  asset: string
  amount: string
  address: string
  counterAddress?: string
  chain: string
  mempool?: boolean
  confirmed?: boolean
  date: number
  reference?: string
  metadata?: Record<string, any>
}

export class TatumNotificationService {
  private readonly webhookBaseUrl: string

  constructor() {
    this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://yourapp.com/api/webhook'
    
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
      let webhookUrl = `${this.webhookBaseUrl}/tatum/payment/${request.invoiceId}`
      
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
        webhookUrl
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

      // Find the invoice and its derived address
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          derivedAddress: true,
          merchant: true
        }
      })

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`)
      }

      // Verify the address matches
      if (invoice.derivedAddress.address.toLowerCase() !== webhookPayload.address.toLowerCase()) {
        throw new Error(`Address mismatch: expected ${invoice.derivedAddress.address}, got ${webhookPayload.address}`)
      }

      // Create webhook notification record
      await prisma.webhookNotification.create({
        data: {
          derivedAddressId: invoice.derivedAddressId,
          invoiceId: invoice.id,
          txHash: webhookPayload.txId,
          amount: parseFloat(webhookPayload.amount),
          blockNumber: webhookPayload.blockNumber ? BigInt(webhookPayload.blockNumber) : null,
          confirmations: this.calculateConfirmations(webhookPayload),
          chain: webhookPayload.chain,
          status: webhookPayload.confirmed ? 'CONFIRMED' : 'PENDING',
          webhookPayload: webhookPayload as any,
          processedAt: new Date()
        }
      })

      // Update derived address activity
      await prisma.derivedAddress.update({
        where: { id: invoice.derivedAddressId },
        data: {
          lastNotificationAt: new Date(),
          lastActivityAt: new Date(),
          firstUsedAt: invoice.derivedAddress.firstUsedAt || new Date()
        }
      })

      // Process payment if confirmed
      if (webhookPayload.confirmed) {
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

      // Update merchant balance
      const globalWallet = await tx.globalHDWallet.findUnique({
        where: { id: invoice.derivedAddress.globalWalletId }
      })

      if (globalWallet) {
        await tx.merchantBalance.updateMany({
          where: {
            merchantId: invoice.merchantId,
            globalWalletId: globalWallet.id
          },
          data: {
            balance: { increment: paymentAmount },
            totalReceived: { increment: paymentAmount },
            lastUpdated: new Date()
          }
        })
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
        confirmed: webhookPayload.confirmed,
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
    if (webhookPayload.mempool) return 0
    if (webhookPayload.confirmed) return 6 // Default confirmed state
    return webhookPayload.blockNumber ? 1 : 0
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
   * Cleanup expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<void> {
    try {
      console.log('🧹 Cleaning up expired subscriptions...')

      // Find expired invoices with active subscriptions
      const expiredInvoices = await prisma.invoice.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: ['PENDING', 'UNDERPAID'] },
          derivedAddress: {
            subscriptionActive: true,
            tatumSubscriptionId: { not: null }
          }
        },
        include: {
          derivedAddress: true
        }
      })

      console.log(`Found ${expiredInvoices.length} expired subscriptions to cleanup`)

      for (const invoice of expiredInvoices) {
        if (invoice.derivedAddress.tatumSubscriptionId) {
          // Remove Tatum subscription
          await this.removeSubscription(invoice.derivedAddress.tatumSubscriptionId)

          // Update database
          await prisma.derivedAddress.update({
            where: { id: invoice.derivedAddressId },
            data: {
              subscriptionActive: false,
              tatumSubscriptionId: null
            }
          })

          // Update invoice status
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'EXPIRED' }
          })
        }
      }

      console.log(`✅ Cleaned up ${expiredInvoices.length} expired subscriptions`)

    } catch (error) {
      console.error('❌ Failed to cleanup expired subscriptions:', error)
    }
  }

  /**
   * Get subscription health status
   */
  async getSubscriptionHealth(): Promise<{
    totalActive: number
    totalNotifications: number
    recentActivity: number
  }> {
    const [activeCount, totalNotifications, recentActivity] = await Promise.all([
      prisma.derivedAddress.count({
        where: { subscriptionActive: true }
      }),
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
      totalActive: activeCount,
      totalNotifications,
      recentActivity
    }
  }

  /**
   * Start periodic cleanup process for expired subscriptions
   * Runs every 4 hours in production
   */
  private startPeriodicCleanup(): void {
    const CLEANUP_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours

    setInterval(async () => {
      try {
        console.log('🧹 [CLEANUP] Starting periodic subscription cleanup...')
        await this.cleanupExpiredSubscriptions()
        console.log('✅ [CLEANUP] Periodic cleanup completed')
      } catch (error) {
        console.error('❌ [CLEANUP] Periodic cleanup failed:', error)
      }
    }, CLEANUP_INTERVAL)

    console.log(`🔄 [CLEANUP] Periodic cleanup started (every ${CLEANUP_INTERVAL / 1000 / 60} minutes)`)
  }

  /**
   * Force cleanup of all expired subscriptions (manual trigger)
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
      console.log('🧹 [FORCE-CLEANUP] Starting comprehensive cleanup...')

      // Find all expired invoices with active subscriptions
      const expiredInvoices = await prisma.invoice.findMany({
        where: {
          OR: [
            // Invoices that expired
            {
              expiresAt: { lt: new Date() },
              status: { in: ['PENDING', 'UNDERPAID'] }
            },
            // Invoices that were paid/cancelled but still have active subscriptions
            {
              status: { in: ['PAID', 'EXPIRED', 'CANCELLED'] },
              derivedAddress: {
                subscriptionActive: true
              }
            }
          ],
          derivedAddress: {
            subscriptionActive: true,
            tatumSubscriptionId: { not: null }
          }
        },
        include: {
          derivedAddress: true
        }
      })

      console.log(`Found ${expiredInvoices.length} subscriptions to cleanup`)

      for (const invoice of expiredInvoices) {
        try {
          if (invoice.derivedAddress.tatumSubscriptionId) {
            // Remove Tatum subscription
            await this.removeSubscription(invoice.derivedAddress.tatumSubscriptionId)

            // Update database
            await prisma.derivedAddress.update({
              where: { id: invoice.derivedAddressId },
              data: {
                subscriptionActive: false,
                tatumSubscriptionId: null
              }
            })

            // Update invoice status if expired
            if (invoice.expiresAt < new Date() && ['PENDING', 'UNDERPAID'].includes(invoice.status)) {
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'EXPIRED' }
              })
            }

            cleaned++
          }
        } catch (error) {
          console.error(`Failed to cleanup subscription for invoice ${invoice.id}:`, error)
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
   * Get detailed statistics about subscriptions
   */
  async getDetailedStats(): Promise<{
    subscriptions: {
      active: number
      expired: number
      total: number
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
      activeSubscriptions,
      totalDerivedAddresses,
      pendingInvoices,
      paidInvoices,
      expiredInvoices,
      totalInvoices,
      totalNotifications,
      notifications24h,
      notifications7d,
      notifications30d
    ] = await Promise.all([
      prisma.derivedAddress.count({ where: { subscriptionActive: true } }),
      prisma.derivedAddress.count(),
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
      subscriptions: {
        active: activeSubscriptions,
        expired: totalDerivedAddresses - activeSubscriptions,
        total: totalDerivedAddresses
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