import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiHandler, validateRequest } from '@/lib/api/middleware'
import { PrismaClient } from '@prisma/client'
import { tatumVAManager } from '@/lib/tatum/client'

const prisma = new PrismaClient()

// Create invoice schema
const createInvoiceSchema = z.object({
  amount: z.string()
    .regex(/^\d+(\.\d{1,18})?$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  currency: z.string()
    .min(3, 'Currency code must be at least 3 characters')
    .max(20, 'Currency code cannot exceed 20 characters')
    .toUpperCase(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  expiresIn: z.number()
    .min(300, 'Expiration must be at least 5 minutes (300 seconds)')
    .max(604800, 'Expiration cannot exceed 7 days (604800 seconds)')
    .default(3600), // 1 hour default
  orderId: z.string()
    .max(100, 'Order ID cannot exceed 100 characters')
    .optional(),
  customData: z.record(z.string())
    .optional(),
  notifyUrl: z.string()
    .url('Invalid notify URL')
    .optional(),
  redirectUrl: z.string()
    .url('Invalid redirect URL')
    .optional(),
  returnUrl: z.string()
    .url('Invalid return URL')
    .optional(),
})

// List invoices schema
const listInvoicesSchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val) : 1)
    .refine(val => val >= 1, 'Page must be at least 1'),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val) : 20)
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'UNDERPAID', 'OVERPAID', 'PROCESSING'])
    .optional(),
  currency: z.string()
    .optional(),
  orderId: z.string()
    .optional(),
  startDate: z.string()
    .datetime('Invalid start date format')
    .optional(),
  endDate: z.string()
    .datetime('Invalid end date format')
    .optional(),
})

