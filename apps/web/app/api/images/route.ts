import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { saveImage } from "@/lib/tasks/images"
import { LeanError } from "@/lib/utils"

// Uploads are multipart, so they come here rather than through tRPC.
export async function POST(req: Request) {
  try {
    const s = await getSession()
    if (!s) throw new LeanError("Sign in first", 401)
    const f = await req.formData()
    const file = f.get("file")
    if (!(file instanceof Blob)) throw new LeanError("No image")
    const taskId = f.get("taskId")
    const out = await saveImage(
      { ws: s.workspace.id, me: s.me },
      {
        taskId: typeof taskId === "string" && taskId ? taskId : null,
        mime: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      }
    )
    return NextResponse.json({ data: out })
  } catch (e) {
    if (e instanceof LeanError)
      return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
