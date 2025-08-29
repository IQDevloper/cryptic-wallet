import { NextRequest, NextResponse } from 'next/server'

// DEPRECATED: This API route used the old wallet system
// Use the new tRPC invoice router instead: src/lib/trpc/routers/invoice.ts
// See HD_WALLET_MIGRATION_TRACKER.md for migration details

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'API deprecated - use tRPC invoice.create instead',
    migration: 'See HD_WALLET_MIGRATION_TRACKER.md for details'
  }, { status: 410 }) // 410 Gone
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'API deprecated - use tRPC invoice.list instead',
    migration: 'See HD_WALLET_MIGRATION_TRACKER.md for details'
  }, { status: 410 }) // 410 Gone
}