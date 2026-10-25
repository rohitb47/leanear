import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema, type Db } from "./db";

// Sign-in for people: GitHub, Google, and email + password on your own machine.
// Agents never touch this; they use lk_ keys (see agentCtx in auth.ts).

export const providers = () => ({
  github: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
  google: !!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET),
  password: process.env.NODE_ENV !== "production",
});

function make(d: Db) {
  const p = providers();
  return betterAuth({
    baseURL: process.env.PUBLIC_URL || process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(d, {
      provider: "pg",
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: p.password },
    socialProviders: {
      ...(p.github ? { github: { clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! } } : {}),
      ...(p.google ? { google: { clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! } } : {}),
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["github", "google"] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof make>;
const g = globalThis as unknown as { __leanAuth?: Promise<Auth> };

/** Built on first use, once the database is open. */
export function auth(): Promise<Auth> {
  g.__leanAuth ??= db().then(make);
  return g.__leanAuth;
}
