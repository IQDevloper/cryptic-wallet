import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

import {
  corsHeaders,
  formatErrorResponse,
  formatSuccessResponse,
  generateRequestId,
} from '@/lib/api/middleware'

const prisma = new PrismaClient()

interface RouteContext {
  params: { id: string }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const requestId = generateRequestId()

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        merchant: {
          include: {
            merchantSettings: true,
          },
        },
        paymentAddress: {
          include: {
            assetNetwork: {
              include: {
                asset: true,
                network: true,
              },
            },
          },
        },
      },
    })

    if (!invoice || invoice.deletedAt) {
      const notFoundError = new Error('Invoice not found') as Error & {
        code?: string
      }
      notFoundError.code = 'P2025'
      throw notFoundError
    }

    const networkCode =
      invoice.paymentAddress?.assetNetwork?.network.code ?? invoice.network

    const responseData = {
      id: invoice.id,
      amount: invoice.amount.toString(),
      amountPaid: invoice.amountPaid.toString(),
      currency: invoice.currency,
      network: networkCode,
      status: invoice.status,
      description: invoice.description,
      orderId: invoice.orderId,
      depositAddress: invoice.depositAddress,
      qrCodeData: invoice.qrCodeData,
      paymentUrl: `https://pay.cryptic.com/${invoice.id}`,
      expiresAt: invoice.expiresAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      isExpired: invoice.expiresAt.getTime() < Date.now(),
      merchant: invoice.merchant
        ? {
            name: invoice.merchant.name,
            businessName: invoice.merchant.businessName,
            settings: invoice.merchant.merchantSettings
              ? {
                  companyName: invoice.merchant.merchantSettings.companyName,
                  supportEmail: invoice.merchant.merchantSettings.supportEmail,
                  brandColor: invoice.merchant.merchantSettings.brandColor,
                  logoUrl: invoice.merchant.merchantSettings.logoUrl,
                }
              : null,
          }
        : null,
    }

    return NextResponse.json(formatSuccessResponse(responseData, requestId), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    const errorResponse = formatErrorResponse(error, requestId)

    const status =
      errorResponse.error.code === 'NOT_FOUND'
        ? 404
        : errorResponse.error.code === 'CONFLICT'
        ? 409
        : errorResponse.error.code === 'VALIDATION_ERROR'
        ? 400
        : errorResponse.error.code === 'UNAUTHORIZED'
        ? 401
        : 500

    return NextResponse.json(errorResponse, {
      status,
      headers: corsHeaders,
    })
  }
}
