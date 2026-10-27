import Link from "next/link"
import { GitHubIcon, Mark } from "@shipthat/ui/mark"
import { NavShell } from "./nav"
import { APP, GITHUB, X } from "@/lib/site/links"

export function SiteNav({ count }: { count: number | null }) {
  return (
    <NavShell>
      <div className="wrap">
        <Link className="wm" href="/#top" aria-label="shipth.at">
          <Mark />
          shipth.at
        </Link>
        <nav className="links">
          <Link href="/#product">Product</Link>
          <Link href="/#agents">Agents</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="right">
          <a
            className="btn ghost sm"
            href={GITHUB}
            target="_blank"
            rel="noreferrer"
          >
            <GitHubIcon size={15} />
            GitHub
            {count !== null && (
              <span className="count">{count.toLocaleString("en")}</span>
            )}
          </a>
          <a className="btn sm" href={APP}>
            Sign in
          </a>
        </div>
      </div>
    </NavShell>
  )
}

export function SiteFoot() {
  return (
    <footer className="foot">
      <div className="wrap">
        <Link className="wm" href="/" aria-label="shipth.at">
          <Mark />
          shipth.at
        </Link>
        <nav>
          <a href={GITHUB} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/docs">Docs</Link>
          <a href={X} target="_blank" rel="noreferrer">
            X
          </a>
          <a
            href={`${GITHUB}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
          >
            Licence
          </a>
        </nav>
        <span className="mono">© 2026 shipth.at</span>
      </div>
    </footer>
  )
}
