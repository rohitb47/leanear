import { createHash, randomBytes, randomUUID } from "node:crypto";

export const id = () => randomUUID();
export const token = (bytes = 24) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export class LeanError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
