"use client";

import { useEffect, useState } from "react";
import { usePresence } from "./motion";
import { onToast } from "./store";

export function Toasts() {
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { mounted, ref } = usePresence<HTMLDivElement>(open, { y: 14, o: 0 }, { y: 14, o: 0 }, 0.3, 0.28);
  useEffect(() => {
    let t = 0;
    const off = onToast((m) => {
      setMsg(m);
      setOpen(true);
      clearTimeout(t);
      t = window.setTimeout(() => setOpen(false), 2000);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  if (!mounted) return null;
  return (
    <div className="toastwrap">
      <div className="toast" role="status" ref={ref}>
        {msg}
      </div>
    </div>
  );
}
