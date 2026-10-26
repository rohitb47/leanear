import type { Metadata } from "next"
import { DocHead, Pager, Steps } from "@/components/docs/parts"
import { APP } from "@/lib/site/links"

export const metadata: Metadata = {
  title: { absolute: "Getting started: Leanear docs" },
}

export default function GettingStarted() {
  return (
    <>
      <DocHead
        href="/docs"
        lead="Sign in, make a project and give your agent a key. Then it picks up tasks the same way you do."
      />
      <Steps>
        <li>
          <b>Sign in</b> at{" "}
          <a className="link" href={APP}>
            cloud.leanear.app
          </a>{" "}
          with GitHub.
        </li>
        <li>
          <b>Make a project.</b> Name it and its key fills itself in, like LEA.
        </li>
        <li>
          <b>Add an agent</b> in Settings. Give it a name and copy its key. Keys
          start with <code className="inline">lk_</code>.
        </li>
      </Steps>
      <p>Then connect the agent over MCP, and hand it its first task.</p>
      <Pager href="/docs" />
    </>
  )
}
