# 🧪 Webhook Testing Guide

This guide helps you test the Tatum webhook system with real cryptocurrency transactions.

## 📋 Prerequisites

1. **Active merchant account** in your system
2. **Global HD wallets** set up for test currencies
3. **Tatum API key** configured
4. **Public webhook URL** (use ngrok for local testing)

## 🚀 Quick Start

### 1. Set up for testing

```bash
# Switch to testnet (recommended)
TATUM_ENVIRONMENT="testnet"
SKIP_TATUM_SUBSCRIPTION="false"

# Use ngrok for local webhook testing
ngrok http 3000
# Copy the HTTPS URL to WEBHOOK_BASE_URL in .env
WEBHOOK_BASE_URL="https://abc123.ngrok.io/api/webhook"
```

### 2. Create test invoices

```bash
# Run the test invoice generator
npx tsx src/scripts/test-webhook.ts
```

This will create test invoices for:
- ETH (native token on Ethereum)
- USDT (ERC-20 token on Ethereum) 
- BTC (native Bitcoin)
- BNB (native token on BSC)
- USDT (BEP-20 token on BSC)

### 3. Monitor webhook activity

```bash
# Start the monitoring dashboard
npx tsx src/scripts/monitor-webhooks.ts
```

### 4. Send test transactions

The script will show addresses like:
```
1. ETH on ethereum
   Amount: 0.001 ETH
   Address: 0x742d35Cc6FF64890e0c8F2B9A5e90C4b3d6d41A7
   Invoice ID: cm123abc
```

## 💰 Getting Test Coins

### Ethereum Testnet (Sepolia)
- **ETH**: https://sepoliafaucet.com/
- **Test USDT**: Deploy your own ERC-20 or use existing testnet contracts

### Bitcoin Testnet
- **BTC**: https://bitcoinfaucet.uo1.net/
- **Electrum Wallet**: Use testnet mode for easy testing

### BSC Testnet
- **BNB**: https://testnet.binance.org/faucet-smart
- **MetaMask**: Add BSC Testnet network

## 🔍 What Happens When You Send Money

1. **Transaction Broadcast**: Your transaction is sent to the blockchain
2. **Tatum Detection**: Tatum's monitoring detects the incoming transaction
3. **Webhook Fired**: Tatum sends a webhook to your endpoint
4. **Processing**: Your system processes the webhook and updates invoice status
5. **Merchant Notification**: Optional merchant webhook is triggered

## 📱 Webhook Flow Examples

### Native Token (ETH)
```json
POST /api/webhook/tatum/payment/cm123abc
{
  "address": "0x742d35Cc6FF64890e0c8F2B9A5e90C4b3d6d41A7",
  "amount": "0.001",
  "asset": "ETH",
  "type": "native",
  "chain": "ethereum-mainnet",
  "subscriptionType": "INCOMING_NATIVE_TX",
  "txId": "0xabc123...",
  "blockNumber": 18567890,
  "counterAddress": "0x123..." // sender address
}
```

### Token (USDT)
```json
POST /api/webhook/tatum/payment/cm456def  
{
  "address": "0x742d35Cc6FF64890e0c8F2B9A5e90C4b3d6d41A7",
  "amount": "10.000000",
  "asset": "USDT",
  "type": "token", 
  "chain": "ethereum-mainnet",
  "subscriptionType": "INCOMING_FUNGIBLE_TX",
  "txId": "0xdef456...",
  "blockNumber": 18567891,
  "counterAddress": "0x456...",
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7"
}
```

## 🛠️ Troubleshooting

### No webhook received?
1. Check if subscription was created successfully
2. Verify webhook URL is publicly accessible
3. Check Tatum API key permissions
4. Ensure transaction has enough confirmations

### Webhook received but not processed?
1. Check server logs for processing errors
2. Verify invoice exists and is active
3. Check database connectivity
4. Verify HMAC signature (if enabled)

### Transaction confirmed but invoice not updated?
1. Check address matching logic
2. Verify amount parsing and comparison
3. Check invoice expiration time
4. Review merchant balance update logic

## 📊 Monitoring Tools

### Built-in Monitoring
```bash
# Real-time webhook monitoring
npx tsx src/scripts/monitor-webhooks.ts

# Check subscription health
curl -H "Authorization: Bearer $JWT_SECRET" \
  "http://localhost:3000/api/admin/subscriptions?action=health"

# View detailed statistics  
curl -H "Authorization: Bearer $JWT_SECRET" \
  "http://localhost:3000/api/admin/subscriptions?action=stats"
```

### External Monitoring
- **webhook.site**: For capturing webhook payloads
- **ngrok**: For local tunnel and request inspection
- **Tatum Dashboard**: For API usage and subscription management

## 🔒 Security Considerations

### Production Setup
1. **Use HTTPS** for all webhook URLs
2. **Enable HMAC verification** with `WEBHOOK_SECRET_KEY`
3. **Validate all inputs** in webhook handlers
4. **Use mainnet API keys** for production
5. **Set up proper authentication** for admin endpoints

### Rate Limiting
- Tatum has API rate limits
- Implement exponential backoff for retries
- Consider webhook processing queues for high volume

## 📈 Performance Tips

1. **Use invoice-specific webhooks** when possible (`/payment/{invoiceId}`)
2. **Process webhooks asynchronously** for better response times
3. **Implement proper database indexing** on frequently queried fields
4. **Use connection pooling** for database connections
5. **Monitor webhook processing times** and optimize bottlenecks

## 🔗 Useful Links

- [Tatum API Documentation](https://docs.tatum.io/)
- [Webhook Testing Tools](https://webhook.site/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Testnet Faucets Directory](https://faucetlink.to/)

---

Happy testing! 🎉