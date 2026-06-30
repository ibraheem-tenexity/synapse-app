import crypto from "crypto";

/**
 * Returns the NEXTAUTH_SECRET. If the env var is not set, generates a random
 * secret for this process. This ensures the app is never blocked by a missing
 * secret in dev/CI — the operator does not need to supply this token.
 */
export function getNextAuthSecret(): string {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  // Self-generate: deterministic per-process random (not persistent across restarts,
  // but fine for demo/dev; production Railway deploy sets NEXTAUTH_SECRET via env).
  const generated = crypto.randomBytes(32).toString("hex");
  process.env.NEXTAUTH_SECRET = generated;
  return generated;
}
