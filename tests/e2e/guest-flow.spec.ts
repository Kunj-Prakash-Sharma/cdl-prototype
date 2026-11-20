// The guest quiz and the phone gate in a real browser (D78, D80), against the TEST database.
// Needs network access: the invisible Cloudflare Turnstile widget (dummy keys) loads from Cloudflare.
import { expect, test } from "@playwright/test";
import { answerScored, answerStatus, finishBasics, requestCode, scoredCount, varied } from "../support/chat-e2e";
import { newLearnerPhone } from "../support/e2e";

test.describe("guest quiz", () => {
  test.describe.configure({ timeout: 150_000 });
  test("a guest finishes the quiz, meets the phone gate with a sample, verifies, and then sees the real report", async ({
    page,
  }) => {
    // 1. No login: the Start screen, then the chat at its first question.
    await page.goto("/discover");
    await page.waitForFunction(() => "turnstile" in window);
    await expect(page.getByTestId("guest-start")).toBeVisible();
    await expect(async () => {
      await page.getByRole("button", { name: "Start" }).click();
      await expect(page.getByTestId("choice-0")).toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 40_000 });
    await answerStatus(page); // status first, then the name (D87)

    // 2. Finish the quiz as a guest (the name is typed here, before any account exists).
    await finishBasics(page, "Asha");
    await answerScored(page, scoredCount, varied);
    await expect(page).toHaveURL(/\/discover\/report$/, { timeout: 20_000 });

    // 3. The gate. The page holds a fixed sample only: the guest's own name is nowhere in what the browser received.
    await expect(page.getByTestId("report-gate")).toBeVisible();
    expect(await page.content()).not.toContain("Asha");
    await expect(page.getByText("linked to this number")).toBeVisible();
    // A guest is not "logged in" anywhere else.
    await page.goto("/my-self");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/discover/report");
    await expect(page.getByTestId("report-gate")).toBeVisible(); // still gated after a reload

    // 4. Verify a phone at the gate. The same page now shows the real report, with the callback form.
    const phone = newLearnerPhone();
    const code = await requestCode(page, phone);
    const codeInput = page.getByLabel("6-digit code");
    await expect(async () => {
      await codeInput.fill("");
      await codeInput.fill(code);
      await expect(page.getByTestId("report-gate")).toHaveCount(0, { timeout: 2500 });
    }).toPass({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/discover\/report$/);
    await expect(page.getByTestId("report")).toBeVisible();
    await expect(page.getByTestId("report-callback-button")).toBeVisible();
  });

  test("a verified learner never sees the gate, also after a retake", async ({ page }) => {
    await page.goto("/login?next=%2Fdiscover");
    const phone = newLearnerPhone();
    const code = await requestCode(page, phone);
    const codeInput = page.getByLabel("6-digit code");
    await expect(async () => {
      await codeInput.fill("");
      await codeInput.fill(code);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 2500 });
    }).toPass({ timeout: 20_000 });
    await answerStatus(page);
    await finishBasics(page, "Asha");
    await answerScored(page, scoredCount, varied);
    await expect(page).toHaveURL(/\/discover\/report$/, { timeout: 20_000 });
    await expect(page.getByTestId("report")).toBeVisible();
    await expect(page.getByTestId("report-gate")).toHaveCount(0);
  });
});
