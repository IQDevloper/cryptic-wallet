import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createTRPCRouter,
  userAuthenticatedProcedure,
  merchantAuthenticatedProcedure,
  userOwnsMerchantProcedure,
} from '../procedures';

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the merchant belongs to the authenticated user
      const merchant = await ctx.prisma.merchant.findFirst({
        where: {
          id: input.merchantId,
          userId: ctx.user.userId,
          isActive: true,
        },
      });

      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this merchant',
        });
      }

      // Normalize network code (handle both "binance_smart_chain" and "bsc")
      const networkCodeMap: Record<string, string> = {
        'binance_smart_chain': 'bsc',
        'bnb_smart_chain': 'bsc',
        'binance': 'bsc',
        'ethereum_mainnet': 'ethereum',
        'eth': 'ethereum',
        'tron_mainnet': 'tron',
        'trx': 'tron',
        'matic': 'polygon',
        'polygon_mainnet': 'polygon',
        'bitcoin_mainnet': 'bitcoin',
        'btc': 'bitcoin',
        'litecoin_mainnet': 'litecoin',
        'ltc': 'litecoin',
        'dogecoin_mainnet': 'dogecoin',
        'doge': 'dogecoin',
        'bitcoin_cash': 'bitcoin-cash',
        'bch': 'bitcoin-cash',
      }

      const normalizedNetwork = networkCodeMap[input.network.toLowerCase()] || input.network.toLowerCase()

      // Find the system wallet for this currency/network combination using unified schema
      const assetNetwork = await ctx.prisma.assetNetwork.findFirst({
        where: {
          asset: { symbol: input.currency.toUpperCase() },
          network: { code: normalizedNetwork },
          isActive: true
        },
        include: {
          asset: true,
          network: true
        }
      })

      if (!assetNetwork) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency/network combination: ${input.currency}/${input.network} (normalized to: ${normalizedNetwork}). Available networks: bsc, ethereum, tron, polygon, bitcoin, litecoin, dogecoin, bitcoin-cash`,
        });
      }

      // Find active KMS wallet for this network
      const kmsWallet = await ctx.prisma.kmsWallet.findFirst({
        where: {
          networkId: assetNetwork.networkId,
          status: 'ACTIVE',
          purpose: { in: ['DEPOSIT', 'BOTH'] }
        }
      })

      if (!kmsWallet) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No active KMS wallet found for ${input.currency} on ${input.network}. Please ensure the KMS wallet is set up first.`,
        });
      }

      // Find or create merchant wallet for this asset network
      let merchantWallet = await ctx.prisma.merchantWallet.findFirst({
        where: {
          merchantId: merchant.id,
          assetNetworkId: assetNetwork.id
        }
      })

      // Auto-create merchant wallet if it doesn't exist
      if (!merchantWallet) {
        merchantWallet = await ctx.prisma.merchantWallet.create({
          data: {
            merchantId: merchant.id,
            assetNetworkId: assetNetwork.id,
            availableBalance: 0,
            pendingBalance: 0,
            lockedBalance: 0
          }
        })
        console.log(`✅ Auto-created merchant wallet for ${input.currency} on ${input.network}`)
      }

      // Generate address using KMS address generator
      const { generateAddressFast } = await import('@/lib/kms/address-generator')

      const addressResult = await generateAddressFast(
        kmsWallet.id,
        assetNetwork.id, // Pass assetNetworkId to avoid foreign key constraint error
        merchant.id,
        input.currency
      )

      // Verify payment address was created
      const paymentAddress = await ctx.prisma.paymentAddress.findUnique({
        where: { id: addressResult.addressId }
      })

      if (!paymentAddress) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment address'
        })
      }

      // Calculate expiration time (1 hour default)
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      // Create QR code data
      const qrData = `${input.currency.toLowerCase()}:${paymentAddress.address}?amount=${input.amount}`;

      // Create invoice and webhook subscription in a transaction - fail if either fails
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Create invoice using unified schema
        const invoice = await tx.invoice.create({
          data: {
            amount: input.amount,
            currency: input.currency.toUpperCase(),
            network: normalizedNetwork, // Use normalized network code
            description: input.description,
            orderId: input.orderId,
            depositAddress: paymentAddress.address,
            qrCodeData: qrData,
            expiresAt,
            merchantId: merchant.id,
            paymentAddressId: paymentAddress.id,
            status: 'PENDING',
          },
        });

        // Update payment address with invoice ID
        await tx.paymentAddress.update({
          where: { id: paymentAddress.id },
          data: { invoiceId: invoice.id }
        });

        console.log(
          `⚡ [INVOICE] Payment address ${paymentAddress.address} created for invoice ${invoice.id}`,
        );
        console.log(
          `⚡ [INVOICE] Address creation completed (derivation index: ${paymentAddress.derivationIndex})`,
        );

        // Set up Tatum webhook subscription for payment monitoring - CRITICAL
        try {
          const { TatumNotificationService } = await import(
            '../../tatum/notification-service'
          );
          const notificationService = new TatumNotificationService();

          // Get Tatum chain identifier from asset network
          const tatumChain = assetNetwork.network.tatumChainId;
          const contractAddress = assetNetwork.contractAddress || undefined;

          console.log(`📡 [INVOICE] Creating Tatum notification subscription...`, {
            address: paymentAddress.address,
            chain: tatumChain,
            currency: input.currency.toUpperCase(),
            contractAddress: contractAddress || 'none (native)',
            invoiceId: invoice.id
          });

          // Create webhook subscription - this will throw if it fails
          const subscriptionId = await notificationService.createSubscription({
            address: paymentAddress.address,
            chain: tatumChain,
            invoiceId: invoice.id,
            currency: input.currency.toUpperCase(),
            contractAddress,
          });

          // Update payment address with subscription ID
          await tx.paymentAddress.update({
            where: { id: paymentAddress.id },
            data: {
              tatumSubscriptionId: subscriptionId,
              subscriptionActive: true
            }
          });

          console.log(`✅ [INVOICE] Webhook subscription created successfully!`);
          console.log(`   Subscription ID: ${subscriptionId}`);
          console.log(`   Monitoring address: ${paymentAddress.address}`);
          console.log(`   Network: ${tatumChain}`);
          console.log(`   Currency: ${input.currency.toUpperCase()}`);

        } catch (error) {
          // Log detailed error but don't fail invoice creation
          console.error(`❌ [INVOICE] Failed to create webhook subscription:`, error);
          console.error(`   This means payment monitoring might not work automatically.`);
          console.error(`   Invoice will still be created but requires manual monitoring.`);
          console.error(`   Error details:`, error instanceof Error ? error.message : error);

          // Mark subscription as inactive
          await tx.paymentAddress.update({
            where: { id: paymentAddress.id },
            data: {
              subscriptionActive: false,
              tatumSubscriptionId: null
            }
          });
        }
        
        return invoice;
      });

      return {
        id: result.id,
        amount: result.amount.toString(),
        currency: result.currency,
        network: result.network,
        description: result.description,
        orderId: result.orderId,
        depositAddress: result.depositAddress,
        qrCodeData: result.qrCodeData,
        expiresAt: result.expiresAt.toISOString(),
        status: result.status,
        message:
          'Invoice created successfully with payment monitoring enabled',
      };
    }),

  // Get invoice by ID (Dashboard access)
  get: userOwnsMerchantProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        invoiceId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          merchantId: ctx.merchant.id,
        },
        include: {
          paymentAddress: {
            include: {
              assetNetwork: {
                include: {
                  asset: true,
                  network: true
                }
              },
              kmsWallet: {
                include: {
                  network: true
                }
              }
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
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
        network: invoice.paymentAddress.assetNetwork.network.code,
        networkCode: invoice.paymentAddress.assetNetwork.network.code,
        confirmationsRequired: 6, // Default confirmations - get from network config if needed
        transactions:
          invoice.transactions?.map((tx: any) => ({
            id: tx.id,
            txHash: tx.txHash,
            amount: tx.amount.toString(),
            blockNumber: tx.blockNumber?.toString(),
            confirmations: tx.confirmations,
            status: tx.status,
            createdAt: tx.createdAt.toISOString(),
          })) || [],
      };
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
          paymentAddress: {
            include: {
              assetNetwork: {
                include: {
                  asset: true,
                  network: true
                }
              },
              kmsWallet: {
                include: {
                  network: true
                }
              }
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        });
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
        network: invoice.paymentAddress.assetNetwork.network.code,
        networkCode: invoice.paymentAddress.assetNetwork.network.code,
        confirmationsRequired: 6, // Default confirmations - get from network config if needed
        transactions:
          invoice.transactions?.map((tx: any) => ({
            id: tx.id,
            txHash: tx.txHash,
            amount: tx.amount.toString(),
            blockNumber: tx.blockNumber?.toString(),
            confirmations: tx.confirmations,
            status: tx.status,
            createdAt: tx.createdAt.toISOString(),
          })) || [],
      };
    }),

  // List merchant invoices with filtering
  list: merchantAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
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
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        orderId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {
        merchantId: ctx.merchant.id,
      };

      if (input.status) where.status = input.status;
      if (input.currency) where.currency = input.currency;
      if (input.orderId)
        where.orderId = { contains: input.orderId, mode: 'insensitive' };
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = new Date(input.startDate);
        if (input.endDate) where.createdAt.lte = new Date(input.endDate);
      }

      const [invoices, total] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where,
          include: {
            paymentAddress: {
              include: {
                assetNetwork: {
                  include: {
                    asset: true,
                    network: true
                  }
                },
                kmsWallet: {
                  include: {
                    network: true
                  }
                }
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
      ]);

      return {
        invoices: invoices.map((invoice) => ({
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
          network: invoice.paymentAddress.assetNetwork.network.code,
          networkCode: invoice.paymentAddress.assetNetwork.network.code,
          transactionCount: invoice.transactions?.length || 0,
          lastTransaction: invoice.transactions?.[0]
            ? {
                txHash: invoice.transactions[0].txHash,
                amount: invoice.transactions[0].amount.toString(),
                status: invoice.transactions[0].status,
                createdAt: invoice.transactions[0].createdAt.toISOString(),
              }
            : null,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),
});