# Merchant Invoice API Guide

This guide explains how merchants can create and manage invoices using the Cryptic Wallet API. It covers authentication, available endpoints, and request examples in cURL, Python, and TypeScript.

## Base URL

```
https://<your-domain>/api/v1
```

Replace `<your-domain>` with the hostname of your Cryptic Wallet deployment. All examples below assume the base URL above.

## Authentication

Merchant endpoints require an API key. Provide it with either:

- `Authorization: Bearer <API_KEY>` header (recommended), or
- `X-API-Key: <API_KEY>` header

If the API key is missing, invalid, or inactive the API returns:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "API key required. Include it in Authorization header as \"Bearer <key>\" or X-API-Key header."
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

### Rate limiting

Merchants are rate limited per endpoint according to their configured quota. When exceeded the response status is `429` with headers `X-RateLimit-*` describing the limit window.

## Response envelope

Successful responses are wrapped in a standard envelope:

```json
{
  "data": { /* endpoint-specific payload */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

Errors follow the structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

## Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/invoices` | `POST` | Create a new invoice for the authenticated merchant. | Required |
| `/invoices` | `GET` | List invoices for the authenticated merchant with optional filters. | Required |
| `/invoices/{id}` | `GET` | Fetch full details for a specific merchant invoice. | Required |
| `/invoices/{id}/public` | `GET` | Public invoice payload for pay.cryptic.com pages. | Not required |

Below are the request and response details for each endpoint.

---

## Create an invoice — `POST /invoices`

### Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | string or number | ✅ | Invoice amount in the requested currency (must be positive). |
| `currency` | string | ✅ | Asset symbol, e.g. `USDT`. Case-insensitive. |
| `network` | string | ✅ | Network code, e.g. `ethereum`, `tron`, `bsc`. Normalized internally. |
| `description` | string | ❌ | Customer-facing description (max 500 chars). |
| `orderId` | string | ❌ | Your internal order reference (max 100 chars). |
| `metadata` | object | ❌ | Arbitrary JSON metadata stored with the invoice. |
| `notifyUrl` | string | ❌ | Webhook URL notified on status changes. |
| `redirectUrl` | string | ❌ | URL to send customer after successful payment capture. |
| `returnUrl` | string | ❌ | URL to send customer if they leave the payment page. |
| `expiresIn` | number | ❌ | Expiry in seconds (between 300 and 604800). Default: 3600. |

### Example request bodies

#### cURL

```bash
curl -X POST "https://<your-domain>/api/v1/invoices" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "125.00",
    "currency": "USDT",
    "network": "tron",
    "description": "Order #5012",
    "orderId": "5012",
    "metadata": {"customerEmail": "alice@example.com"},
    "notifyUrl": "https://merchant.example.com/webhooks/cryptic",
    "redirectUrl": "https://merchant.example.com/success",
    "returnUrl": "https://merchant.example.com/return",
    "expiresIn": 1800
  }'
```

#### Python (requests)

```python
import os
import requests

API_KEY = os.environ["CRYPTIC_API_KEY"]
BASE_URL = "https://<your-domain>/api/v1"

payload = {
    "amount": "125.00",
    "currency": "USDT",
    "network": "tron",
    "description": "Order #5012",
    "orderId": "5012",
    "metadata": {"customerEmail": "alice@example.com"},
    "notifyUrl": "https://merchant.example.com/webhooks/cryptic",
    "redirectUrl": "https://merchant.example.com/success",
    "returnUrl": "https://merchant.example.com/return",
    "expiresIn": 1800,
}

response = requests.post(
    f"{BASE_URL}/invoices",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json=payload,
    timeout=10,
)
response.raise_for_status()
print(response.json()["data"])
```

#### TypeScript (fetch)

