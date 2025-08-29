import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🎣 Webhook received:', {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body
    })

    // Log the webhook payload for testing
    if (body.event === 'invoice.paid') {
      console.log('💰 Invoice payment webhook:', {
        invoiceId: body.invoice?.id,
        amount: body.invoice?.amount,
        currency: body.invoice?.currency,
        status: body.invoice?.status,
        txHash: body.transaction?.txHash
      })
    }

    // Respond with success
    return NextResponse.json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  })
}