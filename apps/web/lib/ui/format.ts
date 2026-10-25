// Small formatters and the clipboard, shared by every screen.

const pad = (n: number) => String(n).padStart(2, "0")
export const count = (n: number) => pad(n)

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 45) return "now"
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d`
  if (s < 60 * 86400) return `${Math.round(s / (7 * 86400))}w`
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  })
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
