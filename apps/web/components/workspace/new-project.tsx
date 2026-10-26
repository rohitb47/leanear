"use client"

import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { ProjectForm } from "@/components/workspace/onboarding"

/** Another product, another project. */
export function NewProject({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { go } = useApp()
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
        <button className="btn accent sm" type="submit" form="new-project">
          Create project
        </button>
      </div>
    </Dialog>
  )
}
