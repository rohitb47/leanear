"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@/components/chrome/dialog"

// One designed confirm for the app, in place of the browser's. Anything can
// ask and wait for the answer:
//
//     if (!(await confirm({ title: "Remove Claude?", action: "Remove" }))) return

type Ask = {
  title: string
  body?: string
  /** The button that goes ahead: "Remove", "Revoke". */
  action: string
  danger?: boolean
}

let open: ((a: Ask, done: (yes: boolean) => void) => void) | null = null

export function confirm(a: Ask): Promise<boolean> {
  return new Promise((done) => {
    if (open) open(a, done)
    else done(false)
  })
}

/** Mounted once, in the app shell. */
export function ConfirmHost() {
  const [ask, setAsk] = useState<{
    a: Ask
    done: (yes: boolean) => void
  } | null>(null)
  const [shown, setShown] = useState<Ask | null>(null)
  if (ask && ask.a !== shown) setShown(ask.a)
  useEffect(() => {
    open = (a, done) => setAsk({ a, done })
    return () => {
      open = null
    }
  }, [])
  const answer = (yes: boolean) => {
    ask?.done(yes)
    setAsk(null)
  }
  return (
    <Dialog
      open={!!ask}
      onClose={() => answer(false)}
      label={shown?.title ?? "Confirm"}
      className="dialog-text confirm"
    >
      <div className="db">
        <h3>{shown?.title}</h3>
        {shown?.body && <p>{shown.body}</p>}
      </div>
      <div className="df">
        <div className="grow" />
        <button className="btn bare sm" onClick={() => answer(false)}>
          Cancel
        </button>
        <button
          className={`btn sm${shown?.danger ? " danger" : ""}`}
          autoFocus
          onClick={() => answer(true)}
        >
          {shown?.action}
        </button>
      </div>
    </Dialog>
  )
}
