"use client";

import { useCallback, useEffect, useState } from "react";
import type { Member, Project, SettingsData } from "@/lib/types";
import { keyFor } from "@/lib/key";
import { rpc } from "./api";
import { useApp } from "./App";
import { authClient } from "./authClient";
import { Connect } from "./Connect";
import { hardGo, liveMembers, putMember, putProject, setWorkspaceName, toast, useData } from "./store";
import { Av, ago, copy } from "./ui";

/** Projects, people, agents and their keys, appearance. That's everything. */
export function Settings() {
  const d = useData();
  const { theme, setTheme } = useApp();
  const [data, setData] = useState<SettingsData | null>(null);
  const reload = useCallback(() => {
    rpc<SettingsData>("settingsData")
      .then(setData)
      .catch((e) => toast(e.message));
  }, []);
  useEffect(reload, [reload]);
  const owner = d.me.role === "owner";
  const people = liveMembers(d).filter((m) => m.kind === "person");
  const agents = liveMembers(d).filter((m) => m.kind === "agent");

  const act = async <T,>(op: string, args: Record<string, unknown>, done?: (r: T) => void) => {
    try {
      const r = await rpc<T>(op, args);
      done?.(r);
      reload();
      return r;
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <>
      <div className="titlerow">
        <h1>Settings</h1>
        <span className="mono">{d.workspace.name}</span>
      </div>
      <div className="pad">
        <Members people={people} owner={owner} data={data} act={act} />
        <Agents agents={agents} data={data} act={act} />
        <Projects act={act} />
        <Workspace />
        <section>
          <div className="sechead">
            <span>Appearance</span>
          </div>
          <div className="row">
            <div className="grow">Theme</div>
            <div className="seg" role="group" aria-label="Theme">
              {(["system", "light", "dark"] as const).map((v) => (
                <button key={v} aria-pressed={theme === v} onClick={() => setTheme(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section>
          <div className="sechead">
            <span>You</span>
          </div>
          <div className="row">
            <Av m={d.members[d.me.memberId]} lg />
            <div className="grow">
              <div>{d.me.name}</div>
              <div className="small">{d.me.email ?? "No email"}</div>
            </div>
            <button
              className="btn"
              onClick={async () => {
                await authClient.signOut();
                hardGo("/signin");
              }}
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

type Act = <T>(op: string, args: Record<string, unknown>, done?: (r: T) => void) => Promise<T | undefined>;

function Members({ people, owner, data, act }: { people: Member[]; owner: boolean; data: SettingsData | null; act: Act }) {
  const d = useData();
  const link = (token: string) => `${location.origin}/join/${token}`;
  return (
    <section>
      <div className="sechead">
        <span>Members</span>
        {owner && (
          <button
            className="btn bare"
            onClick={() =>
              act<{ token: string }>("createInvite", {}, async (r) => {
                toast((await copy(link(r.token))) ? "Invite link copied. It works for 7 days." : "Invite link created below");
              })
            }
          >
            Invite someone
          </button>
        )}
      </div>
      {people.map((m) => (
        <div className="row" key={m.id}>
          <Av m={m} lg />
          <div className="grow">
            <div>
              {m.name}
              {m.id === d.me.memberId && <span className="muted"> (you)</span>}
            </div>
          </div>
          <span className="pill">{m.role === "owner" ? "Owner" : "Member"}</span>
          {owner && m.id !== d.me.memberId && (
            <span className="acts">
              {m.role !== "owner" && (
                <button className="btn sm" onClick={() => act<Member>("makeOwner", { memberId: m.id }, putMember)}>
                  Make owner
                </button>
              )}
              <button
                className="btn sm danger"
                onClick={() => confirm(`Remove ${m.name} from this workspace?`) && act("removeMember", { memberId: m.id }, () => putMember({ ...m, removed: true }))}
              >
                Remove
              </button>
            </span>
          )}
        </div>
      ))}
      {owner &&
        data?.invites.map((i) => (
          <div className="row" key={i.id}>
            <span className="av none lg">+</span>
            <div className="grow">
              <div className="mono" style={{ color: "var(--ink)", wordBreak: "break-all" }}>
                {link(i.token)}
              </div>
              <div className="small">Invite link · works until {new Date(i.expiresAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
            </div>
            <span className="acts">
              <button className="btn sm" onClick={async () => toast((await copy(link(i.token))) ? "Copied" : "Select the link to copy it")}>
                Copy
              </button>
              <button className="btn sm" onClick={() => act("revokeInvite", { inviteId: i.id })}>
                Revoke
              </button>
            </span>
          </div>
        ))}
    </section>
  );
}

function Agents({ agents, data, act }: { agents: Member[]; data: SettingsData | null; act: Act }) {
  const d = useData();
  const [adding, setAdding] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ memberId: string; key: string } | null>(null);
  return (
    <section>
      <div className="sechead">
        <span>Agents</span>
        <button className="btn bare" onClick={() => setAdding(agents.length ? "" : "Claude")}>
          Add an agent
        </button>
      </div>
      {adding !== null && (
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            await act<{ member: Member; key: string }>("addAgent", { name: adding }, (r) => {
              putMember(r.member);
              setFresh({ memberId: r.member.id, key: r.key });
              setAdding(null);
            });
          }}
        >
          <input className="field" autoFocus placeholder="Name, like Claude or Codex" value={adding} onChange={(e) => setAdding(e.target.value)} maxLength={40} />
          <button className="btn primary sm" type="submit">
            Add
          </button>
          <button className="btn bare sm" type="button" onClick={() => setAdding(null)}>
            Cancel
          </button>
        </form>
      )}
      {!agents.length && adding === null && <div className="row muted">No agents yet. Add one and paste a line into Claude Code, Codex or Cursor.</div>}
      {agents.map((m) => {
        const keys = data?.keys.filter((k) => k.memberId === m.id) ?? [];
        return (
          <div key={m.id}>
            <div className="row">
              <Av m={m} lg />
              <div className="grow">
                <div>{m.name}</div>
                <div className="small">
                  {keys.length ? (
                    keys.map((k, i) => (
                      <span key={k.id}>
                        {i > 0 && " · "}
                        <span className="mono">lk_••••{k.hint}</span> {k.lastUsedAt ? `used ${ago(k.lastUsedAt)} ago`.replace("now ago", "just now") : "never used"}{" "}
                        <button className="mono" style={{ textDecoration: "underline" }} onClick={() => confirm(`Revoke this key for ${m.name}? Anything using it stops at once.`) && act("revokeKey", { keyId: k.id })}>
                          revoke
                        </button>
                      </span>
                    ))
                  ) : (
                    "No keys"
                  )}
                </div>
              </div>
              <span className="acts">
                <button className="btn sm" onClick={() => act<{ key: string }>("newKey", { memberId: m.id }, (r) => setFresh({ memberId: m.id, key: r.key }))}>
                  New key
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => confirm(`Remove ${m.name}? Its keys stop working.`) && act("removeMember", { memberId: m.id }, () => putMember({ ...m, removed: true }))}
                >
                  Remove
                </button>
              </span>
            </div>
            {fresh?.memberId === m.id && (
              <div className="formcard" style={{ margin: "12px 0" }}>
                <div>
                  <b>Here&apos;s {m.name}&apos;s key.</b> <span className="muted">It won&apos;t be shown again. Paste this where your agent runs:</span>
                </div>
                <Connect url={d.mcpUrl} apiKey={fresh.key} />
                <button className="btn bare sm" style={{ alignSelf: "flex-end" }} onClick={() => setFresh(null)}>
                  Done
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Projects({ act }: { act: Act }) {
  const d = useData();
  const { go } = useApp();
  const [adding, setAdding] = useState<{ name: string; key: string; touched: boolean } | null>(null);
  const [edit, setEdit] = useState<{ id: string; name: string; key: string } | null>(null);
  const projects = Object.values(d.projects);
  const counts = (p: Project) => Object.values(d.tasks).filter((t) => t.projectId === p.id).length;
  return (
    <section>
      <div className="sechead">
        <span>Projects</span>
        <button className="btn bare" onClick={() => setAdding({ name: "", key: "", touched: false })}>
          New project
        </button>
      </div>
      {adding && (
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            await act<Project>("createProject", { name: adding.name, key: adding.key || keyFor(adding.name) }, (p) => {
              putProject(p);
              setAdding(null);
              go({ view: "board", key: p.key });
            });
          }}
        >
          <input
            className="field keyin"
            value={adding.key || keyFor(adding.name || "")}
            onChange={(e) => setAdding({ ...adding, key: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5), touched: true })}
            aria-label="Key"
          />
          <input
            className="field"
            autoFocus
            placeholder="Project name"
            value={adding.name}
            onChange={(e) => setAdding({ ...adding, name: e.target.value, key: adding.touched ? adding.key : "" })}
            maxLength={60}
          />
          <button className="btn primary sm" type="submit" disabled={!adding.name.trim()}>
            Create
          </button>
          <button className="btn bare sm" type="button" onClick={() => setAdding(null)}>
            Cancel
          </button>
        </form>
      )}
      {projects.map((p) =>
        edit?.id === p.id ? (
          <form
            key={p.id}
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              await act<Project>("updateProject", { project: p.id, name: edit.name, key: edit.key }, (r) => {
                putProject(r);
                setEdit(null);
              });
            }}
          >
            <input
              className="field keyin"
              value={edit.key}
              disabled={counts(p) > 0}
              title={counts(p) > 0 ? "The key is fixed once a project has tasks" : undefined}
              onChange={(e) => setEdit({ ...edit, key: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) })}
              aria-label="Key"
            />
            <input className="field" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={60} />
            <button className="btn primary sm" type="submit">
              Save
            </button>
            <button className="btn bare sm" type="button" onClick={() => setEdit(null)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="row" key={p.id}>
            <span className="cid" style={{ width: 48, flex: "none" }}>
              {p.key}
            </span>
            <div className="grow">{p.name}</div>
            <span className="small">
              {counts(p)} {counts(p) === 1 ? "task" : "tasks"}
            </span>
            <span className="acts">
              <button className="btn sm" onClick={() => setEdit({ id: p.id, name: p.name, key: p.key })}>
                Rename
              </button>
              {counts(p) === 0 && (
                <button
                  className="btn sm danger"
                  onClick={() => confirm(`Delete ${p.name}?`) && act("deleteProject", { project: p.id }, () => putProject({ ...p, deleted: true }))}
                >
                  Delete
                </button>
              )}
            </span>
          </div>
        ),
      )}
    </section>
  );
}

function Workspace() {
  const d = useData();
  const [name, setName] = useState<string | null>(null);
  return (
    <section>
      <div className="sechead">
        <span>Workspace</span>
      </div>
      {name === null ? (
        <div className="row">
          <div className="grow">{d.workspace.name}</div>
          <button className="btn sm" onClick={() => setName(d.workspace.name)}>
            Rename
          </button>
        </div>
      ) : (
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await rpc<{ name: string }>("renameWorkspace", { name });
              setWorkspaceName(r.name);
              setName(null);
            } catch (x) {
              toast((x as Error).message);
            }
          }}
        >
          <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn primary sm">Save</button>
          <button className="btn bare sm" type="button" onClick={() => setName(null)}>
            Cancel
          </button>
        </form>
      )}
      {d.workspaces.length > 1 &&
        d.workspaces
          .filter((w) => w.id !== d.workspace.id)
          .map((w) => (
            <div className="row" key={w.id}>
              <div className="grow">{w.name}</div>
              <button
                className="btn sm"
                onClick={async () => {
                  try {
                    await rpc("switchWorkspace", { workspaceId: w.id });
                    hardGo("/");
                  } catch (x) {
                    toast((x as Error).message);
                  }
                }}
              >
                Switch
              </button>
            </div>
          ))}
    </section>
  );
}
