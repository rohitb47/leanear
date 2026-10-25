import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { MARK_PATH } from "@leanear/ui/mark"

export const alt = "Leanear: Linear, but leaner"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  const font = await readFile(join(process.cwd(), "app/fonts/Switzer-600.ttf"))
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
        color: "#ededed",
        fontFamily: "Switzer",
      }}
    >
      <svg width="72" height="72" viewBox="0 0 24 24">
        <path d={MARK_PATH} fill="#ededed" fillRule="evenodd" />
      </svg>
      <div
        style={{
          display: "flex",
          marginTop: 48,
          fontSize: 112,
          letterSpacing: "-0.045em",
        }}
      >
        Linear, but&nbsp;
        <span
          style={{
            background: "#1b1b1d",
            borderRadius: 22,
            padding: "0 16px 6px",
          }}
        >
          leaner.
        </span>
      </div>
      <div
        style={{
          marginTop: 36,
          fontSize: 32,
          color: "#a1a1a1",
          letterSpacing: "-0.01em",
        }}
      >
        Open source, on GitHub
      </div>
    </div>,
    { ...size, fonts: [{ name: "Switzer", data: font, weight: 600 }] }
  )
}
