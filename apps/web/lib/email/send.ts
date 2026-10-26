import "server-only"
import { LeanError } from "@/lib/utils"

// Email, through Resend. On when RESEND_API_KEY is set; without it, invites
// are links to copy, and nothing else in Leanear sends mail.

export const mailOn = () => !!process.env.RESEND_API_KEY

/** Who mail comes from: a verified sender on your Resend domain. */
const FROM = () => process.env.EMAIL_FROM || "Leanear <hello@leanear.app>"

export async function sendMail(m: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new LeanError("Email is off on this server")
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM(), ...m }),
  })
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { message?: string }
    throw new LeanError(
      `The email didn't send${j.message ? `: ${j.message}` : ""}. The link still works.`
    )
  }
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  )

/** An invite: who asked, to where, one button. Emails stay light. */
export function inviteMail(a: {
  from: string
  workspace: string
  link: string
}) {
  const subject = `${a.from} invited you to ${a.workspace} on Leanear`
  const text = `${a.from} invited you to ${a.workspace} on Leanear, one board for a small team and all its agents.

Join: ${a.link}

The link works for 7 days.`
  const html = `<!doctype html><html><body style="margin:0;padding:40px 16px;background:#ffffff;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#111111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:440px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:600;letter-spacing:-0.02em;padding-bottom:12px">Join ${esc(a.workspace)}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:#555555;padding-bottom:28px">${esc(a.from)} invited you to ${esc(a.workspace)} on Leanear, one board for a small team and all its agents.</td></tr>
<tr><td style="padding-bottom:28px"><a href="${esc(a.link)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#ff6a3d;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none">Join ${esc(a.workspace)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#888888">The link works for 7 days. If you weren't expecting this, you can ignore it.</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
