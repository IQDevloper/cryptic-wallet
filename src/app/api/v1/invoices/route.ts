import { NextRequest } from 'next/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

import { apiHandler } from '@/lib/api/middleware'
import { createInvoiceForMerchant } from '@/lib/invoice/service'

const prisma = new PrismaClient()

const createInvoiceSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .refine((val) => {
      const numeric = typeof val === 'number' ? val : Number(val)
      return Number.isFinite(numeric) && numeric > 0
    }, 'Amount must be a positive number'),
  currency: z.string().min(2).max(10),
  network: z.string().min(2).max(30),
  description: z.string().max(500).optional(),
  orderId: z.string().max(100).optional(),
  metadata: z.record(z.any()).optional(),
  notifyUrl: z.string().url().optional(),
  redirectUrl: z.string().url().optional(),
  returnUrl: z.string().url().optional(),
  expiresIn: z.number().min(300).max(604800).optional(),
})

const listInvoicesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z
    .enum([
      'PENDING',
      'PAID',
      'EXPIRED',
      'CANCELLED',
      'UNDERPAID',
      'OVERPAID',
      'PROCESSING',
    ])
    .optional(),
  currency: z.string().optional(),
  orderId: z.string().optional(),
})

export const POST = apiHandler(async (request: NextRequest, context: any) => {
  const body = await request.json()
  const input = createInvoiceSchema.parse(body)

  const amountDecimal = new Prisma.Decimal(
    typeof input.amount === 'number' ? input.amount : input.amount
  )

  const invoice = await createInvoiceForMerchant({
    prisma,
    merchantId: context.merchant.id,
    amount: amountDecimal,
    currency: input.currency,
    network: input.network,
    description: input.description,
    orderId: input.orderId,
    customData: input.metadata,
    notifyUrl: input.notifyUrl,
    redirectUrl: input.redirectUrl,
    returnUrl: input.returnUrl,
    expiresInSeconds: input.expiresIn,
  })

  return invoice
})

export const GET = apiHandler(async (request: NextRequest, context: any) => {
  const searchParams = request.nextUrl.searchParams
  const input = listInvoicesSchema.parse({
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    currency: searchParams.get('currency') ?? undefined,
    orderId: searchParams.get('orderId') ?? undefined,
  })

  const where: Prisma.InvoiceWhereInput = {
    merchantId: context.merchant.id,
  }

  if (input.status) {
    where.status = input.status as any
  }

  if (input.currency) {
    where.currency = input.currency.toUpperCase()
  }

  if (input.orderId) {
    where.orderId = input.orderId
  }

  const skip = (input.page - 1) * input.limit

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        paymentAddress: {
          include: {
            assetNetwork: {
              include: {
                network: true,
              },
            },
          },
        },
      },
      skip,
      take: input.limit,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    page: input.page,
    limit: input.limit,
    total,
    totalPages: Math.ceil(total / input.limit),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount.toString(),
      amountPaid: invoice.amountPaid.toString(),
      currency: invoice.currency,
      network:
        invoice.paymentAddress?.assetNetwork?.network.code ?? invoice.network,
      description: invoice.description,
      orderId: invoice.orderId,
      status: invoice.status,
      depositAddress: invoice.depositAddress,
      paymentUrl: `https://pay.cryptic.com/${invoice.id}`,
      qrCodeData: invoice.qrCodeData,
      expiresAt: invoice.expiresAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    })),
  }
})
