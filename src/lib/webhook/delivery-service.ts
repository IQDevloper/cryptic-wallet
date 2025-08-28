import { PrismaClient, WebhookDelivery, WebhookStatus, WebhookEventType } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export interface WebhookPayload {
  event: WebhookEventType
  data: any
  timestamp: number
  webhookId: string
}

export interface WebhookDeliveryOptions {
  url: string
  payload: WebhookPayload
  secret?: string
  maxAttempts?: number
  timeoutSeconds?: number
  merchantId: string
  invoiceId?: string
}

export class WebhookDeliveryService {
  private static instance: WebhookDeliveryService
  private readonly MAX_ATTEMPTS = 3
  private readonly TIMEOUT_SECONDS = 30
  private readonly RETRY_DELAYS = [1000, 5000, 15000, 60000] // 1s, 5s, 15s, 1m
  
  static getInstance(): WebhookDeliveryService {
    if (!WebhookDeliveryService.instance) {
      WebhookDeliveryService.instance = new WebhookDeliveryService()
    }
    return WebhookDeliveryService.instance
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateRetryDelay(attemptCount: number): number {
    const baseDelay = this.RETRY_DELAYS[Math.min(attemptCount, this.RETRY_DELAYS.length - 1)]
    const jitter = Math.random() * 0.1 * baseDelay // Add 10% jitter
    return baseDelay + jitter
  }

  /**
   * Send webhook with retry logic
   */
  async deliverWebhook(options: WebhookDeliveryOptions): Promise<WebhookDelivery> {
    const {
      url,
      payload,
      secret,
      maxAttempts = this.MAX_ATTEMPTS,
      timeoutSeconds = this.TIMEOUT_SECONDS,
      merchantId,
      invoiceId
    } = options

    // Create initial webhook delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        url,
        eventType: payload.event,
        status: WebhookStatus.PENDING,
        payload: payload as any,
        maxAttempts,
        timeoutSeconds,
        merchantId,
        invoiceId,
        headers: {}
      }
    })

    // Start delivery process in background
    this.processDelivery(delivery.id, options).catch(error => {
      console.error(`Background webhook delivery failed for ${delivery.id}:`, error)
    })

    return delivery
  }

  /**
   * Process webhook delivery with retry logic
   */
  private async processDelivery(deliveryId: string, options: WebhookDeliveryOptions): Promise<void> {
    let delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId }
    })

    if (!delivery) {
      console.error(`Webhook delivery not found: ${deliveryId}`)
      return
    }

    while (delivery.attemptCount < delivery.maxAttempts && delivery.status === WebhookStatus.PENDING) {
      try {
        const success = await this.attemptDelivery(delivery, options)
        
        if (success) {
          // Mark as sent successfully
          delivery = await prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              status: WebhookStatus.SENT,
              sentAt: new Date(),
              attemptCount: { increment: 1 }
            }
          })
          return
        }
      } catch (error) {
        console.error(`Webhook delivery attempt failed for ${deliveryId}:`, error)
        
        // Update with error information
        delivery = await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            attemptCount: { increment: 1 },
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        })
      }

      // Check if we should retry
      if (delivery.attemptCount < delivery.maxAttempts) {
        const retryDelay = this.calculateRetryDelay(delivery.attemptCount)
        const nextRetryAt = new Date(Date.now() + retryDelay)
        
        // Update next retry time
        delivery = await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: { nextRetryAt }
        })

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        // Refresh delivery record
        delivery = await prisma.webhookDelivery.findUnique({
          where: { id: deliveryId }
        })!
      }
    }

    // Mark as failed if all attempts exhausted
    if (delivery && delivery.attemptCount >= delivery.maxAttempts && delivery.status === WebhookStatus.PENDING) {
      await this.moveToDeadLetterQueue(delivery)
    }
  }

  /**
   * Attempt single webhook delivery
   */
  private async attemptDelivery(delivery: WebhookDelivery, options: WebhookDeliveryOptions): Promise<boolean> {
    const { secret } = options
    const payloadString = JSON.stringify(delivery.payload)
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Cryptic-Gateway/1.0',
      'X-Webhook-Event': delivery.eventType,
      'X-Webhook-Id': delivery.id,
      'X-Webhook-Attempt': (delivery.attemptCount + 1).toString(),
      'X-Webhook-Timestamp': Date.now().toString()
    }

    // Add signature if secret is provided
    if (secret) {
      const signature = this.generateSignature(payloadString, secret)
      headers['X-Signature'] = `sha256=${signature}`
    }

    try {
      const response = await fetch(delivery.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(delivery.timeoutSeconds * 1000)
      })

      // Update delivery record with response
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          headers: headers as any,
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: await response.text().catch(() => '')
          } as any,
          httpStatus: response.status
        }
      })

      // Check if delivery was successful
      if (response.ok) {
        console.log(`Webhook delivered successfully: ${delivery.id} to ${delivery.url}`)
        return true
      } else {
        console.error(`Webhook delivery failed with status ${response.status}: ${delivery.id}`)
        return false
      }
    } catch (error) {
      console.error(`Webhook delivery network error for ${delivery.id}:`, error)
      
      // Update with error response
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          headers: headers as any,
          response: {
            error: error instanceof Error ? error.message : 'Network error'
          } as any,
          httpStatus: 0
        }
      })
      
      throw error
    }
  }

  /**
   * Move failed webhook to dead letter queue
   */
  private async moveToDeadLetterQueue(delivery: WebhookDelivery): Promise<void> {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: WebhookStatus.FAILED,
        errorMessage: `Failed after ${delivery.maxAttempts} attempts`
      }
    })

    console.error(`Webhook moved to dead letter queue: ${delivery.id} after ${delivery.attemptCount} attempts`)
    
    // TODO: Implement alerting mechanism for failed webhooks
    // This could send notifications to administrators or monitoring systems
  }

  /**
   * Retry webhook delivery manually (for dead letter queue processing)
   */
  async retryWebhook(deliveryId: string): Promise<boolean> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { merchant: true }
    })

    if (!delivery) {
      throw new Error(`Webhook delivery not found: ${deliveryId}`)
    }

    if (delivery.status !== WebhookStatus.FAILED) {
      throw new Error(`Webhook delivery is not in failed status: ${deliveryId}`)
    }

    // Reset delivery for retry
    const updatedDelivery = await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookStatus.PENDING,
        attemptCount: 0,
        nextRetryAt: null,
        errorMessage: null,
        sentAt: null
      }
    })

    // Prepare options for retry
    const options: WebhookDeliveryOptions = {
      url: delivery.url,
      payload: delivery.payload as WebhookPayload,
      secret: delivery.merchant?.webhookSecret || undefined,
      maxAttempts: delivery.maxAttempts,
      timeoutSeconds: delivery.timeoutSeconds,
      merchantId: delivery.merchantId,
      invoiceId: delivery.invoiceId || undefined
    }

    // Start retry process
    this.processDelivery(deliveryId, options).catch(error => {
      console.error(`Manual retry failed for ${deliveryId}:`, error)
    })

    return true
  }

  /**
   * Get webhook delivery statistics
   */
  async getDeliveryStats(merchantId: string, timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number
    successful: number
    failed: number
    pending: number
    successRate: number
  }> {
    const now = new Date()
    let since: Date

    switch (timeframe) {
      case 'hour':
        since = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'day':
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
    }

    const stats = await prisma.webhookDelivery.groupBy({
      by: ['status'],
      where: {
        merchantId,
        createdAt: { gte: since }
      },
      _count: { status: true }
    })

    const statMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<WebhookStatus, number>)

    const total = Object.values(statMap).reduce((sum, count) => sum + count, 0)
    const successful = statMap[WebhookStatus.SENT] || 0
    const failed = statMap[WebhookStatus.FAILED] || 0
    const pending = statMap[WebhookStatus.PENDING] || 0

    return {
      total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? (successful / total) * 100 : 0
    }
  }

  /**
   * Clean up old webhook delivery records
   */
  async cleanupOldDeliveries(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    const result = await prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: [WebhookStatus.SENT, WebhookStatus.ACKNOWLEDGED] }
      }
    })

    console.log(`Cleaned up ${result.count} old webhook delivery records`)
    return result.count
  }
}

export const webhookDeliveryService = WebhookDeliveryService.getInstance()