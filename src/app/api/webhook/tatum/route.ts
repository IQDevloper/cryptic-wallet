import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { z } from 'zod'

const prisma = new PrismaClient()

// Tatum webhook payload schemas
const TatumWebhookSchema = z.object({
  subscriptionType: z.string(),
  txId: z.string(),
  blockNumber: z.number().optional(),
  asset: z.string(),
  amount: z.string(),
  address: z.string(),
  counterAddress: z.string().optional(),
  chain: z.string(),
  mempool: z.boolean().optional(),
  confirmed: z.boolean().optional(),
  date: z.number(),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

type TatumWebhookPayload = z.infer<typeof TatumWebhookSchema>

interface WebhookProcessingResult {
  success: boolean
  invoiceId?: string
  transactionId?: string
  status?: string
  error?: string
}

// Utility function to verify webhook signature (if Tatum provides one)
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

// Process incoming payment transaction
async function processPaymentWebhook(webhookData: TatumWebhookPayload): Promise<WebhookProcessingResult> {
  const startTime = Date.now()
  console.log(`[Webhook] Processing payment for address ${webhookData.address}, tx: ${webhookData.txId}`)

  try {
    // Start database transaction for atomic updates
    return await prisma.$transaction(async (prisma) => {
      // Find invoice by deposit address
      const invoice = await prisma.invoice.findFirst({
        where: {
          depositAddress: webhookData.address,
          status: {
            in: ['PENDING', 'UNDERPAID', 'PROCESSING']
          }
        },
        include: {
          wallet: {
            include: {
              currency: {
                include: {
                  network: true
                }
              }
            }
          },
          transactions: true,
          merchant: true
        }
      })

      if (!invoice) {
        console.log(`[Webhook] No pending invoice found for address ${webhookData.address}`)
        return { 
          success: false, 
          error: 'Invoice not found or already processed' 
        }
      }

      // Check if transaction already exists (idempotency control)
      let existingTransaction = await prisma.transaction.findFirst({
        where: {
          OR: [
            { txHash: webhookData.txId },
            { tatumWebhookId: webhookData.reference || webhookData.txId }
          ]
        }
      })

      if (existingTransaction) {
        console.log(`[Webhook] Transaction ${webhookData.txId} already exists, updating confirmations`)
        
        // Update confirmation count if needed
        const confirmations = webhookData.blockNumber ? 
          Math.max(0, Date.now() - webhookData.date) / (invoice.wallet.currency.network.averageBlockTime || 600000) : 0
        
        const updatedTransaction = await prisma.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            confirmations: Math.floor(confirmations),
            blockNumber: webhookData.blockNumber ? BigInt(webhookData.blockNumber) : undefined,
            status: webhookData.confirmed ? 'CONFIRMED' : 'PENDING',
            processedAt: new Date()
          }
        })

        return {
          success: true,
          invoiceId: invoice.id,
          transactionId: updatedTransaction.id,
          status: 'updated'
        }
      }

      // Parse amount (handle decimal precision)
      const transactionAmount = parseFloat(webhookData.amount)
      const invoiceAmount = parseFloat(invoice.amount.toString())
      const currentPaid = parseFloat(invoice.amountPaid.toString())
      const newTotalPaid = currentPaid + transactionAmount

      console.log(`[Webhook] Transaction amount: ${transactionAmount}, Invoice amount: ${invoiceAmount}, Current paid: ${currentPaid}`)

      // Create new transaction record
      const transaction = await prisma.transaction.create({
        data: {
          txHash: webhookData.txId,
          amount: transactionAmount,
          blockNumber: webhookData.blockNumber ? BigInt(webhookData.blockNumber) : null,
          confirmations: 0,
          status: webhookData.confirmed ? 'CONFIRMED' : 'PENDING',
          fromAddress: webhookData.counterAddress,
          toAddress: webhookData.address,
          tatumWebhookId: webhookData.reference || webhookData.txId,
          processedAt: new Date(),
          invoiceId: invoice.id
        }
      })

      // Update invoice status based on payment amount
      let newInvoiceStatus = invoice.status
      let paidAt = invoice.paidAt

      if (newTotalPaid >= invoiceAmount) {
        newInvoiceStatus = 'PAID'
        paidAt = new Date()
      } else if (newTotalPaid > 0) {
        newInvoiceStatus = 'UNDERPAID'
      }

      // Update invoice with new payment information
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newTotalPaid,
          status: newInvoiceStatus,
          paidAt,
          confirmedAt: webhookData.confirmed && newInvoiceStatus === 'PAID' ? new Date() : undefined
        }
      })

      // Update wallet balance
      await prisma.wallet.update({
        where: { id: invoice.walletId },
        data: {
          balance: {
            increment: transactionAmount
          },
          lastBalanceUpdate: new Date()
        }
      })

      // Create balance history record
      await prisma.balanceHistory.create({
        data: {
          walletId: invoice.walletId,
          balanceBefore: invoice.wallet.balance,
          balanceAfter: invoice.wallet.balance.add(transactionAmount),
          amountChange: transactionAmount,
          changeType: 'DEPOSIT',
          description: `Payment for invoice ${invoice.id}`,
          reference: transaction.txHash
        }
      })

      // Schedule webhook notification to merchant (if configured)
      if (invoice.merchant.webhookUrl && newInvoiceStatus === 'PAID') {
        await prisma.webhookDelivery.create({
          data: {
            url: invoice.notifyUrl || invoice.merchant.webhookUrl,
            eventType: 'INVOICE_PAID',
            status: 'PENDING',
            payload: {
              event: 'INVOICE_PAID',
              invoice: {
                id: invoice.id,
                orderId: invoice.orderId,
                amount: invoice.amount.toString(),
                amountPaid: newTotalPaid.toString(),
                currency: invoice.currency,
                status: newInvoiceStatus,
                paidAt: paidAt?.toISOString(),
                depositAddress: invoice.depositAddress
              },
              transaction: {
                id: transaction.id,
                txHash: transaction.txHash,
                amount: transaction.amount.toString(),
                blockNumber: transaction.blockNumber?.toString(),
                confirmations: transaction.confirmations,
                status: transaction.status
              },
              timestamp: Date.now()
            },
            merchantId: invoice.merchantId,
            invoiceId: invoice.id,
            nextRetryAt: new Date(Date.now() + 5000) // Retry in 5 seconds
          }
        })
      }

      const processingTime = Date.now() - startTime
      console.log(`[Webhook] Payment processed successfully in ${processingTime}ms, invoice: ${invoice.id}, status: ${newInvoiceStatus}`)

      return {
        success: true,
        invoiceId: invoice.id,
        transactionId: transaction.id,
        status: newInvoiceStatus
      }
    })

  } catch (error) {
    console.error('[Webhook] Payment processing failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = ip
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  console.log(`[Webhook] Incoming Tatum webhook from IP: ${ip}`)

  try {
    // Rate limiting check
    if (!checkRateLimit(ip, 100, 60000)) { // 100 requests per minute
      console.warn(`[Webhook] Rate limit exceeded for IP: ${ip}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Parse request body
    const body = await request.text()
    let webhookData: TatumWebhookPayload

    try {
      const rawData = JSON.parse(body)
      webhookData = TatumWebhookSchema.parse(rawData)
    } catch (parseError) {
      console.error('[Webhook] Invalid webhook payload:', parseError)
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Verify webhook signature if secret is configured
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.TATUM_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      if (!verifyWebhookSignature(body, signature, webhookSecret)) {
        console.warn(`[Webhook] Invalid signature from IP: ${ip}`)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // Process the webhook based on subscription type
    let result: WebhookProcessingResult

    switch (webhookData.subscriptionType) {
      case 'ADDRESS_TRANSACTION':
      case 'INCOMING_NATIVE_TX':
      case 'INCOMING_FUNGIBLE_TX':
        result = await processPaymentWebhook(webhookData)
        break
      
      default:
        console.log(`[Webhook] Unsupported subscription type: ${webhookData.subscriptionType}`)
        return NextResponse.json(
          { message: 'Webhook received but not processed' },
          { status: 200 }
        )
    }

    // Log webhook processing result
    const processingTime = Date.now() - startTime
    console.log(`[Webhook] Processing completed in ${processingTime}ms:`, {
      success: result.success,
      invoiceId: result.invoiceId,
      transactionId: result.transactionId,
      status: result.status,
      error: result.error
    })

    if (result.success) {
      return NextResponse.json({
        message: 'Webhook processed successfully',
        invoiceId: result.invoiceId,
        transactionId: result.transactionId,
        status: result.status
      }, { status: 200 })
    } else {
      return NextResponse.json({
        error: 'Webhook processing failed',
        details: result.error
      }, { status: 422 })
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`[Webhook] Unexpected error after ${processingTime}ms:`, error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    timestamp: Date.now(),
    version: '1.0.0'
  }, { status: 200 })
}