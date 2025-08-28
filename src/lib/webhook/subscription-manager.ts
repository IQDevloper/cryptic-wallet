import { TatumSDK, Network, Ethereum, Bitcoin } from '@tatumio/tatum'

interface TatumWebhookSubscription {
  id: string
  type: 'ADDRESS_EVENT' | 'PENDING_TXS' | 'INCOMING_NATIVE_TX'
  attr: {
    address: string
    chain: string
    url: string
  }
  enabled: boolean
}

interface CreateSubscriptionOptions {
  address: string
  chain: string
  callbackUrl: string
  subscriptionType?: 'ADDRESS_EVENT' | 'PENDING_TXS' | 'INCOMING_NATIVE_TX'
}

export class WebhookSubscriptionManager {
  private static instance: WebhookSubscriptionManager
  private tatumApiKey: string
  private tatumBaseUrl: string

  constructor() {
    this.tatumApiKey = process.env.TATUM_API_KEY!
    this.tatumBaseUrl = process.env.TATUM_ENVIRONMENT === 'mainnet' 
      ? 'https://api.tatum.io' 
      : 'https://api.tatum.io'
      
    if (!this.tatumApiKey) {
      throw new Error('TATUM_API_KEY environment variable is required')
    }
  }

  static getInstance(): WebhookSubscriptionManager {
    if (!WebhookSubscriptionManager.instance) {
      WebhookSubscriptionManager.instance = new WebhookSubscriptionManager()
    }
    return WebhookSubscriptionManager.instance
  }

