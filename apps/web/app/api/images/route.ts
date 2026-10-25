import { NextResponse } from "next/server";
import { personCtx } from "@/lib/auth";
import { saveImage } from "@/lib/core";
import { fail } from "@/lib/respond";
import { LeanError } from "@/lib/util";

export async function POST(req: Request) {
  try {
    const c = await personCtx();
    const f = await req.formData();
    const file = f.get("file");
    if (!(file instanceof Blob)) throw new LeanError("No image");
    const taskId = f.get("taskId");
    const out = await saveImage(c, {
      taskId: typeof taskId === "string" && taskId ? taskId : null,
      mime: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ data: out });
  } catch (e) {
    return fail(e);
  }
}
