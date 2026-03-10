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

function round2(value) {
  return Number(value.toFixed(2));
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
    buildings.push({
      x,
      y: topY,
      width: cappedWidth,
      height,
      accent: rng(),
      windowSeed: rng(),
      holes: []
    });
    x += cappedWidth;
  }

  return buildings;
}

function pickSpawn(buildings, side) {
  const count = buildings.length;
  const index = side === 0 ? Math.floor(count * 0.18) : Math.floor(count * 0.78);
  const building = buildings[clamp(index, 1, count - 2)];
  return {
    x: building.x + building.width / 2,
    y: building.y - 16,
    radius: 14,
    angleDeg: side === 0 ? 46 : 134,
    power: 340,
    name: side === 0 ? "P1" : "P2"
  };
}

function makeTurnConditions(state) {
  return {
    wind: (state.rng() * 2 - 1) * 36,
    spin: (state.rng() * 2 - 1) * 24
  };
}

function createImpact(x, y, type, owner) {
  return {
    x,
    y,
    type,
    owner,
    ttlMs: type === "player" ? 950 : 780,
    ageMs: 0
  };
}

function clearTransientState(state) {
  state.banana = null;
  state.effects = [];
  state.banner = "";
}

function setupMatch(state) {
  state.rng = createRng(state.seed);
  state.skyline = buildSkyline(state.rng);
  state.players = [pickSpawn(state.skyline, 0), pickSpawn(state.skyline, 1)];
  state.currentPlayerIndex = 0;
  state.scores = [0, 0];
  state.mode = "aiming";
  state.winner = null;
  state.isPaused = false;
  state.throwCount = 0;
  state.turnConditions = makeTurnConditions(state);
  state.timeMs = 0;
  clearTransientState(state);
  state.banner = "Player 1 opens the skyline duel.";
}

export function createGame(seed = 20260310) {
  const state = {
    seed,
    rng: null,
    skyline: [],
    players: [],
    currentPlayerIndex: 0,
    scores: [0, 0],
    mode: "title",
    winner: null,
    isPaused: false,
    throwCount: 0,
    turnConditions: { wind: 0, spin: 0 },
    banana: null,
    effects: [],
    banner: "",
    timeMs: 0
  };

  setupMatch(state);
  state.mode = "title";
  state.banner = "Seeded rooftop duel. Press Enter or Space to launch.";
  return state;
}

function beginMatch(state) {
  setupMatch(state);
}

function pointInsideHole(building, x, y, radius = 0) {
  return building.holes.some((hole) => {
    const dx = x - hole.x;
    const dy = y - hole.y;
    const limit = hole.radius + radius * 0.55;
    return dx * dx + dy * dy <= limit * limit;
  });
}

