Cryptic Gateway — Archon Project ID (c028af0a-9c65-4083-a2fb-fa3ba3c85c12)

RULES:

To maintain this project, follow these guidelines:

1. Use `npm` as the package manager.
2. To find the latest version of packages, consult the Context7 MCP.
3. If you need to interact with the browser, refer to the BrowserMCP.
4. To install a database, use Docker Compose to set up a PostgreSQL database.
5. To fetch the latest version of the Tatum API, consult the Archon MCP or the Tailwind 4 documentation in the knowledge base.
6. To get the latest version of Shadcn UI, refer to the Shadcn-UI MCP.
7. **Always use the Archon MCP** to document significant changes, optimizations, and architectural decisions for future reference.

# ARCHITECTURE PATTERNS

## tRPC Authentication Procedures

This project uses three distinct authentication patterns for different use cases:

### 1. `userAuthenticatedProcedure`
- **Use for**: General user operations (user profile, merchant list)
- **Authentication**: JWT token from user login session
- **Context**: Provides `ctx.user` and `ctx.dbUser`

### 2. `merchantAuthenticatedProcedure` 
- **Use for**: External API access with merchant API keys
- **Authentication**: Bearer token with merchant API key
- **Context**: Provides `ctx.merchant`

### 3. `userOwnsMerchantProcedure` ⭐
- **Use for**: Dashboard operations requiring merchant ownership verification
- **Authentication**: JWT token + automatic merchant ownership verification
- **Context**: Provides `ctx.user`, `ctx.dbUser`, and `ctx.merchant`
- **Benefits**: Eliminates duplicate database queries, centralizes ownership logic
- **Performance**: Reduces DB calls by ~1 query per request

## Component Architecture

### Dashboard Components
- Use tRPC hooks for data fetching: `trpc.merchant.getBalances.useQuery()`
- Implement proper loading states with Skeleton components
- Handle errors gracefully with toast notifications
- Follow the established component structure in `/src/app/dashboard/`

### Form Components
- Use `react-hook-form` with `zod` validation
- Implement proper TypeScript interfaces for props
- Handle nullable fields (like `imageUrl`) appropriately
- Follow the pattern established in `create-invoice-form.tsx`

## Database Query Optimization

When creating new tRPC procedures:
1. **Use appropriate authentication procedure** based on the use case above
2. **Minimize database queries** by leveraging context data from procedures  
3. **Combine related queries** using Promise.all() when possible
4. **Use Prisma includes** efficiently to fetch related data in single queries

# WALLET-MERCHANT INTEGRATION FLOW

## End-to-End User Journey: E-commerce Store Integration

### Scenario: Sarah's TechGadgets Store

**Business Context**: Sarah runs an online electronics store and wants to accept cryptocurrency payments for her products.

### Phase 1: Account Setup & Merchant Creation

```typescript
// 1. User Registration & Login
POST /api/trpc/auth.register
{
  "email": "sarah@techgadgets.com",
  "name": "Sarah Johnson",
  "password": "securePassword123"
}

// 2. Merchant Creation (Automatic Wallet Creation)
POST /api/trpc/merchant.create  
{
  "name": "TechGadgets Store",
  "email": "payments@techgadgets.com", 
  "businessName": "TechGadgets LLC",
  "webhookUrl": "https://techgadgets.com/webhook"
}

// Response: Merchant + Wallets Created
{
  "id": "merchant_abc123",
  "name": "TechGadgets Store",
  "apiKey": "mk_1234567890abcdef...",
  "walletsCreated": 5,    // BTC, ETH, USDC, etc.
  "walletsFailed": 0
}
```

**What Happens Automatically**:
- ✅ Merchant record created
- ✅ API keys generated  
- ✅ Wallets created for ALL active currencies (BTC, ETH, USDC, MATIC, etc.)
- ✅ Tatum virtual accounts established
- ✅ Ready to accept payments immediately

### Phase 2: API Integration

Sarah's e-commerce platform integrates using the merchant API key:

```javascript
// Sarah's E-commerce Backend Integration
const CRYPTIC_API_KEY = "mk_1234567890abcdef..."
const CRYPTIC_BASE_URL = "https://your-domain.com/api/trpc"

// Function to create payment invoice
async function createCryptoInvoice(orderData) {
  const response = await fetch(`${CRYPTIC_BASE_URL}/invoice.create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRYPTIC_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: orderData.total,
      currency: "USDC", 
      orderId: orderData.id,
      description: orderData.description,
      notifyUrl: "https://techgadgets.com/webhook/payment"
    })
  })
  
  return response.json()
}
```

### Phase 3: Customer Purchase Flow

```typescript
// Customer buys $99.99 wireless headphones
// Sarah's system calls our API:

