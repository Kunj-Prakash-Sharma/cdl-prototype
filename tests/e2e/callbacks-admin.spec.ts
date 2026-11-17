// The admin callbacks page at /admin/callbacks in a real browser (375px "mobile" and "desktop" projects), against the
// TEST database. A learner asks for a callback, then an admin (a second browser context) finds it, changes its status
// and downloads the CSV. Needs network access (Turnstile).
import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { finishQuiz, openChat } from "../support/chat-e2e";
import { e2eAdminPhone, leadsFor } from "../support/e2e";

const screenPhone = (national: string) => `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
const sheetPhone = (national: string) => `91 ${national.slice(0, 5)} ${national.slice(5)}`;

/** A learner finishes the quiz and asks for a callback in the evening. Returns their number. */
async function learnerAsksForCallback(page: Page): Promise<string> {
  const phone = await openChat(page);
  await finishQuiz(page);
  await page.getByTestId("callback-time-evening").click();
  await page.getByTestId("callback-consent").check();
  await page.getByTestId("callback-submit").click();
  await expect(page.getByTestId("callback-done")).toBeVisible();
  return phone;
}

async function adminPage(browser: Browser, projectName: string, repeatEachIndex: number): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Index 0 of each project is used by the auth tests; this spec takes the next one (up to 2 repeat rounds).
  await openChat(page, e2eAdminPhone(projectName, repeatEachIndex + 1));
  return page;
}

test.describe("admin callbacks", () => {
  test.describe.configure({ timeout: 180_000 });

  test("an admin sees the request, changes its status and downloads the CSV", async ({ page, browser }, testInfo) => {
    const phone = await learnerAsksForCallback(page);
    const admin = await adminPage(browser, testInfo.project.name, testInfo.repeatEachIndex);

    await admin.goto("/admin/callbacks");
    await expect(admin.getByRole("heading", { name: "Callbacks", level: 1 })).toBeVisible();
    const row = admin.getByTestId("callbacks-row").filter({ hasText: screenPhone(phone) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Asha"); // the profile name, read live
    await expect(row).not.toContainText("Parent or guardian"); // no minor flow (D79)
    await expect(row).toContainText("Best time: Evening");
    await expect(row.getByTestId("lead-status")).toHaveValue("new");

    // The page fits the screen (the table scrolls inside its card).
    const overflow = await admin.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // Changing the status is saved and shows after the reload from the server.
    await row.getByTestId("lead-status").selectOption("contacted");
    await expect(row.getByTestId("lead-status")).toHaveValue("contacted");
    await expect.poll(async () => (await leadsFor(phone))[0]?.status).toBe("contacted");
    await admin.reload();
    await expect(
      admin
        .getByTestId("callbacks-row")
        .filter({ hasText: screenPhone(phone) })
        .getByTestId("lead-status"),
    ).toHaveValue("contacted");

    // The status tabs filter the list.
    await admin.getByTestId("callbacks-tab-contacted").click();
    await expect(admin).toHaveURL(/status=contacted/);
    await expect(admin.getByTestId("callbacks-row").filter({ hasText: screenPhone(phone) })).toHaveCount(1);
    await admin.getByTestId("callbacks-tab-closed").click();
    await expect(admin.getByTestId("callbacks-row").filter({ hasText: screenPhone(phone) })).toHaveCount(0);

    // The CSV: byte order mark, header, and the phone written as text with a digit first.
    await admin.goto("/admin/callbacks?status=contacted");
    const download = admin.waitForEvent("download");
    await admin.getByTestId("callbacks-download").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^callbacks-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = readFileSync((await file.path())!, "utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Requested at,Status,Name,Phone,Preferred time");
    const line = csv.split("\r\n").find((l) => l.includes(sheetPhone(phone)));
    expect(line, "the request is in the file").toBeDefined();
    expect(line).toContain(`,Contacted,Asha,${sheetPhone(phone)},Evening,`);
    await expect(admin.getByTestId("callbacks-download-note")).toContainText("Downloaded");
    await admin.context().close();
  });

  test("a learner cannot open the callbacks page, not even the raw response", async ({ page }) => {
    await openChat(page);
    const raw = await page.request.get("/admin/callbacks", { maxRedirects: 0 });
    const html = await raw.text();
    expect(html).not.toContain("People who asked us to call them");
    await page.goto("/admin/callbacks");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByText("People who asked us to call them")).toHaveCount(0);
  });

  test("a logged-out visitor is sent to the login page", async ({ request }) => {
    const res = await request.get("/admin/callbacks", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toContain("/login?next=");
  });
});
