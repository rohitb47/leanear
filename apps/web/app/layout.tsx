import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

// The site's type: Bricolage for headings, Geist for the rest, Geist Mono for
// ids and keys.
const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
})
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Leanear",
  description: "One board for a small team and all its agents.",
  robots: { index: false },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
