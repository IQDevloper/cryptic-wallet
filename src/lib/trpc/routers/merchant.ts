import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, userAuthenticatedProcedure, merchantAuthenticatedProcedure, userOwnsMerchantProcedure } from '../procedures'
import crypto from 'crypto'

type MerchantWalletWithSystem = {
  id: string
  merchantId: string
  systemWalletId: string
  availableBalance: any // Decimal type
  lockedBalance: any // Decimal type
  totalReceived: any // Decimal type 
  totalWithdrawn: any // Decimal type
  systemWallet: {
    assetNetwork: {
      asset: { symbol: string, name: string, imageUrl?: string | null }
      network: { code: string, name: string }
      contractAddress?: string | null
    }
    signatureId: string
  }
}

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
  merchantWallets: Array<MerchantWalletWithSystem>,
  amount: number,
  targetNetwork: string
) {

  // Strategy 1: Check if we can withdraw directly from target network
  const sameNetworkBalance = merchantWallets.find(
    mw => mw.systemWallet.assetNetwork.network.code === targetNetwork
  )
  
  if (sameNetworkBalance) {
    const available = parseFloat(sameNetworkBalance.availableBalance.toString()) - 
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
  const sortedBalances = merchantWallets
    .map(mw => ({
      network: mw.systemWallet.assetNetwork.network.code,
      available: parseFloat(mw.availableBalance.toString()) - parseFloat(mw.lockedBalance.toString()),
      fee: NETWORK_FEES[mw.systemWallet.assetNetwork.network.code] || 1.0,
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
      // Generate API key
      const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex')
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

      // Create merchant (balances will be created dynamically via webhook)
      const merchant = await ctx.prisma.merchant.create({
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


      return {
        id: merchant.id,
        name: merchant.name,
        apiKey: merchant.apiKey,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
        message: `Merchant created successfully. Balances will be created automatically when payments are received.`,
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

  // Get merchant wallets (returns KMS wallet balances)
  getWallets: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    // Return merchant balances from KMS wallet system
    const merchantBalances = await ctx.prisma.merchantWallet.findMany({
      where: { merchantId: ctx.merchant.id },
      include: {
        systemWallet: {
          select: {
            assetNetwork: {
              select: {
                asset: true,
                network: true,
              }
            },
            signatureId: true,
          }
        }
      }
    })

    // Transform to wallet-like structure for API compatibility
    return merchantBalances.map(mb => ({
      id: mb.id,
      merchantId: mb.merchantId,
      currency: mb.systemWallet.assetNetwork.asset.symbol,
      network: mb.systemWallet.assetNetwork.network.code,
      contractAddress: mb.systemWallet.assetNetwork.contractAddress || null,
      balance: mb.availableBalance.toString(),
      lockedBalance: mb.lockedBalance.toString(),
      totalReceived: mb.totalReceived.toString(),
      totalWithdrawn: mb.totalWithdrawn.toString(),
      signatureId: mb.systemWallet.signatureId, // Add KMS signature ID for transaction signing
      isActive: true,
      createdAt: mb.createdAt,
      updatedAt: mb.updatedAt,
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
            paymentAddress: {
              include: {
                systemWallet: true,
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
      // Get merchant wallets with full asset information
      const merchantWallets = await ctx.prisma.merchantWallet.findMany({
        where: { merchantId: ctx.merchant.id },
        include: {
          systemWallet: {
            select: {
              assetNetwork: {
                include: {
                  asset: true,
                  network: true
                }
              }
            }
          }
        }
      })

      // Get all active asset networks to show complete list (including zero balances)
      const allAssetNetworks = await ctx.prisma.assetNetwork.findMany({
        where: { isActive: true },
        include: {
          asset: true,
          network: true
        }
      })

      // Create balance map for existing balances
      const balanceMap = new Map()
      merchantWallets.forEach(mw => {
        const key = `${mw.systemWallet.assetNetwork.asset.symbol}-${mw.systemWallet.assetNetwork.network.code}`
        balanceMap.set(key, mw)
      })

      // Get prices for all assets
      const { fetchPricesFromAPI } = await import('@/app/services/price-provider')
      const assetSymbols = [...new Set(allAssetNetworks.map(an => an.asset.symbol))]
      let prices: Record<string, number> = {}
      
      try {
        prices = await fetchPricesFromAPI(assetSymbols)
      } catch {
        // Use default empty prices if fetch fails
        prices = {}
      }

      // Return complete asset network list with balances (or zero balances)
      return allAssetNetworks.map(assetNetwork => {
        const key = `${assetNetwork.asset.symbol}-${assetNetwork.network.code}`
        const existingBalance = balanceMap.get(key)
        const balance = existingBalance ? Number(existingBalance.availableBalance) : 0
        const price = prices[assetNetwork.asset.symbol] || 0
        
        return {
          currency: assetNetwork.asset.symbol,
          network: assetNetwork.network.code,
          balance,
          availableBalance: existingBalance ? Number(existingBalance.availableBalance) : 0,
          lockedBalance: existingBalance ? Number(existingBalance.lockedBalance) : 0,
          totalReceived: existingBalance ? Number(existingBalance.totalReceived) : 0,
          totalWithdrawn: existingBalance ? Number(existingBalance.totalWithdrawn) : 0,
          price,
          value: balance * price,
          imageUrl: assetNetwork.asset.imageUrl || null,
          name: assetNetwork.asset.name,
          contractAddress: assetNetwork.contractAddress,
          lastUpdated: existingBalance?.updatedAt.toISOString() || new Date().toISOString()
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
      // TODO: implement withdrawal
      // // Get all merchant balances for this currency
      // const currencyBalances = await ctx.prisma.merchantBalance.findMany({
      //   where: {
      //     merchantId: ctx.merchant.id,
      //     wallet: {
      //       currency: input.currency,
      //     },
      //   },
      //   include: {
      //     wallet: true,
      //   },
      // })

      // if (currencyBalances.length === 0) {
      //   throw new TRPCError({
      //     code: 'NOT_FOUND',
      //     message: `No balances found for ${input.currency}`,
      //   })
      // }

      // // Calculate total available balance across all networks
      // const totalAvailable = currencyBalances.reduce((sum, mb) => {
      //   const available = parseFloat(mb.balance.toString()) - parseFloat(mb.lockedBalance.toString())
      //   return sum + available
      // }, 0)

      // if (totalAvailable < input.amount) {
      //   throw new TRPCError({
      //     code: 'BAD_REQUEST',
      //     message: `Insufficient balance. Available: ${totalAvailable}, Requested: ${input.amount}`,
      //   })
      // }

      // // Find optimal source networks for withdrawal
      // const withdrawalPlan = selectOptimalSources(
      //   currencyBalances,
      //   input.amount,
      //   input.targetNetwork
      // )

      // // Start transaction to lock funds and create withdrawal record
      // const withdrawal = await ctx.prisma.$transaction(async (tx) => {
      //   // Lock the required balances
      //   for (const source of withdrawalPlan.sources) {
      //     const merchantBalance = currencyBalances.find(
      //       cb => cb.wallet.network === source.network
      //     )
      //     if (!merchantBalance) continue

      //     await tx.merchantBalance.update({
      //       where: {
      //         id: merchantBalance.id,
      //       },
      //       data: {
      //         lockedBalance: {
      //           increment: source.amount,
      //         },
      //       },
      //     })
      //   }

      //   // Create withdrawal record
      //   const withdrawalRecord = await tx.withdrawal.create({
      //     data: {
      //       id: `wd_${crypto.randomBytes(16).toString('hex')}`,
      //       merchantId: ctx.merchant.id,
      //       currency: input.currency,
      //       totalAmount: input.amount,
      //       targetNetwork: input.targetNetwork,
      //       targetAddress: input.targetAddress,
      //       status: 'PENDING',
      //       withdrawalSources: withdrawalPlan.sources,
      //       totalFees: withdrawalPlan.totalFees,
      //       needsBridging: withdrawalPlan.needsBridging,
      //     },
      //   })

      //   return withdrawalRecord
      // })

      // // Async withdrawal processing would be triggered here in production
      
      // return {
      //   withdrawalId: withdrawal.id,
      //   status: withdrawal.status,
      //   amount: input.amount,
      //   targetNetwork: input.targetNetwork,
      //   targetAddress: input.targetAddress,
      //   estimatedFees: withdrawalPlan.totalFees,
      //   needsBridging: withdrawalPlan.needsBridging,
      //   message: withdrawalPlan.needsBridging 
      //     ? `Withdrawal requires cross-chain bridging. Estimated completion: 10-30 minutes.`
      //     : `Direct network withdrawal. Estimated completion: 2-5 minutes.`,
      // }
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
            paymentAddress: {
              include: {
                systemWallet: true,
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

  // Generate KMS wallets for merchant (Updated for new unified schema)
  generateKMSWallets: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .mutation(async ({ ctx }) => {
      // Get all active asset networks to create system wallets for
      const assetNetworks = await ctx.prisma.assetNetwork.findMany({
        where: { isActive: true },
        include: {
          asset: true,
          network: true
        }
      })

      console.log(`Creating ${assetNetworks.length} merchant wallets for merchant ${ctx.merchant.id}...`);
      
      const createdWallets: Array<any> = [];
      const failedWallets: Array<any> = [];
      
      // Create merchant wallets for each asset network
      for (const assetNetwork of assetNetworks) {
        try {
          // Check if system wallet already exists for this asset network
          let systemWallet = await ctx.prisma.systemWallet.findFirst({
            where: {
              assetNetworkId: assetNetwork.id,
              status: 'ACTIVE'
            }
          })

          // If no system wallet exists, create one (this would normally be done by KMS setup)
          if (!systemWallet) {
            systemWallet = await ctx.prisma.systemWallet.create({
              data: {
                assetNetworkId: assetNetwork.id,
                networkId: assetNetwork.networkId,
                signatureId: `temp_${assetNetwork.asset.symbol}_${assetNetwork.network.code}`,
                status: 'PENDING_SETUP'
              }
            })
          }

          // Check if merchant wallet already exists
          const existingMerchantWallet = await ctx.prisma.merchantWallet.findFirst({
            where: {
              merchantId: ctx.merchant.id,
              systemWalletId: systemWallet.id
            }
          })

          if (!existingMerchantWallet) {
            // Create merchant wallet
            const merchantWallet = await ctx.prisma.merchantWallet.create({
              data: {
                merchantId: ctx.merchant.id,
                systemWalletId: systemWallet.id,
                availableBalance: 0,
                pendingBalance: 0,
                lockedBalance: 0,
                totalReceived: 0,
                totalWithdrawn: 0
              }
            })
            
            createdWallets.push({
              id: merchantWallet.id,
              currency: assetNetwork.asset.symbol,
              network: assetNetwork.network.code,
              contractAddress: assetNetwork.contractAddress,
              systemWalletId: systemWallet.id,
              signatureId: systemWallet.signatureId
            })
          } else {
            console.log(`Merchant wallet already exists for ${assetNetwork.asset.symbol}/${assetNetwork.network.code}`)
          }
          
        } catch (error) {
          console.error(`Failed to create merchant wallet for ${assetNetwork.asset.symbol}/${assetNetwork.network.code}:`, error);
          failedWallets.push({
            currency: assetNetwork.asset.symbol,
            network: assetNetwork.network.code,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return {
        success: true,
        walletsGenerated: createdWallets.length,
        walletsFailed: failedWallets.length,
        generatedWallets: createdWallets,
        failedWallets,
        message: `Successfully created ${createdWallets.length} merchant wallets. ${failedWallets.length} failed.`
      };
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

        // 2. Delete webhook deliveries
        await tx.webhookDelivery.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 3. Delete invoices (will cascade to webhook notifications)
        await tx.invoice.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 4. Delete payment addresses for this merchant
        await tx.paymentAddress.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 5. Delete merchant wallets
        await tx.merchantWallet.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 6. Delete withdrawals
        await tx.withdrawal.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 7. Delete merchant settings
        await tx.merchantSettings.deleteMany({
          where: { merchantId: ctx.merchant.id }
        })

        // 8. Finally delete the merchant
        await tx.merchant.delete({
          where: { id: ctx.merchant.id }
        })
      })

      return { success: true }
    }),
})
