import { z } from "zod"
import { switchWorkspace } from "@/lib/auth/session"
import { sync } from "@/lib/sync/sync"
import { addAgent, newKey, revokeKeys } from "@/lib/workspace/agents"
import { createInvite, revokeInvite } from "@/lib/workspace/invites"
import { makeOwner, removeMember, renameMember } from "@/lib/workspace/members"
import { renameWorkspace, settingsData } from "@/lib/workspace/workspace"
import { createTRPCRouter, workspaceProcedure } from "../init"

const memberId = z.string().min(1)

/** The workspace itself: its sync, settings, members, agents and invites. */
export const workspaceRouter = createTRPCRouter({
  sync: workspaceProcedure
    .input(
      z.object({ since: z.string().nullable(), task: z.string().nullable() })
    )
    .query(async ({ ctx, input }) => ({
      workspace: ctx.c.ws,
      data: await sync(ctx.c, input.since, input.task),
    })),

  settings: workspaceProcedure.query(({ ctx }) => settingsData(ctx.c)),

  rename: workspaceProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ ctx, input }) => renameWorkspace(ctx.c, input)),

  switch: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await switchWorkspace(ctx.session, input.workspaceId)
      return { ok: true }
    }),

  addAgent: workspaceProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ ctx, input }) => addAgent(ctx.c, input)),

  newKey: workspaceProcedure
    .input(z.object({ memberId }))
    .mutation(({ ctx, input }) => newKey(ctx.c, input)),

  revokeKeys: workspaceProcedure
    .input(z.object({ memberId, unused: z.boolean() }))
    .mutation(({ ctx, input }) => revokeKeys(ctx.c, input)),

  renameMember: workspaceProcedure
    .input(z.object({ memberId, name: z.string() }))
    .mutation(({ ctx, input }) => renameMember(ctx.c, input)),

  removeMember: workspaceProcedure
    .input(z.object({ memberId }))
    .mutation(({ ctx, input }) => removeMember(ctx.c, input)),

  makeOwner: workspaceProcedure
    .input(z.object({ memberId }))
    .mutation(({ ctx, input }) => makeOwner(ctx.c, input)),

  createInvite: workspaceProcedure
    .input(z.object({ email: z.string().optional() }).optional())
    .mutation(({ ctx, input }) => createInvite(ctx.c, input ?? {})),

  revokeInvite: workspaceProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(({ ctx, input }) => revokeInvite(ctx.c, input)),
})
