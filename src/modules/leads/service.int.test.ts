// Integration test: real leads service + real chat service + real Postgres (the `self_test` database; see tests/support).
// No Better Auth and no Next: the phone reader is injected, so only the database is real.
// Run with: npm run test:int
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  finishAttempt,
  getNextStep,
  startOrResumeAttempt,
  submitAnswer,
  type Learner,
  type NextStep,
} from "@/modules/chat/service";
import { CURRENT_CONSENT } from "./consent-copy";
import { sendCallbackAlert, sweepUnalertedLeads } from "./jobs";
import { leads } from "./schema";
import { authUser } from "@/modules/auth/schema";
import { LEADS_PAGE_SIZE, type LeadFilters } from "./admin-leads";
import {
  createCallback,
  exportLeadsCsv,
  getConsentWording,
  listLeadsForAdmin,
  setLeadStatus,
  type NameReader,
  type PhoneReader,
} from "./service";

let counter = 0;
async function makeLearner(): Promise<Learner> {
  const userId = `lead-test-${Date.now()}-${counter++}`;
  await db.execute(
    sql`insert into auth_user (id, name, email) values (${userId}, 'Asha', ${userId + "@phone.invalid"})`,
  );
  return { userId, name: "Asha" };
}

/** Finishes a whole attempt for the learner, with the given age answer (position in the age options). */
async function finishReport(learner: Learner, ageIndex = 2) {
  const started = await startOrResumeAttempt(learner);
  if (!started.ok) throw new Error(started.code);
  const { attemptId } = started;
  await submitAnswer(learner, attemptId, "b-status", 0); // status is asked first (set 1.1.0), then the name, then age
  await submitAnswer(learner, attemptId, "b-age", ageIndex);
  for (let guard = 0; guard < 100; guard++) {
    const res = await getNextStep(learner, attemptId);
    if (!res.ok) throw new Error(res.code);
    const step: NextStep = res.next;
    if (step.kind === "done") break;
    if (step.kind === "name") throw new Error("test learner needs a name");
    const value = step.kind === "basics" ? 0 : (guard % 5) + 1;
    await submitAnswer(learner, attemptId, step.id, value);
  }
  const done = await finishAttempt(learner, attemptId);
  if (!done.ok) throw new Error(done.code);
  return attemptId;
}

const phoneOf =
  (phone: string | null): PhoneReader =>
  async () =>
    phone;
const PHONE = "+919876543210";
const rows = (userId: string) => db.select().from(leads).where(eq(leads.userId, userId));
const ok = <T extends { ok: boolean }>(res: T) => {
  if (!res.ok) throw new Error(`expected ok, got ${JSON.stringify(res)}`);
  return res as Extract<T, { ok: true }>;
};

const cleanup = () => db.execute(sql`delete from auth_user where id like 'lead-test-%'`);
beforeEach(cleanup);
afterAll(cleanup);

