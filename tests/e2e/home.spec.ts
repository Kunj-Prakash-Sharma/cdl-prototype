// Home features that need the backend: the mini-chat answer carried into the quiz (D87) and "Book a free call" with no
// report (D90). Real browser, TEST database, needs network access (Turnstile). Wording is read from the question set.
import { expect, test, type Page } from "@playwright/test";
import { CURRENT_QUESTION_SET } from "../../src/modules/chat/question-set";
import { enterCode, requestCode } from "../support/chat-e2e";
import { leadsFor, newLearnerPhone } from "../support/e2e";

const home = CURRENT_QUESTION_SET.basics.find((b) => b.id === CURRENT_QUESTION_SET.homeQuestionId)!;

async function loginToHome(page: Page): Promise<string> {
  const phone = newLearnerPhone();
  await page.goto("/login?next=%2F");
  const code = await requestCode(page, phone);
  await enterCode(page, code);
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  return phone;
}

test.describe("home", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a visitor who is not logged in is sent to login (and back to Home) to book a call", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("coach-book")).toHaveAttribute("href", "/login?next=%2F");
    // The preview card shows the question set's own options.
    await expect(page.getByTestId("home-replies").getByRole("link")).toHaveCount(home.options.length);
  });

  test("a learner books a call from Home with no report, and the Home answer is not asked again", async ({ page }) => {
    const phone = await loginToHome(page);

    // Book a free call: consent is needed, then one lead is saved.
    // Until the session part streams in, the button is a placeholder that does nothing (never the login link).
    await expect(page.getByTestId("coach-book")).toHaveJSProperty("tagName", "BUTTON");
    await page.getByTestId("coach-book").click();
    await expect(page.getByTestId("coach-submit")).toBeDisabled();
    await page.getByTestId("coach-consent").check();
    await page.getByTestId("coach-submit").click();
    await expect(page.getByTestId("coach-done")).toBeVisible();
    await expect.poll(async () => (await leadsFor(phone)).length).toBe(1);

    // The mini-chat answer goes with the learner into the quiz: shown as answered, the name comes next.
    const picked = home.options[1]!;
    await page.getByTestId("home-replies").getByRole("link", { name: picked.label }).click();
    await expect(page).toHaveURL(/\/discover$/);
    await expect(page.getByTestId("home-answered")).toContainText(picked.label);
    await expect(page.getByTestId("name-input")).toBeVisible();

    // Change asks it again here; a new tap moves on to the name.
    await page.getByTestId("home-answer-change").click();
    await expect(page.getByTestId("choice-0")).toBeVisible();
    await page.getByTestId("choice-0").click();
    await expect(page.getByTestId("name-input")).toBeVisible();
    await expect(page.getByTestId("home-answered")).toHaveCount(0);
  });
});
