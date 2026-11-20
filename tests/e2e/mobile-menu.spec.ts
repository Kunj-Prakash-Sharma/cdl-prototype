// The phone menu: it dims and locks the page behind it, and closes on Escape, on a tap outside, and on navigation.
import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "the hamburger menu only exists in the phone layout");
});

async function openMenu(page: Page) {
  await page.goto("/");
  const button = page.getByRole("button", { name: /menu/i });
  // A click before React hydrates does nothing, so retry until the menu reports open.
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
}

const pageScrollLocked = (page: Page) => page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");

test("opening the menu locks the page behind it, and closing it unlocks", async ({ page }) => {
  await openMenu(page);
  expect(await pageScrollLocked(page)).toBe(true);
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.getByRole("link", { name: "Level 1 Learning" })).toBeHidden();
  expect(await pageScrollLocked(page)).toBe(false);
});

test("Escape closes the menu and returns focus to its button", async ({ page }) => {
  await openMenu(page);
  await page.keyboard.press("Escape");
  const button = page.getByRole("button", { name: "Open menu" });
  await expect(button).toBeVisible();
  await expect(button).toBeFocused();
  expect(await pageScrollLocked(page)).toBe(false);
});

test("a tap on the dimmed page closes the menu", async ({ page }) => {
  await openMenu(page);
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width / 2, viewport.height - 20); // far below the menu panel
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(await pageScrollLocked(page)).toBe(false);
});

test("choosing a link closes the menu and unlocks the page", async ({ page }) => {
  await openMenu(page);
  await page.getByRole("link", { name: "Level 1 Learning" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  expect(await pageScrollLocked(page)).toBe(false);
});
