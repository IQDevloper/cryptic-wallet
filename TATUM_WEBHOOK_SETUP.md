# 📡 Tatum Webhook Setup Guide

## ✅ What's Already Done

Your system **ALREADY creates Tatum webhook notifications** when invoices are created!

The code is in:
- **Invoice Router**: `/src/lib/trpc/routers/invoice.ts` (lines 181-239)
- **Notification Service**: `/src/lib/tatum/notification-service.ts`

---

## 🔄 How It Works

### When Invoice is Created:

```
1. Customer requests invoice
   ↓
2. System generates unique address from xPub
   ↓
3. System creates Tatum webhook subscription ← AUTOMATIC!
   ↓
4. Tatum monitors blockchain for payments to this address
   ↓
5. Payment received → Tatum sends webhook to your server
   ↓
6. Your server updates invoice status to PAID
```

### What Gets Created:

```typescript
// When you create an invoice:
const invoice = await trpc.invoice.create({
  merchantId: "abc123",
  amount: 10,
  currency: "USDT",
  network: "bsc"
})

// System automatically:
// 1. Generates address: 0xD9FC154Ae4EbC2A1735d73DcF2D8Ef6633De5815
// 2. Creates Tatum subscription for this address
// 3. Saves subscription ID in database
// 4. Monitors for payments

// Result:
{
  subscriptionId: "67890xyz...",
  subscriptionActive: true,
  address: "0xD9FC154Ae4EbC2A1735d73DcF2D8Ef6633De5815"
}
```

---

## 🌐 Setup Required

### 1. Configure Webhook URL

Your webhook URL is **ALREADY SET** in `.env`:

```bash
WEBHOOK_BASE_URL="https://17e65be72b72.ngrok-free.app"
```

**For Production:**
```bash
# Update .env with your production domain
WEBHOOK_BASE_URL="https://your-domain.com"
```

**For Local Development:**
```bash
# Use ngrok for local testing
ngrok http 3000

# Update .env with ngrok URL
WEBHOOK_BASE_URL="https://abc123.ngrok.io"
```

### 2. Webhook Endpoint

Your webhook endpoint is at:
```
/api/webhook/tatum/payment/[invoiceId]
```

**Full URL for each invoice:**
```
https://your-domain.com/api/webhook/tatum/payment/inv_xyz789
```

---

## 🧪 Testing Webhook Setup

### Test 1: Create Invoice and Check Subscription

```bash
# Create a test invoice
curl -X POST http://localhost:3000/api/trpc/invoice.create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "YOUR_MERCHANT_ID",
    "amount": 10,
    "currency": "USDT",
    "network": "bsc"
  }'

# Check logs for:
# ✅ [INVOICE] Webhook subscription created successfully!
# Subscription ID: abc123-def456...
# Monitoring address: 0x...
```

### Test 2: Verify in Database

```bash
# Open Prisma Studio
npx prisma studio

# Check payment_addresses table:
# - tatumSubscriptionId should have value
# - subscriptionActive should be true
```

### Test 3: Check Tatum Dashboard

```bash
# List all subscriptions
curl https://api.tatum.io/v4/subscription \
  -H "x-api-key: YOUR_TATUM_API_KEY"

# You should see your subscriptions listed
```

---

## 📊 Webhook Subscription Details

### What Tatum Monitors:

**For Native Tokens (ETH, BNB, BTC):**
```json
{
  "type": "INCOMING_NATIVE_TX",
  "attr": {
    "address": "0xYourAddress...",
    "chain": "BSC",
    "url": "https://your-domain.com/api/webhook/tatum/payment/inv_123"
  }
}
```

**For ERC-20 Tokens (USDT, USDC):**
```json
{
  "type": "INCOMING_FUNGIBLE_TX",
  "attr": {
    "address": "0xYourAddress...",
    "chain": "ETH",
    "url": "https://your-domain.com/api/webhook/tatum/payment/inv_123"
  }
}
```

### When Tatum Sends Webhook:

```json
{
  "address": "0xYourAddress...",
  "amount": "10.5",
  "asset": "USDT",
  "blockNumber": 12345678,
  "counterAddress": "0xSender...",
  "txId": "0xTransactionHash...",
  "type": "token",
  "chain": "ethereum-mainnet"
}
```

---

## 🔍 Troubleshooting

### Issue: "Unsupported chain for webhooks"

**Error Message:**
```
❌ Failed to create Tatum subscription:
Unsupported chain for webhooks: bsc-mainnet
```

**Cause**: Chain ID format mismatch between database and Tatum API

**Status**: ✅ **FIXED** - The system now supports both short format (`bsc`) and `-mainnet` suffix (`bsc-mainnet`)

