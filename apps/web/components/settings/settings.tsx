"use client"

import { Copy } from "@leanear/ui/copy"
import { useCallback, useEffect, useState } from "react"
import type { Member, SettingsData } from "@/lib/sync/types"
import { authClient } from "@/lib/auth/client"
import {
  hardGo,
  liveMembers,
  projectByKey,
  putMember,
  putProject,
  setWorkspaceName,
  toast,
  undoable,
  useData,
} from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Menu } from "@/components/chrome/menu"
import { Av } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { confirm } from "@/components/chrome/confirm"
import { KeyDialog } from "@/components/workspace/add-agent"
import { InviteDialog } from "@/components/workspace/invite"
import { PlanCard } from "@/components/workspace/plan"
import { ago } from "@/lib/ui/format"

/** One project's settings: its name, its key, and deleting it. */
export function ProjectSettings({ projectKey }: { projectKey: string }) {
  const { go } = useApp()
  return (
    <div className="set">
      <div className="set-col">
        <ProjectSection projectKey={projectKey} />
        <p className="set-note">
          People, agents and the plan are the whole workspace&apos;s, in{" "}
          <button className="linkish" onClick={() => go({ view: "settings" })}>
            Settings at Home
          </button>
          .
        </p>
      </div>
    </div>
  )
}