describe("requesting a callback", () => {
  it("saves a lead with the phone, consent time and version, the report's attempt and status new", async () => {
    const learner = await makeLearner();
    const attemptId = await finishReport(learner);
    const now = new Date("2026-11-05T10:00:00Z");
    const res = ok(await createCallback(learner, { consent: true, preferredTime: "evening" }, phoneOf(PHONE), { now }));
    expect(res.created).toBe(true);
    expect(res.lead).toMatchObject({ status: "new", preferredTime: "evening" });
    const [row] = await rows(learner.userId);
    expect(row).toMatchObject({
      userId: learner.userId,
      attemptId,
      phone: PHONE,
      consentVersion: CURRENT_CONSENT.version,
      status: "new",
      preferredTime: "evening",
    });
    expect(row!.consentAt.toISOString()).toBe(now.toISOString());
  });

  it("never hands the phone number back to the learner", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const res = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    expect(JSON.stringify(res)).not.toContain("98765");
    expect(res.lead.preferredTime).toBeNull();
  });

  it("treats every age the same (D79): the contact is always the learner, whatever the age answer", async () => {
    const [kid, adult] = [await makeLearner(), await makeLearner()];
    await finishReport(kid, 0);
    await finishReport(adult, 3);
    ok(await createCallback(kid, { consent: true }, phoneOf(PHONE)));
    ok(await createCallback(adult, { consent: true }, phoneOf(PHONE)));
    for (const learner of [kid, adult]) expect((await rows(learner.userId))[0]!.contactRole).toBe("learner");
  });

  it("refuses without the consent tick, and saves nothing", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    expect(await createCallback(learner, { consent: false }, phoneOf(PHONE))).toEqual({
      ok: false,
      code: "consent_required",
    });
    expect(await rows(learner.userId)).toHaveLength(0);
  });

  it("refuses a preferred time that is not one of the fixed choices", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const bad = { consent: true, preferredTime: "midnight" } as unknown as Parameters<typeof createCallback>[1];
    expect(await createCallback(learner, bad, phoneOf(PHONE))).toEqual({ ok: false, code: "invalid_input" });
    expect(await rows(learner.userId)).toHaveLength(0);
  });

  it("needs a finished report and a phone number", async () => {
    const noReport = await makeLearner();
    expect(await createCallback(noReport, { consent: true }, phoneOf(PHONE))).toEqual({ ok: false, code: "no_report" });
    await startOrResumeAttempt(noReport); // an open attempt is not a report
    expect(await createCallback(noReport, { consent: true }, phoneOf(PHONE))).toEqual({ ok: false, code: "no_report" });

    const noPhone = await makeLearner();
    await finishReport(noPhone);
    expect(await createCallback(noPhone, { consent: true }, phoneOf(null))).toEqual({ ok: false, code: "no_phone" });
    expect(await rows(noPhone.userId)).toHaveLength(0);
  });
});

describe("repeat taps make one lead (idempotent)", () => {
  it("returns the same lead with created false for taps after the first", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const first = ok(await createCallback(learner, { consent: true, preferredTime: "morning" }, phoneOf(PHONE)));
    const second = ok(await createCallback(learner, { consent: true, preferredTime: "evening" }, phoneOf(PHONE)));
    const third = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    expect([first.created, second.created, third.created]).toEqual([true, false, false]);
    expect(second.lead.id).toBe(first.lead.id);
    expect(third.lead.id).toBe(first.lead.id);
    expect(await rows(learner.userId)).toHaveLength(1);
    expect((await rows(learner.userId))[0]!.preferredTime).toBe("morning"); // the first request stands
  });

  it("creates exactly one lead, with exactly one created:true, when taps race", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createCallback(learner, { consent: true }, phoneOf(PHONE))),
    );
    const good = results.map((r) => ok(r));
    expect(good.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(good.map((r) => r.lead.id)).size).toBe(1);
    expect(await rows(learner.userId)).toHaveLength(1);
  });

  it("allows a new request after the team has handled the old one", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const first = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    await db.update(leads).set({ status: "contacted" }).where(eq(leads.id, first.lead.id));
    const again = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    expect(again.created).toBe(true);
    expect(again.lead.id).not.toBe(first.lead.id);
    expect(await rows(learner.userId)).toHaveLength(2);
  });

  it("keeps different learners' requests apart", async () => {
    const [a, b] = [await makeLearner(), await makeLearner()];
    await finishReport(a);
    await finishReport(b);
    const first = ok(await createCallback(a, { consent: true }, phoneOf(PHONE)));
    const second = ok(await createCallback(b, { consent: true }, phoneOf(PHONE)));
    expect(first.lead.id).not.toBe(second.lead.id);
    expect(second.created).toBe(true);
  });
});

describe("consent wording for the form", () => {
  it("shows the same wording to every age, with the version, and none to someone without a report", async () => {
    const [kid, adult, none] = [await makeLearner(), await makeLearner(), await makeLearner()];
    await finishReport(kid, 0);
    await finishReport(adult, 2);
    const forKid = await getConsentWording(kid.userId);
    const forAdult = await getConsentWording(adult.userId);
    expect(forKid).toEqual({
      text: CURRENT_CONSENT.text,
      version: CURRENT_CONSENT.version,
      draft: CURRENT_CONSENT.draft,
    });
    expect(forAdult).toEqual(forKid);
    expect(await getConsentWording(none.userId)).toBeNull();
  });
});

