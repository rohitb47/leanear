import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import pg from "pg"

const globalForPrisma = globalThis as unknown as {
  pool: pg.Pool
  prisma: PrismaClient
}

// The URL carries its own sslmode: Neon's asks for it, local Docker doesn't.
export const pool =
  globalForPrisma.pool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool
  globalForPrisma.prisma = prisma
}

/** The client inside an interactive transaction. */
export type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>