/** The workspace's settings: who's in it, the plan, its name, you. */
export function Settings() {
  const d = useData()
  const [data, setData] = useState<SettingsData | null>(null)
  const reload = useCallback(() => {
    api.workspace.settings
      .query()
      .then(setData)
      .catch((e) => toast(e.message))
  }, [])
  useEffect(reload, [reload])

  return (
    <div className="set">
      <div className="set-col">
        <MembersSection data={data} reload={reload} />
        {d.billing.on && <PlanSection />}
        <WorkspaceSection />
        <section>
          <h4>You</h4>
          <div className="set-card">
            <div className="set-row">
              <Av m={d.members[d.me.memberId]} size="lg" />
              <div className="who">
                <div>{d.me.name}</div>
                <div className="sub">{d.me.email}</div>
              </div>
              <button
                className="btn sm"
                onClick={async () => {
                  await authClient.signOut()
                  hardGo("/signin")
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** A field that saves when you leave it or press Enter. */
function Field({
  value,
  onSave,
  label,
  className = "",
  disabled,
  title,
  upper,
}: {
  value: string
  onSave: (v: string) => Promise<unknown>
  label: string
  className?: string
  disabled?: boolean
  title?: string
  upper?: boolean
}) {
  const [v, setV] = useState(value)
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setV(value)
  }
  return (
    <input
      className={`field ${className}`}
      aria-label={label}
      value={v}
      disabled={disabled}
      title={title}
      spellCheck={false}
      onChange={(e) =>
        setV(
          upper
            ? e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, "")
                .slice(0, 5)
            : e.target.value
        )
      }
      onBlur={async () => {
        if (v.trim() === value || !v.trim()) return setV(value)
        try {
          await onSave(v.trim())
        } catch (e) {
          setV(value)
          toast((e as Error).message)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          e.stopPropagation()
          setV(value)
        }
      }}
    />
  )
}

function ProjectSection({ projectKey }: { projectKey: string }) {
  const d = useData()
  const { go } = useApp()
  const p = projectByKey(d, projectKey)
  if (!p) return null
  const tasks = Object.values(d.tasks).filter(
    (t) => t.projectId === p.id
  ).length
  return (
    <section>
      <h4>Project</h4>
      <div className="set-card">
        <div className="set-row">
          <span className="lbl">Name</span>
          <Field
            label="Project name"
            value={p.name}
            onSave={async (name) =>
              putProject(
                await api.projects.update.mutate({ project: p.id, name })
              )
            }
          />
        </div>
        <div className="set-row">
          <span className="lbl">Key</span>
          <Field
            label="Project key"
            className="key"
            upper
            value={p.key}
            disabled={tasks > 0}
            title={
              tasks > 0
                ? "The key is fixed once a project has tasks"
                : undefined
            }
            onSave={async (key) => {
              const r = await api.projects.update.mutate({ project: p.id, key })
              putProject(r)
              go({ view: "settings", key: r.key }, true)
            }}
          />
          <span className="role" style={{ marginLeft: "auto" }}>
            {tasks} {tasks === 1 ? "task" : "tasks"}
          </span>
        </div>
        {tasks === 0 && Object.keys(d.projects).length > 1 && (
          <button
            className="set-row add"
            style={{ color: "var(--red)" }}
            onClick={async () => {
              try {
                await api.projects.delete.mutate({ project: p.id })
                putProject({ ...p, deleted: true })
                toast(
                  `Moved ${p.name} to the trash`,
                  undoable(p.name, async () => {
                    const r = await api.log.restore.mutate({
                      kind: "project",
                      id: p.id,
                    })
                    if ("project" in r && r.project) putProject(r.project)
                  })
                )
                const next = Object.values(d.projects).find(
                  (x) => x.id !== p.id
                )
                if (next) go({ view: "board", key: next.key }, true)
              } catch (e) {
                toast((e as Error).message)
              }
            }}
          >
            Delete project
          </button>
        )}
      </div>
    </section>
  )
}

function MembersSection({
  data,
  reload,
}: {
  data: SettingsData | null
  reload: () => void
}) {
  const d = useData()
  const { addAgent } = useApp()
  const owner = d.me.role === "owner"
  const people = liveMembers(d).filter((m) => m.kind === "person")
  const agents = liveMembers(d).filter((m) => m.kind === "agent")
  const [inviting, setInviting] = useState(false)
  const [fresh, setFresh] = useState<{ m: Member; key: string } | null>(null)
  const [menu, setMenu] = useState<{ m: Member; el: HTMLElement } | null>(null)

  // An agent added or an invite made in a dialog: show its key and link here.
  useEffect(() => {
    window.addEventListener("lean-members", reload)
    return () => window.removeEventListener("lean-members", reload)
  }, [reload])

  const act = async <T,>(call: () => Promise<T>, done?: (r: T) => void) => {
    try {
      const r = await call()
      done?.(r)
      reload()
    } catch (e) {
      toast((e as Error).message)
    }
  }
  const link = (token: string) => `${location.origin}/join/${token}`
  const keysOf = (m: Member) =>
    data?.keys.filter((k) => k.memberId === m.id) ?? []

  return (
    <section>
      <h4>
        Members <span className="n">{people.length + agents.length}</span>
      </h4>
      <div className="set-card">
        {people.map((m) => (
          <div className="set-row" key={m.id}>
            <Av m={m} size="lg" />
            <div className="who">
              <div>
                {m.name}
                {m.id === d.me.memberId && (
                  <span className="muted"> (you)</span>
                )}
              </div>
            </div>
            <span className="role">
              {m.role === "owner" ? "Owner" : "Member"}
            </span>
            {owner && m.id !== d.me.memberId && (
              <button
                className="icon"
                aria-label={`Manage ${m.name}`}
                onClick={(e) => setMenu({ m, el: e.currentTarget })}
              >
                {I.more}
              </button>
            )}
          </div>
        ))}
        {agents.map((m) => {
          const keys = keysOf(m)
          const k = keys[keys.length - 1]
          return (
            <div key={m.id}>
              <div className="set-row">
                <Av m={m} size="lg" />
                <div className="who">
                  <div>{m.name}</div>
                  <div className="sub">
                    {k
                      ? k.lastUsedAt
                        ? `Last called ${ago(k.lastUsedAt) === "now" ? "just now" : `${ago(k.lastUsedAt)} ago`}`
                        : "Not connected yet"
                      : "No key"}
                  </div>
                </div>
                <span className="role">{k ? `lk_••••${k.hint}` : ""}</span>
                <button
                  className="icon"
                  aria-label={`Manage ${m.name}`}
                  onClick={(e) => setMenu({ m, el: e.currentTarget })}
                >
                  {I.more}
                </button>
              </div>
            </div>
          )
        })}
        {owner &&
          data?.invites.map((i) => (
            <div className="set-row" key={i.id}>
              <span className="av lg none">{I.plus}</span>
              <div className="who">
                <div className="mono" style={{ color: "var(--ink)" }}>
                  {link(i.token)}
                </div>
                <div className="sub">
                  Invite link, works until{" "}
                  {new Date(i.expiresAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <Copy text={link(i.token)} />
              <button
                className="btn bare sm"
                onClick={() =>
                  act(() =>
                    api.workspace.revokeInvite.mutate({ inviteId: i.id })
                  )
                }
              >
                Revoke
              </button>
            </div>
          ))}
        <button className="set-row add" onClick={addAgent}>
          <span className="plus">{I.plus}</span>
          Add an agent
        </button>
        {owner && (
          <button className="set-row add" onClick={() => setInviting(true)}>
            <span className="plus">{I.plus}</span>
            Invite someone
          </button>
        )}
      </div>
      <p className="set-note">
        Agents are members with a name and a key. Invite links work for 7 days.
      </p>

      <Menu
        anchor={menu?.el ?? null}
        open={!!menu}
        onClose={() => setMenu(null)}
        align="end"
        width={200}
      >
        {menu?.m.kind === "agent" ? (
          <>
            <button
              onClick={() => {
                const m = menu.m
                setMenu(null)
                act(
                  () => api.workspace.newKey.mutate({ memberId: m.id }),
                  (r) => setFresh({ m, key: r.key })
                )
              }}
            >
              New key
            </button>
            {keysOf(menu.m).map((k) => (
              <button
                key={k.id}
                onClick={async () => {
                  setMenu(null)
                  if (
                    await confirm({
                      title: `Revoke lk_••••${k.hint}?`,
                      body: "Anything using this key stops at once.",
                      action: "Revoke",
                      danger: true,
                    })
                  )
                    act(() => api.workspace.revokeKey.mutate({ keyId: k.id }))
                }}
              >
                Revoke lk_••••{k.hint}
              </button>
            ))}
            <hr />
          </>
        ) : (
          menu?.m.role !== "owner" && (
            <button
              onClick={() => {
                const m = menu!.m
                setMenu(null)
                act(
                  () => api.workspace.makeOwner.mutate({ memberId: m.id }),
                  putMember
                )
              }}
            >
              Make owner
            </button>
          )
        )}
        <button
          className="danger"
          onClick={async () => {
            const m = menu!.m
            setMenu(null)
            if (
              !(await confirm({
                title: `Remove ${m.name}?`,
                body:
                  m.kind === "agent"
                    ? "Its keys stop working at once. Its name stays on old activity."
                    : "They lose access at once. Their name stays on old activity.",
                action: "Remove",
                danger: true,
              }))
            )
              return
            act(
              () => api.workspace.removeMember.mutate({ memberId: m.id }),
              () => putMember({ ...m, removed: true })
            )
          }}
        >
          Remove
        </button>
      </Menu>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
      <KeyDialog
        agent={fresh?.m ?? null}
        apiKey={fresh?.key ?? null}
        onClose={() => setFresh(null)}
      />
    </section>
  )
}

function PlanSection() {
  const d = useData()
  const [busy, setBusy] = useState(false)
  if (!d.billing.on) return null
  const b = d.billing
  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : ""
  if (!b.active) return <PlanCard back="/settings" />
  const rows: [string, number, number][] = [
    ["Projects", b.usage.projects, b.limits.projects],
    ["People", b.usage.people, b.limits.people],
    ["Agents", b.usage.agents, b.limits.agents],
  ]
  return (
    <section>
      <h4>Plan</h4>
      <div className="set-card">
        <div className="set-row">
          <div className="who">
            <div>Leanear Cloud, ${b.cents / 100} a month</div>
            <div className="sub">
              {b.status === "past_due"
                ? "The last payment didn't go through. Stripe will try again."
                : b.cancelsAtEnd
                  ? `Ends ${date(b.paidUntil)}`
                  : `Renews ${date(b.paidUntil)}`}
            </div>
          </div>
          <button
            className="btn sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                location.assign((await api.billing.portal.mutate()).url)
              } catch (e) {
                toast((e as Error).message)
                setBusy(false)
              }
            }}
          >
            Billing
          </button>
        </div>
        {rows.map(([label, n, max]) => (
          <div className="set-row" key={label}>
            <span className="lbl">{label}</span>
            <div className="meter">
              <i style={{ width: `${Math.min(100, (n / max) * 100)}%` }} />
            </div>
            <span className="role" style={{ width: 48, textAlign: "right" }}>
              {n} of {max}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function WorkspaceSection() {
  const d = useData()
  return (
    <section>
      <h4>Workspace</h4>
      <div className="set-card">
        <div className="set-row">
          <span className="lbl">Name</span>
          <Field
            label="Workspace name"
            value={d.workspace.name}
            onSave={async (name) =>
              setWorkspaceName(
                (await api.workspace.rename.mutate({ name })).name
              )
            }
          />
        </div>
      </div>
    </section>
  )
}
