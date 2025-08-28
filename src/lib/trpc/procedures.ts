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

// Merchant authentication middleware
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
