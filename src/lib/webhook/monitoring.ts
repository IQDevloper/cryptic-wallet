import { PrismaClient, WebhookDelivery, WebhookStatus, Merchant } from '@prisma/client'
import { webhookSubscriptionManager } from './subscription-manager'
import { webhookDeliveryService } from './delivery-service'

const prisma = new PrismaClient()

interface WebhookHealthStatus {
  isHealthy: boolean
  errors: string[]
  lastCheck: Date
}

interface WebhookMetrics {
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
  pendingDeliveries: number
  averageResponseTime: number
  successRate: number
  lastDeliveryTime: Date | null
  subscriptionCount: number
}

interface MerchantWebhookHealth {
  merchantId: string
  merchantName: string
  webhookUrl: string | null
  isConfigured: boolean
  health: WebhookHealthStatus
  metrics: WebhookMetrics
  recommendations: string[]
}

export class WebhookMonitoringService {
  private static instance: WebhookMonitoringService

  static getInstance(): WebhookMonitoringService {
    if (!WebhookMonitoringService.instance) {
      WebhookMonitoringService.instance = new WebhookMonitoringService()
    }
    return WebhookMonitoringService.instance
  }

  /**
   * Perform comprehensive webhook system health check
   */
  async performSystemHealthCheck(): Promise<{
    overallHealth: WebhookHealthStatus
    subscriptionHealth: WebhookHealthStatus
    deliveryHealth: WebhookHealthStatus
    systemMetrics: {
      totalMerchants: number
      configuredWebhooks: number
      activeSubscriptions: number
      recentDeliveries: number
    }
  }> {
    const errors: string[] = []
    
    // Check subscription system
    const subscriptionHealth = await this.checkSubscriptionHealth()
    if (!subscriptionHealth.isHealthy) {
      errors.push(...subscriptionHealth.errors)
    }

    // Check delivery system
    const deliveryHealth = await this.checkDeliveryHealth()
    if (!deliveryHealth.isHealthy) {
      errors.push(...deliveryHealth.errors)
    }

    // Get system metrics
    const systemMetrics = await this.getSystemMetrics()

    return {
      overallHealth: {
        isHealthy: errors.length === 0,
        errors,
        lastCheck: new Date()
      },
      subscriptionHealth,
      deliveryHealth,
      systemMetrics
    }
  }

