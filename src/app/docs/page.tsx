import { Metadata } from "next"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BookOpen, Code2, Globe, Shield } from "lucide-react"

export const metadata: Metadata = {
  title: "Merchant Invoice API Documentation",
  description:
    "Learn how to create, list, and fetch Cryptic merchant invoices with authenticated API requests and language examples.",
}

type Field = {
  name: string
  type: string
  required: boolean
  description: string
}

type QueryParam = {
  name: string
  type: string
  description: string
}

function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string
  subtitle?: string
  id: string
}) {
  return (
    <div id={id} className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="uppercase tracking-wide">Section</span>
      </div>
      <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
      {subtitle ? (
        <p className="text-lg text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  )
}

function CodeBlock({
  label,
  language,
  code,
}: {
  label: string
  language: string
  code: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">
          {language}
        </span>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function FieldTable({
  caption,
  fields,
}: {
  caption: string
  fields: Field[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{caption}</p>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[160px_160px_80px_auto] bg-muted/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Field</span>
          <span>Type</span>
          <span>Required</span>
          <span>Description</span>
        </div>
        <div className="divide-y divide-border">
          {fields.map((field) => (
            <div
              key={field.name}
              className="grid grid-cols-[160px_160px_80px_auto] gap-y-2 px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">{field.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {field.type}
              </span>
              <span className="text-muted-foreground">
                {field.required ? "Yes" : "No"}
              </span>
              <span className="text-muted-foreground">{field.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QueryTable({
  caption,
  params,
}: {
  caption: string
  params: QueryParam[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{caption}</p>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[160px_160px_auto] bg-muted/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Parameter</span>
          <span>Type</span>
          <span>Description</span>
        </div>
        <div className="divide-y divide-border">
          {params.map((param) => (
            <div
              key={param.name}
              className="grid grid-cols-[160px_160px_auto] gap-y-2 px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">{param.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {param.type}
              </span>
              <span className="text-muted-foreground">{param.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const createInvoiceExamples = {
  curl: String.raw`curl -X POST "https://<your-domain>/api/v1/invoices" \
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
  }'`,
  python: String.raw`import os
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
print(response.json()["data"])`,
  typescript: String.raw`const API_KEY = process.env.CRYPTIC_API_KEY!
const BASE_URL = "https://<your-domain>/api/v1"

export async function createInvoice() {
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
}`,
}

const listInvoiceExamples = {
  curl: String.raw`curl -G "https://<your-domain>/api/v1/invoices" \
  -H "Authorization: Bearer $API_KEY" \
  --data-urlencode "status=PENDING" \
  --data-urlencode "page=1" \
  --data-urlencode "limit=10"`,
  python: String.raw`import os
import requests

API_KEY = os.environ["CRYPTIC_API_KEY"]
BASE_URL = "https://<your-domain>/api/v1"

params = {
    "status": "PENDING",
    "page": 1,
    "limit": 10,
}

response = requests.get(
    f"{BASE_URL}/invoices",
    headers={"Authorization": f"Bearer {API_KEY}"},
    params=params,
    timeout=10,
)
response.raise_for_status()
print(response.json()["data"]["invoices"])`,
  typescript: String.raw`const API_KEY = process.env.CRYPTIC_API_KEY!
const BASE_URL = "https://<your-domain>/api/v1"

export async function listInvoices() {
  const url = new URL(`${BASE_URL}/invoices`)
  url.searchParams.set("status", "PENDING")
  url.searchParams.set("page", "1")
  url.searchParams.set("limit", "10")

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  const payload = await res.json()
  return payload.data
}`,
}

const detailExamples = {
  curl: String.raw`curl "https://<your-domain>/api/v1/invoices/{id}" \
  -H "Authorization: Bearer $API_KEY"`,
  python: String.raw`import os
import requests

API_KEY = os.environ["CRYPTIC_API_KEY"]
BASE_URL = "https://<your-domain>/api/v1"
INVOICE_ID = "inv_01hxyz..."

response = requests.get(
    f"{BASE_URL}/invoices/{INVOICE_ID}",
    headers={"Authorization": f"Bearer {API_KEY}"},
    timeout=10,
)
response.raise_for_status()
print(response.json()["data"])`,
  typescript: String.raw`const API_KEY = process.env.CRYPTIC_API_KEY!
const BASE_URL = "https://<your-domain>/api/v1"

export async function getInvoice(id: string) {
  const res = await fetch(`${BASE_URL}/invoices/${id}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  const payload = await res.json()
  return payload.data
}`,
}

const publicExamples = {
  curl: String.raw`curl "https://<your-domain>/api/v1/invoices/{id}/public"`,
  python: String.raw`import requests

BASE_URL = "https://<your-domain>/api/v1"
INVOICE_ID = "inv_01hxyz..."

response = requests.get(
    f"{BASE_URL}/invoices/{INVOICE_ID}/public",
    timeout=10,
)
response.raise_for_status()
print(response.json()["data"])`,
  typescript: String.raw`const BASE_URL = "https://<your-domain>/api/v1"

export async function fetchPublicInvoice(id: string) {
  const res = await fetch(`${BASE_URL}/invoices/${id}/public`)

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  const payload = await res.json()
  return payload.data
}`,
}

const createInvoiceFields: Field[] = [
  {
    name: "amount",
    type: "string | number",
    required: true,
    description: "Invoice amount in the requested currency (must be positive).",
  },
  {
    name: "currency",
    type: "string",
    required: true,
    description: "Asset symbol, e.g. USDT. Case-insensitive.",
  },
  {
    name: "network",
    type: "string",
    required: true,
    description: "Network code, e.g. ethereum, tron, bsc.",
  },
  {
    name: "description",
    type: "string",
    required: false,
    description: "Customer-facing description (max 500 chars).",
  },
  {
    name: "orderId",
    type: "string",
    required: false,
    description: "Internal order reference (max 100 chars).",
  },
  {
    name: "metadata",
    type: "object",
    required: false,
    description: "Arbitrary JSON metadata stored with the invoice.",
  },
  {
    name: "notifyUrl",
    type: "string",
    required: false,
    description: "Webhook URL notified on status changes.",
  },
  {
    name: "redirectUrl",
    type: "string",
    required: false,
    description: "URL to send customer after successful payment capture.",
  },
  {
    name: "returnUrl",
    type: "string",
    required: false,
    description: "URL to send customer if they leave the payment page.",
  },
  {
    name: "expiresIn",
    type: "number",
    required: false,
    description: "Expiry in seconds (between 300 and 604800). Default: 3600.",
  },
]

const listInvoiceParams: QueryParam[] = [
  {
    name: "page",
    type: "number",
    description: "Page to fetch. Defaults to 1.",
  },
  {
    name: "limit",
    type: "number",
    description: "Items per page (1-100). Defaults to 20.",
  },
  {
    name: "status",
    type: "string",
    description:
      "Filter by invoice status (PENDING, PAID, EXPIRED, CANCELLED, UNDERPAID, OVERPAID, PROCESSING).",
  },
  {
    name: "currency",
    type: "string",
    description: "Return invoices for a specific currency symbol.",
  },
  {
    name: "orderId",
    type: "string",
    description: "Match invoices created for an internal order reference.",
  },
]

const detailResponse = `{
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
}`

const listResponse = `{
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
}`

const publicResponse = `{
  "id": "inv_01hxyz...",
  "merchant": {
    "name": "Acme Co.",
    "logoUrl": "https://merchant.example.com/logo.png"
  },
  "amount": "125.00",
  "amountPaid": "0",
  "currency": "USDT",
  "network": "tron",
  "status": "PENDING",
  "description": "Order #5012",
  "depositAddress": "TTWZ...",
  "qrCodeData": "usdt:TTWZ...?amount=125",
  "expiresAt": "2024-01-01T01:30:00.000Z",
  "createdAt": "2024-01-01T00:30:00.000Z",
  "paymentUrl": "https://pay.cryptic.com/inv_01hxyz...",
  "recentTransactions": []
}`

const responseEnvelope = `{
  "data": {
    /* endpoint-specific payload */
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}`

const errorEnvelope = `{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "uuid"
}`

export default function MerchantDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-b from-background via-background to-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-16 md:px-10 lg:px-16">
          <div className="flex flex-col gap-6">
            <Badge className="w-fit bg-blue-600 text-white">Developers</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Merchant Invoice API
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground md:text-xl">
              Learn how to authenticate, create, and manage invoices programmatically. Use the
              examples below to integrate Cryptic Gateway payments into your application in minutes.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
                <Shield className="h-4 w-4" /> API key security
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
                <Globe className="h-4 w-4" /> Multi-chain support
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1">
                <Code2 className="h-4 w-4" /> Ready-to-run snippets
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#create"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Start with invoice creation
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/api/v1/invoices"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                View API base path
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-blue-200 bg-blue-600/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Shield className="h-5 w-5" /> Authentication
                </CardTitle>
                <CardDescription>
                  Authenticate every merchant request with a server-side API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock
                  label="Authorization header"
                  language="http"
                  code="Authorization: Bearer <API_KEY>"
                />
                <CodeBlock
                  label="Alternate header"
                  language="http"
                  code="X-API-Key: <API_KEY>"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Base URL
                </CardTitle>
                <CardDescription>
                  All examples use the versioned API namespace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  label="REST base"
                  language="text"
                  code="https://<your-domain>/api/v1"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" /> Environments
                </CardTitle>
                <CardDescription>
                  Use separate API keys for production and staging deployments.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Rate limits apply per API key. When you exceed a limit the API returns <code>429</code>
                  with <code>X-RateLimit-*</code> headers describing the quota and reset time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-20 px-6 py-16 md:px-10 lg:px-16">
        <section id="overview" className="space-y-8">
          <SectionHeading
            id="overview"
            title="Response envelope"
            subtitle="Every successful response wraps data and metadata for consistent parsing."
          />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Successful response</CardTitle>
                <CardDescription>Use the <code>data</code> property for endpoint-specific payloads.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="Example" language="json" code={responseEnvelope} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Error response</CardTitle>
                <CardDescription>Non-2xx responses return a typed error object.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="Example" language="json" code={errorEnvelope} />
              </CardContent>
            </Card>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="bg-muted/60 px-6 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Endpoint summary
              </h3>
            </div>
            <div className="divide-y divide-border text-sm">
              <div className="grid grid-cols-[200px_120px_1fr_120px] px-6 py-3 font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Path</span>
                <span>Method</span>
                <span>Description</span>
                <span>Auth</span>
              </div>
              {[{
                path: "/invoices",
                method: "POST",
                description: "Create a new invoice for the authenticated merchant.",
                auth: "Required",
              },
              {
                path: "/invoices",
                method: "GET",
                description: "List invoices for the authenticated merchant with optional filters.",
                auth: "Required",
              },
              {
                path: "/invoices/{id}",
                method: "GET",
                description: "Fetch full details for a specific merchant invoice.",
                auth: "Required",
              },
              {
                path: "/invoices/{id}/public",
                method: "GET",
                description: "Retrieve the public invoice payload for pay.cryptic.com.",
                auth: "Not required",
              }].map((row) => (
                <div
                  key={`${row.method}-${row.path}`}
                  className="grid grid-cols-[200px_120px_1fr_120px] items-start px-6 py-4"
                >
                  <span className="font-mono text-xs text-foreground">{row.path}</span>
                  <span className="rounded-full bg-muted px-2 py-1 text-center text-xs font-semibold uppercase text-blue-600 dark:text-blue-300">
                    {row.method}
                  </span>
                  <span className="text-muted-foreground">{row.description}</span>
                  <span className="text-muted-foreground">{row.auth}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="create" className="space-y-8">
          <SectionHeading
            id="create"
            title="Create an invoice"
            subtitle="POST /invoices"
          />
          <FieldTable caption="Request body" fields={createInvoiceFields} />
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request examples</CardTitle>
                <CardDescription>Run these commands from a trusted server-side environment.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="cURL" language="bash" code={createInvoiceExamples.curl} />
                <CodeBlock label="Python" language="python" code={createInvoiceExamples.python} />
                <CodeBlock label="TypeScript" language="ts" code={createInvoiceExamples.typescript} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Successful response</CardTitle>
                <CardDescription>The response is available under <code>data</code>.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="JSON" language="json" code={detailResponse} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="list" className="space-y-8">
          <SectionHeading
            id="list"
            title="List invoices"
            subtitle="GET /invoices"
          />
          <QueryTable caption="Query parameters" params={listInvoiceParams} />
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request examples</CardTitle>
                <CardDescription>Paginate through invoices with optional filters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="cURL" language="bash" code={listInvoiceExamples.curl} />
                <CodeBlock label="Python" language="python" code={listInvoiceExamples.python} />
                <CodeBlock label="TypeScript" language="ts" code={listInvoiceExamples.typescript} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Response payload</CardTitle>
                <CardDescription>The envelope includes pagination metadata alongside invoice rows.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="JSON" language="json" code={listResponse} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="detail" className="space-y-8">
          <SectionHeading
            id="detail"
            title="Retrieve a merchant invoice"
            subtitle="GET /invoices/{id}"
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request examples</CardTitle>
                <CardDescription>Fetch full details with audit metadata for a single invoice.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="cURL" language="bash" code={detailExamples.curl} />
                <CodeBlock label="Python" language="python" code={detailExamples.python} />
                <CodeBlock label="TypeScript" language="ts" code={detailExamples.typescript} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Response payload</CardTitle>
                <CardDescription>Includes payment address, QR data, and redirect configuration.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="JSON" language="json" code={detailResponse} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="public" className="space-y-8">
          <SectionHeading
            id="public"
            title="Public invoice payload"
            subtitle="GET /invoices/{id}/public"
          />
          <p className="text-muted-foreground">
            Use this endpoint to power <span className="font-mono">pay.cryptic.com</span> payment pages and client-side status
            widgets. It exposes merchant branding and recent transaction history without requiring authentication.
          </p>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request examples</CardTitle>
                <CardDescription>No API key required. Safe to call from the browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CodeBlock label="cURL" language="bash" code={publicExamples.curl} />
                <CodeBlock label="Python" language="python" code={publicExamples.python} />
                <CodeBlock label="TypeScript" language="ts" code={publicExamples.typescript} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Response payload</CardTitle>
                <CardDescription>Includes branding details to render checkout experiences.</CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock label="JSON" language="json" code={publicResponse} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="webhooks" className="space-y-6">
          <SectionHeading
            id="webhooks"
            title="Webhook tips"
            subtitle="Keep your systems in sync as invoices are paid."
          />
          <Card>
            <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
              <p>
                When <code>notifyUrl</code> is provided during invoice creation, Cryptic Gateway sends POST requests with status
                transitions, confirmations, and underpayment alerts. Handle retries by treating notifications as idempotent
                using the <code>requestId</code> header.
              </p>
              <p>
                Recommended workflow:
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-foreground">
                <li>Verify the <code>requestId</code> is new before processing.</li>
                <li>Compare the <code>status</code> field against your internal order state.</li>
                <li>Respond with <code>200 OK</code> to acknowledge delivery; failures are retried with exponential backoff.</li>
              </ol>
              <p>
                For customer redirects, configure <code>redirectUrl</code> for success and <code>returnUrl</code> for abandoned
                checkouts to ensure seamless UX.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
