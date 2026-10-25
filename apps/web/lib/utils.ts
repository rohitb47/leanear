import { createHash, randomBytes, randomUUID } from "node:crypto"

export const id = () => randomUUID()
export const token = (bytes = 24) => randomBytes(bytes).toString("base64url")
export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex")

/**
 * A refusal the caller should read: wrong input, not allowed, not found.
 * tRPC turns it into an error with this message, MCP into tool text.
 */
export class LeanError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

/** Trimmed text, checked for presence and length, with an error that names it. */
export function text(
  v: unknown,
  name: string,
  max: number,
  required = true
): string {
  if (v === undefined || v === null) {
    if (required) throw new LeanError(`${name} is required`)
    return ""
  }
  if (typeof v !== "string") throw new LeanError(`${name} must be text`)
  const s = v.trim()
  if (required && !s) throw new LeanError(`${name} is required`)
  if (s.length > max)
    throw new LeanError(`${name} is longer than ${max} characters`)
  return s
}
