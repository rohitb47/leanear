import { anyCtx } from "@/lib/auth/agent"
import { readImage } from "@/lib/tasks/images"

// Screenshots, for workspace members and their agents only.
export async function GET(req: Request, ctx: RouteContext<"/i/[id]">) {
  const { id } = await ctx.params
  const c = await anyCtx(req)
  if (!c) return new Response("Sign in to see this image", { status: 401 })
  const img = await readImage(c.ws, id)
  if (!img) return new Response("Not found", { status: 404 })
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  })
}
