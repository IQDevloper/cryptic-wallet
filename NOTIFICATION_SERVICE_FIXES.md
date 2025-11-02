# 🔧 Notification Service Schema Fixes

## Summary

Fixed all schema references in `notification-service.ts` to align with the current unified Prisma schema.

---

## Changes Made

### 1. `processWebhookNotification()` Method (Lines 108-172)

**Old Schema References:**
- `invoice.address` → Changed to `invoice.paymentAddress`
- `invoice.addressId` → Changed to `invoice.paymentAddressId`
- `addressId` in webhook notification → Changed to `paymentAddressId`
- `prisma.address.update()` → Changed to `prisma.paymentAddress.update()`
- `lastActivityAt` field → Changed to `lastSeenAt`
- `firstUsedAt` field → Changed to `firstSeenAt`

**Updated Code:**
```typescript
// Find the invoice and its payment address
const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: {
    paymentAddress: true,  // ← Was: address
    merchant: true
  }
})

// Verify the address matches
if (invoice.paymentAddress.address.toLowerCase() !== webhookPayload.address.toLowerCase()) {
  // ← Was: invoice.address.address
  ...
}

// Create webhook notification record
await prisma.webhookNotification.create({
  data: {
    paymentAddressId: invoice.paymentAddressId,  // ← Was: addressId
    invoiceId: invoice.id,
    ...
  }
})

// Update payment address activity
await prisma.paymentAddress.update({  // ← Was: prisma.address
  where: { id: invoice.paymentAddressId },
  data: {
    lastSeenAt: new Date(),  // ← Was: lastActivityAt
    firstSeenAt: invoice.paymentAddress.firstSeenAt || new Date()  // ← Was: firstUsedAt
  }
})
```

---

### 2. `processConfirmedPayment()` Method (Lines 197-244)

**Old Schema References:**
- `tx.wallet.findFirst()` → Removed (wallet table doesn't exist)
- `invoice.address.walletId` → Changed to `invoice.paymentAddressId`
- `tx.merchantBalance` → Changed to `tx.merchantWallet`
- Balance fields: `balance`, `totalReceived`, `totalWithdrawn` → Changed to `availableBalance`, `pendingBalance`, `lockedBalance`

**Updated Code:**
```typescript
// Get the asset network associated with this invoice's payment address
const paymentAddress = await tx.paymentAddress.findUnique({
  where: { id: invoice.paymentAddressId },
  include: { assetNetwork: true }
})

// Find existing merchant wallet or create one
let merchantWallet = await tx.merchantWallet.findFirst({  // ← Was: merchantBalance
  where: {
    merchantId: invoice.merchantId,
    assetNetworkId: paymentAddress.assetNetworkId  // ← Was: walletId
  }
})

if (!merchantWallet) {
  // Create merchant wallet if it doesn't exist
  merchantWallet = await tx.merchantWallet.create({
    data: {
      merchantId: invoice.merchantId,
      assetNetworkId: paymentAddress.assetNetworkId,
      availableBalance: 0,  // ← Was: balance
      pendingBalance: 0,
      lockedBalance: 0
    }
  })
}

// Update merchant wallet balance
await tx.merchantWallet.update({
  where: { id: merchantWallet.id },
  data: {
    availableBalance: { increment: paymentAmount }  // ← Was: balance
  }
})
```

---

### 3. `getSystemHealth()` Method (Lines 378-403)

**Old Schema References:**
- `prisma.address.count()` → Changed to `prisma.paymentAddress.count()`

**Updated Code:**
```typescript
const [addressCount, totalNotifications, recentActivity] = await Promise.all([
  prisma.paymentAddress.count(),  // ← Was: prisma.address.count()
  prisma.webhookNotification.count(),
  prisma.webhookNotification.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  })
])
```

---

### 4. `getDetailedStats()` Method (Lines 508-530)

**Old Schema References:**
- `prisma.address.count()` → Changed to `prisma.paymentAddress.count()`
- `assignedToInvoice` field → Changed to `invoiceId`

**Updated Code:**
```typescript
const [
  totalAddresses,
  activeAddresses,
  ...
] = await Promise.all([
  prisma.paymentAddress.count(),  // ← Was: prisma.address.count()
  prisma.paymentAddress.count({
    where: { invoiceId: { not: null } }  // ← Was: assignedToInvoice
  }),
  ...
])
```

---

## Schema Mapping Reference

| Old Schema | New Schema |
|------------|------------|
| `address` table | `paymentAddress` table |
| `addressId` field | `paymentAddressId` field |
| `merchantBalance` table | `merchantWallet` table |
| `wallet` table | (removed - merged into KmsWallet + AssetNetwork) |
| `walletId` field | `assetNetworkId` field |
| `balance` field | `availableBalance` field |
| `totalReceived` field | (removed) |
| `totalWithdrawn` field | (removed) |
| `lastActivityAt` field | `lastSeenAt` field |
| `firstUsedAt` field | `firstSeenAt` field |
| `assignedToInvoice` field | `invoiceId` field |

---

## Current Schema Structure

### PaymentAddress Table
```prisma
model PaymentAddress {
  id                   String        @id @default(cuid())
  kmsWalletId          String
  assetNetworkId       String
  merchantId           String

  address              String        @unique
  derivationIndex      BigInt
  addressSignatureId   String?       @unique
  invoiceId            String?       @unique

  balance              Decimal       @default(0)
  tatumSubscriptionId  String?       @unique
  subscriptionActive   Boolean       @default(false)
  firstSeenAt          DateTime?
  lastSeenAt           DateTime?
  metadata             Json?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  // Relations
  kmsWallet            KmsWallet
  assetNetwork         AssetNetwork
  merchant             Merchant
  invoice              Invoice?
  webhookNotifications WebhookNotification[]
}
```

### MerchantWallet Table
```prisma
model MerchantWallet {
  id               String        @id @default(cuid())
  merchantId       String
  assetNetworkId   String

  availableBalance Decimal       @default(0)
  pendingBalance   Decimal       @default(0)
  lockedBalance    Decimal       @default(0)

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  // Relations
  merchant         Merchant
  assetNetwork     AssetNetwork
}
```

### WebhookNotification Table
```prisma
model WebhookNotification {
  id                String        @id @default(cuid())
  paymentAddressId  String        // ← Was: addressId
  invoiceId         String?

  txHash            String        @unique
  amount            Decimal
  blockNumber       BigInt?
  confirmations     Int           @default(0)
  chain             String

  status            String        @default("PENDING")
  webhookPayload    Json
  processedAt       DateTime?
  createdAt         DateTime      @default(now())

  // Relations
  paymentAddress    PaymentAddress
  invoice           Invoice?
}
```

---

## Testing Checklist

- [x] TypeScript compilation passes (no errors)
- [ ] Webhook processing works for real payments
- [ ] Merchant wallet balance updates correctly
- [ ] System health stats return accurate data
- [ ] Detailed stats return without errors

---

## Related Files

- `/src/lib/tatum/notification-service.ts` - Main notification service (FIXED ✅)
- `/src/lib/trpc/routers/invoice.ts` - Invoice creation with webhook setup (FIXED ✅)
- `/prisma/schema.prisma` - Unified database schema (Reference)

---

**All TypeScript errors resolved!** ✅

The notification service is now fully aligned with the unified KMS-based schema architecture.
