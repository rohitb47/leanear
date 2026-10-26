import type { Metadata } from "next"
import { Code, DocHead, Pager, Steps } from "@/components/docs/parts"

export const metadata: Metadata = { title: "The loop" }

export default function Loop() {
  return (
    <>
      <DocHead
        href="/docs/loop"
        lead="Assign tasks to your agent, then tell it to work through them. You review a list, not a chat log."
      />
      <Code code="Work through my Leanear tasks." file="Prompt" />
      <Steps>
        <li>
          It calls <code className="inline">next_task</code> and moves the task
          to Doing.
        </li>
        <li>It does the work in your repo, following your CLAUDE.md.</li>
        <li>
          It writes what it did with <code className="inline">comment</code> and
          moves the task to Done with <code className="inline">move_task</code>,
          or back to you with a question.
        </li>
      </Steps>
      <Pager href="/docs/loop" />
    </>
  )
}
