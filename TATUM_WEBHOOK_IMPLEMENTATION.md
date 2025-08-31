# Tatum Webhook System Implementation

## Overview
Successfully implemented a comprehensive Tatum webhook notification system for monitoring HD wallet transactions in real-time.

## ✅ Completed Components

### 1. Notification Service (`src/lib/tatum/notification-service.ts`)
- **TatumNotificationService** class with complete webhook management
- **Subscription Management**: Create and remove Tatum address subscriptions
- **Webhook Processing**: Handle incoming payment notifications
- **Balance Updates**: Update merchant balances and invoice status
- **Cleanup Operations**: Periodic and manual subscription cleanup
- **Statistics**: Detailed performance and health metrics

### 2. Webhook Handlers
- **Generic Handler**: `/api/webhook/tatum` - Handles webhooks by finding invoice by address
- **Invoice-Specific Handler**: `/api/webhook/tatum/payment/{invoiceId}` - Direct invoice processing
- **Signature Verification**: HMAC validation using WEBHOOK_SECRET_KEY
- **Error Handling**: Comprehensive error logging and response handling

### 3. Database Schema Updates
Updated `DerivedAddress` model with webhook tracking fields:
```prisma
tatumSubscriptionId String?
subscriptionActive  Boolean @default(false)
lastNotificationAt  DateTime?
```

Added `WebhookNotification` model for complete audit trail:
```prisma
model WebhookNotification {
  id                String      @id @default(cuid())
  derivedAddressId  String
  invoiceId         String
  txHash            String
  amount            Decimal     @db.Decimal(36, 18)
  blockNumber       BigInt?
  confirmations     Int         @default(0)
  chain             String
  status            String
  webhookPayload    Json
  processedAt       DateTime    @default(now())
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  // ... relationships
}
```

### 4. Integration with Invoice Creation
- **Automatic Subscription**: When invoice created, Tatum subscription is automatically set up
- **Real-time Monitoring**: Each invoice gets dedicated blockchain monitoring
- **Graceful Degradation**: If subscription fails, invoice creation continues

### 5. Admin Management (`/api/admin/subscriptions`)
- **Health Monitoring**: `GET ?action=health` - Active subscriptions and notifications
- **Detailed Statistics**: `GET ?action=stats` - Comprehensive metrics
- **Manual Cleanup**: `POST {"action": "cleanup"}` - Force cleanup of expired subscriptions

### 6. Lifecycle Management
- **Periodic Cleanup**: Runs every 4 hours in production
- **Automatic Expiration**: Expired invoices automatically cleaned up
- **Performance Tracking**: Processing time and success rate monitoring

## 🔄 Webhook Flow

### Invoice Creation → Monitoring Setup
```
1. Invoice created with unique derived address
2. Tatum subscription created for address monitoring
3. Webhook URL: /api/webhook/tatum/payment/{invoiceId}
4. DerivedAddress updated with subscription info
```

### Payment Detection → Processing
```
1. Customer sends payment to derived address
2. Tatum detects transaction on blockchain
3. Webhook sent to our endpoint with transaction data
4. Invoice status updated (PENDING → PAID)
5. Merchant balance increased
6. Transaction record created
7. Merchant webhook notification sent (if configured)
```

### Cleanup Process
```
1. Periodic job finds expired invoices
2. Tatum subscription removed
3. Database updated (subscriptionActive = false)
4. Invoice status set to EXPIRED
```

## 🔧 Configuration

### Environment Variables
```bash
WEBHOOK_BASE_URL="http://localhost:3000/api/webhook"
WEBHOOK_SECRET_KEY="your_webhook_secret_key_here"
TATUM_API_KEY="your_tatum_api_key"
TATUM_ENVIRONMENT="mainnet"  # or "testnet"
```

### Tatum Webhook URLs
- **Generic**: `${WEBHOOK_BASE_URL}/tatum`
- **Invoice-specific**: `${WEBHOOK_BASE_URL}/tatum/payment/{invoiceId}`

## 📊 Monitoring & Statistics

### Health Check
```bash
curl -H "Authorization: Bearer ${JWT_SECRET}" \
  "http://localhost:3000/api/admin/subscriptions?action=health"
```

### Detailed Statistics
```bash
curl -H "Authorization: Bearer ${JWT_SECRET}" \
  "http://localhost:3000/api/admin/subscriptions?action=stats"
```

### Manual Cleanup
```bash
curl -X POST \
  -H "Authorization: Bearer ${JWT_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup"}' \
  "http://localhost:3000/api/admin/subscriptions"
```

## 🚀 Key Features

### Real-time Processing
- Immediate payment detection via Tatum webhooks
- Automatic invoice status updates
- Real-time balance updates for merchants

### Scalability
- Each invoice gets unique derived address
- Parallel webhook processing
- Efficient database transactions

### Reliability
- Webhook signature verification
- Duplicate payment protection
- Comprehensive error handling
- Automatic retry mechanisms

### Monitoring
- Detailed performance metrics
- Health status tracking
- Audit trail for all webhook notifications

## 🔒 Security

- **HMAC Signature Verification**: All webhooks validated using secret key
- **Unique Addresses**: Each invoice uses unique derived address
- **Address Validation**: Webhook address must match invoice address
- **Authentication**: Admin endpoints protected with JWT tokens

## 📈 Performance Optimizations

- **Direct Invoice Processing**: Invoice-specific URLs eliminate address lookups
- **Batch Operations**: Efficient database operations with transactions
- **Periodic Cleanup**: Prevents subscription accumulation
- **Caching**: Health metrics cached for improved response times

## 🧪 Testing

### Test Webhook Endpoint
```bash
curl "http://localhost:3000/api/webhook/tatum"
```

### Test Invoice-Specific Endpoint
```bash
curl "http://localhost:3000/api/webhook/tatum/payment/test-invoice-id"
```

This implementation provides a robust, scalable, and secure foundation for processing cryptocurrency payments through Tatum's blockchain monitoring infrastructure.