// Shared steps for the browser tests that need a learner who has finished the quiz (report, callbacks).
// Copied from chat.spec.ts on purpose so that file stays untouched; merge the two when the chat tests are next edited.
// Needs network access: the invisible Cloudflare Turnstile widget (dummy keys) loads from Cloudflare.
import { expect, type Locator, type Page } from "@playwright/test";
import { CURRENT_QUESTION_SET } from "../../src/modules/chat/question-set";
import { latestOtp, newLearnerPhone } from "./e2e";

const items = CURRENT_QUESTION_SET.items;
export const scoredCount = items.length;
export const basicsCount = CURRENT_QUESTION_SET.basics.length;

/** Varied on purpose: no run of the same value, so no part is all-same (needs at least 2 questions per part). */
export const varied = (i: number) => (i % 5) + 1;

export async function requestCode(page: Page, phone: string): Promise<string> {
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

/** Logs in with a fresh number and opens the chat at the name step (the status question is answered on the way). */
export async function openChat(page: Page, phone: string = newLearnerPhone()): Promise<string> {
  await page.goto("/login?next=%2Fdiscover");
  const code = await requestCode(page, phone);
  // Six digits submit on their own, but not before React has hydrated: under load the first fill can do nothing, so
  // type the code again until the login page has moved on.
  const codeInput = page.getByLabel("6-digit code");
  await expect(async () => {
    await codeInput.fill("");
    await codeInput.fill(code);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 2500 });
  }).toPass({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/discover$/, { timeout: 15_000 });
  await answerStatus(page);
  // The guide says what it is before asking anything (E4-S1: a virtual guide, not a human).
  await expect(page.getByText("virtual guide, not a human")).toBeVisible();
  return phone;
}

export async function answerStatus(page: Page) {
  // A learner who already answered it (a number reused by an earlier run) is waiting at the name step: nothing to tap.
  const name = page.getByTestId("name-input");
  const status = page.getByTestId("choice-0");
  await expect(name.or(status)).toBeVisible();
  if (!(await name.isVisible())) await answerWith(page, status);
  await expect(name).toBeVisible();
}

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const exact = (s: string) => new RegExp(`^\\s*${escapeRe(s)}\\s*$`);

/** Clicks an answer button and waits until the screen has moved on (new progress and, for scale, new question). */
export async function answerWith(page: Page, button: Locator) {
  const progress = page.getByTestId("progress");
  const questionText = page.getByTestId("question-text");
  const beforeProgress = (await progress.textContent()) ?? "";
  const beforeQuestion = (await questionText.count()) ? ((await questionText.textContent()) ?? "") : null;
  await button.click();
  const terminal = page
    .getByTestId("finishing")
    .or(page.getByTestId("result"))
    .or(page.getByTestId("report"))
    .or(page.getByTestId("retry"));
  const moved = beforeQuestion
    ? questionText.filter({ hasNotText: exact(beforeQuestion) })
    : progress.filter({ hasNotText: exact(beforeProgress) });
  await expect(moved.or(terminal).first()).toBeVisible();
}

export async function sendName(page: Page, name: string) {
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("name-send").click();
}

/**
 * Name and the remaining tap questions (the status was answered before the name), ending on the first scored question. `ageIndex` is the position of the answer to the
 * first tap question (age). Every age takes the same path (D79).
 */
export async function finishBasics(page: Page, name = "Asha", ageIndex = 0) {
  await sendName(page, name);
  // The status question was answered before the name (D87), so the age comes first here.
  for (let i = 0; i < basicsCount - 1; i++) {
    await answerWith(page, page.getByTestId(`choice-${i === 0 ? ageIndex : 0}`));
  }
  await expect(page.getByTestId("question-text")).toBeVisible();
}

/** Answers `count` scored questions; value(i) gives the i-th answer (0-based within this call). */
export async function answerScored(page: Page, count: number, value: (i: number) => number) {
  for (let i = 0; i < count; i++) {
    await expect(page.getByTestId("question-text")).toBeVisible();
    await expect(page.getByTestId("helpline")).toBeVisible();
    await answerWith(page, page.getByTestId(`scale-${value(i)}`));
  }
}

export async function finishQuiz(page: Page, ageIndex = 0) {
  await finishBasics(page, "Asha", ageIndex);
  await answerScored(page, scoredCount, varied);
  // Finishing opens the report by itself (E4-S11).
  await expect(page).toHaveURL(/\/discover\/report$/, { timeout: 20_000 });
  await expect(page.getByTestId("report")).toBeVisible();
}
