import assert from "node:assert/strict";
import test from "node:test";

import { createGame, input, renderGameToText, step } from "../src/game-core.js";

test("createGame initializes deterministic state", () => {
  const state = createGame(1234);
  assert.equal(state.mode, "aiming");
  assert.equal(state.players.length, 2);
  assert.equal(state.currentPlayerIndex, 0);
  assert.match(renderGameToText(state), /mode=aiming/);
});

test("banana throw transitions to flying then resolves turn", () => {
  const state = createGame(99);
  input(state, "throwBanana");
  assert.equal(state.mode, "flying");

  for (let i = 0; i < 240; i += 1) {
    step(state, 16.6667);
    if (state.mode === "aiming" || state.mode === "gameover") {
      break;
    }
  }

  assert.ok(state.mode === "aiming" || state.mode === "gameover");
  assert.equal(typeof state.scores[0], "number");
  assert.equal(typeof state.scores[1], "number");
});

test("pause prevents physics advancement until resumed", () => {
  const state = createGame(77);
  input(state, "throwBanana");
  const beforeX = state.banana.x;
  input(state, "togglePause");
  step(state, 1000);
  assert.equal(state.banana.x, beforeX);
  input(state, "togglePause");
  step(state, 1000);
  assert.notEqual(state.banana.x, beforeX);
});
