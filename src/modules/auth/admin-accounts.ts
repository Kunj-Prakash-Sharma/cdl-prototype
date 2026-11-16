// PRIVATE to modules/auth. Email + password admin accounts (D77). Used by scripts/create-admin.ts, which a person runs
// by hand (there is no screen and no sign-up). Returns typed results and never logs the email or the password.
import { auth } from "./auth";
import { generatePassword, normalizeAdminEmail } from "./admin-credentials";
import { deleteSessionsForUser, setUserRole } from "./repo";

export type AdminAccountResult =
  { ok: true; email: string; password: string } | { ok: false; code: "invalid_email" | "exists" | "not_found" };

/** Makes a new admin who logs in with email + password. Refuses an email that already has any account. */
export async function createEmailAdmin(rawEmail: string): Promise<AdminAccountResult> {
  const email = normalizeAdminEmail(rawEmail);
  if (!email) return { ok: false, code: "invalid_email" };
  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: false }))
    return { ok: false, code: "exists" };

  const password = generatePassword();
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: email.split("@")[0]!, // the admin screens show the name; PII like the email
      emailVerified: true,
    },
    { method: "admin" },
  );
  try {
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(password),
    });
    await setUserRole(user.id, "admin");
  } catch (err) {
    // Never leave an admin account that has no password (or a password account that is not an admin).
    await ctx.internalAdapter.deleteUser(user.id);
    throw err;
  }
  return { ok: true, email, password };
}

/** New random password for an existing email-admin. The old password stops working and every session ends. */
export async function resetEmailAdminPassword(rawEmail: string): Promise<AdminAccountResult> {
  const email = normalizeAdminEmail(rawEmail);
  if (!email) return { ok: false, code: "invalid_email" };
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
  const hasPassword = found?.accounts.some((a) => a.providerId === "credential" && a.accountId === found.user.id);
  const isAdmin = (found?.user as { role?: string | null } | undefined)?.role === "admin";
  if (!found || !hasPassword || !isAdmin) return { ok: false, code: "not_found" };

  const password = generatePassword();
  await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(password));
  await deleteSessionsForUser(found.user.id);
  return { ok: true, email, password };
}
