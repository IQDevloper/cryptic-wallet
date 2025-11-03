// Main tRPC server configuration
export { createTRPCContext } from './types'
export type { Context } from './types'
import { createTRPCRouter } from './procedures'
import {
  authRouter,
  userRouter,
  merchantRouter,
  currencyRouter,
  invoiceRouter,
  transactionRouter,
  webhookRouter,
  adminRouter,
} from './routers'

// Main app router
export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  merchant: merchantRouter,
  currency: currencyRouter,
  invoice: invoiceRouter,
  transaction: transactionRouter,
  webhook: webhookRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
