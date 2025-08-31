import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, userAuthenticatedProcedure, merchantAuthenticatedProcedure, userOwnsMerchantProcedure } from '../procedures'
import crypto from 'crypto'
import type { MerchantBalance, GlobalHDWallet } from '@prisma/client'

// Shared validation schemas
const merchantIdSchema = z.object({ merchantId: z.string().cuid() })
const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Network fees configuration
const NETWORK_FEES: Record<string, number> = {
  ethereum: 10.0,
  bsc: 1.0,
  tron: 1.0,
  polygon: 0.1,
  bitcoin: 5.0,
} as const

const BRIDGE_FEE = 5.0

// Helper function to select optimal withdrawal sources
function selectOptimalSources(
  currencyBalances: Array<MerchantBalance & { globalWallet: GlobalHDWallet }>,
  amount: number,
  targetNetwork: string
) {

  // Strategy 1: Check if we can withdraw directly from target network
  const sameNetworkBalance = currencyBalances.find(
    cb => cb.globalWallet.network === targetNetwork
  )
  
  if (sameNetworkBalance) {
    const available = parseFloat(sameNetworkBalance.balance.toString()) - 
                     parseFloat(sameNetworkBalance.lockedBalance.toString())
    
    if (available >= amount) {
      // Direct withdrawal from same network - no bridging needed
      return {
        sources: [{ network: targetNetwork, amount }],
        totalFees: NETWORK_FEES[targetNetwork] || 1.0,
        needsBridging: false,
      }
    }
  }

  // Strategy 2: Use multiple networks if needed
  const sortedBalances = currencyBalances
    .map(cb => ({
      network: cb.globalWallet.network,
      available: parseFloat(cb.balance.toString()) - parseFloat(cb.lockedBalance.toString()),
      fee: NETWORK_FEES[cb.globalWallet.network] || 1.0,
    }))
    .filter(b => b.available > 0)
    .sort((a, b) => a.fee - b.fee) // Sort by lowest fees first

  const sources: Array<{ network: string; amount: number }> = []
  let remaining = amount

  for (const balance of sortedBalances) {
    if (remaining <= 0) break

    const useAmount = Math.min(remaining, balance.available)
    if (useAmount > 0) {
      sources.push({ network: balance.network, amount: useAmount })
      remaining -= useAmount
    }
  }

  // Check if we have enough funds
  if (remaining > 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Insufficient funds across all networks. Need ${amount}, available ${amount - remaining}`,
    })
  }

  // Calculate total fees
  const networkFeesTotal = sources.reduce(
    (sum, source) => sum + (NETWORK_FEES[source.network] || 1.0),
    0
  )

  // Add bridge fees if cross-network transfer needed
  const needsBridging = sources.length > 1 || 
                        (sources.length === 1 && sources[0].network !== targetNetwork)
  
  const totalFees = networkFeesTotal + (needsBridging ? BRIDGE_FEE : 0)

  return {
    sources,
    totalFees,
    needsBridging,
  }
}

export const merchantRouter = createTRPCRouter({
  // Get merchant profile
  getProfile: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.merchant.id,
      name: ctx.merchant.name,
      webhookUrl: ctx.merchant.webhookUrl,
      createdAt: ctx.merchant.createdAt,
    }
  }),

  // List merchants (for admin/dashboard)  
  list: userAuthenticatedProcedure
    .input(
      paginationSchema.extend({
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
        websiteUrl: z.string().url().optional(),
        businessAddress: z.string().max(500).optional(),
        taxId: z.string().max(50).optional(),
        webhookUrl: z.string().url().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get active currencies with network and base currency data
      const activeCurrencies = await ctx.prisma.currency.findMany({
        where: { isActive: true },
        include: { 
          network: true,
          baseCurrency: true 
        }
      })

      if (activeCurrencies.length === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No active currencies found. Cannot create merchant without currencies.',
        })
      }

      // Generate API key
      const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex')
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

      // Use transaction to ensure atomicity
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Create merchant
        const merchant = await tx.merchant.create({
          data: {
            name: input.name,
            businessAddress: input.businessAddress,
            webhookUrl: input.webhookUrl,
            isActive: input.isActive,
            apiKey,
            apiKeyHash,
            userId: ctx.user.userId,
          },
        })

        // Initialize merchant balances for all active currencies
        const balanceCreationResults = []
        
        // Create merchant balance record for each active currency
        for (const currency of activeCurrencies) {
          try {
            // Find or create corresponding GlobalHDWallet for this currency/network
            const globalWallet = await tx.globalHDWallet.findFirst({
              where: {
                currency: currency.baseCurrency.code,
                network: currency.network.code,
                contractAddress: currency.contractAddress,
                status: 'ACTIVE'
              }
            })

            if (!globalWallet) {
              // Skip silently - this is expected for currencies without initialized wallets
              continue
            }

            const merchantBalance = await tx.merchantBalance.create({
              data: {
                merchantId: merchant.id,
                globalWalletId: globalWallet.id,
                balance: 0,
                lockedBalance: 0,
                totalReceived: 0,
                totalWithdrawn: 0
              }
            })
            
            balanceCreationResults.push({
              currency: currency.baseCurrency.code,
              network: currency.network.code,
              contractAddress: currency.contractAddress,
              balanceId: merchantBalance.id,
              globalWalletId: globalWallet.id,
              currencyId: currency.id,
              success: true
            })
            
          } catch (error) {
            
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to create balance for ${currency.baseCurrency.code} on ${currency.network.code}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            })
          }
        }

        return {
          merchant,
          balances: balanceCreationResults
        }
      })


      return {
        id: result.merchant.id,
        name: result.merchant.name,
        apiKey: result.merchant.apiKey,
        isActive: result.merchant.isActive,
        createdAt: result.merchant.createdAt,
        balancesCreated: result.balances.length,
        balanceDetails: result.balances,
        message: `Merchant created successfully with ${result.balances.length} currency balances across ${new Set(result.balances.map(b => b.network)).size} networks`,
      }
    }),

  // Get merchant by ID
  getById: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .query(async ({ ctx }) => {
      // Merchant is already available from userOwnsMerchantProcedure
      return ctx.merchant
    }),

  // Regenerate API key
  regenerateApiKey: userOwnsMerchantProcedure
    .input(merchantIdSchema)
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

  // Get merchant wallets (returns HD wallet balances)
  getWallets: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    // Return merchant balances from HD wallet system instead of legacy wallets
    const merchantBalances = await ctx.prisma.merchantBalance.findMany({
      where: { merchantId: ctx.merchant.id },
      include: {
        globalWallet: {
          select: {
            currency: true,
            network: true,
            contractAddress: true,
            derivationPath: true,
          }
        }
      }
    })

    // Transform to wallet-like structure for API compatibility
    return merchantBalances.map(mb => ({
      id: mb.id,
      merchantId: mb.merchantId,
      currency: mb.globalWallet.currency,
      network: mb.globalWallet.network,
      contractAddress: mb.globalWallet.contractAddress,
      balance: mb.balance.toString(),
      lockedBalance: mb.lockedBalance.toString(),
      totalReceived: mb.totalReceived.toString(),
      totalWithdrawn: mb.totalWithdrawn.toString(),
      derivationPath: mb.globalWallet.derivationPath,
      isActive: true,
      createdAt: mb.createdAt,
      updatedAt: mb.lastUpdated,
    }))
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
            derivedAddress: {
              include: {
                globalWallet: true,
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
      merchantIdSchema.extend({
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
      merchantIdSchema.extend({
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
      merchantIdSchema.extend({
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
    .input(merchantIdSchema)
    .query(async ({ ctx }) => {
      // Get merchant balances with full currency information
      const merchantBalances = await ctx.prisma.merchantBalance.findMany({
        where: { merchantId: ctx.merchant.id },
        include: {
          globalWallet: {
            select: {
              currency: true,
              network: true,
              contractAddress: true,
            }
          }
        }
      })

      // Get all active currencies to show complete list (including zero balances)
      const allCurrencies = await ctx.prisma.currency.findMany({
        where: { isActive: true },
        include: {
          baseCurrency: true,
          network: true
        }
      })

      // Create balance map for existing balances
      const balanceMap = new Map()
      merchantBalances.forEach(mb => {
        const key = `${mb.globalWallet.currency}-${mb.globalWallet.network}`
        balanceMap.set(key, mb)
      })

      // Get prices for all currencies
      const { fetchPricesFromAPI } = await import('@/app/services/price-provider')
      const currencyCodes = [...new Set(allCurrencies.map(c => c.baseCurrency.code))]
      let prices: Record<string, number> = {}
      
      try {
        prices = await fetchPricesFromAPI(currencyCodes)
      } catch {
        // Use default empty prices if fetch fails
        prices = {}
      }

      // Return complete currency list with balances (or zero balances)
      return allCurrencies.map(currency => {
        const key = `${currency.baseCurrency.code}-${currency.network.code}`
        const existingBalance = balanceMap.get(key)
        const balance = existingBalance ? Number(existingBalance.balance) : 0
        const price = prices[currency.baseCurrency.code] || 0
        
        return {
          id: existingBalance?.id || `${currency.id}-placeholder`,
          currency: currency.baseCurrency.code,
          network: currency.network.code,
          balance,
          availableBalance: existingBalance ? balance - Number(existingBalance.lockedBalance) : 0,
          lockedBalance: existingBalance ? Number(existingBalance.lockedBalance) : 0,
          totalReceived: existingBalance ? Number(existingBalance.totalReceived) : 0,
          totalWithdrawn: existingBalance ? Number(existingBalance.totalWithdrawn) : 0,
          price,
          value: balance * price,
          imageUrl: currency.baseCurrency.imageUrl || null,
          name: currency.baseCurrency.name,
          contractAddress: currency.contractAddress,
          lastUpdated: existingBalance?.lastUpdated.toISOString() || new Date().toISOString()
        }
      }).sort((a, b) => b.value - a.value)
    }),

  // Unified withdrawal endpoint for cross-network transfers
  requestWithdrawal: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
        currency: z.string().min(1).max(10),
        amount: z.number().positive(),
        targetNetwork: z.string().min(1).max(20),
        targetAddress: z.string().min(10).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all merchant balances for this currency
      const currencyBalances = await ctx.prisma.merchantBalance.findMany({
        where: {
          merchantId: ctx.merchant.id,
          globalWallet: {
            currency: input.currency,
          },
        },
        include: {
          globalWallet: true,
        },
      })

      if (currencyBalances.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No balances found for ${input.currency}`,
        })
      }

      // Calculate total available balance across all networks
      const totalAvailable = currencyBalances.reduce((sum, mb) => {
        const available = parseFloat(mb.balance.toString()) - parseFloat(mb.lockedBalance.toString())
        return sum + available
      }, 0)

      if (totalAvailable < input.amount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Insufficient balance. Available: ${totalAvailable}, Requested: ${input.amount}`,
        })
      }

      // Find optimal source networks for withdrawal
      const withdrawalPlan = selectOptimalSources(
        currencyBalances,
        input.amount,
        input.targetNetwork
      )

      // Start transaction to lock funds and create withdrawal record
      const withdrawal = await ctx.prisma.$transaction(async (tx) => {
        // Lock the required balances
        for (const source of withdrawalPlan.sources) {
          const merchantBalance = currencyBalances.find(
            cb => cb.globalWallet.network === source.network
          )
          if (!merchantBalance) continue

          await tx.merchantBalance.update({
            where: {
              id: merchantBalance.id,
            },
            data: {
              lockedBalance: {
                increment: source.amount,
              },
            },
          })
        }

        // Create withdrawal record
        const withdrawalRecord = await tx.withdrawal.create({
          data: {
            id: `wd_${crypto.randomBytes(16).toString('hex')}`,
            merchantId: ctx.merchant.id,
            currency: input.currency,
            totalAmount: input.amount,
            targetNetwork: input.targetNetwork,
            targetAddress: input.targetAddress,
            status: 'PENDING',
            withdrawalSources: withdrawalPlan.sources,
            totalFees: withdrawalPlan.totalFees,
            needsBridging: withdrawalPlan.needsBridging,
          },
        })

        return withdrawalRecord
      })

      // Async withdrawal processing would be triggered here in production
      
      return {
        withdrawalId: withdrawal.id,
        status: withdrawal.status,
        amount: input.amount,
        targetNetwork: input.targetNetwork,
        targetAddress: input.targetAddress,
        estimatedFees: withdrawalPlan.totalFees,
        needsBridging: withdrawalPlan.needsBridging,
        message: withdrawalPlan.needsBridging 
          ? `Withdrawal requires cross-chain bridging. Estimated completion: 10-30 minutes.`
          : `Direct network withdrawal. Estimated completion: 2-5 minutes.`,
      }
    }),

  invoices: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
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
            derivedAddress: {
              include: {
                globalWallet: true,
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

  delete: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .mutation(async ({ ctx }) => {
      // Use transaction to ensure all related data is cleaned up
      await ctx.prisma.$transaction(async (tx) => {
        // Delete related data in the correct order to respect foreign key constraints
        
        // 1. Delete transactions first
        await tx.transaction.deleteMany({
          where: {
            invoice: {
              merchantId: ctx.merchant.id
            }
          }
        })

        // 2. Delete derived addresses (this will also handle invoices due to cascade)
        await tx.derivedAddress.deleteMany({
          where: {
            invoices: {
              some: {
                merchantId: ctx.merchant.id
              }
            }
          }
        })

        // 3. Delete invoices
        await tx.invoice.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 4. Delete merchant balances
        await tx.merchantBalance.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 5. Delete withdrawals
        await tx.withdrawal.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 6. Finally delete the merchant
        await tx.merchant.delete({
          where: { id: ctx.merchant.id }
        })
      })

      return { success: true }
    }),
})
