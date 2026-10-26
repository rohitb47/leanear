"use client"

import { useState } from "react"
import { useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { Dialog } from "@/components/chrome/dialog"
import { Cmd } from "@/components/workspace/connect"
import { changedMembers } from "@/components/workspace/add-agent"

/**
 * Invite someone. With email set up: type their address and it's sent, with
 * the link shown too in case it lands in spam. Without: a link to copy and
 * send however you like. Either way it works for 7 days, until revoked.
 */
export function InviteDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const d = useData()
  const [email, setEmail] = useState("")
  const [done, setDone] = useState<{
    link: string
    to: string | null
    note: string | null
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const make = async () => {
    if (d.mail && !email.trim()) return setErr("Type their email first")
    setBusy(true)
    setErr(null)
    try {
      const r = await api.workspace.createInvite.mutate(
        d.mail ? { email: email.trim() } : {}
      )
      setDone({
        link: `${location.origin}/join/${r.token}`,
        to: r.sent ? r.email : null,
        note: r.mailError,
      })
      changedMembers()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const close = () => {
    onClose()
    setDone(null)
    setEmail("")
    setErr(null)
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      label="Invite someone"
      className="dialog-text"
    >
      <div className="db">
        <h3>Invite someone</h3>
        {done ? (
          <>
            <p>
              {done.to
                ? `Sent to ${done.to}. They sign in with GitHub and join as a member.`
                : "Send them this link. They sign in with GitHub and join as a member."}{" "}
              It works for 7 days.
            </p>
            {done.note && <div className="callout problem">{done.note}</div>}
            <Cmd code={done.link} file="Invite link" />
          </>
        ) : d.mail ? (
          <>
            <p>
              We&apos;ll email them a link. They sign in with GitHub and join as
              a member.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void make()
              }}
            >
              <input
                className="field"
                type="email"
                autoFocus
                placeholder="name@company.com"
                aria-label="Their email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErr(null)
                }}
              />
            </form>
          </>
        ) : (
          <p>
            Make a link and send it to them. They sign in with GitHub and join
            as a member. It works for 7 days.
          </p>
        )}
        {err && <div className="err">{err}</div>}
      </div>
      <div className="df">
        <div className="grow" />
        {done ? (
          <button className="btn sm" onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button className="btn bare sm" onClick={close}>
              Cancel
            </button>
            <button className="btn accent sm" disabled={busy} onClick={make}>
              {d.mail ? "Send invite" : "Make the link"}
            </button>
          </>
        )}
      </div>
    </Dialog>
  )
}
