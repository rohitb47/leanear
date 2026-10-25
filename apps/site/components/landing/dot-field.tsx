// The brand's dot grid: tiny dots 34px apart, brightness seeded at random and
// mirrored on both axes, so it is random and symmetric at once. A mask clears
// the middle so the dots never sit behind the words.
const W = 1440
const H = 720
const GAP = 34

function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DOTS = (() => {
  const rand = seeded(47)
  const cols = Math.floor(W / GAP)
  const rows = Math.floor(H / GAP)
  const x0 = (W - (cols - 1) * GAP) / 2
  const y0 = (H - (rows - 1) * GAP) / 2
  const out: { x: number; y: number; o: number }[] = []
  for (let i = 0; i < Math.ceil(cols / 2); i++) {
    for (let j = 0; j < Math.ceil(rows / 2); j++) {
      const o = 0.12 + rand() * 0.5
      const spots = new Set([
        `${i},${j}`,
        `${cols - 1 - i},${j}`,
        `${i},${rows - 1 - j}`,
        `${cols - 1 - i},${rows - 1 - j}`,
      ])
      for (const k of spots) {
        const [c, r] = k.split(",").map(Number)
        out.push({ x: x0 + c * GAP, y: y0 + r * GAP, o })
      }
    }
  }
  return out
})()

export function DotField() {
  return (
    <svg
      className="dots"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="dots-fade" cx="50%" cy="46%" r="60%">
          <stop offset="0.38" stopColor="#000" />
          <stop offset="0.85" stopColor="#fff" />
        </radialGradient>
        <mask id="dots-mask">
          <rect width={W} height={H} fill="url(#dots-fade)" />
        </mask>
      </defs>
      <g mask="url(#dots-mask)" fill="currentColor">
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={1.3} opacity={d.o} />
        ))}
      </g>
    </svg>
  )
}
