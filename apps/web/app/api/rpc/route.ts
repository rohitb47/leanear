import { NextResponse } from "next/server";
import { personCtx, switchWorkspace } from "@/lib/auth";
import * as core from "@/lib/core";
import { fail } from "@/lib/respond";
import { LeanError } from "@/lib/util";

// The app's one endpoint: { op, args } in, the result out. Same core as MCP.
type Args = Record<string, unknown>;
type C = Awaited<ReturnType<typeof personCtx>>;

const OPS: Record<string, (c: C, a: Args) => Promise<unknown>> = {
  createTask: core.createTask,
  updateTask: core.updateTask,
  moveTask: core.moveTask,
  comment: core.comment,
  deleteTask: core.deleteTask,
  getTask: core.getTask,
  createProject: core.createProject,
  updateProject: core.updateProject,
  deleteProject: core.deleteProject,
  renameWorkspace: core.renameWorkspace,
  addAgent: core.addAgent,
  newKey: core.newKey,
  revokeKey: core.revokeKey,
  renameMember: core.renameMember,
  removeMember: core.removeMember,
  makeOwner: core.makeOwner,
  createInvite: (c) => core.createInvite(c),
  revokeInvite: core.revokeInvite,
  settingsData: (c) => core.settingsData(c),
  switchWorkspace: async (c, a) => {
    await switchWorkspace(c.session, String(a.workspaceId));
    return { ok: true };
  },
};

export async function POST(req: Request) {
  try {
    // JSON only: a cross-site form can't send it without a preflight.
    if (!req.headers.get("content-type")?.startsWith("application/json")) throw new LeanError("Send JSON", 415);
    const { op, args } = (await req.json()) as { op?: string; args?: Args };
    const fn = op ? OPS[op] : undefined;
    if (!fn) throw new LeanError(`Unknown op ${op}`, 404);
    const c = await personCtx();
    return NextResponse.json({ data: await fn(c, args ?? {}) });
  } catch (e) {
    return fail(e);
  }
}
