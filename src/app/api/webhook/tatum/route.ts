import { NextRequest, NextResponse } from 'next/server'
import { tatumNotificationService } from '@/lib/tatum/notification-service'
import crypto from 'crypto'

/**
 * Enhanced Tatum webhook handler for HD wallet system
 * Handles payment notifications and subscription management
 * 
 * Routes:
 * POST /api/webhook/tatum - Generic Tatum webhook receiver
 * POST /api/webhook/tatum/payment/{invoiceId} - Invoice-specific webhook
 */

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    
    // Check if this is an invoice-specific webhook: /api/webhook/tatum/payment/{invoiceId}
    const isInvoiceWebhook = pathParts.includes('payment')
    const invoiceId = isInvoiceWebhook ? pathParts[pathParts.length - 1] : null

    console.log(`🔔 [WEBHOOK] Tatum notification received`, {
      path: url.pathname,
      isInvoiceWebhook,
      invoiceId,
      timestamp: new Date().toISOString()
    })

    // Get webhook payload
    const payload = await request.json()
    
    // Verify webhook signature if secret key is configured
    if (process.env.WEBHOOK_SECRET_KEY) {
      const signature = request.headers.get('x-webhook-signature')
      const expectedSignature = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('❌ [WEBHOOK] Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Log payload for debugging
    console.log('📦 [WEBHOOK] Payload received:', {
      type: payload.subscriptionType,
      address: payload.address,
      amount: payload.amount,
      txId: payload.txId,
      confirmed: payload.confirmed,
      chain: payload.chain
    })

    if (isInvoiceWebhook && invoiceId) {
      // Invoice-specific webhook - process directly
      await tatumNotificationService.processWebhookNotification(invoiceId, payload)
      
      return NextResponse.json({ 
        success: true,
        message: 'Invoice webhook processed successfully',
        invoiceId,
        txId: payload.txId
      })
    } else {
      // Generic webhook - need to find invoice by address
      const { address, chain } = payload
      
      if (!address || !chain) {
        console.error('❌ [WEBHOOK] Missing address or chain in payload')
        return NextResponse.json({ error: 'Missing address or chain' }, { status: 400 })
      }

      // Find invoice by deposit address
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      try {
        const invoice = await prisma.invoice.findFirst({
          where: {
            depositAddress: address.toLowerCase(),
            status: { in: ['PENDING', 'UNDERPAID'] } // Only process active invoices
          },
          include: {
            derivedAddress: true
          }
        })

        if (!invoice) {
          console.warn(`⚠️ [WEBHOOK] No active invoice found for address: ${address}`)
          return NextResponse.json({ 
            success: false,
            message: 'No active invoice found for this address',
            address
          }, { status: 404 })
        }

        // Process the webhook notification
        await tatumNotificationService.processWebhookNotification(invoice.id, payload)
        
        return NextResponse.json({ 
          success: true,
          message: 'Webhook processed successfully',
          invoiceId: invoice.id,
          txId: payload.txId
        })
      } finally {
        await prisma.$disconnect()
      }
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing Tatum webhook:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    message: 'Tatum webhook handler for HD wallet system',
    version: '2.0',
    endpoints: {
      generic: '/api/webhook/tatum',
      invoice_specific: '/api/webhook/tatum/payment/{invoiceId}'
    },
    features: [
      'HD wallet system integration',
      'Real-time payment processing',
      'Merchant balance updates',
      'Webhook signature verification',
      'Invoice status management'
    ]
  })
}