  /**
   * Check subscription system health
   */
  private async checkSubscriptionHealth(): Promise<WebhookHealthStatus> {
    const errors: string[] = []
    
    try {
      // Test subscription manager connectivity
      const healthCheck = await webhookSubscriptionManager.healthCheck()
      
      if (!healthCheck.isHealthy) {
        errors.push(...healthCheck.errors)
      }

      // Check for subscription anomalies
      const stats = await webhookSubscriptionManager.getSubscriptionStats()
      
      if (stats.total === 0) {
        errors.push('No active webhook subscriptions found')
      }

      // Validate critical subscriptions exist
      const activeInvoices = await prisma.invoice.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { gt: new Date() }
        },
        select: { depositAddress: true, wallet: { select: { currency: { select: { network: { select: { tatumChainId: true } } } } } } }
      })

      let missingSubscriptions = 0
      for (const invoice of activeInvoices) {
        const chainId = invoice.wallet.currency.network.tatumChainId
        const subscription = await webhookSubscriptionManager.getSubscriptionByAddress(
          invoice.depositAddress,
          chainId
        )
        
        if (!subscription) {
          missingSubscriptions++
        }
      }

      if (missingSubscriptions > 0) {
        errors.push(`${missingSubscriptions} active invoices missing webhook subscriptions`)
      }

    } catch (error) {
      errors.push(`Subscription health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      isHealthy: errors.length === 0,
      errors,
      lastCheck: new Date()
    }
  }

  /**
   * Check delivery system health
   */
  private async checkDeliveryHealth(): Promise<WebhookHealthStatus> {
    const errors: string[] = []

    try {
      // Check for stuck pending deliveries
      const stuckDeliveries = await prisma.webhookDelivery.count({
        where: {
          status: WebhookStatus.PENDING,
          createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } // Older than 1 hour
        }
      })

      if (stuckDeliveries > 0) {
        errors.push(`${stuckDeliveries} webhook deliveries stuck in pending state`)
      }

      // Check for high failure rate
      const recentDeliveries = await prisma.webhookDelivery.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        _count: { status: true }
      })

      const deliveryStats = recentDeliveries.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status
        return acc
      }, {} as Record<WebhookStatus, number>)

      const totalDeliveries = Object.values(deliveryStats).reduce((sum, count) => sum + count, 0)
      const failedDeliveries = deliveryStats[WebhookStatus.FAILED] || 0

      if (totalDeliveries > 0) {
        const failureRate = (failedDeliveries / totalDeliveries) * 100
        
        if (failureRate > 10) { // More than 10% failure rate
          errors.push(`High webhook failure rate: ${failureRate.toFixed(1)}%`)
        }
      }

      // Check for delivery delays
      const avgDeliveryTime = await this.getAverageDeliveryTime()
      if (avgDeliveryTime > 30000) { // More than 30 seconds
        errors.push(`High average delivery time: ${avgDeliveryTime / 1000}s`)
      }

    } catch (error) {
      errors.push(`Delivery health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      isHealthy: errors.length === 0,
      errors,
      lastCheck: new Date()
    }
  }

  /**
   * Get system-wide metrics
   */
  private async getSystemMetrics(): Promise<{
    totalMerchants: number
    configuredWebhooks: number
    activeSubscriptions: number
    recentDeliveries: number
  }> {
    const [
      totalMerchants,
      configuredWebhooks,
      recentDeliveries
    ] = await Promise.all([
      prisma.merchant.count({ where: { isActive: true } }),
      prisma.merchant.count({ 
        where: { 
          isActive: true, 
          webhookUrl: { not: null } 
        } 
      }),
      prisma.webhookDelivery.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ])

    const subscriptionStats = await webhookSubscriptionManager.getSubscriptionStats()

    return {
      totalMerchants,
      configuredWebhooks,
      activeSubscriptions: subscriptionStats.total,
      recentDeliveries
    }
  }

  /**
   * Get webhook health status for a specific merchant
   */
  async getMerchantWebhookHealth(merchantId: string): Promise<MerchantWebhookHealth> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        isActive: true
      }
    })

    if (!merchant) {
      throw new Error(`Merchant not found: ${merchantId}`)
    }

    const isConfigured = !!(merchant.webhookUrl && merchant.isActive)
    const errors: string[] = []
    const recommendations: string[] = []

    // Check webhook configuration
    if (!merchant.webhookUrl) {
      errors.push('Webhook URL not configured')
      recommendations.push('Configure a webhook URL to receive payment notifications')
    } else {
      // Test webhook URL reachability
      const isReachable = await this.testWebhookUrl(merchant.webhookUrl)
      if (!isReachable) {
        errors.push('Webhook URL is not reachable')
        recommendations.push('Ensure webhook endpoint is accessible and returns appropriate status codes')
      }
    }

    if (!merchant.isActive) {
      errors.push('Merchant account is inactive')
    }

    // Get delivery metrics
    const metrics = await this.getMerchantMetrics(merchantId)

    // Generate recommendations based on metrics
    if (metrics.successRate < 90 && metrics.totalDeliveries > 0) {
      recommendations.push('Webhook success rate is low. Check endpoint reliability and error handling')
    }

    if (metrics.averageResponseTime > 5000) {
      recommendations.push('Webhook response time is high. Optimize endpoint performance')
    }

    if (metrics.failedDeliveries > metrics.successfulDeliveries && metrics.totalDeliveries > 10) {
      recommendations.push('More failed deliveries than successful ones. Review webhook implementation')
    }

    return {
      merchantId,
      merchantName: merchant.name,
      webhookUrl: merchant.webhookUrl,
      isConfigured,
      health: {
        isHealthy: errors.length === 0,
        errors,
        lastCheck: new Date()
      },
      metrics,
      recommendations
    }
  }

  /**
   * Get metrics for a specific merchant
   */
  private async getMerchantMetrics(merchantId: string): Promise<WebhookMetrics> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [deliveryStats, avgResponseTime, lastDelivery, subscriptionCount] = await Promise.all([
      prisma.webhookDelivery.groupBy({
        by: ['status'],
        where: {
          merchantId,
          createdAt: { gte: since24h }
        },
        _count: { status: true }
      }),
      this.getAverageResponseTimeForMerchant(merchantId),
      prisma.webhookDelivery.findFirst({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      this.getMerchantSubscriptionCount(merchantId)
    ])

    const statMap = deliveryStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<WebhookStatus, number>)

    const totalDeliveries = Object.values(statMap).reduce((sum, count) => sum + count, 0)
    const successfulDeliveries = statMap[WebhookStatus.SENT] || 0
    const failedDeliveries = statMap[WebhookStatus.FAILED] || 0
    const pendingDeliveries = statMap[WebhookStatus.PENDING] || 0

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      averageResponseTime: avgResponseTime,
      successRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
      lastDeliveryTime: lastDelivery?.createdAt || null,
      subscriptionCount
    }
  }

  /**
   * Test if webhook URL is reachable
   */
  private async testWebhookUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to avoid sending actual webhook data
        signal: AbortSignal.timeout(10000), // 10 second timeout
        headers: {
          'User-Agent': 'Cryptic-Gateway-HealthCheck/1.0'
        }
      })
      
      // Consider 2xx, 4xx as reachable (4xx means endpoint exists but may reject the request format)
      return response.status < 500
    } catch (error) {
      return false
    }
  }

  /**
   * Get average delivery time
   */
  private async getAverageDeliveryTime(): Promise<number> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        status: WebhookStatus.SENT,
        sentAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { createdAt: true, sentAt: true },
      take: 100
    })

    if (deliveries.length === 0) return 0

    const totalTime = deliveries.reduce((sum, delivery) => {
      if (delivery.sentAt) {
        return sum + (delivery.sentAt.getTime() - delivery.createdAt.getTime())
      }
      return sum
    }, 0)

    return totalTime / deliveries.length
  }

  /**
   * Get average response time for specific merchant
   */
  private async getAverageResponseTimeForMerchant(merchantId: string): Promise<number> {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        merchantId,
        status: WebhookStatus.SENT,
        sentAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: { createdAt: true, sentAt: true },
      take: 50
    })

    if (deliveries.length === 0) return 0

    const totalTime = deliveries.reduce((sum, delivery) => {
      if (delivery.sentAt) {
        return sum + (delivery.sentAt.getTime() - delivery.createdAt.getTime())
      }
      return sum
    }, 0)

    return totalTime / deliveries.length
  }

  /**
   * Get subscription count for merchant
   */
  private async getMerchantSubscriptionCount(merchantId: string): Promise<number> {
    // Get active invoices for merchant
    const activeInvoices = await prisma.invoice.findMany({
      where: {
        merchantId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      },
      select: { depositAddress: true }
    })

    // Check subscriptions for each address
    // This is an approximation since we don't directly track merchant-subscription relationships
    return activeInvoices.length
  }

  /**
   * Generate webhook health report
   */
  async generateHealthReport(): Promise<{
    timestamp: Date
    systemHealth: any
    merchantHealthSummary: {
      totalMerchants: number
      healthyMerchants: number
      unhealthyMerchants: number
      unconfiguredMerchants: number
    }
    criticalIssues: string[]
    recommendations: string[]
  }> {
    const systemHealth = await this.performSystemHealthCheck()
    
    // Get all active merchants
    const merchants = await prisma.merchant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, webhookUrl: true }
    })

    let healthyMerchants = 0
    let unhealthyMerchants = 0
    let unconfiguredMerchants = 0
    const criticalIssues: string[] = []
    const recommendations: string[] = []

    // Analyze each merchant
    for (const merchant of merchants) {
      try {
        const health = await this.getMerchantWebhookHealth(merchant.id)
        
        if (!health.isConfigured) {
          unconfiguredMerchants++
        } else if (health.health.isHealthy) {
          healthyMerchants++
        } else {
          unhealthyMerchants++
          criticalIssues.push(`${merchant.name}: ${health.health.errors.join(', ')}`)
        }

        // Add merchant-specific recommendations
        recommendations.push(...health.recommendations.map(r => `${merchant.name}: ${r}`))
      } catch (error) {
        unhealthyMerchants++
        criticalIssues.push(`${merchant.name}: Health check failed`)
      }
    }

    // Add system-level critical issues
    if (!systemHealth.overallHealth.isHealthy) {
      criticalIssues.push(...systemHealth.overallHealth.errors)
    }

    return {
      timestamp: new Date(),
      systemHealth,
      merchantHealthSummary: {
        totalMerchants: merchants.length,
        healthyMerchants,
        unhealthyMerchants,
        unconfiguredMerchants
      },
      criticalIssues,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    }
  }
}

export const webhookMonitoringService = WebhookMonitoringService.getInstance()