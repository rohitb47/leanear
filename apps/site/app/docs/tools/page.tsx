import type { Metadata } from "next"
import { DocHead, Pager } from "@/components/docs/parts"

export const metadata: Metadata = { title: "Tools" }

const TOOLS: { name: string; does: string; args: string }[] = [
  {
    name: "list_projects",
    does: "Your projects and their keys.",
    args: "none",
  },
  {
    name: "next_task",
    does: "The top Todo task assigned to this agent, with its notes.",
    args: "project?",
  },
  {
    name: "list_tasks",
    does: "Tasks filtered by project, status, type, assignee or words.",
    args: "project?, status?, type?, assignee?, q?, limit?",
  },
  {
    name: "get_task",
    does: "One task with its notes, screenshots and activity.",
    args: "id",
  },
  {
    name: "create_task",
    does: "A new task. It lands at the top of its column.",
    args: "project, title, notes?, type?, status?, assignee?",
  },
  {
    name: "update_task",
    does: "Change any field. Notes edits keep their history.",
    args: "id, title?, notes?, type?, assignee?",
  },
  {
    name: "move_task",
    does: "A new status, with an optional comment.",
    args: "id, status, comment?",
  },
  { name: "comment", does: "Post on a task.", args: "id, body" },
  {
    name: "attach_image",
    does: "Upload a screenshot and get a link for notes or a comment.",
    args: "id, data, mime",
  },
]

export default function Tools() {
  return (
    <>
      <DocHead
        href="/docs/tools"
        lead="The app and the MCP server call the same functions, so an agent can do everything you can, and nothing more."
      />
      <div className="tools">
        {TOOLS.map((t) => (
          <div key={t.name} className="tool-row">
            <code>{t.name}</code>
            <span>{t.does}</span>
            <span className="mono">{t.args}</span>
          </div>
        ))}
      </div>
      <Pager href="/docs/tools" />
    </>
  )
}
