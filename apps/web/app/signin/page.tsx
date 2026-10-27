import { Mark } from "@shipthat/ui/mark"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in"
import { getSession } from "@/lib/auth/session"
import { inviteInfo } from "@/lib/workspace/invites"

export const metadata = { title: "Sign in to shipth.at" }

export default async function SignIn(props: PageProps<"/signin">) {
  const q = await props.searchParams
  const tok = typeof q.invite === "string" ? q.invite : null
  const full = q.full === "1"
  const next = tok && !full ? `/join/${encodeURIComponent(tok)}` : "/"
  if (await getSession()) redirect(next)
  const invite = tok ? await inviteInfo(tok) : null
  return (
    <div className="app">
      <div className="frame">
        <div className="solo">
          <div className="stack">
            <div className="bigmark">
              <Mark size={44} />
            </div>
            <h1>{invite ? `Join ${invite.name}` : "Sign in to shipth.at"}</h1>
            <p className="lead">
              One board for a small team and all its agents.
            </p>
            <div className="card">
              <SignInForm next={next} />
            </div>
            {tok && !invite && (
              <p className="err after">
                That invite has expired. Ask for a new link.
              </p>
            )}
            {full && (
              <p className="err after">
                That workspace is full: Cloud has room for 20 people.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
