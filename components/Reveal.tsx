"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

// Fades a block up the first time it scrolls into view. Never re-triggers.
export function Reveal({
  as: Tag = "div",
  className = "",
  i = 0,
  children,
  ...rest
}: { as?: ElementType; className?: string; i?: number; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ "--i": i } as React.CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