```ts
const API_KEY = process.env.CRYPTIC_API_KEY!
const BASE_URL = "https://<your-domain>/api/v1"

async function createInvoice() {
  const res = await fetch(`${BASE_URL}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      amount: "125.00",
      currency: "USDT",
      network: "tron",
      description: "Order #5012",
      orderId: "5012",
      metadata: { customerEmail: "alice@example.com" },
      notifyUrl: "https://merchant.example.com/webhooks/cryptic",
      redirectUrl: "https://merchant.example.com/success",
      returnUrl: "https://merchant.example.com/return",
      expiresIn: 1800,
    }),
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  const payload = await res.json()
  console.log(payload.data)
}
```

### Successful response payload (`data` field)

```json
{
  "id": "inv_01hxyz...",
  "amount": "125.00",
  "currency": "USDT",
  "network": "tron",
  "description": "Order #5012",
  "orderId": "5012",
  "depositAddress": "TTWZ...",
  "qrCodeData": "usdt:TTWZ...?amount=125",
  "status": "PENDING",
  "expiresAt": "2024-01-01T01:30:00.000Z",
  "notifyUrl": "https://merchant.example.com/webhooks/cryptic",
  "redirectUrl": "https://merchant.example.com/success",
  "returnUrl": "https://merchant.example.com/return",
  "paymentUrl": "https://pay.cryptic.com/inv_01hxyz...",
  "message": "Invoice created successfully with payment monitoring enabled"
}
```

---

## List invoices — `GET /invoices`

### Query parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default `1`). |
| `limit` | number | Items per page between 1 and 100 (default `20`). |
| `status` | enum | Filter by status (`PENDING`, `PAID`, `EXPIRED`, `CANCELLED`, `UNDERPAID`, `OVERPAID`, `PROCESSING`). |
| `currency` | string | Filter by currency code (case-insensitive). |
| `orderId` | string | Filter by your order reference. |

### Example requests

#### cURL

```bash
curl "https://<your-domain>/api/v1/invoices?page=1&limit=10&status=PENDING" \
  -H "Authorization: Bearer $API_KEY"
```

#### Python

```python
import os
import requests

API_KEY = os.environ["CRYPTIC_API_KEY"]
BASE_URL = "https://<your-domain>/api/v1"

params = {"page": 1, "limit": 10, "status": "PENDING"}
response = requests.get(
    f"{BASE_URL}/invoices",
    headers={"Authorization": f"Bearer {API_KEY}"},
    params=params,
    timeout=10,
)
response.raise_for_status()
print(response.json()["data"]["invoices"])
```

#### TypeScript

```ts
const res = await fetch("https://<your-domain>/api/v1/invoices?limit=10", {
  headers: { Authorization: `Bearer ${API_KEY}` },
})
const payload = await res.json()
console.log(payload.data.invoices)
```

### Successful response payload (`data` field)

```json
{
  "page": 1,
  "limit": 10,
  "total": 42,
  "totalPages": 5,
  "invoices": [
    {
      "id": "inv_01hxyz...",
      "amount": "125.00",
      "amountPaid": "0",
      "currency": "USDT",
      "network": "tron",
      "description": "Order #5012",
      "orderId": "5012",
      "status": "PENDING",
      "depositAddress": "TTWZ...",
      "paymentUrl": "https://pay.cryptic.com/inv_01hxyz...",
      "qrCodeData": "usdt:TTWZ...?amount=125",
      "expiresAt": "2024-01-01T01:30:00.000Z",
      "createdAt": "2024-01-01T00:30:00.000Z"
    }
  ]
}
```

---

## Get invoice details — `GET /invoices/{id}`

Provides full invoice information, including webhook URLs, merchant branding, and transaction history.

### Example requests

#### cURL

```bash
curl "https://<your-domain>/api/v1/invoices/inv_01hxyz..." \
  -H "Authorization: Bearer $API_KEY"
