// The chat screens at /discover in a real browser (375px "mobile" and "desktop" projects), against the TEST database.
// Needs network access: the invisible Cloudflare Turnstile widget (dummy keys) loads from Cloudflare.
// Counts and stages are derived from CURRENT_QUESTION_SET, never hardcoded.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { CURRENT_QUESTION_SET } from "../../src/modules/chat/question-set";
import { latestOtp, newLearnerPhone } from "../support/e2e";

const items = CURRENT_QUESTION_SET.items;
const lastStage = items[items.length - 1]!.stage;
// Items are asked in set order, so the last part is the trailing run of items with the last item's stage.
const lastPartSize = items.filter((item) => item.stage === lastStage).length;
const scoredCount = items.length;
const basicsCount = CURRENT_QUESTION_SET.basics.length;

/** Varied on purpose: no run of the same value, so no part is all-same (needs at least 2 questions per part). */
const varied = (i: number) => (i % 5) + 1;

async function requestCode(page: Page, phone: string): Promise<string> {
  await page.waitForFunction(() => "turnstile" in window);
  await page.getByLabel("Mobile number").fill(phone);
  const codeInput = page.getByLabel("6-digit code");
  const botCheckError = page.getByText("We could not verify you are human");
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByRole("button", { name: "Send code" }).click();
    const outcome = await Promise.race([
      codeInput.waitFor({ state: "visible", timeout: 15_000 }).then(() => "code"),
      botCheckError.waitFor({ state: "visible", timeout: 15_000 }).then(() => "bot-check"),
    ]);
    if (outcome === "code") return latestOtp(phone);
    await page.waitForTimeout(800);
  }
  throw new Error("the bot check never produced a token");
}