/**
 * @swagger
 * /api/v1/invoices:
 *   post:
 *     summary: Create a new invoice
 *     description: Creates a new cryptocurrency payment invoice with a unique deposit address
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Invoices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Payment amount in the specified cryptocurrency
 *                 pattern: ^\d+(\.\d{1,18})?$
 *                 example: "0.001"
 *               currency:
 *                 type: string
 *                 description: Cryptocurrency code (BTC, ETH, etc.)
 *                 example: "BTC"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Invoice description
 *                 example: "Payment for Order #12345"
 *               expiresIn:
 *                 type: integer
 *                 minimum: 300
 *                 maximum: 604800
 *                 default: 3600
 *                 description: Invoice expiration time in seconds
 *               orderId:
 *                 type: string
 *                 maxLength: 100
 *                 description: Your internal order ID
 *                 example: "ORDER-12345"
 *               customData:
 *                 type: object
 *                 description: Additional custom data
 *               notifyUrl:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL for payment notifications
 *               redirectUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after successful payment
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect when user cancels
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     amount:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     depositAddress:
 *                       type: string
 *                     qrCodeData:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PAID, EXPIRED, CANCELLED]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export const POST = apiHandler(async (request: NextRequest, { merchant, requestId }) => {
  const validation = await validateRequest(createInvoiceSchema)(request)
  if (validation instanceof Response) return validation

  const { data: input } = validation

  // Find currency and validate it's supported
  const currency = await prisma.currency.findFirst({
    where: {
      OR: [
        { code: input.currency },
        { symbol: input.currency },
      ],
      isActive: true,
    },
    include: {
      network: true,
    },
  })

  if (!currency) {
    throw new Error(`Unsupported currency: ${input.currency}`)
  }

  // Get or create merchant wallet for this currency
  let wallet = await prisma.wallet.findFirst({
    where: {
      merchantId: merchant.id,
      currencyId: currency.id,
    },
  })

  if (!wallet) {
    // Create virtual account with Tatum
    const account = await tatumVAManager.createVirtualAccount(currency.code, merchant.id)

    wallet = await prisma.wallet.create({
      data: {
        tatumAccountId: account.id,
        merchantId: merchant.id,
        currencyId: currency.id,
      },
    })
  }

  // Generate unique deposit address
  const addressResult = await tatumVAManager.generateDepositAddress(wallet.tatumAccountId)

  // Create QR code data for payment
  const qrData = `${currency.symbol.toLowerCase()}:${addressResult.address}?amount=${input.amount}${input.description ? `&label=${encodeURIComponent(input.description)}` : ''}`

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + input.expiresIn * 1000)

  // Create invoice record
  const invoice = await prisma.invoice.create({
    data: {
      amount: parseFloat(input.amount),
      currency: input.currency,
      description: input.description,
      orderId: input.orderId,
      customData: input.customData,
      depositAddress: addressResult.address,
      qrCodeData: qrData,
      expiresAt,
      notifyUrl: input.notifyUrl,
      redirectUrl: input.redirectUrl,
      returnUrl: input.returnUrl,
      merchantId: merchant.id,
      walletId: wallet.id,
    },
    include: {
      wallet: {
        include: {
          currency: {
            include: {
              network: true,
            },
          },
        },
      },
    },
  })

  // Set up blockchain monitoring webhook
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhook/tatum'
    await tatumVAManager.createAddressWebhook(
      currency.network.tatumChainId,
      addressResult.address,
      webhookUrl
    )
  } catch (error) {
    console.error('Failed to create monitoring webhook:', error)
    // Don't fail invoice creation if webhook setup fails
  }

  // Return invoice data
  return {
    id: invoice.id,
    amount: invoice.amount.toString(),
    currency: invoice.currency,
    description: invoice.description,
    orderId: invoice.orderId,
    customData: invoice.customData,
    depositAddress: invoice.depositAddress,
    qrCodeData: invoice.qrCodeData,
    status: invoice.status,
    expiresAt: invoice.expiresAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    network: {
      name: currency.network.name,
      code: currency.network.code,
      confirmationsRequired: currency.network.blockConfirmations,
    },
    paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`,
  }
})

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: List invoices
 *     description: Retrieve a paginated list of invoices with optional filtering
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Invoices]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, EXPIRED, CANCELLED, UNDERPAID, OVERPAID, PROCESSING]
 *       - name: currency
 *         in: query
 *         schema:
 *           type: string
 *       - name: orderId
 *         in: query
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
export const GET = apiHandler(async (request: NextRequest, { merchant, requestId }) => {
  const validation = await validateRequest(listInvoicesSchema)(request)
  if (validation instanceof Response) return validation

  const { data: input } = validation

  const skip = ((input.page as number) - 1) * (input.limit as number)

  // Build query filters
  const where: any = {
    merchantId: merchant.id,
  }

  if (input.status) where.status = input.status
  if (input.currency) where.currency = input.currency
  if (input.orderId) {
    where.orderId = { contains: input.orderId, mode: 'insensitive' }
  }
  if (input.startDate || input.endDate) {
    where.createdAt = {}
    if (input.startDate) where.createdAt.gte = new Date(input.startDate)
    if (input.endDate) where.createdAt.lte = new Date(input.endDate)
  }

  // Fetch invoices with pagination
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        wallet: {
          include: {
            currency: {
              include: {
                network: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 3, // Last 3 transactions per invoice
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.limit as number,
    }),
    prisma.invoice.count({ where }),
  ])

  return {
    invoices: invoices.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount.toString(),
      amountPaid: invoice.amountPaid.toString(),
      currency: invoice.currency,
      description: invoice.description,
      orderId: invoice.orderId,
      customData: invoice.customData,
      depositAddress: invoice.depositAddress,
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString(),
      expiresAt: invoice.expiresAt.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      network: {
        name: invoice.wallet.currency.network.name,
        code: invoice.wallet.currency.network.code,
        confirmationsRequired: invoice.wallet.currency.network.blockConfirmations,
      },
      transactionCount: invoice.transactions.length,
      lastTransaction: invoice.transactions[0] ? {
        txHash: invoice.transactions[0].txHash,
        amount: invoice.transactions[0].amount.toString(),
        status: invoice.transactions[0].status,
        confirmations: invoice.transactions[0].confirmations,
        createdAt: invoice.transactions[0].createdAt.toISOString(),
      } : null,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`,
    })),
    pagination: {
      page: input.page as number,
      limit: input.limit as number,
      total,
      pages: Math.ceil(total / (input.limit as number)),
    },
  }
})