import { loadEnvFile } from "node:process"

import { defineConfig } from "prisma/config"

// Prisma 7 doesn't read env files itself. Locally the URL is in .env.local; a
// Vercel build has none and the environment already carries it.
try {
  loadEnvFile(".env.local")
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "" },
})
