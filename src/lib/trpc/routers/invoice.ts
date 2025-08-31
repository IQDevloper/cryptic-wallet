import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, userAuthenticatedProcedure, merchantAuthenticatedProcedure, userOwnsMerchantProcedure } from '../procedures'

export const invoiceRouter = createTRPCRouter({
  // Create new invoice
  create: userAuthenticatedProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        amount: z.number().positive(),
        currency: z.string().min(2).max(10),
        network: z.string().min(2).max(20), 
        description: z.string().max(500).optional(),
        orderId: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the merchant belongs to the authenticated user
      const merchant = await ctx.prisma.merchant.findFirst({
        where: {
          id: input.merchantId,
          userId: ctx.user.userId,
          isActive: true,
        },
      })

      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this merchant',
        })
      }
      // Find the global HD wallet for this currency/network combination
      // Use testnet wallets when in testnet environment
      const isTestnet = process.env.TATUM_ENVIRONMENT === 'testnet'
      let possibleNetworks: string[]
      
      if (isTestnet) {
        // Map mainnet networks to their testnet equivalents
        const networkMap: Record<string, string[]> = {
          'ethereum': ['ethereum-sepolia', 'ethereum-testnet'],
          'bitcoin': ['bitcoin-testnet'],
          'bitcoin-omni': ['bitcoin-testnet'], // Bitcoin Omni layer uses Bitcoin testnet
          'bsc': ['bsc-testnet'],
          'polygon': ['polygon-amoy'],
          'arbitrum': ['arbitrum-sepolia'],
          'base': ['base-sepolia'],
          'tron': ['tron-testnet', 'tron-shasta'],
          'solana': ['solana-devnet'],
          'sui': ['sui-testnet'],
          'litecoin': ['litecoin-testnet'],
          'dogecoin': ['dogecoin-testnet'],
          'dash': ['dash-testnet']
        }
        possibleNetworks = networkMap[input.network.toLowerCase()] || [`${input.network}-testnet`]
      } else {
        possibleNetworks = [input.network.toLowerCase()]
      }
      
      const globalWallet = await ctx.prisma.globalHDWallet.findFirst({
        where: {
          currency: input.currency.toUpperCase(),
          network: { in: possibleNetworks },
          status: 'ACTIVE'
        }
      })

      if (!globalWallet) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No wallet found for ${input.currency} on ${input.network}`,
        })
      }

      // Generate a unique deposit address from the global HD wallet
      const { generateAddress } = await import('../../hdwallet/address-generator')
      const addressResult = await generateAddress(globalWallet.id, merchant.id)

      // Calculate expiration time (1 hour default)
      const expiresAt = new Date(Date.now() + 3600 * 1000)

      // Create QR code data
      const qrData = `${input.currency.toLowerCase()}:${addressResult.address}?amount=${input.amount}`

      // Set up Tatum webhook subscription BEFORE creating invoice
      // This ensures we have monitoring in place before the invoice exists
      let subscriptionId: string | null = null
      const skipSubscription = process.env.SKIP_TATUM_SUBSCRIPTION === 'true'
      
      if (!skipSubscription) {
        try {
          const { tatumNotificationService } = await import('../../tatum/notification-service')
          
          // For now, we'll create the invoice first then the subscription
          // But if subscription fails, we'll delete the invoice to maintain consistency
          
          // Create invoice using pure HD wallet system
          const invoice = await ctx.prisma.invoice.create({
            data: {
              amount: input.amount,
              currency: input.currency.toUpperCase(),
              description: input.description,
              orderId: input.orderId,
              depositAddress: addressResult.address,
              qrCodeData: qrData,
              expiresAt,
              merchantId: merchant.id,
              derivedAddressId: addressResult.derivedAddressId, // HD wallet derived address - primary reference
              status: 'PENDING'
            }
          })

          try {
            subscriptionId = await tatumNotificationService.createSubscription({
              address: addressResult.address,
              chain: globalWallet.network, // Use the actual network from the global wallet (e.g., ethereum-sepolia)
              invoiceId: invoice.id,
              currency: input.currency.toUpperCase(),
              contractAddress: globalWallet.contractAddress || undefined
            })

            // Update derived address with subscription info
            await ctx.prisma.derivedAddress.update({
              where: { id: addressResult.derivedAddressId },
              data: {
                tatumSubscriptionId: subscriptionId,
                subscriptionActive: true
              }
            })

            console.log(`✅ [INVOICE] Tatum subscription created for invoice ${invoice.id}: ${subscriptionId}`)
          } catch (subscriptionError) {
            console.error(`❌ [INVOICE] Failed to create Tatum subscription, rolling back invoice:`, subscriptionError)
            
            // Delete the invoice and derived address since we can't monitor payments
            await ctx.prisma.invoice.delete({
              where: { id: invoice.id }
            })
            
            await ctx.prisma.derivedAddress.delete({
              where: { id: addressResult.derivedAddressId }
            })
            
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to set up payment monitoring. The invoice was not created. Please check your Tatum API configuration and try again.',
              cause: subscriptionError
            })
          }

          return {
            id: invoice.id,
            amount: invoice.amount.toString(),
            currency: invoice.currency,
            network: input.network,
            description: invoice.description,
            orderId: invoice.orderId,
            depositAddress: invoice.depositAddress,
            qrCodeData: invoice.qrCodeData,
            expiresAt: invoice.expiresAt.toISOString(),
            status: invoice.status,
            message: 'Invoice created successfully with payment monitoring enabled'
          }
        } catch (error) {
          // If we get here, either invoice creation failed or subscription failed and we rolled back
          throw error
        }
      } else {
        // Skip subscription mode - create invoice without monitoring
        console.log(`⚠️ [INVOICE] Creating invoice without Tatum subscription (SKIP_TATUM_SUBSCRIPTION=true)`)
        
        const invoice = await ctx.prisma.invoice.create({
          data: {
            amount: input.amount,
            currency: input.currency.toUpperCase(),
            description: input.description,
            orderId: input.orderId,
            depositAddress: addressResult.address,
            qrCodeData: qrData,
            expiresAt,
            merchantId: merchant.id,
            derivedAddressId: addressResult.derivedAddressId,
            status: 'PENDING'
          }
        })

        return {
          id: invoice.id,
          amount: invoice.amount.toString(),
          currency: invoice.currency,
          network: input.network,
          description: invoice.description,
          orderId: invoice.orderId,
          depositAddress: invoice.depositAddress,
          qrCodeData: invoice.qrCodeData,
          expiresAt: invoice.expiresAt.toISOString(),
          status: invoice.status,
          message: 'Invoice created successfully (without payment monitoring)'
        }
      }
    }),

  // Get invoice by ID (Dashboard access)
  get: userOwnsMerchantProcedure
    .input(z.object({ 
      merchantId: z.string().min(1),
      invoiceId: z.string().min(1) 
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          merchantId: ctx.merchant.id,
        },
        include: {
          derivedAddress: {
            include: {
              globalWallet: true,
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
        network: invoice.derivedAddress.globalWallet.network,
        networkCode: invoice.derivedAddress.globalWallet.network,
        confirmationsRequired: 6, // Default confirmations - get from network config if needed
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

  // Get invoice by ID (External API access)
  getExternal: merchantAuthenticatedProcedure
    .input(z.object({ invoiceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          merchantId: ctx.merchant.id,
        },
        include: {
          derivedAddress: {
            include: {
              globalWallet: true,
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
        network: invoice.derivedAddress.globalWallet.network,
        networkCode: invoice.derivedAddress.globalWallet.network,
        confirmationsRequired: 6, // Default confirmations - get from network config if needed
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
            derivedAddress: {
              include: {
                globalWallet: true,
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
          network: invoice.derivedAddress.globalWallet.network,
          networkCode: invoice.derivedAddress.globalWallet.network,
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
