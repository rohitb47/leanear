"use client"

import { GitHubIcon } from "@leanear/ui/mark"
import { useState } from "react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/common/button"

/** GitHub, the one way in. */
export function SignInForm({ next }: { next: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <>
      <Button
        className="btn accent wide github"
        loading={busy}
        onClick={async () => {
          setBusy(true)
          setErr(null)
          const r = await authClient.signIn.social({
            provider: "github",
            callbackURL: next,
          })
          if (r.error) {
            setErr(r.error.message ?? "Couldn't sign you in. Try again.")
            setBusy(false)
          }
        }}
      >
        <GitHubIcon size={17} /> Continue with GitHub
      </Button>
      {err && <p className="err">{err}</p>}
    </>
  )
}
