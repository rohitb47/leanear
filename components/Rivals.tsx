"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Morph } from "./Morph";
import { AppTile, RIVALS } from "./Tiles";

// A team of 3 on each tool's cheapest paid plan, billed yearly, against $9
// flat (checked 25 Oct 2026). Rounded down, never up.
const LIST = [
  { k: "linear", pct: 70 },
  { k: "asana", pct: 72 },
  { k: "notion", pct: 70 },
] as const;

export function Rivals() {
  const [i, setI] = useState(0);
  const rot = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setInterval>;
    const start = () => (t = setInterval(() => setI((x) => (x + 1) % LIST.length), 2800));
    const vis = () => (document.hidden ? clearInterval(t) : start());
    const first = setTimeout(start, 1600);
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // The name changes width; ease the space it takes so the line never jumps.
  useLayoutEffect(() => {
    const el = rot.current?.querySelector<HTMLElement>(".morph > :last-child");
    if (el) setW(el.offsetWidth);
  }, [i]);

  const r = LIST[i];
  return (
    <span className="l2">
      <span className="sticker">
        <Morph value={String(r.pct)} />% cheaper
      </span>{" "}
      <span>than</span>{" "}
      <span className="rot" ref={rot} style={w ? { width: w } : undefined}>
        <Morph
          value={r.k}
          big
          render={(k) => {
            const t = RIVALS[k as keyof typeof RIVALS];
            return (
              <span className="rival">
                <AppTile t={t} px={0} className="rtile" />
                {t.name}
              </span>
            );
          }}
        />
      </span>
    </span>
  );
}
