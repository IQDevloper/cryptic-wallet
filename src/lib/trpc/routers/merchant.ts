import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createTRPCRouter,
  userAuthenticatedProcedure,
  merchantAuthenticatedProcedure,
  userOwnsMerchantProcedure,
} from '../procedures';
import crypto from 'crypto';

// Shared validation schemas
const merchantIdSchema = z.object({ merchantId: z.string().cuid() });
const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Network fees configuration
const NETWORK_FEES: Record<string, number> = {
  ethereum: 10.0,
  bsc: 1.0,
  tron: 1.0,
  polygon: 0.1,
  bitcoin: 5.0,
} as const;

const BRIDGE_FEE = 5.0;

export const merchantRouter = createTRPCRouter({
  // Get merchant profile
  getProfile: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.merchant.id,
      name: ctx.merchant.name,
      webhookUrl: ctx.merchant.webhookUrl,
      createdAt: ctx.merchant.createdAt,
    };
  }),

  // List merchants (for admin/dashboard)
  list: userAuthenticatedProcedure
    .input(
      paginationSchema.extend({
        search: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {
        userId: ctx.user.userId,
      };

      if (input.search) {
        where.OR = [{ name: { contains: input.search, mode: 'insensitive' } }];
      }

      if (input.status) {
        where.isActive = input.status === 'active';
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
      ]);

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
          ]);

          const totalInvoices = merchant._count.invoices;
          const paidInvoices = successRate;
          const calculatedSuccessRate =
            totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

          return {
            ...merchant,
            stats: {
              totalInvoices,
              totalRevenue: totalRevenue._sum.amountPaid?.toFixed(2) || '0.00',
              successRate: calculatedSuccessRate.toFixed(1),
            },
          };
        }),
      );

      return {
        merchants: merchantsWithStats,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate API key
      const apiKey = 'mk_' + crypto.randomBytes(32).toString('hex');
      const apiKeyHash = crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');

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
      });

      return {
        id: merchant.id,
        name: merchant.name,
        apiKey: merchant.apiKey,
        isActive: merchant.isActive,
        createdAt: merchant.createdAt,
        message: `Merchant created successfully. Balances will be created automatically when payments are received.`,
      };
    }),

  // Get merchant by ID
  getById: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .query(async ({ ctx }) => {
      // Merchant is already available from userOwnsMerchantProcedure
      return ctx.merchant;
    }),

  // Regenerate API key
  regenerateApiKey: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .mutation(async ({ ctx }) => {
      const crypto = await import('crypto');
      const newApiKey = 'mk_' + crypto.randomBytes(32).toString('hex');

      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { apiKey: newApiKey },
      });

      return {
        apiKey: updatedMerchant.apiKey,
      };
    }),

  // Get merchant wallets (returns KMS wallet balances)
  getWallets: merchantAuthenticatedProcedure.query(async ({ ctx }) => {
    // Return merchant balances from KMS wallet system
    const merchantWallets = await ctx.prisma.merchantWallet.findMany({
      where: { merchantId: ctx.merchant.id },
      include: {
        assetNetwork: {
          include: {
            asset: true,
            network: true,
          },
        },
      },
    });

    // Transform to wallet-like structure for API compatibility
    return merchantWallets.map((mw) => ({
      id: mw.id,
      merchantId: mw.merchantId,
      currency: mw.assetNetwork.asset.symbol,
      network: mw.assetNetwork.network.code,
      contractAddress: mw.assetNetwork.contractAddress || null,
      balance: mw.availableBalance.toString(),
      lockedBalance: mw.lockedBalance.toString(),
      pendingBalance: mw.pendingBalance.toString(),
      isActive: true,
      createdAt: mw.createdAt,
      updatedAt: mw.updatedAt,
    }));
  }),

  // Get merchant invoices
  getInvoices: merchantAuthenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED']).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where = {
        merchantId: ctx.merchant.id,
        ...(input.status && { status: input.status }),
      };

      const [invoices, total] = await Promise.all([
        ctx.prisma.invoice.findMany({
          where,
          include: {
            paymentAddress: {
              include: {
                assetNetwork: {
                  include: {
                    asset: true,
                    network: true,
                  },
                },
                kmsWallet: {
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
      ]);

      return {
        invoices,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  updateWebhookUrl: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
        webhookUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { webhookUrl: input.webhookUrl },
      });

      return updatedMerchant;
    }),

  update: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
        name: z.string().optional(),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        taxId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { merchantId: _, ...updateData } = input;

      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: updateData,
      });

      return updatedMerchant;
    }),

  updateStatus: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedMerchant = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: { isActive: input.isActive },
      });

      return updatedMerchant;
    }),

  getBalances: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .query(async ({ ctx }) => {
      // Get merchant wallets with full asset information
      const merchantWallets = await ctx.prisma.merchantWallet.findMany({
        where: { merchantId: ctx.merchant.id },
        include: {
          assetNetwork: {
            include: {
              asset: true,
              network: true,
            },
          },
        },
      });

      // Get all active asset networks to show complete list (including zero balances)
      const allAssetNetworks = await ctx.prisma.assetNetwork.findMany({
        where: { isActive: true },
        include: {
          asset: true,
          network: true,
        },
      });

      // Create balance map for existing balances
      const balanceMap = new Map();
      merchantWallets.forEach((mw) => {
        const key = `${mw.assetNetwork.asset.symbol}-${mw.assetNetwork.network.code}`;
        balanceMap.set(key, mw);
      });

      // Get prices for all assets
      const { fetchPricesFromAPI } = await import(
        '@/app/services/price-provider'
      );
      const assetSymbols = [
        ...new Set(allAssetNetworks.map((an) => an.asset.symbol)),
      ];
      let prices: Record<string, number> = {};

      try {
        prices = await fetchPricesFromAPI(assetSymbols);
      } catch {
        // Use default empty prices if fetch fails
        prices = {};
      }

      // Return complete asset network list with balances (or zero balances)
      return allAssetNetworks
        .map((assetNetwork) => {
          const key = `${assetNetwork.asset.symbol}-${assetNetwork.network.code}`;
          const existingBalance = balanceMap.get(key);
          const balance = existingBalance
            ? Number(existingBalance.availableBalance)
            : 0;
          const price = prices[assetNetwork.asset.symbol] || 0;

          return {
            currency: assetNetwork.asset.symbol,
            network: assetNetwork.network.code,
            balance,
            availableBalance: existingBalance
              ? Number(existingBalance.availableBalance)
              : 0,
            pendingBalance: existingBalance
              ? Number(existingBalance.pendingBalance)
              : 0,
            lockedBalance: existingBalance
              ? Number(existingBalance.lockedBalance)
              : 0,
            price,
            value: balance * price,
            imageUrl: assetNetwork.asset.logoUrl || null,
            name: assetNetwork.asset.name,
            contractAddress: assetNetwork.contractAddress,
            lastUpdated:
              existingBalance?.updatedAt.toISOString() ||
              new Date().toISOString(),
          };
        })
        .sort((a, b) => b.value - a.value);
    }),

  // Unified withdrawal endpoint for cross-network transfers
  requestWithdrawal: userOwnsMerchantProcedure
    .input(
      merchantIdSchema.extend({
        currency: z.string().min(1).max(10),
        amount: z.number().positive(),
        targetNetwork: z.string().min(1).max(20),
        targetAddress: z.string().min(10).max(100),
      }),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const where: any = {
        merchantId: ctx.merchant.id,
      };

      if (input.search) {
        where.OR = [
          { description: { contains: input.search, mode: 'insensitive' } },
          { id: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      if (input.status) {
        where.status = input.status;
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
                    network: true,
                  },
                },
                kmsWallet: {
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
      ]);

      return {
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          merchantId: invoice.merchantId,
          paymentAddressId: invoice.paymentAddressId,
          amount: invoice.amount.toString(),
          currency: invoice.currency,
          network: invoice.network,
          depositAddress: invoice.depositAddress,
          status: invoice.status,
          amountPaid: invoice.amountPaid.toString(),
          orderId: invoice.orderId,
          description: invoice.description,
          customData: invoice.customData,
          memo: invoice.memo,
          notifyUrl: invoice.notifyUrl,
          redirectUrl: invoice.redirectUrl,
          returnUrl: invoice.returnUrl,
          qrCodeData: invoice.qrCodeData,
          fiatAmount: invoice.fiatAmount?.toString(),
          fiatCurrency: invoice.fiatCurrency,
          exchangeRate: invoice.exchangeRate?.toString(),
          paidAt: invoice.paidAt?.toISOString(),
          confirmedAt: invoice.confirmedAt?.toISOString(),
          expiresAt: invoice.expiresAt.toISOString(),
          createdAt: invoice.createdAt.toISOString(),
          updatedAt: invoice.updatedAt.toISOString(),
          deletedAt: invoice.deletedAt?.toISOString(),
          paymentAddress: invoice.paymentAddress
            ? {
                id: invoice.paymentAddress.id,
                address: invoice.paymentAddress.address,
                derivationIndex:
                  invoice.paymentAddress.derivationIndex.toString(),
                invoiceId: invoice.paymentAddress.invoiceId,
                assetNetworkId: invoice.paymentAddress.assetNetworkId,
                kmsWalletId: invoice.paymentAddress.kmsWalletId,
                merchantId: invoice.paymentAddress.merchantId,
                tatumSubscriptionId: invoice.paymentAddress.tatumSubscriptionId,
                subscriptionActive: invoice.paymentAddress.subscriptionActive,
                createdAt: invoice.paymentAddress.createdAt.toISOString(),
                updatedAt: invoice.paymentAddress.updatedAt.toISOString(),
                assetNetwork: invoice.paymentAddress.assetNetwork
                  ? {
                      id: invoice.paymentAddress.assetNetwork.id,
                      assetId: invoice.paymentAddress.assetNetwork.assetId,
                      networkId: invoice.paymentAddress.assetNetwork.networkId,
                      contractAddress:
                        invoice.paymentAddress.assetNetwork.contractAddress,
                      isActive: invoice.paymentAddress.assetNetwork.isActive,
                      createdAt:
                        invoice.paymentAddress.assetNetwork.createdAt.toISOString(),
                      updatedAt:
                        invoice.paymentAddress.assetNetwork.updatedAt.toISOString(),
                      asset: invoice.paymentAddress.assetNetwork.asset,
                      network: invoice.paymentAddress.assetNetwork.network,
                    }
                  : null,
                kmsWallet: invoice.paymentAddress.kmsWallet
                  ? {
                      id: invoice.paymentAddress.kmsWallet.id,
                      networkId: invoice.paymentAddress.kmsWallet.networkId,
                      signatureId: invoice.paymentAddress.kmsWallet.signatureId,
                      xpub: invoice.paymentAddress.kmsWallet.xpub,
                      derivationPath:
                        invoice.paymentAddress.kmsWallet.derivationPath,
                      status: invoice.paymentAddress.kmsWallet.status,
                      purpose: invoice.paymentAddress.kmsWallet.purpose,
                      label: invoice.paymentAddress.kmsWallet.label,
                      nextAddressIndex:
                        invoice.paymentAddress.kmsWallet.nextAddressIndex.toString(),
                      createdAt:
                        invoice.paymentAddress.kmsWallet.createdAt.toISOString(),
                      updatedAt:
                        invoice.paymentAddress.kmsWallet.updatedAt.toISOString(),
                      network: invoice.paymentAddress.kmsWallet.network,
                    }
                  : null,
              }
            : null,
          transactions:
            invoice.transactions?.map((tx) => ({
              id: tx.id,
              invoiceId: tx.invoiceId,
              txHash: tx.txHash,
              amount: tx.amount.toString(),
              blockNumber: tx.blockNumber?.toString(),
              blockHash: tx.blockHash,
              confirmations: tx.confirmations,
              status: tx.status,
              fromAddress: tx.fromAddress,
              toAddress: tx.toAddress,
              gasPrice: tx.gasPrice?.toString(),
              gasUsed: tx.gasUsed?.toString(),
              transactionFee: tx.transactionFee?.toString(),
              failureReason: tx.failureReason,
              tatumWebhookId: tx.tatumWebhookId,
              createdAt: tx.createdAt.toISOString(),
              updatedAt: tx.updatedAt.toISOString(),
              processedAt: tx.processedAt?.toISOString(),
              deletedAt: tx.deletedAt?.toISOString(),
            })) || [],
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Generate merchant wallets for all active asset networks
  // Note: KMS wallets are created at the network level by the seed script
  generateKMSWallets: userOwnsMerchantProcedure
    .input(merchantIdSchema)
    .mutation(async ({ ctx }) => {
      // Get all active asset networks
      const assetNetworks = await ctx.prisma.assetNetwork.findMany({
        where: { isActive: true },
        include: {
          asset: true,
          network: true,
        },
      });

      console.log(
        `Creating merchant wallets for ${assetNetworks.length} asset networks for merchant ${ctx.merchant.id}...`,
      );

      const createdWallets: Array<any> = [];
      const failedWallets: Array<any> = [];

      // Create merchant wallet for each asset network
      for (const assetNetwork of assetNetworks) {
        try {
          // Check if merchant wallet already exists
          const existingMerchantWallet =
            await ctx.prisma.merchantWallet.findFirst({
              where: {
                merchantId: ctx.merchant.id,
                assetNetworkId: assetNetwork.id,
              },
            });

          if (!existingMerchantWallet) {
            // Create merchant wallet
            const merchantWallet = await ctx.prisma.merchantWallet.create({
              data: {
                merchantId: ctx.merchant.id,
                assetNetworkId: assetNetwork.id,
                availableBalance: 0,
                pendingBalance: 0,
                lockedBalance: 0,
              },
            });

            createdWallets.push({
              id: merchantWallet.id,
              currency: assetNetwork.asset.symbol,
              network: assetNetwork.network.code,
              contractAddress: assetNetwork.contractAddress,
            });
          } else {
            console.log(
              `Merchant wallet already exists for ${assetNetwork.asset.symbol}/${assetNetwork.network.code}`,
            );
          }
        } catch (error) {
          console.error(
            `Failed to create merchant wallet for ${assetNetwork.asset.symbol}/${assetNetwork.network.code}:`,
            error,
          );
          failedWallets.push({
            currency: assetNetwork.asset.symbol,
            network: assetNetwork.network.code,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return {
        success: true,
        walletsGenerated: createdWallets.length,
        walletsFailed: failedWallets.length,
        generatedWallets: createdWallets,
        failedWallets,
        message: `Successfully created ${createdWallets.length} merchant wallets. ${failedWallets.length} failed.`,
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
              merchantId: ctx.merchant.id,
            },
          },
        });

        // 2. Delete webhook deliveries
        await tx.webhookDelivery.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 3. Delete invoices (will cascade to webhook notifications)
        await tx.invoice.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 4. Delete payment addresses for this merchant
        await tx.paymentAddress.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 5. Delete merchant wallets
        await tx.merchantWallet.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 6. Delete withdrawals
        await tx.withdrawal.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 7. Delete merchant settings
        await tx.merchantSettings.deleteMany({
          where: { merchantId: ctx.merchant.id },
        });

        // 8. Finally delete the merchant
        await tx.merchant.delete({
          where: { id: ctx.merchant.id },
        });
      });

      return { success: true };
    }),
});
