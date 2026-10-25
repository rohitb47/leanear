// Runs before `next build`. With no DATABASE_URL there is nothing to migrate:
// the embedded database migrates itself on first use.
import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: no DATABASE_URL, skipping");
  process.exit(0);
}
const { default: postgres } = await import("postgres");
const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const here = path.dirname(fileURLToPath(import.meta.url));
const client = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(client), { migrationsFolder: path.join(here, "..", "drizzle") });
await client.end();
console.log("migrate: done");
