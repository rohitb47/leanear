import { z } from "zod"
import { listLog } from "@/lib/log/log"
import { listTrash, restore } from "@/lib/log/trash"
import { createTRPCRouter, paidProcedure, workspaceProcedure } from "../init"

/** The workspace's history, and its trash. */
export const logRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        before: z.number().nullable().optional(),
        actor: z.string().nullable().optional(),
        kind: z.string().nullable().optional(),
        project: z.string().nullable().optional(),
      })
    )
    .query(({ ctx, input }) => listLog(ctx.c, input)),

  trash: workspaceProcedure.query(({ ctx }) => listTrash(ctx.c)),

  restore: paidProcedure
    .input(z.object({ kind: z.enum(["task", "project"]), id: z.string() }))
    .mutation(({ ctx, input }) => restore(ctx.c, input)),
})
