// A small interruptible spring engine, the same one the prototype uses.
// Each element carries x, y, scale, opacity and blur. A new target retargets
// from the live value and keeps the velocity, so motion never jumps.

type Key = "x" | "y" | "s" | "o" | "b";
type Values = Record<Key, number>;
type Opts = { z?: number; r?: number; v?: Partial<Values>; onRest?: () => void; keep?: boolean };

const REST: Values = { x: 0, y: 0, s: 1, o: 1, b: 0 };
const KEYS: Key[] = ["x", "y", "s", "o", "b"];

type State = {
  el: HTMLElement;
  cur: Values;
  vel: Values;
  to: Values;
  k: number;
  c: number;
  onRest?: () => void;
  keep: boolean;
};

const live = new Map<HTMLElement, State>();
let raf = 0;
let last = 0;

export const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function write(st: State) {
  const { el, cur } = st;
  el.style.transform = `translate3d(${cur.x}px,${cur.y}px,0) scale(${cur.s})`;
  el.style.opacity = String(cur.o);
  el.style.filter = cur.b > 0.05 ? `blur(${cur.b}px)` : "";
}

function clear(el: HTMLElement) {
  el.style.transform = "";
  el.style.opacity = "";
  el.style.filter = "";
}

function tick(now: number) {
  const dt = Math.min(0.064, (now - last) / 1000 || 0.016);
  last = now;
  const steps = Math.max(1, Math.round(dt * 240));
  const h = dt / steps;
  for (const st of live.values()) {
    let moving = false;
    for (const key of KEYS) {
      let x = st.cur[key];
      let v = st.vel[key];
      const t = st.to[key];
      for (let i = 0; i < steps; i++) {
        const a = -st.k * (x - t) - st.c * v;
        v += a * h;
        x += v * h;
      }
      const scale = key === "x" || key === "y" || key === "b" ? 1 : 0.01;
      if (Math.abs(x - t) < 0.1 * scale && Math.abs(v) < 0.5 * scale) {
        x = t;
        v = 0;
      } else moving = true;
      st.cur[key] = x;
      st.vel[key] = v;
    }
    write(st);
    if (!moving) {
      live.delete(st.el);
      const atRest = KEYS.every((k) => st.cur[k] === REST[k]);
      if (atRest && !st.keep) clear(st.el);
      st.onRest?.();
    }
  }
  raf = live.size ? requestAnimationFrame(tick) : 0;
}

const memo = new WeakMap<HTMLElement, Values>();

/** Current visual offset of an element, so a new spring can start from it. */
export function current(el: HTMLElement): Values {
  return { ...(live.get(el)?.cur ?? memo.get(el) ?? REST) };
}

/** Jump an element to values with no animation. */
export function set(el: HTMLElement, v: Partial<Values>) {
  const cur = { ...current(el), ...v };
  live.delete(el);
  memo.set(el, cur);
  write({ el, cur, vel: { ...REST }, to: cur, k: 0, c: 0, keep: true });
}

/**
 * Spring an element to a target. z is the damping ratio, r the response in
 * seconds (Apple's two numbers). Omitted keys spring to rest.
 */
export function spring(el: HTMLElement, to: Partial<Values>, o: Opts = {}) {
  const z = o.z ?? 1;
  const r = o.r ?? 0.4;
  const w = (2 * Math.PI) / r;
  const prev = live.get(el);
  const cur = prev ? prev.cur : { ...(memo.get(el) ?? REST) };
  const vel = prev ? prev.vel : { x: 0, y: 0, s: 0, o: 0, b: 0 };
  if (o.v) for (const k of KEYS) if (o.v[k] !== undefined) vel[k] = o.v[k]!;
  const target = { ...REST, ...to };
  memo.set(el, target);
  if (reduced()) {
    live.delete(el);
    const st = { el, cur: target, vel, to: target, k: 0, c: 0, keep: !!o.keep };
    if (KEYS.every((k) => target[k] === REST[k]) && !o.keep) clear(el);
    else write(st);
    o.onRest?.();
    return;
  }
  live.set(el, { el, cur, vel, to: target, k: w * w, c: 2 * z * w, onRest: o.onRest, keep: !!o.keep });
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
}

/** Where a throw lands: Apple's momentum projection. */
export const project = (v: number, d = 0.993) => ((v / 1000) * d) / (1 - d);

/** Resistance past an edge. */
export const rubber = (x: number, dim: number, c = 0.55) => (1 - 1 / ((x * c) / dim + 1)) * dim;

/** Move an element's current offset by d, keeping its velocity (for FLIP). */
export function shift(el: HTMLElement, d: { x: number; y: number }) {
  const st = live.get(el);
  if (st) {
    st.cur.x += d.x;
    st.cur.y += d.y;
    write(st);
    return;
  }
  const cur = { ...(memo.get(el) ?? REST) };
  cur.x += d.x;
  cur.y += d.y;
  memo.set(el, cur);
  write({ el, cur, vel: { ...REST }, to: cur, k: 0, c: 0, keep: true });
}
