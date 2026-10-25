"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, AppTile, type AgentKey } from "./Tiles";

const STEPS: { k: AgentKey; line: string; tool: string }[] = [
  { k: "chatgpt", line: "turns your idea into tasks", tool: "create_task" },
  { k: "claude", line: "picks your next task", tool: "next_task" },
  { k: "cursor", line: "reads the project brief", tool: "get_brief" },
  { k: "codex", line: "writes up what it did", tool: "comment" },
  { k: "gemini", line: "attaches the screenshot", tool: "attach_image" },
  { k: "windsurf", line: "moves it to Done", tool: "move_task" },
];

// One agent at a time steps forward and says what it does, with its tool.
export function AgentLoop() {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let t: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(t);
      if (e.isIntersecting) t = setInterval(() => setI((x) => (x + 1) % STEPS.length), 2600);
    });
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      clearInterval(t);
    };
  }, []);
  const s = STEPS[i];
  return (
    <div ref={ref}>
      <div className="faces">
        {STEPS.map((f, n) => (
          <button key={f.k} className={`face ${n === i ? "on" : ""}`} onClick={() => setI(n)} aria-label={AGENTS[f.k].name}>
            <AppTile t={AGENTS[f.k]} px={56} />
          </button>
        ))}
      </div>
      <div className="loop" aria-live="polite">
        <div key={i} className="rise" style={{ animationDuration: "0.55s", animationDelay: "0s" }}>
          <div className="line">
            {AGENTS[s.k].name} {s.line}
          </div>
        </div>
        <span key={`t${i}`} className="tool rise" style={{ animationDuration: "0.55s", animationDelay: "0.06s" }}>
          {s.tool}
        </span>
      </div>
    </div>
  );
}
