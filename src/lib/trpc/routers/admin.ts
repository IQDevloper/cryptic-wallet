import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, adminProcedure } from '../procedures';

export const adminRouter = createTRPCRouter({
  // ============================================
  // SYSTEM STATISTICS
  // ============================================

  /**
   * Get system-wide statistics
   */
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalMerchants,
      activeMerchants,
      totalTransactions,
      confirmedTransactions,
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      totalUsers,
      totalAssets,
      activeAssets,
    ] = await Promise.all([
      ctx.prisma.merchant.count(),
      ctx.prisma.merchant.count({ where: { isActive: true } }),
      ctx.prisma.transaction.count(),
      ctx.prisma.transaction.count({ where: { status: 'CONFIRMED' } }),
      ctx.prisma.invoice.count(),
      ctx.prisma.invoice.count({ where: { status: 'PENDING' } }),
      ctx.prisma.invoice.count({ where: { status: 'PAID' } }),
      ctx.prisma.user.count(),
      ctx.prisma.asset.count(),
      ctx.prisma.asset.count({ where: { isActive: true } }),
    ]);

    return {
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
        inactive: totalMerchants - activeMerchants,
      },
      transactions: {
        total: totalTransactions,
        confirmed: confirmedTransactions,
        pending: totalTransactions - confirmedTransactions,
      },
      invoices: {
        total: totalInvoices,
        pending: pendingInvoices,
        paid: paidInvoices,
      },
      users: {
        total: totalUsers,
      },
      assets: {
        total: totalAssets,
        active: activeAssets,
        inactive: totalAssets - activeAssets,
      },
    };
  }),

  // ============================================
  // COIN/ASSET MANAGEMENT
  // ============================================

  /**
   * List all assets/coins with pagination and filtering
   */
  listAssets: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        type: z.enum(['NATIVE', 'TOKEN']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};

      if (input.search) {
        where.OR = [
          { symbol: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      if (input.type) {
        where.type = input.type;
      }

      const [assets, total] = await Promise.all([
        ctx.prisma.asset.findMany({
          where,
          include: {
            assetOnNetworks: {
              include: {
                network: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.asset.count({ where }),
      ]);

      return {
        assets: assets.map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          logoUrl: asset.logoUrl,
          isActive: asset.isActive,
          createdAt: asset.createdAt.toISOString(),
          networkCount: asset.assetOnNetworks.length,
          networks: asset.assetOnNetworks.map((an) => ({
            networkCode: an.network.code,
            networkName: an.network.name,
            contractAddress: an.contractAddress,
            tokenStandard: an.tokenStandard,
            decimals: an.decimals,
          })),
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Toggle asset active status
   */
  toggleAssetStatus: adminProcedure
    .input(
      z.object({
        assetId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.prisma.asset.update({
        where: { id: input.assetId },
        data: { isActive: input.isActive },
      });

      return {
        success: true,
        asset: {
          id: asset.id,
          symbol: asset.symbol,
          isActive: asset.isActive,
        },
      };
    }),

  // ============================================
  // TRANSACTION MONITORING
  // ============================================

  /**
   * List all transactions across all merchants
   */
  listAllTransactions: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        merchantId: z.string().optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'REJECTED', 'REPLACED']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};

      if (input.merchantId) {
        where.invoice = { merchantId: input.merchantId };
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = new Date(input.startDate);
        if (input.endDate) where.createdAt.lte = new Date(input.endDate);
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          include: {
            invoice: {
              include: {
                merchant: {
                  select: {
                    id: true,
                    name: true,
                    businessName: true,
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
      ]);

      return {
        transactions: transactions.map((tx) => ({
          id: tx.id,
          txHash: tx.txHash,
          amount: tx.amount.toString(),
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          blockNumber: tx.blockNumber?.toString(),
          confirmations: tx.confirmations,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
          merchant: {
            id: tx.invoice.merchant.id,
            name: tx.invoice.merchant.name,
            businessName: tx.invoice.merchant.businessName,
          },
          invoiceId: tx.invoice.id,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // ============================================
  // MERCHANT MANAGEMENT
  // ============================================

  /**
   * List all merchants
   */
  listAllMerchants: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { businessName: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      const [merchants, total] = await Promise.all([
        ctx.prisma.merchant.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            merchantWallets: {
              include: {
                assetNetwork: {
                  include: {
                    asset: true,
                    network: true,
                  },
                },
              },
            },
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

      return {
        merchants: merchants.map((merchant) => ({
          id: merchant.id,
          name: merchant.name,
          businessName: merchant.businessName,
          isActive: merchant.isActive,
          createdAt: merchant.createdAt.toISOString(),
          user: merchant.user,
          totalInvoices: merchant._count.invoices,
          wallets: merchant.merchantWallets.map((wallet) => ({
            id: wallet.id,
            asset: wallet.assetNetwork.asset.symbol,
            network: wallet.assetNetwork.network.code,
            availableBalance: wallet.availableBalance.toString(),
          })),
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Toggle merchant active status
   */
  toggleMerchantStatus: adminProcedure
    .input(
      z.object({
        merchantId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchant = await ctx.prisma.merchant.update({
        where: { id: input.merchantId },
        data: { isActive: input.isActive },
      });

      return {
        success: true,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          isActive: merchant.isActive,
        },
      };
    }),

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * List all users
   */
  listAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(['ADMIN', 'MERCHANT', 'OPERATOR']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};

      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      if (input.role) {
        where.role = input.role;
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            _count: {
              select: {
                merchants: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin?.toISOString(),
          createdAt: user.createdAt.toISOString(),
          merchantCount: user._count.merchants,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Update user role
   */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['ADMIN', 'MERCHANT', 'OPERATOR']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from demoting themselves
      if (input.userId === ctx.user.userId && input.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own admin role',
        });
      }

      const user = await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),
});
