import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  transpilePackages: ["@leanear/ui"],
  async redirects() {
    return [
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