**Details**: See `TATUM_CHAIN_MAPPING_FIX.md`

---

### Issue: "Webhook subscription failed"

**Check logs for:**
```
❌ [INVOICE] Failed to create webhook subscription:
Error details: ...
```

**Common causes:**
1. **WEBHOOK_BASE_URL not set**
   ```bash
   # Fix: Add to .env
   WEBHOOK_BASE_URL="https://your-domain.com"
   ```

2. **Localhost URL used**
   ```bash
   # Problem: WEBHOOK_BASE_URL="http://localhost:3000"
   # Fix: Use ngrok for local dev
   ngrok http 3000
   WEBHOOK_BASE_URL="https://abc123.ngrok.io"
   ```

3. **Tatum API key invalid**
   ```bash
   # Check: TATUM_API_KEY in .env
   # Get new key: https://dashboard.tatum.io/
   ```

4. **Network not supported**
   ```bash
   # Check: /src/lib/tatum/client.ts:chainMap
   # Supported: BTC, ETH, BSC, POLYGON, TRON, etc.
   ```

### Issue: "Payments not detected"

**1. Verify subscription is active:**
```bash
npx prisma studio
# Check payment_addresses table
# subscriptionActive should be true
```

**2. Test webhook endpoint:**
```bash
# Manual webhook test
curl -X POST http://localhost:3000/api/webhook/tatum/payment/YOUR_INVOICE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x...",
    "amount": "10",
    "asset": "USDT",
    "blockNumber": 123,
    "counterAddress": "0x...",
    "txId": "0x...",
    "type": "token",
    "chain": "bsc"
  }'
```

**3. Check Tatum webhook logs:**
```bash
# View Tatum dashboard
# https://dashboard.tatum.io/webhooks
# Check webhook delivery status
```

### Issue: "Subscription created but not monitoring"

**Check webhook URL is publicly accessible:**
```bash
# Test from outside your network
curl https://your-domain.com/api/health

# For ngrok, ensure it's running
ngrok http 3000
```

---

## 🎯 Monitoring Active Subscriptions

### View All Active Subscriptions:

```bash
# Via Tatum API
curl https://api.tatum.io/v4/subscription \
  -H "x-api-key: YOUR_TATUM_API_KEY"
```

### Check Subscription Count:

```bash
# In database
npx prisma studio

# Query:
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN subscriptionActive THEN 1 ELSE 0 END) as active
FROM payment_addresses
WHERE tatumSubscriptionId IS NOT NULL;
```

### Cleanup Old Subscriptions:

```typescript
// Automatic cleanup happens every 4 hours in production
// Manual cleanup:
import { tatumNotificationService } from '@/lib/tatum/notification-service'

await tatumNotificationService.cleanupExpiredInvoices()
```

---

## 📈 System Health Check

```typescript
// Check notification system health
import { tatumNotificationService } from '@/lib/tatum/notification-service'

const health = await tatumNotificationService.getSystemHealth()

console.log(health)
// {
//   totalAddresses: 100,
//   totalNotifications: 25,
//   recentActivity: 5  // Last 24 hours
// }
```

---

## 🚀 Production Checklist

- [ ] WEBHOOK_BASE_URL set to production domain
- [ ] HTTPS enabled (required by Tatum)
- [ ] Webhook endpoint accessible publicly
- [ ] Tatum API key is production key (not testnet)
- [ ] Database has subscriptionActive = true for addresses
- [ ] Test webhook delivery with real payment
- [ ] Monitor logs for webhook processing
- [ ] Set up alerts for failed webhooks

---

## 💡 Key Points

✅ **Automatic**: Subscriptions are created automatically when invoices are created
✅ **No manual setup**: System handles everything
✅ **Real-time**: Payments detected within seconds
✅ **Secure**: Uses Tatum's monitored webhooks
✅ **Reliable**: Automatic retries and error handling

⚠️ **Important**:
- Webhook URL must be **publicly accessible** (no localhost)
- Must use **HTTPS** in production
- Each invoice gets its **own unique webhook**
- Webhooks expire when invoice expires (auto-cleanup)

---

## 🔗 Related Documentation

- **Invoice Router**: `/src/lib/trpc/routers/invoice.ts`
- **Notification Service**: `/src/lib/tatum/notification-service.ts`
- **Tatum Client**: `/src/lib/tatum/client.ts`
- **Webhook Handler**: `/src/app/api/webhook/tatum/route.ts`

---

**Your webhook system is ALREADY configured and working!** 🎉

Just ensure `WEBHOOK_BASE_URL` points to a publicly accessible URL and you're good to go!
