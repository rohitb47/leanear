import { Mark } from "@leanear/ui/mark"
import { redirect } from "next/navigation"
import { SignInForm } from "@/components/auth/sign-in"
import { getSession } from "@/lib/auth/session"
import { inviteInfo } from "@/lib/workspace/invites"

export const metadata = { title: "Sign in to Leanear" }

export default async function SignIn(props: PageProps<"/signin">) {
  const q = await props.searchParams
  const tok = typeof q.invite === "string" ? q.invite : null
  const next = tok ? `/join/${encodeURIComponent(tok)}` : "/"
  if (await getSession()) redirect(next)
  const invite = tok ? await inviteInfo(tok) : null
  return (
    <div className="app">
      <div className="view">
        <div className="center">
          <div className="stack">
            <div className="bigmark">
              <Mark size={44} />
            </div>
            <h2>{invite ? `Join ${invite.name}` : "Sign in to Leanear"}</h2>
            <p>Projects and tasks for you and your agents.</p>
            <div className="formcard">
              <SignInForm next={next} />
            </div>
            {tok && !invite && (
              <p className="err">
                That invite has expired. Ask for a new link.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
