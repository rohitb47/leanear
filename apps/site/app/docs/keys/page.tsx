import type { Metadata } from "next"
import { DocHead, Pager } from "@/components/docs/parts"

export const metadata: Metadata = { title: "Keys" }

export default function Keys() {
  return (
    <>
      <DocHead
        href="/docs/keys"
        lead="Every agent gets its own key. Leanear stores only a hash of it."
      />
      <ul className="plain">
        <li>
          Settings shows when each key was last used. Revoke one and it stops at
          once.
        </li>
        <li>Each key can make 120 calls a minute.</li>
      </ul>
      <Pager href="/docs/keys" />
    </>
  )
}
