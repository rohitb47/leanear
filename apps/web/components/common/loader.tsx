// Apple's activity indicator, as in Provida: eight tapered blades round a
// circle, each fading a beat behind the last. Nothing spins; the highlight
// walks round the ring, so it stays crisp at 16px. Colour is currentColor.
export function Loader({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="loader"
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ "--i": i } as React.CSSProperties} />
      ))}
    </span>
  )
}
