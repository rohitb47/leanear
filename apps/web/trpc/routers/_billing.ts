import { z } from "zod"
import { origin } from "@/lib/auth/session"
import { billing, checkout, portal } from "@/lib/billing/billing"
import { createTRPCRouter, workspaceProcedure } from "../init"

/** The Cloud plan: what it is, a Checkout page to start it, Stripe's portal. */
export const billingRouter = createTRPCRouter({
  get: workspaceProcedure.query(({ ctx }) => billing(ctx.c.ws)),

  checkout: workspaceProcedure
    .input(z.object({ back: z.string().optional() }))
    .mutation(async ({ ctx, input }) =>
      checkout(ctx.c, {
        email: ctx.session.user.email,
        origin: await origin(),
        back: input.back,
      })
    ),

  portal: workspaceProcedure.mutation(async ({ ctx }) =>
    portal(ctx.c, { origin: await origin() })
  ),
})
