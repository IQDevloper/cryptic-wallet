import { NextRequest, NextResponse } from 'next/server'
import { tatumNotificationService } from '@/lib/tatum/notification-service'

/**
 * Admin endpoint for managing Tatum subscriptions
 * Protected by basic authentication for now
 */

export async function GET(request: NextRequest) {
  // Basic auth check - in production, use proper authentication
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'health':
        const health = await tatumNotificationService.getSubscriptionHealth()
        return NextResponse.json({ success: true, data: health })

      case 'stats':
        const stats = await tatumNotificationService.getDetailedStats()
        return NextResponse.json({ success: true, data: stats })

      default:
        return NextResponse.json({
          success: true,
          message: 'Tatum subscription management endpoint',
          availableActions: ['health', 'stats', 'cleanup'],
          usage: {
            health: 'GET /api/admin/subscriptions?action=health',
            stats: 'GET /api/admin/subscriptions?action=stats',
            cleanup: 'POST /api/admin/subscriptions with {"action": "cleanup"}'
          }
        })
    }
  } catch (error) {
    console.error('[ADMIN] Error in subscription management:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Basic auth check
  const authHeader = request.headers.get('authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'cleanup':
        console.log('🧹 [ADMIN] Manual cleanup triggered')
        const result = await tatumNotificationService.forceCleanup()
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed',
          data: result
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: ['cleanup']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[ADMIN] Error in subscription management:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}