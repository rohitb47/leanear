"use client"

import { refOf, useData } from "@/lib/store/store"
import { useApp } from "@/components/chrome/app"
import { Av, StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { isLive } from "@/components/board/board"

/**
 * Home, above every project: the projects, and what's on your plate and your
 * agents' across them. Two lists, nothing else.
 */
export function Home() {
  const d = useData()
  const { go, openTask, newProject } = useApp()
  const projects = Object.values(d.projects).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  // Only open projects' tasks: an archived project is out of the way.
  const tasks = Object.values(d.tasks).filter((t) => d.projects[t.projectId])
  // Yours and your agents': Doing first, then Todo, each in board order.
  const plate = tasks
    .filter(
      (t) =>
        (t.status === "doing" || t.status === "todo") &&
        t.assigneeId &&
        (t.assigneeId === d.me.memberId ||
          d.members[t.assigneeId]?.kind === "agent")
    )
    .sort(
      (a, b) =>
        Number(a.status === "todo") - Number(b.status === "todo") ||
        a.position - b.position
    )

  return (
    <div className="set">
      <div className="set-col">
        <section>
          <h4>Projects</h4>
          <div className="set-card">
            {projects.map((p) => {
              const mine = tasks.filter((t) => t.projectId === p.id)
              const open = mine.filter(
                (t) => t.status !== "done" && t.status !== "canceled"
              ).length
              // Whoever has something in Doing here, once each.
              const doing = [
                ...new Set(
                  mine
                    .filter((t) => t.status === "doing" && t.assigneeId)
                    .map((t) => t.assigneeId!)
                ),
              ]
              return (
                <button
                  key={p.id}
                  className="set-row line"
                  onClick={() => go({ view: "board", key: p.key })}
                >
                  <span className="keypill">{p.key}</span>
                  <div className="who">
                    <div>{p.name}</div>
                  </div>
                  <span className="faces">
                    {doing.map((id) => (
                      <Av
                        key={id}
                        m={d.members[id]}
                        live={d.members[id]?.kind === "agent"}
                      />
                    ))}
                  </span>
                  <span className="role">{open} open</span>
                </button>
              )
            })}
            <button className="set-row add" onClick={newProject}>
              <span className="plus">{I.plus}</span>
              New project
            </button>
          </div>
        </section>

        <section>
          <h4>
            On your plate <span className="n">{plate.length}</span>
          </h4>
          {plate.length ? (
            <div className="set-card">
              {plate.map((t) => (
                <button
                  key={t.id}
                  className="set-row line"
                  onClick={() => openTask(refOf(d, t))}
                >
                  <StatusIcon s={t.status} />
                  <span className="cid" style={{ width: 64, flex: "none" }}>
                    {refOf(d, t)}
                  </span>
                  <div className="who">
                    <div>{t.title}</div>
                  </div>
                  <Av
                    m={t.assigneeId ? d.members[t.assigneeId] : null}
                    live={isLive(d, t)}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="set-note">
              Nothing in Todo or Doing for you or your agents.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
