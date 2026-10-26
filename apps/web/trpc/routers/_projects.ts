import { z } from "zod"
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/lib/projects/projects"
import { createTRPCRouter, workspaceProcedure } from "../init"

const project = z.string().min(1)

export const projectsRouter = createTRPCRouter({
  create: workspaceProcedure
    .input(
      z.object({
        name: z.string(),
        key: z.string(),
      })
    )
    .mutation(({ ctx, input }) => createProject(ctx.c, input)),

  update: workspaceProcedure
    .input(
      z.object({
        project,
        name: z.string().optional(),
        key: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => updateProject(ctx.c, input)),

  delete: workspaceProcedure
    .input(z.object({ project }))
    .mutation(({ ctx, input }) => deleteProject(ctx.c, input)),
})
