import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser, hashPassword, comparePasswords } from '@/lib/auth'

// Create Prisma client
const prisma = new PrismaClient()

// Create context for tRPC
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const user = await getCurrentUser()
  
  return {
    prisma,
    req: opts.req,
    res: opts.res,
    user,
  }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape }) {
    return shape
  },
})

// Export reusable router and procedure helpers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// User authentication middleware
const userAuthenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }

  // Verify user still exists and is active
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.userId },
  })

  if (!user || !user.isActive) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found or inactive',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      dbUser: user,
    },
  })
})

// Merchant authentication middleware (for API access)
const merchantAuthenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const apiKey = ctx.req.headers.authorization?.replace('Bearer ', '')
  
  if (!apiKey) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'API key required',
    })
  }

  const merchant = await ctx.prisma.merchant.findUnique({
    where: { apiKey },
  })

  if (!merchant || !merchant.isActive) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid or inactive API key',
    })
  }

  return next({
    ctx: {
      ...ctx,
      merchant,
    },
  })
})

// Authentication router
const authRouter = createTRPCRouter({
  // Get current user
  me: userAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      userId: ctx.user.userId,
      email: ctx.user.email,
      name: ctx.user.name,
    }
  }),
})

// User router
const userRouter = createTRPCRouter({
  // Get user profile
  getProfile: userAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.dbUser.id,
      name: ctx.dbUser.name,
      email: ctx.dbUser.email,
      createdAt: ctx.dbUser.createdAt,
    }
  }),

  // Update user profile
  updateProfile: userAuthenticatedProcedure
    .input(z.object({
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.prisma.user.update({
        where: { id: ctx.user.userId },
        data: {
          ...(input.name && { name: input.name }),
        },
      })

      return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      }
    }),
})

// Merchant router
const merchantRouter = createTRPCRouter({
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
})

// Currency router
const currencyRouter = createTRPCRouter({
  // Get all active currencies
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.currency.findMany({
      where: { isActive: true },
      include: {
        network: true,
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Get currencies by network
  getByNetwork: publicProcedure
    .input(z.object({ networkCode: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.currency.findMany({
        where: {
          isActive: true,
          network: {
            code: input.networkCode,
            isActive: true,
          },
        },
        include: {
          network: true,
        },
      })
    }),
})

// Main app router
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  merchant: merchantRouter,
  currency: currencyRouter,
})

export type AppRouter = typeof appRouter
