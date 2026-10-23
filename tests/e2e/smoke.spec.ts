import { expect, test } from "@playwright/test";

test("home loads and the discovery CTA is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /start free career discovery/i }).first()).toBeVisible();
});

test("no horizontal scroll on the home page", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
