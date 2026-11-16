// The admin login page at /admin/login in a real browser (375px "mobile" and "desktop" projects), against the TEST
// database (D77). Admins are made with the real script. Needs network access (the Turnstile widget loads from Cloudflare).
import { expect, test, type Page } from "@playwright/test";
import { createEmailAdmin } from "../support/e2e";

const WRONG = "That email or password is not right.";

/** Fills the form and submits. The invisible bot check can be slow to start, so a "not verified" answer is retried. */
async function logInAs(page: Page, email: string, password: string) {
  await page.waitForFunction(() => "turnstile" in window);
  await page.getByLabel("Email").fill(email);
  const submit = page.getByRole("button", { name: "Log in" });
  const botCheckError = page.getByText("We could not verify you are human");
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByLabel("Password").fill(password);
    await submit.click();
    const outcome = await Promise.race([
      page.waitForURL(/\/admin\/(?!login)/, { timeout: 15_000 }).then(() => "in"),
      page
        .getByText(WRONG)
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "wrong"),
      botCheckError.waitFor({ state: "visible", timeout: 15_000 }).then(() => "bot-check"),
    ]);
    if (outcome !== "bot-check") return;
    await page.waitForTimeout(800);
  }
  throw new Error("the bot check never produced a token");
}

test.describe("admin login", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a logged-out visitor to an admin page lands on the admin login (no redirect loop) and can use a phone instead", async ({
    page,
  }) => {
    await page.goto("/admin/callbacks");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fcallbacks$/);
    await expect(page.getByRole("heading", { name: "Admin login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Use a code" })).toHaveAttribute(
      "href",
      "/login?next=%2Fadmin%2Fcallbacks",
    );
    // Stays put: nothing redirects the login page to itself.
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("the right email and password open the admin area and the session survives a reload", async ({ page }) => {
    const { email, password } = createEmailAdmin();
    await page.goto("/admin/login");
    await logInAs(page, email, password);
    await expect(page).toHaveURL(/\/admin\/callbacks$/);
    await expect(page.getByRole("heading", { name: "Callbacks", level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Callbacks", level: 1 })).toBeVisible();
    // Already logged in: the login page sends an admin straight on.
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin\/callbacks$/);
  });

  test("a wrong password and an unknown email give the same message and stay on the page", async ({ page }) => {
    const { email } = createEmailAdmin();
    await page.goto("/admin/login");
    await logInAs(page, email, "definitely-not-the-password");
    await expect(page.getByText(WRONG)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByLabel("Email").fill("nobody-here@example.com");
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(WRONG)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("goes where ?next= says after logging in", async ({ page }) => {
    const { email, password } = createEmailAdmin();
    await page.goto("/admin/login?next=%2Fadmin%2Fusers");
    await logInAs(page, email, password);
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("mobile: the form fits the screen and its buttons are big enough to tap", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const target of [
      page.getByLabel("Email"),
      page.getByLabel("Password"),
      page.getByRole("button", { name: "Log in" }),
    ]) {
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
