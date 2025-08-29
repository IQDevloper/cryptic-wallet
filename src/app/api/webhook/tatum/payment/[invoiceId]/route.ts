import { NextRequest, NextResponse } from 'next/server'
import { tatumNotificationService } from '@/lib/tatum/notification-service'
import crypto from 'crypto'

/**
 * Invoice-specific Tatum webhook handler
 * Route: POST /api/webhook/tatum/payment/{invoiceId}
 * 
 * This endpoint is used by Tatum to send transaction notifications
 * for specific invoice addresses. The invoiceId is embedded in the URL
 * to improve processing efficiency.
 */

interface RouteParams {
  params: Promise<{
    invoiceId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = await params

    console.log(`🔔 [INVOICE-WEBHOOK] Tatum notification for invoice: ${invoiceId}`, {
      timestamp: new Date().toISOString()
    })

    // Get webhook payload
    const payload = await request.json()
    
    // Verify webhook signature if secret key is configured
    if (process.env.WEBHOOK_SECRET_KEY) {
      const signature = request.headers.get('x-webhook-signature')
      if (signature) {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.WEBHOOK_SECRET_KEY)
          .update(JSON.stringify(payload))
          .digest('hex')

        if (signature !== expectedSignature) {
          console.error('❌ [INVOICE-WEBHOOK] Invalid webhook signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
      }
    }

    // Log payload for debugging
    console.log('📦 [INVOICE-WEBHOOK] Payload received:', {
      invoiceId,
      type: payload.subscriptionType,
      address: payload.address,
      amount: payload.amount,
      txId: payload.txId,
      confirmed: payload.confirmed,
      chain: payload.chain,
      blockNumber: payload.blockNumber
    })

    // Process the webhook notification
    await tatumNotificationService.processWebhookNotification(invoiceId, payload)
    
    return NextResponse.json({ 
      success: true,
      message: 'Invoice webhook processed successfully',
      invoiceId,
      txId: payload.txId,
      amount: payload.amount,
      confirmed: payload.confirmed
    })

  } catch (error) {
    console.error('❌ [INVOICE-WEBHOOK] Error processing invoice webhook:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { invoiceId } = await params
  
  return NextResponse.json({ 
    status: 'active',
    message: `Invoice-specific webhook endpoint for ${invoiceId}`,
    invoiceId,
    endpoint: `/api/webhook/tatum/payment/${invoiceId}`,
    version: '2.0'
  })
}