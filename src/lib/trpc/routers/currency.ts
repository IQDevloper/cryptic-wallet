import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../procedures'

export const currencyRouter = createTRPCRouter({
  // Get all base currencies (parent currencies like USDT, BTC, ETH)
  getBaseCurrencies: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.baseCurrency.findMany({
      where: { 
        isActive: true,
        currencies: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        currencies: {
          where: { isActive: true },
          include: {
            network: true,
          },
          orderBy: [
            { network: { code: 'asc' } },
          ],
        },
      },
      orderBy: { priority: 'asc' },
    })
  }),

  // Get currencies by base currency (e.g., all USDT variants)
  getCurrenciesByBase: publicProcedure
    .input(z.object({
      baseCurrencyId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.currency.findMany({
        where: {
          baseCurrencyId: input.baseCurrencyId,
          isActive: true,
        },
        include: {
          baseCurrency: true,
          network: true,
        },
        orderBy: [
          { network: { code: 'asc' } },
        ],
      })
    }),

  // Get all active currencies grouped by base currency
  getGroupedCurrencies: publicProcedure.query(async ({ ctx }) => {
    const baseCurrencies = await ctx.prisma.baseCurrency.findMany({
      where: { 
        isActive: true,
        currencies: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        currencies: {
          where: { isActive: true },
          include: {
            network: true,
          },
          orderBy: [
            { withdrawFee: 'asc' }, // Lowest fee first
            { network: { code: 'asc' } },
          ],
        },
      },
      orderBy: { priority: 'asc' },
    })

    return baseCurrencies.map(baseCurrency => ({
      id: baseCurrency.id,
      code: baseCurrency.code,
      name: baseCurrency.name,
      symbol: baseCurrency.symbol,
      imageUrl: baseCurrency.imageUrl,
      priority: baseCurrency.priority,
      networks: baseCurrency.currencies.map(currency => ({
        currencyId: currency.id,
        networkId: currency.network.id,
        networkName: currency.network.name,
        networkCode: currency.network.code,
        isToken: currency.isToken,
        tokenStandard: currency.tokenStandard,
        contractAddress: currency.contractAddress,
        decimals: currency.decimals,
        withdrawFee: parseFloat(currency.withdrawFee.toString()),
        minAmount: parseFloat(currency.minAmount.toString()),
        maxAmount: currency.maxAmount ? parseFloat(currency.maxAmount.toString()) : null,
      }))
    }))
  }),

  // Search currencies (for autocomplete/filtering)
  searchCurrencies: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.toLowerCase()
      
      const baseCurrencies = await ctx.prisma.baseCurrency.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { symbol: { contains: searchTerm, mode: 'insensitive' } },
          ],
          currencies: {
            some: {
              isActive: true,
            },
          },
        },
        include: {
          currencies: {
            where: { isActive: true },
            include: {
              network: true,
            },
          },
        },
        take: input.limit,
        orderBy: { priority: 'asc' },
      })

      return baseCurrencies
    }),

  // Get currency by ID (with network info)
  getCurrencyById: publicProcedure
    .input(z.object({
      currencyId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.currency.findUnique({
        where: { id: input.currencyId },
        include: {
          baseCurrency: true,
          network: true,
        },
      })
    }),
})