```

#### Python

```python
response = requests.get(
    f"{BASE_URL}/invoices/{invoice_id}",
    headers={"Authorization": f"Bearer {API_KEY}"},
    timeout=10,
)
print(response.json()["data"])
```

#### TypeScript

```ts
const res = await fetch(`${BASE_URL}/invoices/${invoiceId}`, {
  headers: { Authorization: `Bearer ${API_KEY}` },
})
const payload = await res.json()
console.log(payload.data.transactions)
```

### Successful response payload (`data` field)

```json
{
  "id": "inv_01hxyz...",
  "amount": "125.00",
  "amountPaid": "0",
  "currency": "USDT",
  "network": "tron",
  "status": "PENDING",
  "description": "Order #5012",
  "orderId": "5012",
  "depositAddress": "TTWZ...",
  "qrCodeData": "usdt:TTWZ...?amount=125",
  "customData": {"customerEmail": "alice@example.com"},
  "notifyUrl": "https://merchant.example.com/webhooks/cryptic",
  "redirectUrl": "https://merchant.example.com/success",
  "returnUrl": "https://merchant.example.com/return",
  "paymentUrl": "https://pay.cryptic.com/inv_01hxyz...",
  "expiresAt": "2024-01-01T01:30:00.000Z",
  "createdAt": "2024-01-01T00:30:00.000Z",
  "paidAt": null,
  "confirmedAt": null,
  "merchant": {
    "id": "merch_01abc...",
    "name": "Alice",
    "businessName": "Alice Co",
    "settings": {
      "companyName": "Alice Co",
      "supportEmail": "support@alice.co",
      "brandColor": "#4f46e5",
      "logoUrl": "https://cdn.example.com/logo.png"
    }
  },
  "transactions": [
    {
      "id": "tx_01...",
      "txHash": "0x123...",
      "amount": "125.00",
      "blockNumber": "19381293",
      "confirmations": 2,
      "status": "CONFIRMED",
      "createdAt": "2024-01-01T00:45:00.000Z"
    }
  ]
}
```

---

## Public invoice data — `GET /invoices/{id}/public`

Public endpoint used by `pay.cryptic.com` to render payment pages. No authentication is required, and CORS headers are enabled.

### Example requests

#### cURL

```bash
curl "https://<your-domain>/api/v1/invoices/inv_01hxyz.../public"
```

#### Python

```python
response = requests.get(
    f"{BASE_URL}/invoices/{invoice_id}/public",
    timeout=10,
)
print(response.json()["data"])
```

#### TypeScript

```ts
const res = await fetch(`${BASE_URL}/invoices/${invoiceId}/public`)
const payload = await res.json()
console.log(payload.data.paymentUrl)
```

### Successful response payload (`data` field)

```json
{
  "id": "inv_01hxyz...",
  "amount": "125.00",
  "amountPaid": "0",
  "currency": "USDT",
  "network": "tron",
  "status": "PENDING",
  "description": "Order #5012",
  "orderId": "5012",
  "depositAddress": "TTWZ...",
  "qrCodeData": "usdt:TTWZ...?amount=125",
  "paymentUrl": "https://pay.cryptic.com/inv_01hxyz...",
  "expiresAt": "2024-01-01T01:30:00.000Z",
  "createdAt": "2024-01-01T00:30:00.000Z",
  "paidAt": null,
  "isExpired": false,
  "merchant": {
    "name": "Alice",
    "businessName": "Alice Co",
    "settings": {
      "companyName": "Alice Co",
      "supportEmail": "support@alice.co",
      "brandColor": "#4f46e5",
      "logoUrl": "https://cdn.example.com/logo.png"
    }
  }
}
```

---

## Handling webhooks

When `notifyUrl` is set, Cryptic Wallet attempts to subscribe the deposit address to blockchain notifications. Ensure your webhook endpoint validates signatures (see `src/lib/tatum/notification-service.ts`) and processes invoice status updates.

## Next steps

- Rotate API keys regularly and keep them secret.
- Use `paymentUrl` to redirect customers to `pay.cryptic.com/<invoiceId>`.
- Poll the merchant detail endpoint or rely on webhooks to update order fulfillment state.

