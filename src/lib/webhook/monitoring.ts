/*
DEPRECATED: This webhook monitoring service used the old wallet system

The new HD wallet system requires different webhook monitoring:
- Monitor GlobalHDWallet addresses instead of individual wallet addresses
- Update MerchantBalance records instead of Wallet balance records
- Use DerivedAddress for specific payment tracking

TODO: Rewrite webhook monitoring for HD wallet architecture
See HD_WALLET_MIGRATION_TRACKER.md for migration details
*/

export class WebhookMonitoringService {
  constructor() {
    console.warn('WebhookMonitoringService is deprecated - needs HD wallet system integration')
  }

  // All methods deprecated
  async getHealthStatus() {
    throw new Error('WebhookMonitoringService is deprecated - use HD wallet system')
  }

  async getMetrics() {
    throw new Error('WebhookMonitoringService is deprecated - use HD wallet system')
  }

  async checkSubscriptionHealth() {
    throw new Error('WebhookMonitoringService is deprecated - use HD wallet system')
  }
}

export const webhookMonitoringService = new WebhookMonitoringService()