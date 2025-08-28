import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import { PrismaClient, User, Merchant } from '@prisma/client'
import { getCurrentUser, type JWTPayload } from '../auth'

// Create Prisma client
export const prisma = new PrismaClient()

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

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Authenticated context types
export type UserAuthenticatedContext = Context & {
  user: JWTPayload
  dbUser: User
}

export type MerchantAuthenticatedContext = Context & {
  merchant: Merchant
}
