import { z } from 'zod'
import { createTRPCRouter, merchantAuthenticatedProcedure, userOwnsMerchantProcedure } from '../procedures'

export const transactionRouter = createTRPCRouter({
  // Get transactions for merchant (Dashboard access)
  list: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        invoiceId: z.string().min(1).optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'REJECTED', 'REPLACED']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const where: any = {
        invoice: {
          merchantId: ctx.merchant.id,
        },
      }

      if (input.invoiceId) where.invoiceId = input.invoiceId
      if (input.status) where.status = input.status
      if (input.startDate || input.endDate) {
        where.createdAt = {}
        if (input.startDate) where.createdAt.gte = new Date(input.startDate)
        if (input.endDate) where.createdAt.lte = new Date(input.endDate)
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          include: {
            invoice: {
              include: {
                derivedAddress: {
                  include: {
                    globalWallet: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.transaction.count({ where }),
      ])

      return {
        transactions: transactions.map(tx => ({
          id: tx.id,
          txHash: tx.txHash,
          amount: tx.amount.toString(),
          blockNumber: tx.blockNumber?.toString(),
          confirmations: tx.confirmations,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
          invoice: {
            id: tx.invoice.id,
            orderId: tx.invoice.orderId,
            currency: tx.invoice.currency,
            network: tx.invoice.derivedAddress.globalWallet.network,
          },
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      }
    }),

  // Get transactions for merchant (External API access)
  listExternal: merchantAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        invoiceId: z.string().min(1).optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'REJECTED', 'REPLACED']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const where: any = {
        invoice: {
          merchantId: ctx.merchant.id,
        },
      }

      if (input.invoiceId) where.invoiceId = input.invoiceId
      if (input.status) where.status = input.status
      if (input.startDate || input.endDate) {
        where.createdAt = {}
        if (input.startDate) where.createdAt.gte = new Date(input.startDate)
        if (input.endDate) where.createdAt.lte = new Date(input.endDate)
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          include: {
            invoice: {
              include: {
                derivedAddress: {
                  include: {
                    globalWallet: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.transaction.count({ where }),
      ])

      return {
        transactions: transactions.map(tx => ({
          id: tx.id,
          txHash: tx.txHash,
          amount: tx.amount.toString(),
          blockNumber: tx.blockNumber?.toString(),
          confirmations: tx.confirmations,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
          invoice: {
            id: tx.invoice.id,
            orderId: tx.invoice.orderId,
            currency: tx.invoice.currency,
            network: tx.invoice.derivedAddress.globalWallet.network,
          },
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      }
    }),
})
