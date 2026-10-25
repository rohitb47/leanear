"use client";

import type { Activity, Task } from "@/lib/types";
import { get, hardGo, hold, putActivity, putTask, release, toast } from "./store";

export async function rpc<T = unknown>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, args }),
  });
  if (res.status === 401) {
    hardGo("/signin");
    throw new Error("Signed out");
  }
  const j = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) throw new Error(j.error ?? "Something went wrong");
  return j.data as T;
}

export async function upload(file: File | Blob, taskId?: string | null) {
  const f = new FormData();
  f.set("file", file);
  if (taskId) f.set("taskId", taskId);
  const res = await fetch("/api/images", { method: "POST", body: f });
  const j = (await res.json().catch(() => ({}))) as { data?: { path: string }; error?: string };
  if (!res.ok || !j.data) throw new Error(j.error ?? "Upload failed");
  return j.data.path;
}

export async function loadActivity(taskId: string) {
  const r = await rpc<{ activity: Activity[] }>("getTask", { id: taskId });
  putActivity(taskId, r.activity);
}

/**
 * Change a task now, tell the server, keep its answer. If the server says no,
 * put the task back and say why.
 */
export async function patch(id: string, local: Partial<Task>, op: string, args: Record<string, unknown>) {
  const prev = get().tasks[id];
  if (!prev) return;
  hold(id);
  putTask({ ...prev, ...local });
  try {
    const t = await rpc<Task>(op, { id, ...args });
    putTask(t);
    void loadActivity(id).catch(() => {});
  } catch (e) {
    putTask(prev);
    toast((e as Error).message);
  } finally {
    release(id);
  }
}
