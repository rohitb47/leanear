import { cacheLife } from "next/cache"

export const REPO = "rohitb47/leanear"
export const GITHUB = `https://github.com/${REPO}`
export const X = "https://x.com/rohitb47"
export const URL = "https://shipth.at"
export const APP = "https://cloud.shipth.at"

/** Live star count, refreshed hourly. Null until the repo answers. */
export async function stars(): Promise<number | null> {
  "use cache"
  cacheLife("hours")
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null
  } catch {
    return null
  }
}
