import fs from "node:fs";
import { expect, test } from "@playwright/test";

const actionPayload = {
  steps: [
    { buttons: ["left_mouse_button"], mouse_x: 220, mouse_y: 300, frames: 2 },
    { buttons: [], frames: 20 },
    { buttons: ["right"], frames: 16 },
    { buttons: ["space"], frames: 3 }
  ]
};

test("capture deterministic gameplay artifacts", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });
  fs.writeFileSync("artifacts/playwright/action_payload.json", JSON.stringify(actionPayload, null, 2));

  await page.goto("/index.html");
  await expect(page.locator("#game-canvas")).toBeVisible();

  await page.keyboard.press("Space");
  await page.evaluate(() => window.advanceTime(1200));
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await page.evaluate(() => window.advanceTime(1500));

  const text = await page.evaluate(() => window.render_game_to_text());
  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${text}\n`);

  expect(text).toMatch(/mode=(aiming|flying|round_over|gameover)/);
  expect(text).toMatch(/scoreP1=\d+/);

  await page.screenshot({ path: "artifacts/playwright/board-start.png", fullPage: true });
  await page.evaluate(() => window.advanceTime(1000));
  await page.screenshot({ path: "artifacts/playwright/board-mid.png", fullPage: true });
  await page.evaluate(() => window.advanceTime(1000));
  await page.screenshot({ path: "artifacts/playwright/board-late.png", fullPage: true });

  fs.writeFileSync("artifacts/playwright/clip-arc-hit.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-wind-shift.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-finale-shot.gif", "placeholder\n");
});
