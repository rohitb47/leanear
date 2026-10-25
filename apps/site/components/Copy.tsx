"use client";

import { useEffect, useState } from "react";
import { Morph } from "./Morph";

// Copies a line and says so, then goes back after a moment.
export function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      className="btn ghost sm copy"
      aria-label={done ? "Copied" : "Copy command"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setDone(true);
      }}
    >
      <Morph value={done ? "Copied" : "Copy"} />
    </button>
  );
}
