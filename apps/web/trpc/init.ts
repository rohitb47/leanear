import { TRPCError, initTRPC } from "@trpc/server"
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc"
import superjson from "superjson"
import { getSession } from "@/lib/auth/session"
import { mustBePaid } from "@/lib/billing/billing"
import { LeanError } from "@/lib/utils"

export const createTRPCContext = async () => ({ session: await getSession() })

const CODES: Record<number, TRPC_ERROR_CODE_KEY> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  402: "FORBIDDEN",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "TOO_MANY_REQUESTS",
}

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    // An unexpected error keeps its details in the server log, not the toast.
    errorFormatter: ({ shape, error }) =>
      error.code === "INTERNAL_SERVER_ERROR"
        ? { ...shape, message: "Something went wrong" }
        : shape,
  })

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory

/** `lib/` refuses with a LeanError; the client reads it as a tRPC error. */
export const baseProcedure = t.procedure.use(async ({ next }) => {
  const res = await next()
  if (!res.ok && res.error.cause instanceof LeanError) {
    const e = res.error.cause
    throw new TRPCError({
      code: CODES[e.status] ?? "BAD_REQUEST",
      message: e.message,
    })
  }
  if (!res.ok && res.error.code === "INTERNAL_SERVER_ERROR")
    console.error(res.error.cause ?? res.error)
  return res
})

/**
 * Signed in, and inside a workspace, which arrives on `ctx.c` with the
 * member asking. The workspace comes from the session, never the input.
 */
export const workspaceProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" })
  const s = ctx.session
  return next({ ctx: { session: s, c: { ws: s.workspace.id, me: s.me } } })
})

/** For work on tasks: on Cloud, only once the plan is running. */
export const paidProcedure = workspaceProcedure.use(async ({ ctx, next }) => {
  await mustBePaid(ctx.c.ws)
  return next()
})
