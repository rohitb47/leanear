import "server-only";

// GitHub and Google, authorization code flow. Nothing else to configure.

export type Provider = "github" | "google";

export const CONF = {
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    id: () => process.env.GITHUB_ID,
    secret: () => process.env.GITHUB_SECRET,
  },
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    id: () => process.env.GOOGLE_ID,
    secret: () => process.env.GOOGLE_SECRET,
  },
} as const;

export const isProvider = (p: string): p is Provider => p === "github" || p === "google";

export async function exchange(p: Provider, code: string, redirectUri: string) {
  const c = CONF[p];
  const res = await fetch(c.token, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.id() ?? "",
      client_secret: c.secret() ?? "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error ?? "No access token");
  return data.access_token;
}

export async function profile(p: Provider, accessToken: string) {
  const auth = { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "User-Agent": "Leanear" };
  if (p === "github") {
    const u = (await (await fetch("https://api.github.com/user", { headers: auth })).json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };
    const emails = (await (await fetch("https://api.github.com/user/emails", { headers: auth })).json()) as
      | { email: string; primary: boolean; verified: boolean }[]
      | { message: string };
    const email = Array.isArray(emails) ? (emails.find((e) => e.primary && e.verified)?.email ?? null) : null;
    return { providerId: String(u.id), name: u.name || u.login, email, avatarUrl: u.avatar_url };
  }
  const u = (await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: auth })).json()) as {
    sub: string;
    name?: string;
    email?: string;
    email_verified?: boolean;
    picture?: string;
  };
  return {
    providerId: u.sub,
    name: u.name || u.email?.split("@")[0] || "Someone",
    email: u.email_verified ? (u.email ?? null) : null,
    avatarUrl: u.picture ?? null,
  };
}
