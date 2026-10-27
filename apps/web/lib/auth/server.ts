import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "@/lib/prisma"

/**
 * Sign-in for people: GitHub, and nothing else. Everyone using shipth.at has
 * one. Agents never touch this; they use `lk_` keys (`./agent.ts`).
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.PUBLIC_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // The domain, plus the URLs Vercel itself serves this deployment on.
  trustedOrigins: [
    process.env.PUBLIC_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  ].filter((origin): origin is string => Boolean(origin)),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  plugins: [nextCookies()],
})
