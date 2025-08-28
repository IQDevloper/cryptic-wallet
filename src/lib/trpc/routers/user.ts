import { z } from 'zod'
import { createTRPCRouter, userAuthenticatedProcedure } from '../procedures'

export const userRouter = createTRPCRouter({
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
