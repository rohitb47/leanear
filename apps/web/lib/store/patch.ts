"use client"

import type { Task } from "@/lib/sync/types"
import { api } from "@/trpc/client"
import { get, hold, putActivity, putTask, release, toast } from "./store"

/** A screenshot for notes or a comment. Multipart, so not through tRPC. */
export async function upload(file: File | Blob, taskId?: string | null) {
  const f = new FormData()
  f.set("file", file)
  if (taskId) f.set("taskId", taskId)
  const res = await fetch("/api/images", { method: "POST", body: f })
  const j = (await res.json().catch(() => ({}))) as {
    data?: { path: string }
    error?: string
  }
  if (!res.ok || !j.data) throw new Error(j.error ?? "Upload failed")
  return j.data.path
}

export async function loadActivity(taskId: string) {
  putActivity(taskId, await api.tasks.activity.query({ id: taskId }))
}

/**
 * Change a task now, tell the server, keep its answer. If the server says no,
 * put the task back and say why.
 *
 *     patch(t.id, { status }, () => api.tasks.move.mutate({ id: t.id, status }))
 */
export async function patch(
  id: string,
  local: Partial<Task>,
  send: () => Promise<Task>
) {
  const prev = get().tasks[id]
  if (!prev) return
  hold(id)
  putTask({ ...prev, ...local })
  try {
    putTask(await send())
    void loadActivity(id).catch(() => {})
  } catch (e) {
    putTask(prev)
    toast((e as Error).message)
  } finally {
    release(id)
  }
}
