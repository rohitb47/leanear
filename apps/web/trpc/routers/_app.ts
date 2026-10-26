import { createTRPCRouter } from "../init"
import { billingRouter } from "./_billing"
import { devRouter } from "./_dev"
import { logRouter } from "./_log"
import { projectsRouter } from "./_projects"
import { tasksRouter } from "./_tasks"
import { workspaceRouter } from "./_workspace"

export const appRouter = createTRPCRouter({
  tasks: tasksRouter,
  projects: projectsRouter,
  workspace: workspaceRouter,
  billing: billingRouter,
  log: logRouter,
  dev: devRouter,
})

export type AppRouter = typeof appRouter