POST /api/trpc/invoice.create
{
  "amount": "99.99",
  "currency": "USDC",
  "orderId": "ORDER-WH-001", 
  "description": "Sony WH-1000XM5 Wireless Headphones",
  "notifyUrl": "https://techgadgets.com/webhook/payment",
  "redirectUrl": "https://techgadgets.com/order/success",
  "returnUrl": "https://techgadgets.com/order/cancelled"
}

// Our System Response:
{
  "invoiceId": "inv_xyz789",
  "depositAddress": "0x742d35Cc8fF34A82D1C8F2B9A5e90C4b3d6d41A7", 
  "qrCodeData": "ethereum:0x742d35Cc...?value=99990000000000000000&data=0x",
  "amount": "99.99",
  "currency": "USDC",
  "expiresAt": "2024-01-01T15:00:00Z",
  "status": "PENDING"
}
```

**Technical Implementation**:
- 🔹 **Unique Address**: Every invoice gets its own blockchain address
- 🔹 **Tatum Integration**: Address generated via Tatum virtual account
- 🔹 **Webhook Setup**: Real-time monitoring configured for this address
- 🔹 **QR Code**: Ready-to-scan payment information

### Phase 4: Payment Processing

```typescript
// Customer Payment Flow:
// 1. Customer scans QR code with crypto wallet
// 2. Customer sends 99.99 USDC to: 0x742d35Cc8fF34A82D1C8F2B9A5e90C4b3d6d41A7
// 3. Transaction broadcast to blockchain

// Tatum Webhook Notification (Real-time):
POST https://your-domain.com/api/webhook/tatum
{
  "type": "transaction.confirmed",
  "data": {
    "address": "0x742d35Cc8fF34A82D1C8F2B9A5e90C4b3d6d41A7",
    "amount": "99.99",
    "currency": "USDC", 
    "txHash": "0xabc123...",
    "confirmations": 12,
    "invoiceId": "inv_xyz789"
  }
}

// Our System Updates:
// 1. Invoice status: PENDING → PAID
// 2. Merchant wallet balance: +99.99 USDC  
// 3. Notification sent to Sarah's webhook
```

### Phase 5: Merchant Notification

```typescript
// Sarah's Webhook Receives:
POST https://techgadgets.com/webhook/payment
{
  "event": "invoice.paid",
  "invoiceId": "inv_xyz789", 
  "orderId": "ORDER-WH-001",
  "amount": "99.99",
  "currency": "USDC",
  "paidAt": "2024-01-01T14:23:15Z",
  "txHash": "0xabc123..."
}

// Sarah's System Response:
// 1. Mark order as PAID
// 2. Send confirmation email to customer  
// 3. Trigger order fulfillment
// 4. Update inventory
```

## API Integration Examples

### Invoice Creation (External API)
```bash
curl -X POST https://your-domain.com/api/trpc/invoice.create \
  -H "Authorization: Bearer mk_1234567890abcdef..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "150.00",
    "currency": "ETH", 
    "orderId": "ORDER-123",
    "description": "Gaming Keyboard",
    "notifyUrl": "https://yourstore.com/webhook"
  }'
```

### Balance Check (Dashboard)
```bash
curl -X GET "https://your-domain.com/api/trpc/merchant.getBalances?merchantId=merchant_abc123" \
  -H "Authorization: Bearer user_jwt_token"
```

### Invoice Status Check
```bash
curl -X GET "https://your-domain.com/api/trpc/invoice.get?invoiceId=inv_xyz789" \
  -H "Authorization: Bearer mk_1234567890abcdef..."
```

## Webhook Processing Flow

```typescript
// Real-time Payment Processing:
Tatum Blockchain Monitor → Our Webhook Handler → Database Updates → Merchant Notification

// Webhook Handler Logic:
export async function POST(request: Request) {
  const payload = await request.json()
  
  // 1. Verify webhook signature
  // 2. Find invoice by deposit address
  // 3. Update invoice status and merchant balance
  // 4. Send notification to merchant webhook
  // 5. Trigger any additional business logic
}
```

## Key Technical Features

### ⚡ **Performance Optimizations**
- **Concurrent wallet creation** using `Promise.allSettled()`
- **Single query merchant ownership** via `userOwnsMerchantProcedure`
- **Unique addresses** eliminate payment conflicts
- **Real-time webhooks** for instant payment confirmation

### 🔒 **Security Features** 
- **JWT authentication** for dashboard access
- **API key authentication** for external integrations
- **Webhook signature verification** 
- **Automatic merchant ownership verification**

### 🔄 **Error Handling**
- **Graceful Tatum failures** with temporary wallet IDs
- **Webhook retry mechanisms** for failed notifications
- **Invoice expiration** handling
- **Balance reconciliation** for discrepancies

[[calls]]
match = "when the user requests code examples, setup or configuration steps, or library/API documentation"
tool  = "context7"

[[calls]]
match = "when working on optimizations, architectural changes, or significant features"
tool  = "archon"
