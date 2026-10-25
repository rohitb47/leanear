import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@leanear/ui"],
  // `pnpm check` builds into .next-check so it can't clobber a running dev
  // server's .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
}

export default nextConfig
