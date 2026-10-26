import { z } from "zod"
import {
  addTasks,
  clearLog,
  clearTasks,
  devStats,
  emptyTrash,
  fill,
  mustBeGod,
  revokeUnused,
  setPaid,
  wipe,
} from "@/lib/dev/god-mode"
import { createTRPCRouter, workspaceProcedure } from "../init"

/** God mode. Every procedure is a 404 unless `next dev` on a local database. */
const god = workspaceProcedure.use(({ next }) => {
  mustBeGod()
  return next()
})
const project = z.object({ project: z.string() })

export const devRouter = createTRPCRouter({
  stats: god.query(({ ctx }) => devStats(ctx.c)),
  fill: god.mutation(({ ctx }) => fill(ctx.c)),
  addTasks: god
    .input(project)
    .mutation(({ ctx, input }) => addTasks(ctx.c, input)),
  clearTasks: god
    .input(project)
    .mutation(({ ctx, input }) => clearTasks(ctx.c, input)),
  clearLog: god.mutation(({ ctx }) => clearLog(ctx.c)),
  emptyTrash: god.mutation(({ ctx }) => emptyTrash(ctx.c)),
  revokeUnused: god.mutation(({ ctx }) => revokeUnused(ctx.c)),
  setPaid: god
    .input(z.object({ paid: z.boolean() }))
    .mutation(({ ctx, input }) => setPaid(ctx.c, input)),
  wipe: god.mutation(({ ctx }) => wipe(ctx.c)),
})
