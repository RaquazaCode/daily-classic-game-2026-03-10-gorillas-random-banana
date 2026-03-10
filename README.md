# daily-classic-game-2026-03-10-gorillas-random-banana

<div align="center">
  <p>Deterministic Gorillas-style artillery duel with seeded random banana arc perturbations each round.</p>
</div>

<div align="center">
  <p><strong>Media</strong>: Screenshots, clips, action payload, and text-state captures are in <code>artifacts/playwright/</code>.</p>
</div>

## Quick Start
1. `pnpm install`
2. `pnpm test`
3. `pnpm build`
4. `pnpm dev` then open `http://127.0.0.1:4173/index.html`

## How To Play
- `Arrow Left/Right`: decrease/increase aim angle
- `Arrow Up/Down`: increase/decrease throw power
- `Space`: throw banana
- `P`: pause or resume
- `R`: reset match
- `Enter`: restart after game over

## Rules
- Two gorillas stand on randomized rooftops.
- Only the active gorilla can throw.
- Bananas collide with skyline blocks and gorillas.
- First player to reach target score wins the match.

## Scoring
- Hit opposing gorilla: +100 points
- Building impact: 0 points and turn changes
- Out-of-bounds throw: 0 points and turn changes

## Twist
Random banana physics: each round samples deterministic wind and spin factors from seeded RNG, changing arc behavior while keeping test runs reproducible.

## Verification
- Unit simulation checks: `pnpm test`
- Static build output: `pnpm build`
- Playwright artifact capture: `pnpm capture`

## Project Layout
- `src/` game loop, deterministic rules, rendering, browser hooks
- `tests/` simulation tests and Playwright artifact capture
- `scripts/` build copy pipeline
- `assets/` static assets
- `docs/plans/` implementation plan
- `artifacts/playwright/` screenshots, clips, and text-state dumps

## GIF Captures
- Clip 1 - Arc Hit: `artifacts/playwright/clip-arc-hit.gif`
- Clip 2 - Wind Shift: `artifacts/playwright/clip-wind-shift.gif`
- Clip 3 - Finale Shot: `artifacts/playwright/clip-finale-shot.gif`
