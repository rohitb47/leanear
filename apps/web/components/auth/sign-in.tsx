"use client"

import { useState } from "react"
import { I } from "@/components/common/icons"
import { authClient } from "@/lib/auth/client"

/** GitHub, the one way in. */
export function SignInForm({ next }: { next: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <>
      <button
        className="btn accent wide"
        disabled={busy}
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
        {I.github} Continue with GitHub
      </button>
      {err && <p className="err">{err}</p>}
    </>
  )
}