describe("deleting a learner", () => {
  it("removes their leads with them (manual data deletion leaves no phone number behind)", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    await db.execute(sql`delete from auth_user where id = ${learner.userId}`);
    expect(await rows(learner.userId)).toHaveLength(0);
  });
});

// ---- Admin ---------------------------------------------------------------------------------------------------------

const admin = { role: "admin" as const };
const learnerSession = { role: "learner" as const };
/** Reads names straight from the test database, like auth's getUserNames does. */
const namesFromDb: NameReader = async (ids) => {
  if (ids.length === 0) return new Map();
  const found = await db
    .select({ id: authUser.id, name: authUser.name })
    .from(authUser)
    .where(inArray(authUser.id, ids));
  return new Map(found.map((row) => [row.id, row.name]));
};
const listOf = async (filters: LeadFilters = { status: "all", page: 1 }) =>
  ok(await listLeadsForAdmin(admin, filters, namesFromDb)).view;

describe("admin callback list", () => {
  it("refuses anyone who is not an admin", async () => {
    expect(await listLeadsForAdmin(learnerSession, { status: "all", page: 1 }, namesFromDb)).toEqual({
      ok: false,
      code: "forbidden",
    });
  });

  it("shows the newest request first with the name, phone, role, time and what the learner told Mira", async () => {
    const [older, newer] = [await makeLearner(), await makeLearner()];
    await finishReport(older, 2);
    await finishReport(newer, 0);
    ok(
      await createCallback(older, { consent: true, preferredTime: "morning" }, phoneOf("+911111111111"), {
        now: new Date("2026-11-05T08:00:00Z"),
      }),
    );
    ok(await createCallback(newer, { consent: true }, phoneOf(PHONE), { now: new Date("2026-11-05T09:00:00Z") }));
    await db.execute(sql`update leads set created_at = '2026-11-05T08:00:00Z' where user_id = ${older.userId}`);
    await db.execute(sql`update leads set created_at = '2026-11-05T09:00:00Z' where user_id = ${newer.userId}`);

    const view = await listOf();
    const mine = view.rows.filter(
      (r) => [older.userId, newer.userId].length && ["+91 11111 11111", "+91 98765 43210"].includes(r.phone),
    );
    expect(mine.map((r) => r.phone)).toEqual(["+91 98765 43210", "+91 11111 11111"]);
    expect(mine[0]).toMatchObject({
      status: "new",
      name: "Asha",
      age: "Under 15",
      preferredTime: null,
      consentVersion: CURRENT_CONSENT.version,
    });
    expect(mine[0]!.topInterests.length).toBeLessThanOrEqual(3);
    expect(mine[0]!.activity).toBe("Designing things"); // the warm-up answer (D89), first option
    expect(mine[1]).toMatchObject({ preferredTime: "morning", age: "18 to 21" });
    expect(mine[0]).not.toHaveProperty("contactRole");
  });

  it("reads the name live, so an edited profile name shows at once (nothing is copied into the lead)", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    ok(await createCallback(learner, { consent: true }, phoneOf("+912222222222")));
    await db.execute(sql`update auth_user set name = 'Renamed Person' where id = ${learner.userId}`);
    const row = (await listOf()).rows.find((r) => r.phone === "+91 22222 22222");
    expect(row!.name).toBe("Renamed Person");
  });

  it("filters by status and counts every status", async () => {
    const [a, b] = [await makeLearner(), await makeLearner()];
    await finishReport(a);
    await finishReport(b);
    const first = ok(await createCallback(a, { consent: true }, phoneOf("+913333333333")));
    ok(await createCallback(b, { consent: true }, phoneOf("+914444444444")));
    ok(await setLeadStatus(admin, first.lead.id, "contacted"));
    const before = await listOf();
    const contacted = await listOf({ status: "contacted", page: 1 });
    expect(contacted.rows.every((r) => r.status === "contacted")).toBe(true);
    expect(contacted.total).toBe(before.counts.contacted);
    expect(before.counts.new).toBeGreaterThanOrEqual(1);
    expect(before.counts.contacted).toBeGreaterThanOrEqual(1);
  });

  it("pages the list without overlap", async () => {
    const total = LEADS_PAGE_SIZE + 3;
    for (let i = 0; i < total; i++) {
      const userId = `lead-test-page-${Date.now()}-${i}`;
      await db.execute(
        sql`insert into auth_user (id, name, email) values (${userId}, 'P', ${userId + "@phone.invalid"})`,
      );
      await db.execute(sql`
        insert into leads (user_id, attempt_id, phone, contact_role, consent_at, consent_version, created_at)
        values (${userId}, gen_random_uuid(), '+915555555555', 'learner', now(), '1.0.0-draft', now() - (${i} * interval '1 minute'))`);
    }
    const page1 = await listOf({ status: "new", page: 1 });
    const page2 = await listOf({ status: "new", page: 2 });
    expect(page1.rows).toHaveLength(LEADS_PAGE_SIZE);
    expect(page1.pageCount).toBeGreaterThanOrEqual(2);
    const ids = new Set([...page1.rows, ...page2.rows].map((r) => r.id));
    expect(ids.size).toBe(page1.rows.length + page2.rows.length);
    expect(page1.rows[0]!.age).toBeNull(); // no report behind these test rows: the list still works
  });
});

