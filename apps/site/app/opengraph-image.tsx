import { ImageResponse } from "next/og"
import { MARK_PATH } from "@shipthat/ui/mark"

// The card a shared link shows, on-brand: black, the mark, a headline in
// Bricolage with the connector words dimmed, one line in Geist under it.

export const alt = "shipth.at: Linear, but leaner"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const HEAD = "Linear, but leaner."
const LINE = "One board for a small team and all its agents."

/**
 * A Google font as TrueType, cut down to the letters the card uses. `axes` is
 * Google's axis spec, like "opsz,wght@96,500" for Bricolage at display size.
 */
async function font(family: string, axes: string, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family}:${axes}&text=${encodeURIComponent(text)}`
  ).then((r) => r.text())
  const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(
    css
  )?.[1]
  if (!url) throw new Error(`No ${family} ${axes} from Google Fonts`)
  return fetch(url).then((r) => r.arrayBuffer())
}

export default async function Image() {
  const [display, sans] = await Promise.all([
    // The headline at display size, as the site's hero sets it.
    font("Bricolage+Grotesque", "opsz,wght@96,500", HEAD),
    font("Geist", "wght@400", LINE),
  ])
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
      }}
    >
      <svg width="64" height="64" viewBox="0 0 24 24">
        <path d={MARK_PATH} fill="#ededed" fillRule="evenodd" />
      </svg>
      <div
        style={{
          display: "flex",
          marginTop: 56,
          fontFamily: "Bricolage",
          fontSize: 116,
          lineHeight: 1,
          letterSpacing: "-0.035em",
        }}
      >
        <span style={{ color: "#5c5c60" }}>Linear, but&nbsp;</span>
        <span style={{ color: "#ededed" }}>leaner.</span>
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: "Geist",
          fontSize: 34,
          color: "#a1a1a1",
          letterSpacing: "-0.01em",
        }}
      >
        {LINE}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: display, weight: 500 },
        { name: "Geist", data: sans, weight: 400 },
      ],
    }
  )
}
