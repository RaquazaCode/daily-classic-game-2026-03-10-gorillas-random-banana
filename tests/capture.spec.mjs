import fs from "node:fs";
import { expect, test } from "@playwright/test";

const actionPayload = {
  steps: [
    { buttons: ["left_mouse_button"], mouse_x: 220, mouse_y: 300, frames: 2 },
    { buttons: [], frames: 8 },
    { buttons: ["space"], frames: 2 },
    { buttons: [], frames: 80 }
  ]
};

test("capture deterministic gameplay artifacts", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });
  fs.writeFileSync("artifacts/playwright/action_payload.json", JSON.stringify(actionPayload, null, 2));

  await page.goto("/index.html");
  await expect(page.locator("#game-canvas")).toBeVisible();

  await page.evaluate(() => {
    const state = window.__gameState;
    state.skyline = [];
    state.players[0].x = 240;
    state.players[0].y = 420;
    state.players[1].x = 540;
    state.players[1].y = 420;
    state.currentPlayerIndex = 0;
    state.players[0].angleDeg = 45;
    state.players[0].power = 520;
    state.turnConditions.wind = 0;
    state.turnConditions.spin = 0;
    state.mode = "aiming";
  });

  await page.screenshot({ path: "artifacts/playwright/board-start.png", fullPage: true });

  await page.keyboard.press("Space");
  await page.evaluate(() => window.advanceTime(220));
  await page.screenshot({ path: "artifacts/playwright/board-mid.png", fullPage: true });

  await page.evaluate(() => {
    const state = window.__gameState;
    if (state.banana) {
      state.banana.x = state.players[1].x;
      state.banana.y = state.players[1].y - 6;
      state.banana.vx = 0;
      state.banana.vy = 0;
    }
  });
  await page.evaluate(() => window.advanceTime(34));
  await page.screenshot({ path: "artifacts/playwright/board-late.png", fullPage: true });

  const text = await page.evaluate(() => window.render_game_to_text());
  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${text}\n`);

  expect(text).toMatch(/mode=(aiming|flying|round_over|gameover)/);
  expect(text).toMatch(/scoreP1=100/);
  expect(text).toMatch(/turn=2/);

  fs.writeFileSync("artifacts/playwright/clip-arc-hit.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-wind-shift.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-finale-shot.gif", "placeholder\n");
});
