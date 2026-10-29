// Helpers for the Playwright tests. They talk to the TEST database only (assertTestDbUrl refuses anything else).
import { randomInt } from "node:crypto";
import { Pool } from "pg";
import { assertTestDbUrl } from "./test-db";

/**
 * Numbers that become admins on the e2e server. Each Playwright project and each `--repeat-each` round gets its own,
 * because a number can only ask for a code every 30 seconds and five times a day.
 */
export const E2E_ADMIN_PHONES = Array.from({ length: 8 }, (_, i) => `900000000${i + 1}`);

export function e2eAdminPhone(projectName: string, repeatEachIndex: number): string {
  const projectIndex = projectName === "mobile" ? 0 : 1;
  const phone = E2E_ADMIN_PHONES[projectIndex * 4 + repeatEachIndex];
  if (!phone) throw new Error("--repeat-each is limited to 4 rounds; add more numbers to E2E_ADMIN_PHONES");
  return phone;
}

let pool: Pool | undefined;
function db(): Pool {
  pool ??= new Pool({
    connectionString: assertTestDbUrl(process.env.TEST_DATABASE_URL),
    max: 2,
    idleTimeoutMillis: 1000,
  });
  return pool;
}

/** A valid, random Indian mobile number (10 digits, first digit 6-9) that no other test is using. */
export function newLearnerPhone(): string {
  return `9${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
}

/** The 6-digit code the server just "sent". The fake SMS only logs it; Better Auth keeps it in `auth_verification`. */
export async function latestOtp(nationalNumber: string): Promise<string> {
  const identifier = `+91${nationalNumber}`;
  for (let attempt = 0; attempt < 25; attempt++) {
    const { rows } = await db().query<{ value: string }>(
      `select value from auth_verification where identifier = $1 order by "createdAt" desc limit 1`,
      [identifier],
    );
    const code = rows[0]?.value.split(":")[0];
    if (code && /^\d{6}$/.test(code)) return code;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`no OTP found for ${identifier}`);
}

/** Start of every run: forget earlier runs' per-IP and per-number counters so they cannot block this run. */
export async function resetAuthLimits(): Promise<void> {
  await db().query("truncate auth_rate_limit, auth_otp_throttle");
  await pool?.end();
  pool = undefined;
}
