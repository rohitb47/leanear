"use client";

import { useState } from "react";
import { authClient } from "./authClient";
import { I } from "./icons";
import { hardGo } from "./store";

type P = { github: boolean; google: boolean; password: boolean };

export function SignInForm({ providers: p, next }: { providers: P; next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const social = async (provider: "github" | "google") => {
    setBusy(provider);
    setErr(null);
    const r = await authClient.signIn.social({ provider, callbackURL: next });
    if (r.error) {
      setErr(r.error.message ?? "Couldn't sign you in. Try again.");
      setBusy(null);
    }
  };
  const alt = p.github || p.google;
  return (
    <>
      {p.github && (
        <button className="btn accent wide" disabled={!!busy} onClick={() => social("github")}>
          {I.github} Continue with GitHub
        </button>
      )}
      {p.google && (
        <button className={`btn wide${p.github ? "" : " accent"}`} style={p.github ? { background: "var(--card)" } : undefined} disabled={!!busy} onClick={() => social("google")}>
          {I.google} Continue with Google
        </button>
      )}
      {p.password && (
        <form
          style={{ display: "contents" }}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name") ?? "").trim();
            const email = String(f.get("email") ?? "").trim();
            const password = String(f.get("password") ?? "");
            setBusy("password");
            setErr(null);
            // Sign in, or make the account on first use.
            const r = await authClient.signIn.email({ email, password });
            if (r.error) {
              const up = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
              if (up.error) {
                setErr(up.error.code === "USER_ALREADY_EXISTS" || /exist/i.test(up.error.message ?? "") ? "Wrong password for that email" : (up.error.message ?? "Couldn't sign you in"));
                setBusy(null);
                return;
              }
            }
            hardGo(next);
          }}
        >
          {alt && (
            <div className="mono" style={{ textAlign: "center" }}>
              or, on this machine
            </div>
          )}
          <input className="field" name="name" placeholder="Your name (first time only)" maxLength={60} autoComplete="name" />
          <input className="field" name="email" type="email" placeholder="Email" required maxLength={120} autoComplete="email" />
          <input className="field" name="password" type="password" placeholder="Password, 8 or more characters" required minLength={8} autoComplete="current-password" />
          <button className={`btn wide${alt ? "" : " accent"}`} type="submit" style={alt ? { background: "var(--card)" } : undefined} disabled={!!busy}>
            Continue
          </button>
        </form>
      )}
      {!p.github && !p.google && !p.password && <p>Sign-in isn&apos;t set up yet. Add GITHUB_ID and GITHUB_SECRET.</p>}
      {err && <p className="err">{err}</p>}
    </>
  );
}
