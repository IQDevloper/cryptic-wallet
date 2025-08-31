import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  createTRPCRouter,
  userAuthenticatedProcedure,
  merchantAuthenticatedProcedure,
  userOwnsMerchantProcedure,
} from '../procedures';
import { 
  getKMSChain,
  normalizeNetworkName,
  getTatumChain,
  getContractAddress,
} from '../../crypto-assets-config';

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
      // Find the KMS wallet for this currency/network combination
      // Use unified crypto config for chain mapping
      const normalizedNetwork = normalizeNetworkName(input.network);
      const kmsChain = getKMSChain(input.currency.toUpperCase(), normalizedNetwork);
      
      if (!kmsChain) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unsupported currency/network combination: ${input.currency}/${input.network}`,
        });
      }

      // Use normalized network name for database lookup
      const dbNetworkName = normalizedNetwork;

      const kmsWallet = await ctx.prisma.wallet.findFirst({
        where: {
          currency: kmsChain, // Use KMS chain identifier (BTC, ETH, BSC, etc.)
          network: dbNetworkName, // Use normalized network name
          status: 'ACTIVE',
        },
      });

      if (!kmsWallet) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No active KMS wallet found for ${input.currency} on ${input.network}. Looking for currency: '${kmsChain}', network: '${dbNetworkName}'. Please ensure the wallet is generated first.`,
        });
      }

      // Generate a unique deposit address using optimized address generation
      const { generateAddressFast } = await import(
        '../../kms/address-generator'
      );
      const addressResult = await generateAddressFast(
        kmsWallet.id,
        merchant.id,
        input.currency,
      );

      // Calculate expiration time (1 hour default)
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      // Create QR code data
      const qrData = `${input.currency.toLowerCase()}:${addressResult.address}?amount=${input.amount}`;

      // Create invoice and webhook subscription in a transaction - fail if either fails
      const result = await ctx.prisma.$transaction(async (tx) => {
        // Create invoice using KMS system
        const invoice = await tx.invoice.create({
          data: {
            amount: input.amount,
            currency: input.currency.toUpperCase(),
            description: input.description,
            orderId: input.orderId,
            depositAddress: addressResult.address,
            qrCodeData: qrData,
            expiresAt,
            merchantId: merchant.id,
            addressId: addressResult.addressId, // Address - primary reference
            status: 'PENDING',
          },
        });

        // Fast address generation completed
        console.log(
          `⚡ [INVOICE] Address ${addressResult.address} generated FAST for invoice ${invoice.id}`,
        );
        console.log(
          `⚡ [INVOICE] Generation completed instantly (derivation index: ${addressResult.derivationIndex})`,
        );

        // Set up Tatum webhook subscription for payment monitoring - REQUIRED
        const { TatumNotificationService } = await import(
          '../../tatum/notification-service'
        );
        const notificationService = new TatumNotificationService();
        
        // Get Tatum chain identifier and contract address if needed
        const tatumChain = getTatumChain(input.currency.toUpperCase(), normalizedNetwork);
        const contractAddress = getContractAddress(input.currency.toUpperCase(), normalizedNetwork);
        
        if (!tatumChain) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `No Tatum chain mapping available for ${input.currency}/${normalizedNetwork}. Cannot create webhook subscription.`,
          });
        }

        // Create webhook subscription - this will throw if it fails
        const subscriptionId = await notificationService.createSubscription({
          address: addressResult.address,
          chain: tatumChain,
          invoiceId: invoice.id,
          currency: input.currency.toUpperCase(),
          contractAddress,
        });
        
        // Update invoice with subscription ID
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: { 
            customData: {
              ...(invoice.customData as any || {}),
              tatumSubscriptionId: subscriptionId
            }
          },
        });
        
        console.log(`✅ [INVOICE] Webhook subscription created: ${subscriptionId}`);
        
        return updatedInvoice;
      });

      return {
        id: result.id,
        amount: result.amount.toString(),
        currency: result.currency,
        network: input.network || normalizedNetwork,
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
          address: {
            include: {
              wallet: true,
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
        network: invoice.address.wallet.network,
        networkCode: invoice.address.wallet.network,
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
          address: {
            include: {
              wallet: true,
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
        network: invoice.address.wallet.network,
        networkCode: invoice.address.wallet.network,
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
            address: {
              include: {
                wallet: true,
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
          network: invoice.address.wallet.network,
          networkCode: invoice.address.wallet.network,
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