/** Logs in with a fresh number and opens the chat at the name step. */
async function openChat(page: Page) {
  await page.goto("/login?next=%2Fdiscover");
  const code = await requestCode(page, newLearnerPhone());
  await page.getByLabel("6-digit code").fill(code);
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByTestId("name-input")).toBeVisible();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = (s: string) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`);

/** Clicks an answer button and waits until the screen has moved on (new progress and, for scale, new question). */
async function answerWith(page: Page, button: Locator) {
  const progress = page.getByTestId("progress");
  const questionText = page.getByTestId("question-text");
  const beforeProgress = (await progress.textContent()) ?? "";
  const beforeQuestion = (await questionText.count()) ? ((await questionText.textContent()) ?? "") : null;
  await button.click();
  const terminal = page.getByTestId("finishing").or(page.getByTestId("result")).or(page.getByTestId("retry"));
  const moved = beforeQuestion
    ? questionText.filter({ hasNotText: exact(beforeQuestion) })
    : progress.filter({ hasNotText: exact(beforeProgress) });
  await expect(moved.or(terminal).first()).toBeVisible();
}

async function sendName(page: Page, name: string) {
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("name-send").click();
}

/** Name and the tap questions, ending on the first scored question. */
async function finishBasics(page: Page, name = "Asha") {
  await sendName(page, name);
  for (let i = 0; i < basicsCount; i++) {
    await answerWith(page, page.getByTestId("choice-0"));
  }
  await expect(page.getByTestId("question-text")).toBeVisible();
}

/** Answers `count` scored questions; value(i) gives the i-th answer (0-based within this call). */
async function answerScored(page: Page, count: number, value: (i: number) => number) {
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId("question-text")).toBeVisible();
    await expect(page.getByTestId("helpline")).toBeVisible();
    await answerWith(page, page.getByTestId(`scale-${value(i)}`));
  }
}

async function finishQuiz(page: Page) {
  await finishBasics(page);
  await answerScored(page, scoredCount, varied);
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 20_000 });
}

test.describe("chat", () => {
  test("a learner answers every question and reaches the saved result", async ({ page }) => {
    await openChat(page);
    await expect(page.getByTestId("helpline")).toBeVisible();

    await finishBasics(page);
    await expect(page.getByTestId("helpline")).toBeVisible();
    await answerScored(page, scoredCount, varied);

    await expect(page.getByTestId("result")).toBeVisible({ timeout: 20_000 });
    const parsed: unknown = JSON.parse((await page.getByTestId("result-json").textContent()) ?? "");
    expect(parsed).toEqual(expect.any(Object));
    expect(parsed).not.toBeNull();
    expect(Array.isArray(parsed)).toBe(false);
    await expect(page.getByTestId("helpline")).toBeVisible();
  });

  test("reloading in the middle shows the same question and progress", async ({ page }) => {
    await openChat(page);
    await finishBasics(page);
    await answerScored(page, 3, varied);

    const text = await page.getByTestId("question-text").textContent();
    const progress = await page.getByTestId("progress").textContent();
    expect(text).toBeTruthy();

    await page.reload();
    await expect(page.getByTestId("question-text")).toBeVisible();
    await expect(page.getByTestId("question-text")).toHaveText(text!);
    await expect(page.getByTestId("progress")).toHaveText(progress!);
  });

  test("a self-harm phrase as the name stops the quiz and shows the helpline; start again begins anew", async ({
    page,
  }) => {
    await openChat(page);
    await sendName(page, "I want to die");
    await expect(page.getByTestId("stop-screen")).toBeVisible();
    await expect(page.getByTestId("helpline")).toBeVisible();
    await expect(page.getByTestId("name-input")).toHaveCount(0);

    await page.getByTestId("restart-button").click();
    await expect(page.getByTestId("name-input")).toBeVisible();
    await expect(page.getByTestId("stop-screen")).toHaveCount(0);
  });

  test("an abuse word as the name is refused with a message; a real name then works", async ({ page }) => {
    await openChat(page);
    await sendName(page, "idiot");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("name-input")).toBeVisible();
    await expect(page.getByTestId("stop-screen")).toHaveCount(0);

    await sendName(page, "Asha");
    await expect(page.getByTestId("choice-0")).toBeVisible();
    await expect(page.getByTestId("name-input")).toHaveCount(0);
  });

  test("a look-alike name with a Cyrillic letter is refused with a message", async ({ page }) => {
    await openChat(page);
    await sendName(page, "ѕuicide"); // Cyrillic small dze looks like Latin "s"
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByTestId("stop-screen")).toHaveCount(0);
    await expect(page.getByTestId("name-input")).toBeVisible();
  });

  test("all-same answers in the last part ask that part again, then the result appears", async ({ page }) => {
    await openChat(page);
    await finishBasics(page);
    await answerScored(page, scoredCount - lastPartSize, varied);
    await answerScored(page, lastPartSize, () => 3);

    await expect(page.getByTestId("retry")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("helpline")).toBeVisible();
    await page.getByTestId("retry-button").click();
    await expect(page.getByTestId("question-text")).toBeVisible();
    // Only the last part is asked again: the progress is back to everything before that part.
    await expect(page.getByTestId("progress")).toHaveText(
      new RegExp(`^\\s*${basicsCount + 1 + scoredCount - lastPartSize} of `),
    );

    await answerScored(page, lastPartSize, varied);
    await expect(page.getByTestId("result")).toBeVisible({ timeout: 20_000 });
  });

  test("after finishing, a reload shows the saved result and Take it again starts a new attempt", async ({ page }) => {
    await openChat(page);
    await finishQuiz(page);

    await page.reload();
    await expect(page.getByTestId("result")).toBeVisible();
    const retake = page.getByTestId("retake-button");
    await expect(retake).toBeVisible();

    // The page is server-rendered, so a click before React hydrates does nothing: retry until the screen moves.
    const nextScreen = page.getByTestId("choice-0").or(page.getByTestId("question-text"));
    await expect(async () => {
      if (await retake.isVisible()) await retake.click();
      await expect(nextScreen).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByTestId("name-input")).toHaveCount(0);
    await expect(page.getByTestId("result")).toHaveCount(0);
  });

  test("mobile: a scale question has no sideways scroll and big enough buttons", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "the 375px layout check only applies to the mobile project");
    await openChat(page);
    await finishBasics(page);
    const buttons = page.locator('[data-testid^="scale-"]');
    await expect(buttons.first()).toBeVisible();
    // Let the slide-in animation finish before measuring.
    await expect(page.getByTestId("question-text")).toBeVisible();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 500))));

    const noSideScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noSideScroll).toBe(true);

    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      expect(box, `scale button ${i + 1} has a box`).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
