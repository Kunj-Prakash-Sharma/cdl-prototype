// PRIVATE to modules/auth. The pure parts of email + password admin accounts (D77): no Better Auth, no database.
import { randomBytes } from "node:crypto";
import { z } from "zod";

const emailSchema = z.email().max(254);

/** Lower-cased and trimmed, or null when it is not an email. Phone accounts use `<number>@phone.invalid`: refused. */
export function normalizeAdminEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) return null;
  if (email.endsWith(".invalid")) return null;
  return email;
}

/** 24 random URL-safe characters (144 bits). Shown once to whoever runs the script. */
export function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}
