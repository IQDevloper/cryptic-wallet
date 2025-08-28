import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../procedures'

export const currencyRouter = createTRPCRouter({
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
