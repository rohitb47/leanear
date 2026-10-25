import { createTRPCRouter } from "../init"
import { projectsRouter } from "./_projects"
import { tasksRouter } from "./_tasks"
import { workspaceRouter } from "./_workspace"

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  projects: projectsRouter,
  workspace: workspaceRouter,
})

export type AppRouter = typeof appRouter