function intersectsCircleRect(cx, cy, radius, rect) {
  const nearestX = clamp(cx, rect.x, rect.x + rect.width);
  const nearestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function playerHit(state, idx) {
  const player = state.players[idx];
  const banana = state.banana;
  const dx = banana.x - player.x;
  const dy = banana.y - player.y;
  const radius = player.radius + banana.radius;
  return dx * dx + dy * dy <= radius * radius;
}

function setNextTurn(state, message) {
  state.banana = null;
  state.currentPlayerIndex = state.currentPlayerIndex === 0 ? 1 : 0;
  state.throwCount += 1;
  state.turnConditions = makeTurnConditions(state);
  state.mode = "aiming";
  state.banner = message;
}

function finishThrow(state, result, point = null) {
  const attacker = state.currentPlayerIndex;
  const defender = attacker === 0 ? 1 : 0;

  if (result === "player") {
    state.scores[attacker] += 100;
    if (point) {
      state.effects.push(createImpact(point.x, point.y, "player", attacker));
    }
    if (state.scores[attacker] >= TARGET_SCORE) {
      state.banana = null;
      state.mode = "gameover";
      state.winner = attacker;
      state.banner = `Player ${attacker + 1} owns the skyline with ${state.scores[attacker]} points.`;
      return;
    }
    setNextTurn(state, `Direct hit by Player ${attacker + 1}. Player ${defender + 1} returns fire.`);
    return;
  }

  if (result === "building" && point) {
    state.effects.push(createImpact(point.x, point.y, "building", attacker));
    setNextTurn(state, "Concrete chipped away. The skyline just got riskier.");
    return;
  }

  if (result === "out" && point) {
    state.effects.push(createImpact(point.x, point.y, "out", attacker));
  }
  setNextTurn(state, "Banana lost to the night wind. Reset your angle.");
}

function startThrow(state) {
  if (state.mode === "title") {
    beginMatch(state);
    return;
  }
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
  state.banner = `Player ${state.currentPlayerIndex + 1} launched into ${round2(state.turnConditions.wind)} wind.`;
}

function advanceEffects(state, dtMs) {
  if (state.effects.length === 0) {
    return;
  }

  for (const effect of state.effects) {
    effect.ageMs += dtMs;
    effect.ttlMs -= dtMs;
  }
  state.effects = state.effects.filter((effect) => effect.ttlMs > 0);
}

function handleBuildingCollision(state, banana) {
  for (const building of state.skyline) {
    if (!intersectsCircleRect(banana.x, banana.y, banana.radius, building)) {
      continue;
    }
    if (pointInsideHole(building, banana.x, banana.y, banana.radius)) {
      continue;
    }

    building.holes.push({
      x: banana.x,
      y: banana.y,
      radius: Math.min(30, building.width * 0.42)
    });
    finishThrow(state, "building", { x: banana.x, y: banana.y });
    return true;
  }
  return false;
}

function advancePhysics(state, dtMs) {
  const banana = state.banana;
  if (!banana) {
    return;
  }

  const dt = dtMs / 1000;
  banana.t += dt;

  const wobble = Math.sin(banana.t * 11) * state.turnConditions.spin;
  banana.vx += (state.turnConditions.wind + wobble) * dt;
  banana.vy += GRAVITY * dt;
  banana.x += banana.vx * dt;
  banana.y += banana.vy * dt;

  if (banana.x < -20 || banana.x > WORLD_WIDTH + 20 || banana.y > WORLD_HEIGHT + 20 || banana.y < -120) {
    finishThrow(state, "out", { x: clamp(banana.x, 0, WORLD_WIDTH), y: clamp(banana.y, 0, WORLD_HEIGHT) });
    return;
  }

  if (handleBuildingCollision(state, banana)) {
    return;
  }

  const defender = state.currentPlayerIndex === 0 ? 1 : 0;
  if (playerHit(state, defender)) {
    finishThrow(state, "player", { x: state.players[defender].x, y: state.players[defender].y - 10 });
  }
}

export function input(state, command) {
  if (command === "start") {
    if (state.mode === "title") {
      beginMatch(state);
      return;
    }
    if (state.mode === "gameover") {
      beginMatch(state);
      return;
    }
  }

  if (command === "reset") {
    if (state.mode === "title") {
      beginMatch(state);
      state.mode = "title";
      state.banner = "Seeded rooftop duel. Press Enter or Space to launch.";
      return;
    }
    beginMatch(state);
    return;
  }

  if (command === "restart" && state.mode === "gameover") {
    beginMatch(state);
    return;
  }

  if (command === "togglePause") {
    if (state.mode === "title" || state.mode === "gameover") {
      return;
    }
    state.isPaused = !state.isPaused;
    state.banner = state.isPaused
      ? "Match paused. Press P to return to the skyline."
      : `Player ${state.currentPlayerIndex + 1} is back on the rooftop.`;
    return;
  }

  if (state.isPaused) {
    return;
  }

  if (command === "throwBanana") {
    startThrow(state);
    return;
  }

  if (state.mode === "title" || state.mode === "gameover" || state.mode !== "aiming") {
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
  }
}

export function step(state, dtMs) {
  if (dtMs <= 0) {
    return;
  }

  const clampedDt = Math.min(dtMs, 250);
  state.timeMs += clampedDt;
  advanceEffects(state, clampedDt);

  if (state.mode === "title" || state.mode === "gameover" || state.isPaused) {
    return;
  }

  let remaining = clampedDt;
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
  const active = state.players[state.currentPlayerIndex];
  const opponent = state.players[state.currentPlayerIndex === 0 ? 1 : 0];
  const payload = {
    coordSystem: "origin_top_left_x_right_y_down",
    mode: state.mode,
    paused: state.isPaused,
    banner: state.banner,
    currentPlayer: state.currentPlayerIndex + 1,
    scores: {
      p1: state.scores[0],
      p2: state.scores[1]
    },
    targetScore: TARGET_SCORE,
    wind: round2(state.turnConditions.wind),
    spin: round2(state.turnConditions.spin),
    activePlayer: {
      x: round2(active.x),
      y: round2(active.y),
      angle: round2(active.angleDeg),
      power: round2(active.power)
    },
    opponent: {
      x: round2(opponent.x),
      y: round2(opponent.y)
    },
    banana: state.banana
      ? {
          x: round2(state.banana.x),
          y: round2(state.banana.y),
          vx: round2(state.banana.vx),
          vy: round2(state.banana.vy)
        }
      : null,
    effects: state.effects.slice(0, 3).map((effect) => ({
      type: effect.type,
      x: round2(effect.x),
      y: round2(effect.y),
      ttlMs: Math.max(0, Math.round(effect.ttlMs))
    })),
    winner: state.winner === null ? null : state.winner + 1,
    promptsVisible: state.mode === "title" || state.mode === "gameover" || state.isPaused
  };
  return JSON.stringify(payload);
}

export const GAME_CONSTANTS = {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TARGET_SCORE
};
