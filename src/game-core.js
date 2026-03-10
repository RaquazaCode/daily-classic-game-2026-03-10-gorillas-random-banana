const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;
const GRAVITY = 520;
const TARGET_SCORE = 300;
const STEP_MS = 1000 / 120;

function createRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildSkyline(rng) {
  const widths = [66, 74, 82, 90, 98];
  const heights = [150, 180, 210, 240, 270, 300, 330];
  const buildings = [];
  let x = 0;

  while (x < WORLD_WIDTH) {
    const width = widths[Math.floor(rng() * widths.length)];
    const height = heights[Math.floor(rng() * heights.length)];
    const cappedWidth = Math.min(width, WORLD_WIDTH - x);
    const topY = WORLD_HEIGHT - height;
    buildings.push({ x, y: topY, width: cappedWidth, height });
    x += cappedWidth;
  }

  return buildings;
}

function pickSpawn(buildings, side) {
  const count = buildings.length;
  const index = side === 0 ? Math.floor(count * 0.18) : Math.floor(count * 0.78);
  const building = buildings[clamp(index, 1, count - 2)];
  const x = building.x + building.width / 2;
  const y = building.y - 16;
  return { x, y, radius: 14 };
}

function makeTurnConditions(state) {
  const wind = (state.rng() * 2 - 1) * 36;
  const spin = (state.rng() * 2 - 1) * 24;
  return { wind, spin };
}

function resetPlayerAim(state) {
  state.players[0].angleDeg = 44;
  state.players[0].power = 360;
  state.players[1].angleDeg = 136;
  state.players[1].power = 360;
}

function resetState(state) {
  state.rng = createRng(state.seed);
  state.skyline = buildSkyline(state.rng);
  state.players = [pickSpawn(state.skyline, 0), pickSpawn(state.skyline, 1)];
  state.players[0].name = "P1";
  state.players[1].name = "P2";
  resetPlayerAim(state);
  state.currentPlayerIndex = 0;
  state.scores = [0, 0];
  state.mode = "aiming";
  state.winner = null;
  state.isPaused = false;
  state.throwCount = 0;
  state.turnConditions = makeTurnConditions(state);
  state.banana = null;
}

export function createGame(seed = 20260310) {
  const state = {
    seed,
    rng: null,
    skyline: [],
    players: [],
    currentPlayerIndex: 0,
    scores: [0, 0],
    mode: "aiming",
    winner: null,
    isPaused: false,
    throwCount: 0,
    turnConditions: { wind: 0, spin: 0 },
    banana: null
  };
  resetState(state);
  return state;
}

function startThrow(state) {
  if (state.mode !== "aiming") {
    return;
  }
  const player = state.players[state.currentPlayerIndex];
  const angleRad = (player.angleDeg * Math.PI) / 180;
  state.banana = {
    x: player.x,
    y: player.y - 6,
    vx: Math.cos(angleRad) * player.power,
    vy: -Math.sin(angleRad) * player.power,
    radius: 8,
    t: 0
  };
  state.mode = "flying";
}

function intersectsCircleRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.width);
  const nearestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function playerHit(state, idx) {
  const p = state.players[idx];
  const b = state.banana;
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const radius = p.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function finishThrow(state, didHitPlayer = false, hitPlayerIndex = -1) {
  if (didHitPlayer && hitPlayerIndex >= 0) {
    state.scores[state.currentPlayerIndex] += 100;
    if (state.scores[state.currentPlayerIndex] >= TARGET_SCORE) {
      state.mode = "gameover";
      state.winner = state.currentPlayerIndex;
      state.banana = null;
      return;
    }
  }

  state.banana = null;
  state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  state.throwCount += 1;
  state.turnConditions = makeTurnConditions(state);
  state.mode = "aiming";
}

function advancePhysics(state, dtMs) {
  const b = state.banana;
  if (!b) {
    return;
  }
  const dt = dtMs / 1000;
  b.t += dt;

  const wobble = Math.sin(b.t * 11) * state.turnConditions.spin;
  b.vx += (state.turnConditions.wind + wobble) * dt;
  b.vy += GRAVITY * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.x < -20 || b.x > WORLD_WIDTH + 20 || b.y > WORLD_HEIGHT + 20 || b.y < -120) {
    finishThrow(state, false, -1);
    return;
  }

  if (intersectsCircleRect(b.x, b.y, b.radius, {
    x: 0,
    y: WORLD_HEIGHT,
    width: WORLD_WIDTH,
    height: 1
  })) {
    finishThrow(state, false, -1);
    return;
  }

  for (const building of state.skyline) {
    if (intersectsCircleRect(b.x, b.y, b.radius, building)) {
      finishThrow(state, false, -1);
      return;
    }
  }

  const enemy = state.currentPlayerIndex === 0 ? 1 : 0;
  if (playerHit(state, enemy)) {
    finishThrow(state, true, enemy);
  }
}

export function input(state, command) {
  if (command === "reset") {
    resetState(state);
    return;
  }
  if (command === "restart" && state.mode === "gameover") {
    resetState(state);
    return;
  }
  if (command === "togglePause") {
    state.isPaused = !state.isPaused;
    return;
  }

  if (state.mode !== "aiming") {
    return;
  }

  const active = state.players[state.currentPlayerIndex];

  if (command === "aimLeft") {
    active.angleDeg = clamp(active.angleDeg - 2, 10, 170);
    return;
  }
  if (command === "aimRight") {
    active.angleDeg = clamp(active.angleDeg + 2, 10, 170);
    return;
  }
  if (command === "powerUp") {
    active.power = clamp(active.power + 12, 180, 520);
    return;
  }
  if (command === "powerDown") {
    active.power = clamp(active.power - 12, 180, 520);
    return;
  }
  if (command === "throwBanana") {
    startThrow(state);
  }
}

export function step(state, dtMs) {
  if (state.mode === "gameover" || state.isPaused || dtMs <= 0) {
    return;
  }

  let remaining = dtMs;
  while (remaining > 0) {
    const chunk = Math.min(remaining, STEP_MS);
    if (state.mode === "flying") {
      advancePhysics(state, chunk);
    }
    remaining -= chunk;
    if (state.mode !== "flying") {
      break;
    }
  }
}

export function renderGameToText(state) {
  const banana = state.banana
    ? `banana=(${state.banana.x.toFixed(1)},${state.banana.y.toFixed(1)}) v=(${state.banana.vx.toFixed(1)},${state.banana.vy.toFixed(1)})`
    : "banana=none";
  const p1 = state.players[0];
  const p2 = state.players[1];
  const active = state.players[state.currentPlayerIndex];

  return [
    "coord=origin_top_left_x_right_y_down",
    `mode=${state.mode}`,
    `paused=${state.isPaused}`,
    `turn=${state.currentPlayerIndex + 1}`,
    `activeAngle=${active.angleDeg.toFixed(1)}`,
    `activePower=${active.power.toFixed(1)}`,
    `wind=${state.turnConditions.wind.toFixed(2)}`,
    `spin=${state.turnConditions.spin.toFixed(2)}`,
    `p1=(${p1.x.toFixed(1)},${p1.y.toFixed(1)})`,
    `p2=(${p2.x.toFixed(1)},${p2.y.toFixed(1)})`,
    banana,
    `scoreP1=${state.scores[0]}`,
    `scoreP2=${state.scores[1]}`,
    `winner=${state.winner === null ? "none" : state.winner + 1}`
  ].join(" | ");
}

export const GAME_CONSTANTS = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TARGET_SCORE
};
