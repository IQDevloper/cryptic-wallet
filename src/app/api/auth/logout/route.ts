import { NextRequest, NextResponse } from 'next/server'
import { removeAuthCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Remove auth cookie
    await removeAuthCookie()

    return NextResponse.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}