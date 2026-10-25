"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

// The hero's second line: one phrase at a time. The old one rolls up and out
// while the next rolls up from below. The first phrase is what the server
// renders; reduced motion keeps it still.
const WORDS = [
  "a small team",
  "you and Claude",
  "two co-founders",
  "every agent",
]

export function HeroWords() {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <span className="line words">
      <AnimatePresence initial={false}>
        <motion.span
          key={WORDS[i]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", bounce: 0.1, duration: 0.7 }}
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