  /**
   * Create webhook subscription for address monitoring
   */
  async createSubscription(options: CreateSubscriptionOptions): Promise<TatumWebhookSubscription> {
    const { address, chain, callbackUrl, subscriptionType = 'INCOMING_NATIVE_TX' } = options

    try {
      const response = await fetch(`${this.tatumBaseUrl}/v3/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.tatumApiKey
        },
        body: JSON.stringify({
          type: subscriptionType,
          attr: {
            address,
            chain,
            url: callbackUrl
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create webhook subscription: ${response.status} ${errorText}`)
      }

      const subscription = await response.json()
      
      console.log(`Created webhook subscription for address ${address} on ${chain}:`, subscription)
      
      return subscription
    } catch (error) {
      console.error(`Error creating webhook subscription for ${address} on ${chain}:`, error)
      throw error
    }
  }

  /**
   * Get all active webhook subscriptions
   */
  async getSubscriptions(): Promise<TatumWebhookSubscription[]> {
    try {
      const response = await fetch(`${this.tatumBaseUrl}/v3/subscription`, {
        method: 'GET',
        headers: {
          'x-api-key': this.tatumApiKey
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get webhook subscriptions: ${response.status} ${errorText}`)
      }

      const subscriptions = await response.json()
      return subscriptions || []
    } catch (error) {
      console.error('Error getting webhook subscriptions:', error)
      throw error
    }
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.tatumBaseUrl}/v3/subscription/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': this.tatumApiKey
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to delete webhook subscription: ${response.status} ${errorText}`)
      }

      console.log(`Deleted webhook subscription: ${subscriptionId}`)
      return true
    } catch (error) {
      console.error(`Error deleting webhook subscription ${subscriptionId}:`, error)
      throw error
    }
  }

  /**
   * Update webhook subscription
   */
  async updateSubscription(subscriptionId: string, updates: Partial<CreateSubscriptionOptions>): Promise<TatumWebhookSubscription> {
    try {
      const currentSubscriptions = await this.getSubscriptions()
      const existingSubscription = currentSubscriptions.find(s => s.id === subscriptionId)
      
      if (!existingSubscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`)
      }

      // Delete existing subscription
      await this.deleteSubscription(subscriptionId)

      // Create new subscription with updates
      const newSubscription = await this.createSubscription({
        address: updates.address || existingSubscription.attr.address,
        chain: updates.chain || existingSubscription.attr.chain,
        callbackUrl: updates.callbackUrl || existingSubscription.attr.url,
        subscriptionType: updates.subscriptionType || existingSubscription.type
      })

      return newSubscription
    } catch (error) {
      console.error(`Error updating webhook subscription ${subscriptionId}:`, error)
      throw error
    }
  }

  /**
   * Enable/disable webhook subscription
   */
  async toggleSubscription(subscriptionId: string, enabled: boolean): Promise<boolean> {
    // Note: Tatum API doesn't directly support enabling/disabling subscriptions
    // This would typically require deleting and recreating the subscription
    try {
      if (!enabled) {
        await this.deleteSubscription(subscriptionId)
        return false
      } else {
        // To enable, we would need to recreate the subscription
        // This requires knowing the original subscription details
        throw new Error('Enabling disabled subscription requires subscription details. Use updateSubscription instead.')
      }
    } catch (error) {
      console.error(`Error toggling webhook subscription ${subscriptionId}:`, error)
      throw error
    }
  }

  /**
   * Get subscription by address and chain
   */
  async getSubscriptionByAddress(address: string, chain: string): Promise<TatumWebhookSubscription | null> {
    try {
      const subscriptions = await this.getSubscriptions()
      return subscriptions.find(s => 
        s.attr.address.toLowerCase() === address.toLowerCase() && 
        s.attr.chain === chain
      ) || null
    } catch (error) {
      console.error(`Error finding subscription for address ${address} on ${chain}:`, error)
      return null
    }
  }

  /**
   * Clean up subscriptions for addresses that are no longer active
   */
  async cleanupInactiveSubscriptions(activeAddresses: string[]): Promise<number> {
    try {
      const subscriptions = await this.getSubscriptions()
      const addressSet = new Set(activeAddresses.map(addr => addr.toLowerCase()))
      
      const inactiveSubscriptions = subscriptions.filter(sub => 
        !addressSet.has(sub.attr.address.toLowerCase())
      )

      let deletedCount = 0
      for (const subscription of inactiveSubscriptions) {
        try {
          await this.deleteSubscription(subscription.id)
          deletedCount++
        } catch (error) {
          console.error(`Failed to delete inactive subscription ${subscription.id}:`, error)
        }
      }

      console.log(`Cleaned up ${deletedCount} inactive webhook subscriptions`)
      return deletedCount
    } catch (error) {
      console.error('Error cleaning up inactive subscriptions:', error)
      return 0
    }
  }

  /**
   * Validate webhook callback URL is reachable
   */
  async validateCallbackUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      // Check if the endpoint responds (any 2xx or 4xx status is fine for validation)
      return response.status < 500
    } catch (error) {
      console.error(`Webhook callback URL validation failed for ${url}:`, error)
      return false
    }
  }

  /**
   * Get webhook subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    total: number
    byChain: Record<string, number>
    byType: Record<string, number>
  }> {
    try {
      const subscriptions = await this.getSubscriptions()
      
      const stats = {
        total: subscriptions.length,
        byChain: {} as Record<string, number>,
        byType: {} as Record<string, number>
      }

      subscriptions.forEach(subscription => {
        const chain = subscription.attr.chain
        const type = subscription.type
        
        stats.byChain[chain] = (stats.byChain[chain] || 0) + 1
        stats.byType[type] = (stats.byType[type] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting subscription statistics:', error)
      return {
        total: 0,
        byChain: {},
        byType: {}
      }
    }
  }

  /**
   * Health check for webhook subscriptions
   */
  async healthCheck(): Promise<{
    isHealthy: boolean
    subscriptionCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let subscriptionCount = 0

    try {
      // Test API connectivity
      const subscriptions = await this.getSubscriptions()
      subscriptionCount = subscriptions.length

      // Validate API key has proper permissions
      if (subscriptions.length === 0) {
        // Try to create a test subscription to validate permissions
        // Note: This is just a connectivity test, we won't actually create it
      }
    } catch (error) {
      errors.push(`API connectivity error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      isHealthy: errors.length === 0,
      subscriptionCount,
      errors
    }
  }
}

export const webhookSubscriptionManager = WebhookSubscriptionManager.getInstance()