describe("changing a status", () => {
  it("moves a request between the three statuses and notes the time", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const made = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    const now = new Date("2026-11-05T12:00:00Z");
    expect(ok(await setLeadStatus(admin, made.lead.id, "contacted", now)).lead.status).toBe("contacted");
    const [row] = await rows(learner.userId);
    expect(row!.status).toBe("contacted");
    expect(row!.statusChangedAt.toISOString()).toBe(now.toISOString());
    expect(ok(await setLeadStatus(admin, made.lead.id, "closed")).lead.status).toBe("closed");
  });

  it("refuses non-admins, bad ids, bad statuses and unknown leads", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const made = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    expect(await setLeadStatus(learnerSession, made.lead.id, "closed")).toEqual({ ok: false, code: "forbidden" });
    expect(await setLeadStatus(admin, "not-a-uuid", "closed")).toEqual({ ok: false, code: "invalid_input" });
    expect(await setLeadStatus(admin, made.lead.id, "deleted")).toEqual({ ok: false, code: "invalid_input" });
    expect(await setLeadStatus(admin, "00000000-0000-4000-8000-000000000000", "closed")).toEqual({
      ok: false,
      code: "not_found",
    });
    expect((await rows(learner.userId))[0]!.status).toBe("new");
  });

  it("will not put a lead back to new while the same learner has another new one", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const first = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    ok(await setLeadStatus(admin, first.lead.id, "closed"));
    ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    expect(await setLeadStatus(admin, first.lead.id, "new")).toEqual({ ok: false, code: "conflict" });
    expect((await rows(learner.userId)).filter((r) => r.status === "new")).toHaveLength(1);
  });
});

describe("CSV download", () => {
  it("refuses non-admins", async () => {
    expect(await exportLeadsCsv(learnerSession, "all", namesFromDb)).toEqual({ ok: false, code: "forbidden" });
  });

  it("writes one Excel-safe row per request with the phone as text and a dated file name", async () => {
    const learner = await makeLearner();
    await finishReport(learner, 1);
    ok(await createCallback(learner, { consent: true, preferredTime: "afternoon" }, phoneOf("+916666666666")));
    const res = ok(await exportLeadsCsv(admin, "new", namesFromDb, new Date("2026-11-05T10:00:00Z")));
    expect(res.filename).toBe("callbacks-2026-11-05.csv");
    expect(res.truncated).toBe(false);
    expect(res.csv.startsWith("\uFEFFRequested at,Status,Name,Phone,Preferred time,")).toBe(true);
    const line = res.csv.split("\r\n").find((l) => l.includes("91 66666 66666"));
    expect(line).toBeDefined();
    expect(line).toContain(",Asha,91 66666 66666,Afternoon,15 to 17,");
    expect(line).toContain(",Designing things,"); // "Loses track of time doing"
    expect(res.csv.split("\r\n")[0]).toContain("Loses track of time doing");
    expect(line).not.toContain("+91");
    expect(res.count).toBe(res.csv.split("\r\n").length - 2); // minus the header and the trailing break
  });

  it("neutralises a name that would run as a formula in Excel", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    ok(await createCallback(learner, { consent: true }, phoneOf("+917777777777")));
    await db.execute(sql`update auth_user set name = '=HYPERLINK("http://evil","x")' where id = ${learner.userId}`);
    const res = ok(await exportLeadsCsv(admin, "all", namesFromDb));
    const line = res.csv.split("\r\n").find((l) => l.includes("91 77777 77777"))!;
    expect(line).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(line).not.toMatch(/,=HYPERLINK/);
  });

  it("exports only the chosen status", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const made = ok(await createCallback(learner, { consent: true }, phoneOf("+918888888888")));
    ok(await setLeadStatus(admin, made.lead.id, "closed"));
    expect(ok(await exportLeadsCsv(admin, "new", namesFromDb)).csv).not.toContain("91 88888 88888");
    expect(ok(await exportLeadsCsv(admin, "closed", namesFromDb)).csv).toContain("91 88888 88888");
  });
});

