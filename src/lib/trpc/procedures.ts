import { initTRPC, TRPCError } from '@trpc/server'
import { type Context, type UserAuthenticatedContext, type MerchantAuthenticatedContext, prisma } from './types'

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
export const userAuthenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
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
      message: 'User account is inactive',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Now guaranteed to be non-null
      dbUser: user,
    } as UserAuthenticatedContext,
  })
})

// Merchant authentication middleware (for external API access)
export const merchantAuthenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
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
    } as MerchantAuthenticatedContext,
  })
})

// User owns merchant procedure (for dashboard operations)
export const userOwnsMerchantProcedure = t.procedure
  .input((input) => {
    // Ensure input has merchantId field
    if (!input || typeof input !== 'object' || !('merchantId' in input)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'merchantId is required',
      })
    }
    return input
  })
  .use(async ({ ctx, input, next }) => {
    // First check user authentication
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
        message: 'User account is inactive',
      })
    }

    // Get merchantId from input
    const merchantId = (input as any).merchantId

    if (!merchantId || typeof merchantId !== 'string') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Valid merchantId is required',
      })
    }

    // Verify the merchant belongs to the authenticated user
    const merchant = await ctx.prisma.merchant.findFirst({
      where: {
        id: merchantId,
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

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        dbUser: user,
        merchant,
      } as UserAuthenticatedContext & { merchant: typeof merchant },
    })
  })
