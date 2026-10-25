"use client";

import { current, project as throwTo, set, spring } from "@leanear/ui/spring";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STATUSES, STATUS_NAME, TYPE_NAME, type Status, type Task } from "@/lib/types";
import { patch } from "./api";
import { useApp } from "./App";
import { I } from "./icons";
import { useFlip, velocity } from "./motion";
import { projectByKey, refOf, useData, type Data } from "./store";
import { Av, StatusDot, count } from "./ui";

type DragState = { id: string; col: Status; index: number; drop?: boolean };

type G = {
  id: string;
  el: HTMLElement;
  sx: number;
  sy: number;
  x: number;
  y: number;
  touch: boolean;
  started: boolean;
  hist: [number, number, number][];
  timer?: number;
  raf?: number;
  base?: { left: number; top: number; width: number };
  origin?: { col: Status; index: number };
  vx?: number;
  vy?: number;
};

const sortCol = (a: Task, b: Task) => a.position - b.position || b.number - a.number;

/** Position for a task dropped at index in a column (the column excludes it). */
function between(list: Task[], index: number) {
  const before = list[index - 1]?.position;
  const after = list[index]?.position;
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

export const isLive = (d: Data, t: Task) => t.status === "doing" && !!t.assigneeId && d.members[t.assigneeId]?.kind === "agent";

export function Card({ t, d, selected, slot }: { t: Task; d: Data; selected?: boolean; slot?: boolean }) {
  return (
    <button
      className={`card${selected ? " selected" : ""}${isLive(d, t) ? " live" : ""}${slot ? " slot" : ""}`}
      data-task={t.id}
      data-flip={t.id}
    >
      <CardBody t={t} d={d} />
    </button>
  );
}

function CardBody({ t, d }: { t: Task; d: Data }) {
  return (
    <>
      <span className="r1">
        <span className="cid">{refOf(d, t)}</span>
        <span className="type">{TYPE_NAME[t.type]}</span>
        <span className="grow" />
        <Av m={t.assigneeId ? d.members[t.assigneeId] : null} />
      </span>
      <span className="t">{t.title}</span>
    </>
  );
}

export function Board({ projectKey, openId }: { projectKey: string; openId: string | null }) {
  const d = useData();
  const { openTask, openNew, go } = useApp();
  const p = projectByKey(d, projectKey)!;
  const all = Object.values(d.tasks).filter((t) => t.projectId === p.id && t.status !== "canceled");
  const cols = Object.fromEntries(STATUSES.map((s) => [s, all.filter((t) => t.status === s).sort(sortCol)])) as Record<Status, Task[]>;

  const [drag, setDrag] = useState<DragState | null>(null);
  const [base, setBase] = useState<{ left: number; top: number; width: number } | null>(null);
  const dragRef = useRef(drag);
  const g = useRef<G | null>(null);
  const suppress = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const ghostCard = useRef<HTMLDivElement>(null);

  // Tasks that were here when the board opened don't rise in; new ones do.
  const [seen] = useState(() => new Set(Object.keys(d.tasks)));
  useFlip(root, (id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const dragged = drag ? d.tasks[drag.id] : undefined;
  const listFor = (s: Status) => {
    const list = cols[s].filter((t) => t.id !== drag?.id);
    if (drag && dragged && drag.col === s) list.splice(drag.index, 0, dragged);
    return list;
  };

  /* ───────── Drag: lift, follow 1:1, throw, land ───────── */

  function place(x: number, y: number): DragState | null {
    const cur = dragRef.current;
    const el = root.current;
    if (!cur || !el) return null;
    const colEls = [...el.querySelectorAll<HTMLElement>(".col")];
    let col = colEls.find((c) => {
      const r = c.getBoundingClientRect();
      return x >= r.left && x < r.right;
    });
    if (!col) col = x < colEls[0].getBoundingClientRect().left ? colEls[0] : colEls[colEls.length - 1];
    const cards = [...col.querySelectorAll<HTMLElement>(".card:not(.slot)")];
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const top = r.top - current(cards[i]).y;
      if (y < top + cards[i].offsetHeight / 2) {
        index = i;
        break;
      }
    }
    const next = { id: cur.id, col: col.dataset.col as Status, index };
    if (next.col !== cur.col || next.index !== cur.index) {
      dragRef.current = next;
      setDrag(next);
    }
    return next;
  }

  function begin() {
    const s = g.current!;
    s.started = true;
    suppress.current = true;
    s.el.classList.remove("pressing");
    const r = s.el.getBoundingClientRect();
    s.base = { left: r.left, top: r.top, width: r.width };
    const t = d.tasks[s.id];
    const index = cols[t.status].findIndex((x) => x.id === s.id);
    setBase(s.base);
    s.origin = { col: t.status, index };
    const next = { id: s.id, col: t.status, index };
    dragRef.current = next;
    setDrag(next);
    document.documentElement.classList.add("dragging");
    try {
      if (s.touch) navigator.vibrate?.(6);
    } catch {}
    const scroll = () => {
      const s2 = g.current;
      if (!s2?.started) return;
      const sc = root.current?.parentElement;
      const ct = root.current?.closest(".content") as HTMLElement | null;
      let moved = false;
      if (sc) {
        const r2 = sc.getBoundingClientRect();
        const edge = 56;
        let v = 0;
        if (s2.x < r2.left + edge) v = -(r2.left + edge - s2.x) / edge;
        else if (s2.x > r2.right - edge) v = (s2.x - (r2.right - edge)) / edge;
        if (v) {
          sc.scrollLeft += v * 14;
          moved = true;
        }
      }
      if (ct) {
        const r2 = ct.getBoundingClientRect();
        let v = 0;
        if (s2.y < r2.top + 32) v = -(r2.top + 32 - s2.y) / 32;
        else if (s2.y > r2.bottom - 40) v = (s2.y - (r2.bottom - 40)) / 40;
        if (v) {
          ct.scrollTop += v * 10;
          moved = true;
        }
      }
      if (moved) place(s2.x, s2.y);
      s2.raf = requestAnimationFrame(scroll);
    };
    s.raf = requestAnimationFrame(scroll);
  }

  function end(cancel: boolean) {
    const s = g.current;
    if (!s) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    const { vx, vy } = velocity(s.hist);
    s.vx = cancel ? 0 : vx;
    s.vy = cancel ? 0 : vy;
    let final: DragState | null;
    if (cancel) {
      final = { id: s.id, ...s.origin! };
    } else {
      // A throw lands where it was heading, not where the finger let go.
      const sc = root.current!.parentElement!.getBoundingClientRect();
      const px = Math.max(sc.left + 4, Math.min(sc.right - 4, s.x + throwTo(vx)));
      final = place(px, s.y + throwTo(vy) * 0.5) ?? dragRef.current;
    }
    s.started = false;
    const next = { ...final!, drop: true };
    dragRef.current = next;
    setDrag(next);
  }

  function commit() {
    const s = g.current;
    const fin = dragRef.current;
    g.current = null;
    dragRef.current = null;
    document.documentElement.classList.remove("dragging");
    if (!s || !fin) {
      setDrag(null);
      return;
    }
    const t = d.tasks[fin.id];
    const moved = !s.origin || fin.col !== s.origin.col || fin.index !== s.origin.index;
    if (t && moved) {
      const list = cols[fin.col].filter((x) => x.id !== fin.id);
      const position = between(list, fin.index);
      void patch(t.id, { status: fin.col, position }, "moveTask", { status: fin.col, position });
      try {
        if (s.touch) navigator.vibrate?.(8);
      } catch {}
    }
    setDrag(null);
    setTimeout(() => (suppress.current = false), 0);
  }

  // Ghost follows on the first frame of a drag, then lands on the slot.
  useLayoutEffect(() => {
    const s = g.current;
    const gh = ghost.current;
    const inner = ghostCard.current;
    if (!drag || !s || !gh || !inner || !s.base) return;
    if (!drag.drop) {
      if (!gh.dataset.live) {
        gh.dataset.live = "1";
        set(gh, { x: s.x - s.sx, y: s.y - s.sy });
        spring(inner, { s: 1.035 }, { r: 0.22, keep: true });
      }
      return;
    }
    const slot = root.current?.querySelector<HTMLElement>(`.card.slot[data-flip="${drag.id}"]`);
    if (!slot) return commit();
    const r = slot.getBoundingClientRect();
    const c = current(slot);
    spring(inner, {}, { r: 0.3 });
    spring(gh, { x: r.left - c.x - s.base.left, y: r.top - c.y - s.base.top }, { z: 0.8, r: 0.4, v: { x: s.vx ?? 0, y: s.vy ?? 0 }, keep: true, onRest: commit });
    // commit and place read the latest state through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  type H = { move: (e: PointerEvent) => void; up: () => void; cancel: () => void };
  const handlers = useRef<H | null>(null);
  useLayoutEffect(() => {
    handlers.current = {
    move: (e) => {
      const s = g.current;
      if (!s || dragRef.current?.drop) return;
      s.x = e.clientX;
      s.y = e.clientY;
      s.hist.push([e.clientX, e.clientY, performance.now()]);
      if (s.hist.length > 10) s.hist.shift();
      if (!s.started) {
        const dist = Math.hypot(e.clientX - s.sx, e.clientY - s.sy);
        if (s.touch) {
          if (dist > 10) {
            clearTimeout(s.timer);
            s.el.classList.remove("pressing");
            g.current = null;
          }
          return;
        }
        if (dist < 5) return;
        begin();
        return;
      }
      if (ghost.current) set(ghost.current, { x: s.x - s.sx, y: s.y - s.sy });
      place(s.x, s.y);
    },
    up: () => {
      const s = g.current;
      if (!s || dragRef.current?.drop) return;
      clearTimeout(s.timer);
      s.el.classList.remove("pressing");
      if (s.started) end(false);
      else g.current = null;
    },
    cancel: () => {
      const s = g.current;
      if (!s || dragRef.current?.drop) return;
      clearTimeout(s.timer);
      s.el.classList.remove("pressing");
      if (s.started) end(true);
      else g.current = null;
    },
  };
  });

  useEffect(() => {
    const move = (e: PointerEvent) => handlers.current?.move(e);
    const up = () => handlers.current?.up();
    const cancel = () => handlers.current?.cancel();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && g.current?.started) {
        e.preventDefault();
        handlers.current?.cancel();
      }
    };
    const touch = (e: TouchEvent) => {
      if (g.current?.started) e.preventDefault();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("touchmove", touch, { passive: false });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchmove", touch);
      document.documentElement.classList.remove("dragging");
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || g.current) return;
    const c = (e.target as HTMLElement).closest<HTMLElement>(".card[data-task]");
    if (!c) return;
    const touch = e.pointerType !== "mouse";
    g.current = { id: c.dataset.task!, el: c, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, touch, started: false, hist: [[e.clientX, e.clientY, performance.now()]] };
    if (touch) {
      c.classList.add("pressing");
      g.current.timer = window.setTimeout(() => {
        if (g.current && !g.current.started) begin();
      }, 280);
    }
  };

  const onClick = (e: React.MouseEvent) => {
    if (suppress.current) {
      suppress.current = false;
      return;
    }
    const c = (e.target as HTMLElement).closest<HTMLElement>(".card[data-task]");
    if (c) {
      const t = d.tasks[c.dataset.task!];
      if (t) openTask(refOf(d, t));
    }
  };

  const projects = Object.values(d.projects);
  const total = all.length;

  return (
    <>
      <div className="titlerow">
        <h1>{p.name}</h1>
        <span className="mono">
          {p.key} · {total} {total === 1 ? "task" : "tasks"}
        </span>
        <span className="grow" />
        {projects.length > 1 && (
          <div className="keys">
            {projects.map((x) => (
              <button key={x.id} className={`key${x.key === p.key ? " on" : ""}`} onClick={() => go({ view: "board", key: x.key })}>
                {x.key}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="boardscroll">
        <div className="board" ref={root} onPointerDown={onPointerDown} onClick={onClick} onContextMenu={(e) => g.current?.touch && e.preventDefault()}>
          {STATUSES.map((s) => {
            const list = listFor(s);
            return (
              <div className="col" data-col={s} key={s}>
                <div className="colhead">
                  <StatusDot s={s} />
                  <span>{STATUS_NAME[s]}</span>
                  <span className="count">{count(list.length)}</span>
                  <button className="add" onClick={(e) => openNew(s, e.currentTarget)} aria-label={`New task in ${STATUS_NAME[s]}`}>
                    {I.plus}
                  </button>
                </div>
                <div className="cards">
                  {list.map((t) => (
                    <Card key={t.id} t={t} d={d} selected={t.id === openId} slot={drag?.id === t.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {drag && dragged && base && (
        <div ref={ghost} className="ghostwrap" style={{ left: base.left, top: base.top, width: base.width }}
        >
          <div ref={ghostCard} className={`card ghost${isLive(d, dragged) ? " live" : ""}`}>
            <CardBody t={dragged} d={d} />
          </div>
        </div>
      )}
    </>
  );
}
