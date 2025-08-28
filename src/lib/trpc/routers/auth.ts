import { createTRPCRouter, userAuthenticatedProcedure } from '../procedures'

export const authRouter = createTRPCRouter({
  // Get current user
  me: userAuthenticatedProcedure.query(async ({ ctx }) => {
    return {
      userId: ctx.user.userId,
      email: ctx.user.email,
      name: ctx.user.name,
    }
  }),
})
