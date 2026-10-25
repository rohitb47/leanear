"use client"

import { createTRPCClient, httpBatchLink } from "@trpc/client"
import superjson from "superjson"
import { hardGo } from "@/lib/store/store"
import type { AppRouter } from "./routers/_app"

/**
 * The app's one way to the server. The board keeps its own store
 * (`lib/store/store.ts`) rather than a query cache, because its writes land
 * on screen before the server answers; this client is what they call.
 */
export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      // Signed out mid-session: start again at sign-in.
      fetch: async (url, init) => {
        const res = await fetch(url, init)
        if (res.status === 401) hardGo("/signin")
        return res
      },
    }),
  ],
})
