import { z } from "zod"
import { taskActivity } from "@/lib/tasks/activity"
import {
  comment,
  createTask,
  deleteTask,
  moveTask,
  updateTask,
} from "@/lib/tasks/tasks"
import { createTRPCRouter, paidProcedure, workspaceProcedure } from "../init"

// Shapes only. What a value may be (a status, a member) is checked in
// lib/tasks, once, for the app and for agents.
const id = z.string().min(1)

export const tasksRouter = createTRPCRouter({
  create: paidProcedure
    .input(
      z.object({
        project: z.string(),
        title: z.string(),
        notes: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        assignee: z.string().optional(),
        position: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) => createTask(ctx.c, input)),

  update: paidProcedure
    .input(
      z.object({
        id,
        title: z.string().optional(),
        notes: z.string().optional(),
        type: z.string().optional(),
        assignee: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => updateTask(ctx.c, input)),

  move: paidProcedure
    .input(
      z.object({
        id,
        status: z.string().optional(),
        position: z.number().optional(),
      })
    )
    .mutation(({ ctx, input }) => moveTask(ctx.c, input)),

  comment: paidProcedure
    .input(z.object({ id, body: z.string() }))
    .mutation(({ ctx, input }) => comment(ctx.c, input)),

  delete: paidProcedure
    .input(z.object({ id }))
    .mutation(({ ctx, input }) => deleteTask(ctx.c, input)),

  activity: workspaceProcedure
    .input(z.object({ id }))
    .query(({ ctx, input }) => taskActivity(ctx.c, input.id)),
})
