import { Mark } from "@leanear/ui/mark";
import { redirect } from "next/navigation";
import { I } from "@/components/icons";
import { inviteInfo, providers, session } from "@/lib/auth";

export const metadata = { title: "Sign in to Leanear" };

export default async function SignIn(props: PageProps<"/signin">) {
  const [s, q] = await Promise.all([session(), props.searchParams]);
  if (s) redirect("/");
  const p = providers();
  const invite = typeof q.invite === "string" ? await inviteInfo(q.invite) : null;
  const error = typeof q.error === "string" ? q.error : null;
  const none = !p.github && !p.google && !p.local;
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
              {/* Sign-in starts at a route handler, so these are plain links, not <Link>. */}
              {p.github && (
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a className="btn accent wide" href="/auth/github">
                  {I.github} Continue with GitHub
                </a>
              )}
              {p.google && (
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a className={`btn wide${p.github ? "" : " accent"}`} href="/auth/google" style={p.github ? { background: "var(--card)" } : undefined}>
                  {I.google} Continue with Google
                </a>
              )}
              {p.local && (
                <form action="/auth/local" method="post" style={{ display: "contents" }}>
                  {(p.github || p.google) && <div className="mono" style={{ textAlign: "center" }}>or, on this machine</div>}
                  <input className="field" name="name" placeholder="Your name" required maxLength={60} autoComplete="name" />
                  <input className="field" name="email" type="email" placeholder="Email" required maxLength={120} autoComplete="email" />
                  <button className={`btn wide${p.github || p.google ? "" : " accent"}`} type="submit" style={p.github || p.google ? { background: "var(--card)" } : undefined}>
                    Continue locally
                  </button>
                </form>
              )}
              {none && <p>Sign-in isn&apos;t set up yet. Add GITHUB_ID and GITHUB_SECRET.</p>}
            </div>
            {error && <p className="err">{error}</p>}
            {invite === null && typeof q.invite === "string" && <p className="err">That invite has expired. Ask for a new link.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