// ---- Telling the team (E6-S3) ---------------------------------------------------------------------------------------

describe("telling the team about a new request", () => {
  it("notifies once, with the lead id, only for the request that created the lead", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const notify = vi.fn(async () => {});
    const first = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE), { notify }));
    ok(await createCallback(learner, { consent: true }, phoneOf(PHONE), { notify }));
    ok(await createCallback(learner, { consent: true }, phoneOf(PHONE), { notify }));
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(first.lead.id);
  });

  it("does not notify for a refused request", async () => {
    const learner = await makeLearner();
    const notify = vi.fn(async () => {});
    await createCallback(learner, { consent: true }, phoneOf(PHONE), { notify }); // no report yet
    await finishReport(learner);
    await createCallback(learner, { consent: false }, phoneOf(PHONE), { notify });
    expect(notify).not.toHaveBeenCalled();
  });

  it("still saves the lead and confirms when the notification cannot be queued", async () => {
    const learner = await makeLearner();
    await finishReport(learner);
    const notify = vi.fn(async () => {
      throw new Error("queue down +919876543210");
    });
    const res = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE), { notify }));
    expect(res.created).toBe(true);
    expect(await rows(learner.userId)).toHaveLength(1);
  });
});

describe("the team email job", () => {
  const TEAM = "team@example.com";
  const lead = async (ageIndex = 1, preferredTime: "evening" | null = "evening") => {
    const learner = await makeLearner();
    await finishReport(learner, ageIndex);
    const made = ok(await createCallback(learner, { consent: true, preferredTime }, phoneOf(PHONE)));
    return { learner, id: made.lead.id };
  };

  it("sends one email to the team with the phone, the time and what Mira learned, and no name", async () => {
    const { id, learner } = await lead(1);
    const send = vi.fn(async () => {});
    const now = new Date("2026-11-05T12:00:00Z");
    await sendCallbackAlert({ leadId: id }, { to: TEAM, send, now: () => now });
    expect(send).toHaveBeenCalledTimes(1);
    const [template, to, data] = send.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(template).toBe("callback_alert");
    expect(to).toBe(TEAM);
    expect(data).toMatchObject({
      leadId: id,
      phone: "+91 98765 43210",
      preferredTime: "evening",
      age: "15 to 17",
    });
    expect(Array.isArray(data.topInterests)).toBe(true);
    expect(data.activity).toBe("Designing things");
    expect(JSON.stringify(data)).not.toContain(learner.name);
    const [row] = await rows(learner.userId);
    expect(row!.alertedAt?.toISOString()).toBe(now.toISOString());
  });

  it("does not send a second email when the job runs again (a retry or a duplicate job)", async () => {
    const { id } = await lead();
    const send = vi.fn(async () => {});
    await sendCallbackAlert({ leadId: id }, { to: TEAM, send });
    await sendCallbackAlert({ leadId: id }, { to: TEAM, send });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("throws when the email fails, so the queue retries, and does not mark the lead as alerted", async () => {
    const { id, learner } = await lead();
    const send = vi.fn(async () => {
      throw new Error("smtp down");
    });
    await expect(sendCallbackAlert({ leadId: id }, { to: TEAM, send })).rejects.toThrow("smtp down");
    expect((await rows(learner.userId))[0]!.alertedAt).toBeNull();
    const retry = vi.fn(async () => {});
    await sendCallbackAlert({ leadId: id }, { to: TEAM, send: retry });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("throws when no team address is configured, and never sends", async () => {
    const { id, learner } = await lead();
    const send = vi.fn(async () => {});
    await expect(sendCallbackAlert({ leadId: id }, { to: undefined, send })).rejects.toThrow("CALLBACK_ALERT_EMAIL");
    expect(send).not.toHaveBeenCalled();
    expect((await rows(learner.userId))[0]!.alertedAt).toBeNull();
  });

  it("quietly drops a job for a lead that no longer exists or a job with a bad payload", async () => {
    const send = vi.fn(async () => {});
    await sendCallbackAlert({ leadId: "00000000-0000-4000-8000-000000000000" }, { to: TEAM, send });
    await sendCallbackAlert({ leadId: "nope" }, { to: TEAM, send });
    await sendCallbackAlert(null, { to: TEAM, send });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("the alert sweep (D76)", () => {
  const NOW = new Date("2026-11-12T12:00:00Z");
  const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);
  const DAY_MIN = 24 * 60;

  /** A lead created `ageMin` minutes before NOW, optionally already alerted. */
  async function leadAged(ageMin: number, alerted = false) {
    const learner = await makeLearner();
    await finishReport(learner);
    const made = ok(await createCallback(learner, { consent: true }, phoneOf(PHONE)));
    await db
      .update(leads)
      .set({ createdAt: minutesAgo(ageMin), alertedAt: alerted ? minutesAgo(ageMin - 1) : null })
      .where(eq(leads.id, made.lead.id));
    return made.lead.id;
  }
  const sweep = async (enqueue: (id: string) => Promise<void> = async () => {}) => {
    const queued: string[] = [];
    const count = await sweepUnalertedLeads({
      enqueue: async (id) => {
        await enqueue(id);
        queued.push(id);
      },
      now: () => NOW,
    });
    return { queued, count };
  };

  it("queues the alert for a lead that was never alerted", async () => {
    const id = await leadAged(10);
    const { queued, count } = await sweep();
    expect(queued).toContain(id);
    expect(count).toBe(queued.length);
  });

  it("leaves a lead alone while it is younger than 5 minutes (its own alert job may still be running)", async () => {
    const id = await leadAged(4);
    expect((await sweep()).queued).not.toContain(id);
  });

  it("leaves a lead that is already alerted", async () => {
    const id = await leadAged(30, true);
    expect((await sweep()).queued).not.toContain(id);
  });

  it("gives up on a lead older than 3 days, but still takes one just inside the window", async () => {
    const old = await leadAged(3 * DAY_MIN + 5);
    const inside = await leadAged(3 * DAY_MIN - 5);
    const { queued } = await sweep();
    expect(queued).not.toContain(old);
    expect(queued).toContain(inside);
  });

  it("queues the oldest first", async () => {
    const newer = await leadAged(20);
    const older = await leadAged(60);
    const { queued } = await sweep();
    expect(queued.indexOf(older)).toBeLessThan(queued.indexOf(newer));
  });

  it("keeps going when one lead cannot be queued, and counts only the ones that were", async () => {
    const first = await leadAged(60);
    const second = await leadAged(30);
    const failing = vi.fn(async (id: string) => {
      if (id === first) throw new Error("queue down +919876543210");
    });
    const { queued, count } = await sweep(failing);
    expect(failing).toHaveBeenCalledWith(first);
    expect(queued).toContain(second);
    expect(queued).not.toContain(first);
    expect(count).toBe(queued.length);
  });

  it("is harmless to run twice: the alert job still sends one email", async () => {
    const id = await leadAged(10);
    const send = vi.fn(async () => {});
    const run = async () => {
      await sweepUnalertedLeads({
        enqueue: (leadId) => sendCallbackAlert({ leadId }, { to: "team@example.com", send }),
        now: () => NOW,
      });
    };
    await run();
    await run();
    expect(
      send.mock.calls.filter((call) => (call as unknown as [string, string, { leadId: string }])[2].leadId === id),
    ).toHaveLength(1);
  });
});

describe("a callback from Home, with no report (D85)", () => {
  const TEAM = "team@example.com";
  const home = { consent: true, source: "home" } as const;

  it("saves a lead with no attempt and the source home, without needing a report", async () => {
    const learner = await makeLearner();
    const res = ok(await createCallback(learner, { ...home, preferredTime: "morning" }, phoneOf(PHONE)));
    expect(res.created).toBe(true);
    const [row] = await rows(learner.userId);
    expect(row).toMatchObject({ source: "home", attemptId: null, status: "new", phone: PHONE });
  });

  it("still needs a finished report when the request comes from the report button", async () => {
    const learner = await makeLearner();
    expect(await createCallback(learner, { consent: true }, phoneOf(PHONE))).toEqual({ ok: false, code: "no_report" });
    expect(await createCallback(learner, { consent: true, source: "report" }, phoneOf(PHONE))).toEqual({
      ok: false,
      code: "no_report",
    });
  });

  it("keeps the other rules: consent tick, a known source, a phone, and one NEW lead per learner", async () => {
    const learner = await makeLearner();
    expect(await createCallback(learner, { consent: false, source: "home" }, phoneOf(PHONE))).toEqual({
      ok: false,
      code: "consent_required",
    });
    const bad = { consent: true, source: "billboard" } as unknown as Parameters<typeof createCallback>[1];
    expect(await createCallback(learner, bad, phoneOf(PHONE))).toEqual({ ok: false, code: "invalid_input" });
    expect(await createCallback(learner, home, phoneOf(null))).toEqual({ ok: false, code: "no_phone" });
    const first = ok(await createCallback(learner, home, phoneOf(PHONE)));
    const again = ok(await createCallback(learner, home, phoneOf(PHONE)));
    expect(again.created).toBe(false);
    expect(again.lead.id).toBe(first.lead.id);
    expect(await rows(learner.userId)).toHaveLength(1);
  });

  it("shows the consent wording from Home without a report, and still none on the report page", async () => {
    const learner = await makeLearner();
    expect(await getConsentWording(learner.userId, "home")).toEqual({
      text: CURRENT_CONSENT.text,
      version: CURRENT_CONSENT.version,
      draft: CURRENT_CONSENT.draft,
    });
    expect(await getConsentWording(learner.userId)).toBeNull();
    expect(CURRENT_CONSENT.text).not.toMatch(/career report/i);
  });

  it('says "No report yet" in the admin list and the CSV, then shows the newest report once they finish the quiz', async () => {
    const learner = await makeLearner();
    ok(await createCallback(learner, home, phoneOf("+917777777777")));
    const find = async () => (await listOf()).rows.find((r) => r.phone === "+91 77777 77777")!;

    const before = await find();
    expect(before).toMatchObject({ source: "home", hasReport: false, age: null, topInterests: [] });
    const csvBefore = ok(await exportLeadsCsv(admin, "all", namesFromDb));
    const lineBefore = csvBefore.csv.split("\r\n").find((l) => l.includes("77777 77777"))!;
    expect(lineBefore).toContain("No report yet");
    expect(lineBefore).toContain(",Home,");

    await finishReport(learner, 3); // finishes the quiz after asking
    const after = await find();
    expect(after).toMatchObject({ source: "home", hasReport: true, age: "22 to 25" });
    expect(after.topInterests.length).toBeGreaterThan(0);
  });

  it("sends the team email with no report fields, and still no name", async () => {
    const learner = await makeLearner();
    const made = ok(await createCallback(learner, { ...home, preferredTime: "evening" }, phoneOf(PHONE)));
    const send = vi.fn(async () => {});
    await sendCallbackAlert({ leadId: made.lead.id }, { to: TEAM, send, now: () => new Date() });
    const [, , data] = send.mock.calls[0] as unknown as [string, string, Record<string, unknown>];
    expect(data).toMatchObject({
      leadId: made.lead.id,
      reportId: null,
      source: "home",
      hasReport: false,
      age: null,
      activity: null,
      topInterests: [],
    });
    expect(JSON.stringify(data)).not.toContain(learner.name);
  });
});
