import { z } from 'zod'
import { createTRPCRouter, merchantAuthenticatedProcedure } from '../procedures'

export const webhookRouter = createTRPCRouter({
  // Configure webhook settings
  configure: merchantAuthenticatedProcedure
    .input(
      z.object({
        webhookUrl: z.string().url().optional(),
        events: z.array(z.enum(['INVOICE_CREATED', 'INVOICE_PAID', 'INVOICE_EXPIRED', 'TRANSACTION_CONFIRMED'])).optional(),
        secret: z.string().min(32).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.merchant.update({
        where: { id: ctx.merchant.id },
        data: {
          webhookUrl: input.webhookUrl,
          webhookSecret: input.secret,
        },
      })

      return {
        webhookUrl: updated.webhookUrl,
        events: input.events || ['INVOICE_PAID', 'TRANSACTION_CONFIRMED'],
      }
    }),

  // Test webhook endpoint
  test: merchantAuthenticatedProcedure
    .input(
      z.object({
        url: z.string().url(),
        event: z.enum(['INVOICE_PAID', 'TRANSACTION_CONFIRMED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const testPayload = {
        event: input.event,
        test: true,
        invoice: {
          id: 'test-invoice-id',
          amount: '100.00000000',
          currency: 'BTC',
          status: input.event === 'INVOICE_PAID' ? 'PAID' : 'PENDING',
        },
        transaction: input.event === 'TRANSACTION_CONFIRMED' ? {
          id: 'test-transaction-id',
          txHash: 'test-transaction-hash',
          amount: '100.00000000',
          confirmations: 6,
          status: 'CONFIRMED',
        } : null,
        timestamp: Date.now(),
      }

      try {
        const response = await fetch(input.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Cryptic-Gateway/1.0',
            'X-Webhook-Event': input.event,
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })

        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          response: response.ok ? await response.text() : null,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }),
})
