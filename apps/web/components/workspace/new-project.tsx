"use client"

import { useState } from "react"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { ProjectForm } from "@/components/workspace/onboarding"
import { Button } from "@/components/common/button"

/** Another product, another project. */
export function NewProject({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { go } = useApp()
  const [busy, setBusy] = useState(false)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="New project"
      className="dialog-text"
    >
      <div className="db">
        <h3>New project</h3>
        <p>One per product. Its key starts every task id, like PRO-12.</p>
        <ProjectForm
          id="new-project"
          onBusy={setBusy}
          onDone={(key) => {
            onClose()
            go({ view: "board", key })
          }}
        />
      </div>
      <div className="df">
        <div className="grow" />
        <button className="btn bare sm" onClick={onClose}>
          Cancel
        </button>
        <Button
          className="btn accent sm"
          type="submit"
          form="new-project"
          loading={busy}
        >
          Create project
        </Button>
      </div>
    </Dialog>
  )
}
