import type { Metadata, Viewport } from "next"
import {
  Geist_Mono,
  Bricolage_Grotesque,
  Geist,
  Mrs_Saint_Delafield,
} from "next/font/google"
import { URL } from "@/lib/site/links"
import "./globals.css"

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
})

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })
const sign = Mrs_Saint_Delafield({
  variable: "--font-sign",
  weight: "400",
  subsets: ["latin"],
})

const title = "shipth.at: Linear, but leaner"
const description =
  "One board for a small team and all its agents. Open source, $9 for the whole team, or run it yourself."

export const metadata: Metadata = {
  metadataBase: new globalThis.URL(URL),
  title,
  description,
  openGraph: {
    title,
    description,
    url: URL,
    siteName: "shipth.at",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@rohitb47",
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} ${sign.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
