// The free report at /discover/report in a real browser (375px "mobile" and "desktop" projects), against the TEST
// database. Needs network access (Turnstile). Wording is read from the page, never hardcoded here.
import { expect, test } from "@playwright/test";
import { finishQuiz, openChat } from "../support/chat-e2e";
import { leadsFor } from "../support/e2e";

test.describe("report", () => {
  // A full quiz takes about half a minute (each question slides out and in).
  test.describe.configure({ timeout: 150_000 });

  test("after the quiz the learner opens a complete report, and it prints without the navbar", async ({ page }) => {
    await openChat(page);
    await finishQuiz(page);

    await expect(page).toHaveURL(/\/discover\/report$/);
    await expect(page.getByTestId("report")).toBeVisible();

    // The draft wording is flagged, every section is there, and the safety line and footer are on the page.
    await expect(page.getByTestId("report-draft")).toBeVisible();
    for (const section of ["interests", "traits", "courses"]) {
      await expect(page.getByTestId(`report-${section}`)).toBeVisible();
    }
    await expect(page.getByTestId("report-try-first")).toBeVisible();
    await expect(page.locator('[data-testid^="report-trait-"]')).toHaveCount(5);
    await expect(page.getByTestId("report-footer")).toContainText("not a diagnosis");
    await expect(page.getByTestId("report").getByTestId("helpline")).toBeVisible();
    // Nothing the scope forbids (D72): no aptitude, work values, fit percentage or salary.
    const text = (await page.getByTestId("report").innerText()).toLowerCase();
    for (const banned of ["aptitude", "work values", "% fit", "salary", "neurotic"]) expect(text).not.toContain(banned);

    // Reloading keeps the report (it is built from the saved result).
    await page.reload();
    await expect(page.getByTestId("report-interests")).toBeVisible();

    // On screen the navbar and the buttons are there; for print they are hidden and the report stays.
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByTestId("report-print")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByTestId("report-print")).toBeHidden();
    await expect(page.getByTestId("report-callback-button")).toBeHidden();
    await expect(page.getByTestId("report-interests")).toBeVisible();
  });

  test("a learner with no finished attempt sees the empty state, and the navbar has the report link", async ({
    page,
  }) => {
    await openChat(page);
    await page.goto("/discover/report");
    await expect(page.getByTestId("report-empty")).toBeVisible();
    await expect(page.getByTestId("report")).toHaveCount(0);
    // The navbar link exists on desktop (the phone menu is covered by the same list of links).
    const link = page.getByRole("link", { name: "My Report" });
    if (await link.first().isVisible()) await expect(link.first()).toHaveAttribute("href", "/discover/report");
  });

  test("My SELF links to the saved report once the quiz is finished (E5-S4)", async ({ page }) => {
    await openChat(page);
    await page.goto("/my-self");
    await expect(page.getByTestId("my-report-link")).toHaveAttribute("href", "/discover");

    await page.goto("/discover");
    await finishQuiz(page);
    await page.goto("/my-self");
    const link = page.getByTestId("my-report-link");
    await expect(link).toHaveAttribute("href", "/discover/report");
    // Hydration may not be done yet: retry the click until the report opens.
    await expect(async () => {
      await link.click();
      await expect(page.getByTestId("report")).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 15_000 });
  });

  test("a parent asks for a callback: the form needs consent, a repeat request keeps one lead", async ({ page }) => {
    const phone = await openChat(page);
    await finishQuiz(page); // the first age answer is under 15, so a parent is the contact
    await expect(page.getByTestId("callback-form")).toBeVisible();

    // The consent text is the parent or guardian wording, and the button waits for the tick.
    await expect(page.getByTestId("callback")).toContainText("parent or guardian");
    await expect(page.getByTestId("callback-submit")).toBeDisabled();
    await page.getByTestId("callback-time-evening").click();
    await page.getByTestId("callback-consent").check();
    await expect(page.getByTestId("callback-submit")).toBeEnabled();
    await page.getByTestId("callback-submit").click();
    await expect(page.getByTestId("callback-done")).toBeVisible();

    const [first, ...others] = await leadsFor(phone);
    expect(others).toHaveLength(0);
    expect(first).toMatchObject({ status: "new", contact_role: "parent", preferred_time: "evening" });
    expect(first!.consent_version).toContain("draft");

    // Asking again (a nervous second tap, or a new visit) gives the same confirmation and still one lead.
    await page.reload();
    await page.getByTestId("callback-consent").check();
    await page.getByTestId("callback-submit").click();
    await expect(page.getByTestId("callback-done")).toBeVisible();
    expect(await leadsFor(phone)).toHaveLength(1);
  });

  test("an adult asks for a callback with the learner wording and no preferred time", async ({ page }) => {
    const phone = await openChat(page);
    await finishQuiz(page, 2); // "18 to 21"
    await expect(page.getByTestId("callback-form")).toBeVisible();
    await expect(page.getByTestId("callback")).not.toContainText("parent or guardian");
    await page.getByTestId("callback-consent").check();
    await page.getByTestId("callback-submit").click();
    await expect(page.getByTestId("callback-done")).toBeVisible();
    const [lead] = await leadsFor(phone);
    expect(lead).toMatchObject({ contact_role: "learner", preferred_time: null });
  });

  test("the report's callback button jumps to the form", async ({ page }) => {
    await openChat(page);
    await finishQuiz(page);
    await page.getByTestId("report-callback-button").click();
    await expect(page).toHaveURL(/#callback$/);
    await expect(page.getByTestId("callback-form")).toBeInViewport();
  });
});
