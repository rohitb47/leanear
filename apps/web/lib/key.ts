// Pure, so the client can use it too.
/** "Provida" → PRO, "Two Words" → TW. Two to five capital letters. */
export function keyFor(name: string) {
  const words = name
    .normalize("NFD")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const k = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 3);
  const up = k.toUpperCase().replace(/[^A-Z]/g, "");
  return (up.length >= 2 ? up : (up + "XX").slice(0, 2)).slice(0, 5);
}
