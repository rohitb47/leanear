import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@leanear/ui"],
  async redirects() {
    return [
      // A docs page that no longer exists; old links land on the start of the docs.
      { source: "/docs/context", destination: "/docs", permanent: true },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.leanear.app" }],
        destination: "https://leanear.app/:path*",
        permanent: true,
      },
    ]
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
