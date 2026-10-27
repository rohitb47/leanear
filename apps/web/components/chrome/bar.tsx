"use client"

import { Mark } from "@shipthat/ui/mark"
import { motion } from "motion/react"
import { useState } from "react"
import { authClient } from "@/lib/auth/client"
import { hardGo, projectByKey, toast, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { href, useApp, type Tab } from "@/components/chrome/app"
import { Menu } from "@/components/chrome/menu"
import { Av } from "@/components/common/avatar"
import { I } from "@/components/common/icons"

const LABEL: Record<Tab, string> = {
  home: "Home",
  board: "Board",
  activity: "Activity",
  settings: "Settings",
  god: "God mode",
}
/**
 * The window's top bar: where you are (the workspace, or a project in it),
 * its tabs, search and you. Actions live where they act, not up here.
 */
export function Bar() {
  const d = useData()
  const app = useApp()
  const { route, go } = app
  const [menu, setMenu] = useState<null | {
    k: "proj" | "me"
    el: HTMLElement
  }>(null)
  if (!("view" in route) || route.view === "welcome" || route.view === "plan")
    return null
  const p = route.key ? projectByKey(d, route.key) : undefined
  const tab = route.view
  // A project has its board; the workspace has its home.
  const tabs = p
    ? (["board", "activity", "settings"] as const)
    : (["home", "activity", "settings"] as const)
  const me = d.members[d.me.memberId]
  const projects = Object.values(d.projects).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const toggle = (k: "proj" | "me") => (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    setMenu((m) => (m?.k === k ? null : { k, el }))
  }

  return (
    <header className="bar">
      <button className="proj" onClick={toggle("proj")} aria-label="Projects">
        <Mark size={18} />
        <span className="pname">{p?.name ?? d.workspace.name}</span>
        {p && <span className="keypill">{p.key}</span>}
        <span className="chev">{I.chev}</span>
      </button>

      <nav className="tabs" aria-label="Sections">
        {tabs.map((v) => {
          const r = { view: v, key: p?.key, task: route.task }
          return (
            <a
              key={v}
              href={href(r)}
              aria-current={tab === v ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return
                e.preventDefault()
                go(r)
              }}
            >
              {tab === v && (
                <motion.span layoutId="tab-pill" className="pill-bg" />
              )}
              <span>{LABEL[v]}</span>
            </a>
          )
        })}
      </nav>

      <div className="actions">
        <button
          className="icon hide-s"
          onClick={app.openPalette}
          aria-label="Search"
          title="Search  ⌘K"
        >
          {I.search}
        </button>
        <button className="me" onClick={toggle("me")} aria-label="You">
          <Av m={me} />
        </button>
      </div>

      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "proj"}
        onClose={() => setMenu(null)}
        width={240}
      >
        <button
          onClick={() => {
            setMenu(null)
            go({ view: "home" })
          }}
        >
          <Mark size={14} />
          <span>Home</span>
          {!p && <span className="check">{I.check}</span>}
        </button>
        <hr />
        {projects.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setMenu(null)
              // Same tab in the other project; from home, its board.
              go({
                view: p && tab !== "god" ? tab : "board",
                key: x.key,
              })
            }}
          >
            <span className="keypill">{x.key}</span>
            <span>{x.name}</span>
            {x.key === p?.key && <span className="check">{I.check}</span>}
          </button>
        ))}
        <hr />
        <button
          onClick={() => {
            setMenu(null)
            app.newProject()
          }}
        >
          {I.plus}
          New project
        </button>
        <button
          onClick={() => {
            setMenu(null)
            app.openSetup()
          }}
        >
          Bring a codebase
        </button>
      </Menu>

      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "me"}
        onClose={() => setMenu(null)}
        width={240}
        align="end"
      >
        <div className="head">
          <div style={{ color: "var(--ink)" }}>{d.me.name}</div>
          <div>{d.me.email}</div>
        </div>
        {d.workspaces.length > 1 && (
          <>
            <hr />
            {d.workspaces.map((w) => (
              <button
                key={w.id}
                onClick={async () => {
                  setMenu(null)
                  if (w.id === d.workspace.id) return
                  try {
                    await api.workspace.switch.mutate({ workspaceId: w.id })
                    hardGo("/")
                  } catch (e) {
                    toast((e as Error).message)
                  }
                }}
              >
                <span>{w.name}</span>
                {w.id === d.workspace.id && (
                  <span className="check">{I.check}</span>
                )}
              </button>
            ))}
          </>
        )}
        <hr />
        {d.god && (
          <button
            onClick={() => {
              setMenu(null)
              go({ view: "god" })
            }}
          >
            God mode
          </button>
        )}
        <a href="https://shipth.at/docs" target="_blank" rel="noreferrer">
          Docs
        </a>
        <button
          onClick={async () => {
            setMenu(null)
            await authClient.signOut()
            hardGo("/signin")
          }}
        >
          Sign out
        </button>
      </Menu>
    </header>
  )
}
