// Creates (or resets) an admin who logs in at /admin/login with email + password (D77, docs/specs/auth.md).
//   npm run admin:create -- team@client.com            new admin, random password printed once
//   npm run admin:create -- team@client.com --reset    new random password for an existing email admin
// Runs against the database in DATABASE_URL (put the production URL in the environment on purpose, never by accident).
// The password is printed once and stored only as a hash: pass it on privately and do not paste it into a chat.
import { createEmailAdmin, resetEmailAdminPassword } from "@/modules/auth/admin-accounts";

const args = process.argv.slice(2);
const reset = args.includes("--reset");
const email = args.find((arg) => !arg.startsWith("--"));

const REASONS = {
  invalid_email: "That is not a usable email address (phone placeholder addresses are refused).",
  exists: "That email already has an account. Use --reset to give an email admin a new password.",
  not_found: "No email admin with that address (it must exist, have a password and be an admin).",
} as const;

async function main() {
  if (!email) {
    console.error("usage: npm run admin:create -- <email> [--reset]");
    process.exit(2);
  }
  const result = reset ? await resetEmailAdminPassword(email) : await createEmailAdmin(email);
  if (!result.ok) {
    console.error(REASONS[result.code]);
    process.exit(1);
  }
  console.log(`${reset ? "Password reset" : "Admin created"}: ${result.email}`);
  console.log(`Password (shown once): ${result.password}`);
}

main()
  .catch((err) => {
    // Never print the error object: it can carry the email.
    console.error("create-admin failed:", err instanceof Error ? err.name : "unknown error");
    process.exit(1);
  })
  .then(() => process.exit(0));
