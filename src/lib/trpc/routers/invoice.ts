import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, merchantAuthenticatedProcedure } from '../procedures'

export const invoiceRouter = createTRPCRouter({
  // Create new invoice
  create: merchantAuthenticatedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,18})?$/, 'Invalid amount format'),
        currency: z.string().min(3).max(20).toUpperCase(),
        description: z.string().max(500).optional(),
        expiresIn: z.number().min(300).max(604800).default(3600), // 5 minutes to 7 days
        orderId: z.string().max(100).optional(),
        customData: z.record(z.any()).optional(),
        notifyUrl: z.string().url().optional(),
        redirectUrl: z.string().url().optional(),
        returnUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find currency and merchant wallet
      const currency = await ctx.prisma.currency.findFirst({
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
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency: ${input.currency}`,
        })
      }

      // Get or create merchant wallet for this currency
      let wallet = await ctx.prisma.wallet.findFirst({
        where: {
          merchantId: ctx.merchant.id,
          currencyId: currency.id,
        },
      })

      if (!wallet) {
        // Create virtual account for this currency
        const tatumVAManager = await import('@/lib/tatum/client').then(m => m.tatumVAManager)
        const account = await tatumVAManager.createVirtualAccount(currency.network.tatumChainId, ctx.merchant.id)

        wallet = await ctx.prisma.wallet.create({
          data: {
            tatumAccountId: account.id,
            merchantId: ctx.merchant.id,
            currencyId: currency.id,
          },
        })
      }

      // Generate unique deposit address
      const tatumVAManager = await import('@/lib/tatum/client').then(m => m.tatumVAManager)
      const addressResult = await tatumVAManager.generateDepositAddress(wallet.tatumAccountId)

      // Create QR code data
      const qrData = `${currency.symbol.toLowerCase()}:${addressResult.address}?amount=${input.amount}`

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + input.expiresIn * 1000)

      // Create invoice
      const invoice = await ctx.prisma.invoice.create({
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
          merchantId: ctx.merchant.id,
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

      // Set up webhook for address monitoring
      try {
        const webhookUrl = process.env.NEXT_PUBLIC_APP_URL + '/api/webhook/tatum'
        await tatumVAManager.createWebhookSubscription(
          currency.network.tatumChainId,
          addressResult.address,
          webhookUrl
        )
      } catch (error) {
        console.error('Failed to create webhook subscription:', error)
        // Don't fail the invoice creation if webhook setup fails
      }

      return {
        id: invoice.id,
        amount: invoice.amount.toString(),
        currency: invoice.currency,
        description: invoice.description,
        orderId: invoice.orderId,
        depositAddress: invoice.depositAddress,
        qrCodeData: invoice.qrCodeData,
        status: invoice.status,
        expiresAt: invoice.expiresAt.toISOString(),
        createdAt: invoice.createdAt.toISOString(),
        network: currency.network.name,
        networkCode: currency.network.code,
        confirmationsRequired: currency.network.blockConfirmations,
      }
    }),

  // Get invoice by ID
  get: merchantAuthenticatedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          merchantId: ctx.merchant.id,
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
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        })
      }

      return {
        id: invoice.id,
        amount: invoice.amount.toString(),
        amountPaid: invoice.amountPaid.toString(),
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
        network: invoice.wallet.currency.network.name,
        networkCode: invoice.wallet.currency.network.code,
        confirmationsRequired: invoice.wallet.currency.network.blockConfirmations,
        transactions: invoice.transactions.map(tx => ({
          id: tx.id,
          txHash: tx.txHash,
          amount: tx.amount.toString(),
          blockNumber: tx.blockNumber?.toString(),
          confirmations: tx.confirmations,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
        })),
      }
    }),

  // List merchant invoices with filtering
  list: merchantAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'UNDERPAID', 'OVERPAID', 'PROCESSING']).optional(),
        currency: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        orderId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const where: any = {
        merchantId: ctx.merchant.id,
      }

      if (input.status) where.status = input.status
      if (input.currency) where.currency = input.currency
      if (input.orderId) where.orderId = { contains: input.orderId, mode: 'insensitive' }
      if (input.startDate || input.endDate) {
        where.createdAt = {}
        if (input.startDate) where.createdAt.gte = new Date(input.startDate)
        if (input.endDate) where.createdAt.lte = new Date(input.endDate)
      }

      const [invoices, total] = await Promise.all([
        ctx.prisma.invoice.findMany({
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
              take: 5, // Last 5 transactions per invoice
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.invoice.count({ where }),
      ])

      return {
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount.toString(),
          amountPaid: invoice.amountPaid.toString(),
          currency: invoice.currency,
          description: invoice.description,
          orderId: invoice.orderId,
          depositAddress: invoice.depositAddress,
          status: invoice.status,
          paidAt: invoice.paidAt?.toISOString(),
          expiresAt: invoice.expiresAt.toISOString(),
          createdAt: invoice.createdAt.toISOString(),
          network: invoice.wallet.currency.network.name,
          networkCode: invoice.wallet.currency.network.code,
          transactionCount: invoice.transactions.length,
          lastTransaction: invoice.transactions[0] ? {
            txHash: invoice.transactions[0].txHash,
            amount: invoice.transactions[0].amount.toString(),
            status: invoice.transactions[0].status,
            createdAt: invoice.transactions[0].createdAt.toISOString(),
          } : null,
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
