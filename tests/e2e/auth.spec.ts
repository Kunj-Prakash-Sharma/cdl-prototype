// Login, guards and admin access in a real browser (375px "mobile" and "desktop" projects), against the TEST database.
// Needs network access: the invisible Cloudflare Turnstile widget (dummy keys) loads from Cloudflare.
import { expect, test, type Page } from "@playwright/test";
import { e2eAdminPhone, latestOtp, newLearnerPhone } from "../support/e2e";

/** Types the number, asks for a code (retrying while the bot-check widget is still loading) and returns the code. */
async function requestCode(page: Page, phone: string): Promise<string> {
  // The login form loads the bot-check script from an effect, so this also means React has hydrated:
  // a click before that would be a plain browser form submit instead of our handler.
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

async function signIn(page: Page, phone: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  const code = await requestCode(page, phone);
  await page.getByLabel("6-digit code").fill(code); // six digits submit on their own
}

/** Desktop has an account menu; the phone layout has the hamburger menu. */
async function logOut(page: Page) {
  const accountMenu = page.getByRole("button", { name: "Account menu" });
  const openMenu = page.getByRole("button", { name: "Open menu" });
  const logOutItem = page.getByRole("menuitem", { name: "Log out" }).or(page.getByRole("button", { name: "Log out" }));
  // A click that lands before React hydrates does nothing, so retry opening the menu until Log out shows.
  await expect(async () => {
    if (!(await logOutItem.isVisible())) {
      await ((await accountMenu.isVisible()) ? accountMenu : openMenu).click();
    }
    await expect(logOutItem).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  await logOutItem.click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("login", () => {
  test("a learner logs in, lands on the chat start, and logs out again", async ({ page }) => {
    await signIn(page, newLearnerPhone());
    await expect(page).toHaveURL(/\/discover$/);

    await logOut(page);
    await page.goto("/my-self");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-self/);
  });

  test("a guarded page sends you to login and brings you back after", async ({ page }) => {
    await page.goto("/my-self");
    await expect(page).toHaveURL(/\/login\?next=%2Fmy-self$/);
    const code = await requestCode(page, newLearnerPhone());
    await page.getByLabel("6-digit code").fill(code);
    await expect(page).toHaveURL(/\/my-self$/);
  });

  test("an unsafe ?next= is ignored", async ({ page }) => {
    await signIn(page, newLearnerPhone(), "https://evil.example/steal");
    await expect(page).toHaveURL(/localhost:\d+\/discover$/);
  });

  test("a logged-in visitor is moved away from the login page", async ({ page }) => {
    await signIn(page, newLearnerPhone());
    await expect(page).toHaveURL(/\/discover$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/discover$/);
  });

  test("a number that cannot be Indian explains why Send is off", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Mobile number").fill("1231231231");
    await expect(page.getByText(/start with 6, 7, 8 or 9/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send code" })).toBeDisabled();
  });

  test("shows the resend countdown and lets you change the number", async ({ page }) => {
    const phone = newLearnerPhone();
    await page.goto("/login");
    await requestCode(page, phone);
    await expect(page.getByText(/Resend in \d+s/)).toBeVisible();
    await page.getByRole("button", { name: "Change number" }).click();
    await expect(page.getByLabel("Mobile number")).toHaveValue(phone);
  });

  test("a wrong code is explained, and five wrong codes lock the number", async ({ page }) => {
    const phone = newLearnerPhone();
    await page.goto("/login");
    const real = await requestCode(page, phone);
    const wrong = real === "000000" ? "111111" : "000000";
    const codeInput = page.getByLabel("6-digit code");

    await codeInput.fill(wrong);
    await expect(page.getByText("That code is not right")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    for (let i = 0; i < 4; i++) {
      await codeInput.fill(wrong);
      await expect(codeInput).toHaveValue(""); // cleared after each refusal
    }
    await expect(page.getByText(/Too many wrong codes/)).toBeVisible();

    // locked: even the right code is refused
    await codeInput.fill(real);
    await expect(page.getByText(/Too many wrong codes/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("guards", () => {
  // The proxy only checks that a session cookie EXISTS. A forged one must still never reveal a protected page.
  const protectedPages = [
    { path: "/my-self", secret: "Pick up right where you left off." },
    { path: "/discover", secret: "all on this page" },
    { path: "/admin/users", secret: "newest first" },
  ];

  test("a forged session cookie never shows a protected page", async ({ page, context, request, baseURL }) => {
    const forged = "better-auth.session_token=forged-value.forged-signature";
    await context.addCookies([
      { name: "better-auth.session_token", value: "forged-value.forged-signature", url: baseURL! },
    ]);

    for (const { path, secret } of protectedPages) {
      // raw server response, no browser: the protected content must not be in it
      const raw = await request.get(path, { headers: { cookie: forged }, maxRedirects: 0 });
      expect(await raw.text(), `${path} leaked protected content to a forged cookie`).not.toContain(secret);

      await page.goto(path);
      await expect(page, `${path} should end at the login page`).toHaveURL(/\/login/);
      await expect(page.getByText(secret)).toHaveCount(0);
    }
  });

  test("a logged-out visitor is redirected by the proxy before anything renders", async ({ request }) => {
    for (const { path } of protectedPages) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers().location, path).toContain("/login?next=");
    }
  });
});

test.describe("admin", () => {
  test("a learner who opens /admin is sent home and sees nothing", async ({ page }) => {
    await signIn(page, newLearnerPhone());
    await expect(page).toHaveURL(/\/discover$/);
    // the raw response (no browser): not even the admin shell may be sent to a learner. The service re-checks the
    // role too, so a weakened layout guard alone would not leak data; this catches the layout guard on its own.
    const raw = await page.request.get("/admin/users", { maxRedirects: 0 });
    const html = await raw.text();
    expect(html).not.toContain("Back to the learner site");
    expect(html).not.toContain("newest first");

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByText("newest first")).toHaveCount(0);
  });

  test("an admin sees the user list in the admin shell, then logs out", async ({ page }, testInfo) => {
    await signIn(page, e2eAdminPhone(testInfo.project.name, testInfo.repeatEachIndex));
    await expect(page).toHaveURL(/\/discover$/); // wait for the login to finish before navigating away
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/users$/);

    await expect(page.getByRole("heading", { name: "Users", level: 1 })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("cell", { name: /^\+91\*+\d{4}$/ }).first()).toBeVisible(); // masked phone
    await expect(page.getByText(/\+91[6-9]\d{9}/)).toHaveCount(0); // raw numbers never shown
    await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0); // no public navbar here

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // search narrows the list; a wildcard is just text
    await page.getByLabel("Search users by name or number").fill("%");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=%25/);
    await expect(page.getByText("No users match these filters")).toBeVisible();

    // log out from the admin shell (phone: open the menu first)
    const menu = page.locator("summary");
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
  });
});
