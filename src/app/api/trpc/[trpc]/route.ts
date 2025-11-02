import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/lib/trpc/server'
import { createTRPCContext } from '@/lib/trpc/server'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req: req as any, res: undefined as any, info: undefined as any }),
  })

export { handler as GET, handler as POST }
