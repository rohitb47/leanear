import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { App } from "@/components/App";
import { snapshot } from "@/lib/snapshot";

export default async function Page(props: PageProps<"/[[...path]]">) {
  const [snap, params, search, jar] = await Promise.all([snapshot(), props.params, props.searchParams, cookies()]);
  if (!snap) redirect("/signin");
  const path = "/" + (params.path ?? []).join("/");
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) if (typeof v === "string") q.set(k, v);
  const last = jar.get("lean-project")?.value ?? null;
  return <App initial={snap} path={path} search={q.toString() ? `?${q}` : ""} last={last ? decodeURIComponent(last) : null} />;
}
