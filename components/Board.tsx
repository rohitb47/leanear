"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mark } from "./Mark";
import { Logo } from "./Logos";
import { Morph } from "./Morph";
import { project, set, shift, spring } from "@/lib/spring";

type Status = "backlog" | "todo" | "doing" | "done";
type Task = { id: string; title: string; type: "Bug" | "Feature" | "Idea"; status: Status; who: "rohit" | "claude" };

const COLS: { key: Status; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

// Leanear is built in Leanear, so the board shows its own tasks.
const START: Task[] = [
  { id: "LEA-21", title: "Paste screenshots into notes", type: "Feature", status: "backlog", who: "rohit" },
  { id: "LEA-24", title: "Docker compose for self-hosting", type: "Feature", status: "backlog", who: "claude" },
  { id: "LEA-26", title: "Public changelog from Done tasks", type: "Idea", status: "backlog", who: "rohit" },
  { id: "LEA-12", title: "Agent keys, hashed and revocable", type: "Feature", status: "todo", who: "claude" },
  { id: "LEA-17", title: "J and K skip the Done column", type: "Bug", status: "todo", who: "claude" },
  { id: "LEA-19", title: "⌘K finds tasks by id", type: "Feature", status: "todo", who: "rohit" },
  { id: "LEA-9", title: "MCP server: next_task", type: "Feature", status: "doing", who: "claude" },
  { id: "LEA-14", title: "Drag to reorder, with momentum", type: "Feature", status: "doing", who: "rohit" },
  { id: "LEA-3", title: "Dark mode, the Apple way", type: "Feature", status: "done", who: "rohit" },
  { id: "LEA-5", title: "Board loads in one request", type: "Feature", status: "done", who: "claude" },
];

function Avatar({ who, live }: { who: Task["who"]; live?: boolean }) {
  if (who === "rohit")
    return (
      <span className="av" title="Rohit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rohit.png" alt="" width={20} height={20} draggable={false} />
      </span>
    );
  return (
    <span className={`av agent ${live ? "live" : ""}`} title="Claude">
      <Logo k="claude" size={11} />
    </span>
  );
}

type Drag = {
  id: string;
  ghost: HTMLElement;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  hist: { t: number; x: number; y: number }[];
  landing: boolean;
};

export function Board() {
  const [tasks, setTasks] = useState(START);
  const [dragId, setDragId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [feed, setFeed] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const drag = useRef<Drag | null>(null);
  const tasksRef = useRef(tasks);

  // FLIP: remember where every row is, change the order, then spring each
  // row from its old place to its new one.
  const snapshot = () => {
    const m = new Map<string, DOMRect>();
    boardRef.current?.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => m.set(el.dataset.id!, el.getBoundingClientRect()));
    before.current = m;
  };
  const update = useCallback((fn: (t: Task[]) => Task[]) => {
    snapshot();
    setTasks(fn);
  }, []);

  useLayoutEffect(() => {
    tasksRef.current = tasks;
    const old = before.current;
    before.current = null;
    if (!old) return;
    boardRef.current?.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
      const a = old.get(el.dataset.id!);
      if (!a) return;
      const b = el.getBoundingClientRect();
      const d = { x: a.left - b.left, y: a.top - b.top };
      if (Math.abs(d.x) < 0.5 && Math.abs(d.y) < 0.5) return;
      shift(el, d);
      spring(el, {}, { z: 0.86, r: 0.42 });
    });
    // A drop: send the ghost to the slot it now belongs to.
    const g = drag.current;
    if (g?.landing) {
      const slot = boardRef.current?.querySelector<HTMLElement>(`[data-id="${g.id}"]`);
      if (!slot) return;
      const r = slot.getBoundingClientRect();
      const v = velocity(g.hist);
      spring(
        g.ghost,
        { x: r.left - g.x0, y: r.top - g.y0, s: 1 },
        {
          z: 0.8,
          r: 0.4,
          v: { x: v.x, y: v.y },
          keep: true,
          onRest: () => {
            g.ghost.remove();
            drag.current = null;
            setDragId(null);
          },
        },
      );
    }
  }, [tasks]);

  // Where would a point drop? Column by x, place by row centres.
  const slotAt = (px: number, py: number, id: string): { status: Status; index: number } | null => {
    const board = boardRef.current;
    if (!board) return null;
    const cols = [...board.querySelectorAll<HTMLElement>("[data-col]")];
    let col = cols[0];
    for (const c of cols) {
      const r = c.getBoundingClientRect();
      if (px >= r.left) col = c;
    }
    const status = col.dataset.col as Status;
    const rows = [...col.querySelectorAll<HTMLElement>("[data-id]")].filter((r) => r.dataset.id !== id);
    let index = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (py < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    return { status, index };
  };

  const moveTo = (id: string, status: Status, index: number) => {
    const list = tasksRef.current;
    const t = list.find((x) => x.id === id);
    if (!t) return;
    const rest = list.filter((x) => x.id !== id);
    const inCol = rest.filter((x) => x.status === status);
    const cur = list.filter((x) => x.status === status).indexOf(t);
    if (t.status === status && cur === index) return;
    const anchor = inCol[index];
    const moved = { ...t, status };
    const at = anchor ? rest.indexOf(anchor) : rest.length;
    const next = [...rest.slice(0, at), moved, ...rest.slice(at)];
    update(() => next);
  };

  // Pointer handling: mouse lifts after a small move, touch after a long press.
  const onPointerDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0 || drag.current) return;
    const row = e.currentTarget;
    const sx = e.clientX;
    const sy = e.clientY;
    const touch = e.pointerType !== "mouse";
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = (x: number, y: number) => {
      started = true;
      row.classList.remove("press");
      const r = row.getBoundingClientRect();
      const ghost = row.cloneNode(true) as HTMLElement;
      ghost.classList.add("lifted");
      ghost.removeAttribute("data-id");
      Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      document.body.appendChild(ghost);
      drag.current = { id, ghost, x0: r.left, y0: r.top, dx: x - r.left, dy: y - r.top, hist: [{ t: performance.now(), x, y }], landing: false };
      spring(ghost, { s: 1.035 }, { z: 0.7, r: 0.3, keep: true });
      setDragId(id);
      document.documentElement.style.cursor = "grabbing";
    };

    const move = (ev: PointerEvent) => {
      if (!started) {
        const far = Math.hypot(ev.clientX - sx, ev.clientY - sy);
        if (touch) {
          if (far > 8) cleanup();
          return;
        }
        if (far < 4) return;
        start(ev.clientX, ev.clientY);
      }
      const g = drag.current;
      if (!g || g.landing) return;
      const now = performance.now();
      g.hist.push({ t: now, x: ev.clientX, y: ev.clientY });
      while (g.hist.length > 2 && now - g.hist[0].t > 100) g.hist.shift();
      const s = { s: 1.035 };
      set(g.ghost, { x: ev.clientX - g.dx - g.x0, y: ev.clientY - g.dy - g.y0, ...s });
      const slot = slotAt(ev.clientX, ev.clientY, id);
      if (slot) moveTo(id, slot.status, slot.index);
    };

    const up = (ev: PointerEvent) => {
      const g = drag.current;
      cleanup();
      if (!started || !g) return;
      // Project the throw: a flick carries on to where it was heading.
      const v = velocity(g.hist);
      const px = ev.clientX + project(v.x);
      const py = ev.clientY + project(v.y);
      const br = boardRef.current!.getBoundingClientRect();
      const slot = slotAt(Math.min(Math.max(px, br.left + 1), br.right - 1), py, id);
      g.landing = true;
      document.documentElement.style.cursor = "";
      snapshot();
      if (slot) moveTo(id, slot.status, slot.index);
      // Force the layout effect even when the order is unchanged.
      setTasks((t) => [...t]);
    };

    const block = (ev: TouchEvent) => {
      if (started) ev.preventDefault();
    };

    const cleanup = () => {
      clearTimeout(timer);
      row.classList.remove("press");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.removeEventListener("touchmove", block);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    if (touch) {
      document.addEventListener("touchmove", block, { passive: false });
      row.classList.add("press");
      timer = setTimeout(() => start(sx, sy), 280);
    }
  };

  // The agent run: Claude takes its top Todo task, works on it, ships it.
  useEffect(() => {
    let visible = false;
    let t: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 });
    if (frameRef.current) io.observe(frameRef.current);

    const run = (step: number) => {
      const wait = (ms: number, next: number) => (t = setTimeout(() => run(next), ms));
      if (!visible || drag.current) return wait(1200, step);
      const list = tasksRef.current;
      if (step === 0) {
        const pick = list.find((x) => x.status === "todo" && x.who === "claude");
        if (!pick) {
          setFeed(null);
          update(() => START);
          return wait(3600, 0);
        }
        moveTop(pick.id, "doing");
        setLiveId(pick.id);
        setFeed(`Claude picked up ${pick.id}`);
        return wait(3400, 1);
      }
      const id = list.find((x) => x.status === "doing" && x.who === "claude" && x.id !== "LEA-9")?.id;
      if (id) {
        moveTop(id, "done");
        setFeed(`Claude moved ${id} to Done`);
      }
      setLiveId(null);
      return wait(4200, 0);
    };

    const moveTop = (id: string, status: Status) =>
      update((list) => {
        const t = list.find((x) => x.id === id)!;
        const rest = list.filter((x) => x.id !== id);
        const at = rest.findIndex((x) => x.status === status);
        const moved = { ...t, status };
        return at < 0 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)];
      });

    t = setTimeout(() => run(0), 2200);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, [update]);

  // The activity pill rises in the first time and leaves the way it came.
  const shown = useRef(false);
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    if (feed && !shown.current) {
      shown.current = true;
      set(el, { y: 16, s: 0.96, o: 0, b: 4 });
      spring(el, {}, { z: 0.9, r: 0.45 });
    } else if (!feed && shown.current) {
      shown.current = false;
      spring(el, { y: 16, s: 0.96, o: 0, b: 4 }, { z: 1, r: 0.35, keep: true });
    }
  }, [feed]);

  return (
    <div className="frame" ref={frameRef}>
      <div className="bar">
        <div className="proj">
          <Mark size={18} />
          Leanear
          <span className="mono">LEA</span>
        </div>
        <div className="tabs" aria-hidden="true">
          <span className="on">Board</span>
          <span>List</span>
          <span>My tasks</span>
          <span>Brief</span>
        </div>
        <div className="tools">
          <span className="kbd">⌘K</span>
          <span className="kbd">C</span>
        </div>
      </div>
      <div className="board" ref={boardRef}>
        {COLS.map((c) => {
          const rows = tasks.filter((t) => t.status === c.key);
          return (
            <div className="col" key={c.key} data-col={c.key}>
              <div className="colhead">
                {c.label}
                <span className="n">
                  <Morph value={String(rows.length)} />
                </span>
              </div>
              <div className="rows">
                {rows.map((t) => (
                  <div
                    key={t.id}
                    data-id={t.id}
                    className={`row ${t.status === "done" ? "done" : ""} ${dragId === t.id ? "slot" : ""}`}
                    onPointerDown={(e) => onPointerDown(e, t.id)}
                  >
                    <div className="r1">
                      <span className="cid">{t.id}</span>
                      <span className="type">{t.type}</span>
                      <Avatar who={t.who} live={liveId === t.id || (t.id === "LEA-9" && t.status === "doing")} />
                    </div>
                    <div className="t">{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="feed" ref={feedRef} style={{ opacity: 0 }} aria-live="polite">
        <Avatar who="claude" />
        <Morph value={feed ?? ""} />
      </div>
    </div>
  );
}

function velocity(h: { t: number; x: number; y: number }[]) {
  if (h.length < 2) return { x: 0, y: 0 };
  const a = h[0];
  const b = h[h.length - 1];
  const dt = (b.t - a.t) / 1000;
  if (dt <= 0 || performance.now() - b.t > 80) return { x: 0, y: 0 };
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
}
