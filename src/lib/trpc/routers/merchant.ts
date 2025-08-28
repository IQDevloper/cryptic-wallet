import { z } from 'zod'
import { createTRPCRouter, userAuthenticatedProcedure, merchantAuthenticatedProcedure, userOwnsMerchantProcedure } from '../procedures'

export const merchantRouter = createTRPCRouter({
  // Get merchant profile
  getProfile: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.merchant.id,
      name: ctx.merchant.name,
      email: ctx.merchant.email,
      webhookUrl: ctx.merchant.webhookUrl,
      createdAt: ctx.merchant.createdAt,
    }
  }),

  // List merchants (for admin/dashboard)
  list: userAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const where: any = {
        userId: ctx.user.userId,
      }

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { email: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      if (input.status) {
        where.isActive = input.status === 'active'
      }

      const [merchants, total] = await Promise.all([
        ctx.prisma.merchant.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            webhookUrl: true,
            createdAt: true,
            _count: {
              select: {
                invoices: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.merchant.count({ where }),
      ])

      // Calculate stats for each merchant
      const merchantsWithStats = await Promise.all(
        merchants.map(async (merchant) => {
          const [totalRevenue, successRate] = await Promise.all([
            ctx.prisma.invoice.aggregate({
              where: {
                merchantId: merchant.id,
                status: 'PAID',
              },
              _sum: {
                amountPaid: true,
              },
            }),
            ctx.prisma.invoice.count({
              where: {
                merchantId: merchant.id,
                status: 'PAID',
              },
            }),
          ])

          const totalInvoices = merchant._count.invoices
          const paidInvoices = successRate
          const calculatedSuccessRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0

          return {
            ...merchant,
            stats: {
              totalInvoices,
              totalRevenue: totalRevenue._sum.amountPaid?.toFixed(2) || '0.00',
              successRate: calculatedSuccessRate.toFixed(1),
            },
          }
        })
      )

      return {
        merchants: merchantsWithStats,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      }
    }),

  // Create merchant
  create: userAuthenticatedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        websiteUrl: z.string().url(),
        businessAddress: z.string().max(500).optional(),
        taxId: z.string().max(50).optional(),
        webhookUrl: z.string().url().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate API key
      const crypto = await import('crypto')
      const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex')
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

      // Create merchant - using email field since websiteUrl doesn't exist in DB yet
      const merchant = await ctx.prisma.merchant.create({
        data: {
          name: input.name,
          email: input.websiteUrl, // Temporarily store website URL in email field
          businessAddress: input.businessAddress,
          webhookUrl: input.webhookUrl,
          isActive: input.isActive,
          apiKey,
          apiKeyHash,
          userId: ctx.user.userId,
        },
      })

      // Get all active currencies to create wallets
      const activeCurrencies = await ctx.prisma.currency.findMany({
        where: { isActive: true },
        include: { network: true }
      })

      // Create wallets for all active currencies
      const walletPromises = activeCurrencies.map(async (currency) => {
        try {
          // Create Tatum virtual account for this currency
          const tatumVAManager = await import('@/lib/tatum/client').then(m => m.tatumVAManager)
          const account = await tatumVAManager.createVirtualAccount(
            currency.network.tatumChainId, 
            merchant.id
          )

          // Create wallet record in database
          return ctx.prisma.wallet.create({
            data: {
              tatumAccountId: account.id,
              merchantId: merchant.id,
              currencyId: currency.id,
              balance: 0,
            },
          })
        } catch (error) {
          console.error(`Failed to create wallet for ${currency.code}:`, error)
          // Create wallet record without Tatum account (can retry later)
          return ctx.prisma.wallet.create({
            data: {
              tatumAccountId: `temp_${merchant.id}_${currency.id}`, // Temporary ID for failed accounts
              merchantId: merchant.id,
              currencyId: currency.id,
              balance: 0,
            },
          })
        }
      })

      // Wait for all wallets to be created
      const wallets = await Promise.allSettled(walletPromises)
      const successfulWallets = wallets.filter(w => w.status === 'fulfilled').length
      const failedWallets = wallets.filter(w => w.status === 'rejected').length

      console.log(`Created merchant ${merchant.id} with ${successfulWallets} wallets (${failedWallets} failed)`)

      return {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email, // This contains the website URL temporarily
        apiKey: merchant.apiKey,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
        walletsCreated: successfulWallets,
        walletsFailed: failedWallets,
      }
    }),

  // Get merchant by ID
  getById: userOwnsMerchantProcedure
    .input(z.object({ merchantId: z.string().cuid() }))
    .query(async ({ ctx }) => {
      // Merchant is already available from userOwnsMerchantProcedure
      return ctx.merchant
    }),

  // Regenerate API key
  regenerateApiKey: userOwnsMerchantProcedure
    .input(z.object({ merchantId: z.string().cuid() }))
    .mutation(async ({ ctx }) => {
      const crypto = await import('crypto')
      const newApiKey = 'mk_' + crypto.randomBytes(32).toString('hex')

      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { apiKey: newApiKey },
      })

      return {
        apiKey: updatedMerchant.apiKey,
      }
    }),

  // Get merchant wallets
  getWallets: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.wallet.findMany({
      where: { merchantId: ctx.merchant.id },
      include: {
        currency: {
          include: {
            network: true,
          },
        },
      },
    })
  }),

  // Get merchant invoices
  getInvoices: merchantAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit

      const where = {
        merchantId: ctx.merchant.id,
        ...(input.status && { status: input.status }),
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
            transactions: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.invoice.count({ where }),
      ])

      return {
        invoices,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      }
    }),

  updateWebhookUrl: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string(),
        webhookUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { webhookUrl: input.webhookUrl },
      })

      return updatedMerchant
    }),

  update: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string(),
        name: z.string().optional(),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        taxId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { merchantId: _, ...updateData } = input
      
      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: updateData,
      })

      return updatedMerchant
    }),

  updateStatus: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { isActive: input.isActive },
      })

      return updatedMerchant
    }),

  getBalances: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string(),
      })
    )
    .query(async ({ ctx }) => {
      // Get merchant wallets with balances
      const wallets = await ctx.prisma.wallet.findMany({
        where: {
          merchantId: ctx.merchant.id,
        },
        include: {
          currency: {
            include: {
              network: true,
            },
          },
        },
      })

      // Get currency prices from external API
      const { fetchPricesFromAPI } = await import('@/app/services/price-provider')
      const currencyCodes = wallets.map(w => w.currency.code)
      let prices: Record<string, number> = {}
      
      try {
        prices = await fetchPricesFromAPI(currencyCodes)
      } catch (error) {
        console.error('Failed to fetch prices:', error)
        // Continue without prices if fetch fails
      }

      // Transform to balance format with prices
      const balances = wallets.map((wallet) => ({
        currency: {
          code: wallet.currency.code,
          name: wallet.currency.name,
          symbol: wallet.currency.symbol,
          imageUrl: wallet.currency.imageUrl,
          network: {
            name: wallet.currency.network.name,
            code: wallet.currency.network.code,
          }
        },
        amount: parseFloat(wallet.balance.toString()),
        price: prices[wallet.currency.code] || 0,
        lastUpdated: wallet.updatedAt.toISOString(),
      }))

      // Sort by value (amount * price) in descending order
      return balances.sort((a, b) => (b.amount * b.price) - (a.amount * a.price))
    }),

  invoices: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit
      const where: any = {
        merchantId: ctx.merchant.id,
      }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: 'insensitive' } },
          { description: { contains: input.search, mode: 'insensitive' } },
          { id: { contains: input.search, mode: 'insensitive' } },
        ]
      }

      if (input.status) {
        where.status = input.status
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
            transactions: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.invoice.count({ where }),
      ])

      return {
        invoices,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      }
    }),
})
