import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DEPRECATED: This API route used the old wallet system
// Use the new tRPC invoice router instead: src/lib/trpc/routers/invoice.ts
// See HD_WALLET_MIGRATION_TRACKER.md for migration details

export async function GET(request: NextRequest, context: RouteContext) {
  return NextResponse.json({ 
    error: 'API deprecated - use tRPC invoice.get instead',
    migration: 'See HD_WALLET_MIGRATION_TRACKER.md for details'
  }, { status: 410 }) // 410 Gone
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return NextResponse.json({ 
    error: 'API deprecated - use tRPC invoice.update instead',
    migration: 'See HD_WALLET_MIGRATION_TRACKER.md for details'
  }, { status: 410 }) // 410 Gone
}