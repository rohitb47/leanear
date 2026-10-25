import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono, Mrs_Saint_Delafield } from "next/font/google";
import { URL } from "@/lib/site";
import "./globals.css";

const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-400.woff2", weight: "400" },
    { path: "./fonts/Switzer-500.woff2", weight: "500" },
    { path: "./fonts/Switzer-600.woff2", weight: "600" },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const sign = Mrs_Saint_Delafield({ variable: "--font-sign", weight: "400", subsets: ["latin"] });

const title = "Leanear: Linear, but leaner";
const description =
  "The open-source project tool for indie hackers and their AI agents. Up to 91% cheaper than Linear. On GitHub.";

export const metadata: Metadata = {
  metadataBase: new globalThis.URL(URL),
  title,
  description,
  openGraph: { title, description, url: URL, siteName: "Leanear", type: "website" },
  twitter: { card: "summary_large_image", title, description, creator: "@rohitb47" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161616" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${switzer.variable} ${mono.variable} ${sign.variable}`}>
      <body>{children}</body>
    </html>
  );
}
