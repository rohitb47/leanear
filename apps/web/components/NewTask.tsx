"use client";

import { useLayoutEffect, useState } from "react";
import { STATUS_NAME, TYPES, TYPE_NAME, type Status, type Task, type TaskType } from "@/lib/types";
import { rpc, upload } from "./api";
import { useApp } from "./App";
import { I } from "./icons";
import { usePresence } from "./motion";
import { liveMembers, projectByKey, putTask, toast, useData } from "./store";
import { Av, StatusDot } from "./ui";

type State = { status: Status; origin: { x: number; y: number } | null } | null;

/** New task. The dialog grows out of whatever opened it. */
export function NewTask({ state, onClose }: { state: State; onClose: () => void }) {
  const open = !!state;
  const { mounted, ref, closing } = usePresence<HTMLFormElement>(open, { s: 0.9, o: 0, b: 6 }, { s: 0.94, o: 0, b: 4 }, 0.34, 0.26);
  // Keep showing what opened it while it springs away.
  const [kept, setKept] = useState(state);
  if (state && state !== kept) setKept(state);
  if (!mounted || !kept) return null;
  return <Dialog state={kept} formRef={ref} closing={closing} onClose={onClose} />;
}

function Dialog({ state, formRef, closing, onClose }: { state: NonNullable<State>; formRef: React.RefObject<HTMLFormElement | null>; closing: boolean; onClose: () => void }) {
  const d = useData();
  const { project } = useApp();
  const p = project ? projectByKey(d, project) : undefined;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<TaskType>("feature");
  const [who, setWho] = useState<string | null>(d.me.memberId);
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const people = liveMembers(d)
    .sort((a, b) => (a.id === d.me.memberId ? -1 : b.id === d.me.memberId ? 1 : a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "person" ? -1 : 1))
    .slice(0, 4);

  useLayoutEffect(() => {
    const el = formRef.current;
    if (!el || !state.origin) return;
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${(state.origin.x - r.left).toFixed(1)}px ${(state.origin.y - r.top).toFixed(1)}px`;
  }, [formRef, state.origin]);

  const onPaste = async (e: React.ClipboardEvent) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    e.preventDefault();
    try {
      const path = await upload(file);
      setShots((s) => [...s, path]);
    } catch (x) {
      toast((x as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p || busy) return;
    if (!title.trim()) {
      setErr("Give it a title first");
      return;
    }
    setBusy(true);
    try {
      const body = [notes.trim(), ...shots.map((s) => `![screenshot](${s})`)].filter(Boolean).join("\n\n");
      const t = await rpc<Task & { ref: string }>("createTask", {
        project: p.id,
        title,
        notes: body,
        type,
        status: state.status,
        assignee: who ?? "none",
      });
      putTask(t);
      onClose();
      toast(`Created ${t.ref}`);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`overlay${closing ? " closing" : ""}`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog" ref={formRef} role="dialog" aria-label="New task" onSubmit={submit} onPaste={onPaste}>
        <div className="dh">
          <span className="pill">
            <StatusDot s={state.status} />
            {STATUS_NAME[state.status]}
          </span>
          <span className="mono">
            {p?.key}-{(Object.values(d.tasks).filter((t) => t.projectId === p?.id).reduce((m, t) => Math.max(m, t.number), 0) || 0) + 1}
          </span>
        </div>
        <div className="db">
          <input
            className="bigin"
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErr(null);
            }}
            placeholder="What needs doing?"
            maxLength={200}
            autoComplete="off"
          />
          <textarea
            className="field"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.currentTarget.form?.requestSubmit()}
            placeholder="Notes, steps to reproduce, anything useful"
          />
          <div className="paste">
            {shots.length ? (
              // eslint-disable-next-line @next/next/no-img-element
              shots.map((s) => <img key={s} src={s} alt="Pasted screenshot" />)
            ) : (
              <>
                {I.image}
                <span>Paste a screenshot here with ⌘V</span>
              </>
            )}
          </div>
          {err && <div className="err">{err}</div>}
        </div>
        <div className="df">
          <div className="seg" role="group" aria-label="Type">
            {TYPES.map((v) => (
              <button type="button" key={v} aria-pressed={type === v} onClick={() => setType(v)}>
                {TYPE_NAME[v]}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Assignee">
            {people.map((m) => (
              <button type="button" key={m.id} aria-pressed={who === m.id} onClick={() => setWho(m.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Av m={m} />
                {m.id === d.me.memberId ? "Me" : m.name}
              </button>
            ))}
            <button type="button" aria-pressed={who === null} onClick={() => setWho(null)}>
              No one
            </button>
          </div>
          <div className="grow" />
          <button className="btn primary" type="submit" disabled={busy}>
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
