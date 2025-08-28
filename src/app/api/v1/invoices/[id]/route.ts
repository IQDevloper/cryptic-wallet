import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     description: Retrieve detailed information about a specific invoice
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Invoices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice details
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
 *                     amountPaid:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     description:
 *                       type: string
 *                     orderId:
 *                       type: string
 *                     customData:
 *                       type: object
 *                     depositAddress:
 *                       type: string
 *                     qrCodeData:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PAID, EXPIRED, CANCELLED, UNDERPAID, OVERPAID, PROCESSING]
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     network:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                         confirmationsRequired:
 *                           type: integer
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           txHash:
 *                             type: string
 *                           amount:
 *                             type: string
 *                           blockNumber:
 *                             type: string
 *                             nullable: true
 *                           confirmations:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     paymentUrl:
 *                       type: string
 *                       format: uri
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 */
export const GET = apiHandler(async (request: NextRequest, context: RouteContext & any) => {
  const { params, merchant } = context
  const { id } = await params

  // Validate UUID format
  const uuidSchema = z.string().uuid('Invalid invoice ID format')
  
  try {
    uuidSchema.parse(id)
  } catch (error) {
    throw new Error('Invalid invoice ID format')
  }

  // Find invoice with all related data
  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      merchantId: merchant.id,
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
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Calculate payment progress
  const amountRequired = parseFloat(invoice.amount.toString())
  const amountReceived = parseFloat(invoice.amountPaid.toString())
  const paymentProgress = amountRequired > 0 ? (amountReceived / amountRequired) * 100 : 0

  // Check if invoice is expired
  const isExpired = invoice.status === 'EXPIRED' || new Date() > invoice.expiresAt

  return {
    id: invoice.id,
    amount: invoice.amount.toString(),
    amountPaid: invoice.amountPaid.toString(),
    amountRemaining: Math.max(0, amountRequired - amountReceived).toString(),
    currency: invoice.currency,
    description: invoice.description,
    orderId: invoice.orderId,
    customData: invoice.customData,
    depositAddress: invoice.depositAddress,
    qrCodeData: invoice.qrCodeData,
    status: invoice.status,
    paidAt: invoice.paidAt?.toISOString(),
    expiresAt: invoice.expiresAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    isExpired,
    paymentProgress: Math.round(paymentProgress * 100) / 100, // Round to 2 decimal places
    network: {
      name: invoice.wallet.currency.network.name,
      code: invoice.wallet.currency.network.code,
      tatumChainId: invoice.wallet.currency.network.tatumChainId,
      confirmationsRequired: invoice.wallet.currency.network.blockConfirmations,
      blockTime: invoice.wallet.currency.network.averageBlockTime,
    },
    currency_info: {
      name: invoice.wallet.currency.name,
      symbol: invoice.wallet.currency.symbol,
      decimals: invoice.wallet.currency.decimals,
      isToken: invoice.wallet.currency.isToken,
      contractAddress: invoice.wallet.currency.contractAddress,
    },
    transactions: invoice.transactions.map(tx => ({
      id: tx.id,
      txHash: tx.txHash,
      amount: tx.amount.toString(),
      blockNumber: tx.blockNumber?.toString(),
      confirmations: tx.confirmations,
      status: tx.status,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      explorerUrl: invoice.wallet.currency.network.explorerUrl 
        ? `${invoice.wallet.currency.network.explorerUrl}/tx/${tx.txHash}`
        : null,
    })),
    paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`,
    redirectUrls: {
      success: invoice.redirectUrl,
      cancel: invoice.returnUrl,
    },
  }
})

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   patch:
 *     summary: Update invoice
 *     description: Update invoice status or other mutable fields (limited operations)
 *     security:
 *       - ApiKeyAuth: []
 *     tags: [Invoices]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CANCELLED]
 *                 description: Only CANCELLED status can be set manually
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Update invoice description
 *               customData:
 *                 type: object
 *                 description: Update custom data
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       400:
 *         description: Bad request - invalid update operation
 *       404:
 *         description: Invoice not found
 *       401:
 *         description: Unauthorized
 */
export const PATCH = apiHandler(async (request: NextRequest, context: RouteContext & any) => {
  const { params, merchant } = context
  const { id } = await params

  // Validate UUID format
  const uuidSchema = z.string().uuid('Invalid invoice ID format')
  uuidSchema.parse(id)

  // Parse request body
  const updateSchema = z.object({
    status: z.enum(['CANCELLED']).optional(),
    description: z.string().max(500).optional(),
    customData: z.record(z.string()).optional(),
  })

  const body = await request.json()
  const updateData = updateSchema.parse(body)

  // Find invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      merchantId: merchant.id,
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Check if invoice can be updated
  if (invoice.status === 'PAID') {
    throw new Error('Cannot update paid invoice')
  }

  if (invoice.status === 'EXPIRED' && updateData.status !== 'CANCELLED') {
    throw new Error('Cannot update expired invoice')
  }

  // Only allow cancellation if invoice is still pending
  if (updateData.status === 'CANCELLED' && invoice.status !== 'PENDING') {
    throw new Error('Can only cancel pending invoices')
  }

  // Update invoice
  const updatedInvoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(updateData.status && { status: updateData.status }),
      ...(updateData.description && { description: updateData.description }),
      ...(updateData.customData && { customData: updateData.customData }),
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

  return {
    id: updatedInvoice.id,
    status: updatedInvoice.status,
    description: updatedInvoice.description,
    customData: updatedInvoice.customData,
    updatedAt: updatedInvoice.updatedAt.toISOString(),
    message: updateData.status === 'CANCELLED' 
      ? 'Invoice cancelled successfully' 
      : 'Invoice updated successfully',
  }
})