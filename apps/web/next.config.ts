import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@leanear/ui"],
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
