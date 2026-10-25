import "server-only"
import { prisma } from "@/lib/prisma"
import type { Ctx } from "@/lib/workspace/context"
import { LeanError, id } from "@/lib/utils"
import { findTask } from "./tasks"

const MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp"]

/** A screenshot for a task's notes or comments, served at `/i/<id>`. */
export async function saveImage(
  c: Ctx,
  a: { taskId?: string | null; mime: string; bytes: Buffer }
) {
  if (!MIMES.includes(a.mime))
    throw new LeanError("Images must be PNG, JPEG, GIF or WebP")
  if (a.bytes.length > 5 * 1024 * 1024)
    throw new LeanError("Images can be up to 5 MB")
  if (!a.bytes.length) throw new LeanError("The image is empty")
  const taskId = a.taskId ? (await findTask(c, a.taskId)).id : null
  const iid = id()
  await prisma.image.create({
    data: {
      id: iid,
      workspaceId: c.ws,
      taskId,
      mime: a.mime,
      bytes: new Uint8Array(a.bytes),
      createdBy: c.me.id,
    },
  })
  return { id: iid, path: `/i/${iid}` }
}

export async function readImage(ws: string, iid: string) {
  return prisma.image.findFirst({
    where: { id: iid, workspaceId: ws },
    select: { mime: true, bytes: true },
  })
}
