// Runs before `next build`. With no DATABASE_URL there is nothing to migrate:
// the embedded database migrates itself on first use.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Locally DATABASE_URL lives in .env.local, which Next reads but plain node doesn't.
const here = path.dirname(fileURLToPath(import.meta.url));
const local = path.join(here, "..", ".env.local");
if (existsSync(local)) process.loadEnvFile(local);

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: no DATABASE_URL, skipping");
  process.exit(0);
}
const { default: postgres } = await import("postgres");
const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const client = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
await client.end();
console.log("migrate: done");
