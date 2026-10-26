"use client"

import { useState } from "react"
import { toast } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { Dialog } from "@/components/chrome/dialog"
import { Cmd } from "@/components/workspace/connect"
import { changedMembers } from "@/components/workspace/add-agent"

/**
 * Invite someone: make a link, copy it, send it however you like. Anyone
 * with it joins as a member for the next 7 days, until it's revoked.
 */
export function InviteDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const make = async () => {
    setBusy(true)
    try {
      const r = await api.workspace.createInvite.mutate()
      setLink(`${location.origin}/join/${r.token}`)
      changedMembers()
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const close = () => {
    onClose()
    setLink(null)
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
        <p>
          Send them a link. They sign in with GitHub and join as a member. It
          works for 7 days, until you revoke it.
        </p>
        {link && <Cmd code={link} file="Invite link" />}
      </div>
      <div className="df">
        <div className="grow" />
        {link ? (
          <button className="btn sm" onClick={close}>
            Done
          </button>
        ) : (
          <>
            <button className="btn bare sm" onClick={close}>
              Cancel
            </button>
            <button className="btn accent sm" disabled={busy} onClick={make}>
              Make the link
            </button>
          </>
        )}
      </div>
    </Dialog>
  )
}
