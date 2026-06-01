import { test, expect } from "@playwright/test";

const GAMES = ["kettletris", "backlog", "steamrunner"];

for (const game of GAMES) {
  test.describe(game, () => {
    test("loads, starts, exposes the gamepad — no console errors", async ({ page }) => {
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto(`/${game}.html`);
      await expect(page.locator("#game-canvas")).toBeVisible();
      expect(await page.evaluate(() => typeof window.KLGameCommon)).toBe("object");

      await page.locator("#game-start-btn").click();
      await expect(page.locator(".pad")).toBeVisible();
      await expect(page.locator(".pad__sys [data-kl-fullscreen]")).toBeVisible();

      await page.locator(".facebtn").first().click(); // rotate / sweep / jump
      await page.waitForTimeout(600);
      expect(errors).toEqual([]);
    });

    test("game-over overlay shows on loss, Play again hides it", async ({ page }) => {
      await page.goto(`/${game}.html`);
      await page.locator("#game-start-btn").click();
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("kl-game-quit")));
      await expect(page.locator("#game-over")).toBeVisible();
      await page.locator("#game-over [data-kl-restart]").click();
      await expect(page.locator("#game-over")).toBeHidden();
    });

    test("fullscreen button enters immersive mode", async ({ page }) => {
      await page.goto(`/${game}.html`);
      await page.locator("[data-kl-fullscreen]").first().click();
      await expect(page.locator("body")).toHaveClass(/kl-immersive/);
    });
  });
}

test("steamrunner: score advances while playing", async ({ page }) => {
  await page.goto("/steamrunner.html");
  await page.locator("#game-start-btn").click();
  await page.waitForTimeout(800);
  const score = await page.evaluate(() =>
    parseInt(document.getElementById("game-score").textContent, 10),
  );
  expect(score).toBeGreaterThan(0);
});
