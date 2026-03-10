import { GAME_CONSTANTS, createGame, input, renderGameToText, step } from "./game-core.js";

const canvas = document.getElementById("game-canvas");
const stageShell = document.querySelector(".stage-shell");
const ctx = canvas.getContext("2d");
const state = createGame(20260310);

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCard(x, y, width, height, options = {}) {
  const {
    fill = "rgba(10, 18, 34, 0.72)",
    stroke = "rgba(255, 215, 157, 0.24)",
    shadow = "rgba(0, 0, 0, 0.2)"
  } = options;
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = shadow;
  roundedRectPath(x, y, width, height, 22);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#081426");
  sky.addColorStop(0.42, "#16325d");
  sky.addColorStop(0.74, "#3f4d87");
  sky.addColorStop(1, "#f28f62");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const aurora = ctx.createRadialGradient(190, 110, 10, 220, 130, 240);
  aurora.addColorStop(0, "rgba(255, 205, 135, 0.82)");
  aurora.addColorStop(0.36, "rgba(255, 137, 128, 0.34)");
  aurora.addColorStop(1, "rgba(255, 137, 128, 0)");
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, canvas.width, 280);

  const moonGradient = ctx.createRadialGradient(804, 116, 20, 804, 116, 86);
  moonGradient.addColorStop(0, "rgba(255, 246, 204, 1)");
  moonGradient.addColorStop(0.4, "rgba(255, 226, 162, 0.95)");
  moonGradient.addColorStop(1, "rgba(255, 226, 162, 0)");
  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.arc(804, 116, 82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 248, 220, 0.75)";
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 97 + 43) % canvas.width;
    const y = 58 + ((i * 53) % 172);
    const twinkle = 1.5 + Math.sin(state.timeMs / 450 + i) * 0.75;
    ctx.beginPath();
    ctx.arc(x, y, twinkle, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 183, 117, 0.12)";
  ctx.fillRect(0, canvas.height - 172, canvas.width, 120);
}

function drawWindRibbon() {
  if (state.mode === "title") {
    return;
  }
  const intensity = Math.abs(state.turnConditions.wind) / 36;
  const direction = Math.sign(state.turnConditions.wind) || 1;
  const baseline = 164;

  ctx.save();
  ctx.strokeStyle = direction > 0 ? "rgba(109, 218, 255, 0.76)" : "rgba(255, 183, 117, 0.78)";
  ctx.lineWidth = 4 + intensity * 3;
  ctx.shadowBlur = 18;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(88, baseline);
  for (let x = 88; x <= 872; x += 56) {
    const wave = Math.sin(state.timeMs / 420 + x / 80) * (14 + intensity * 8);
    ctx.lineTo(x, baseline + wave);
  }
  ctx.stroke();

  const tipX = direction > 0 ? 874 : 86;
  const tipY = baseline + Math.sin(state.timeMs / 420 + tipX / 80) * (14 + intensity * 8);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  if (direction > 0) {
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 16, tipY - 8);
    ctx.lineTo(tipX - 16, tipY + 8);
  } else {
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + 16, tipY - 8);
    ctx.lineTo(tipX + 16, tipY + 8);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDistantCity() {
  ctx.fillStyle = "rgba(13, 24, 49, 0.34)";
  for (let i = 0; i < 14; i += 1) {
    const width = 46 + (i % 5) * 10;
    const height = 70 + (i % 4) * 24;
    const x = i * 74 - 10;
    const y = canvas.height - 188 - height;
    ctx.fillRect(x, y, width, height);
  }
}

function drawSkyline() {
  drawDistantCity();

  for (const building of state.skyline) {
    const gradient = ctx.createLinearGradient(building.x, building.y, building.x, canvas.height);
    gradient.addColorStop(0, building.accent > 0.5 ? "#27456b" : "#20375a");
    gradient.addColorStop(1, building.accent > 0.5 ? "#142542" : "#10203a");

    ctx.save();
    roundedRectPath(building.x, building.y, building.width, building.height + 18, 8);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = "rgba(255, 226, 170, 0.84)";
    for (let wy = building.y + 16; wy < GAME_CONSTANTS.WORLD_HEIGHT - 14; wy += 24) {
      for (let wx = building.x + 10; wx < building.x + building.width - 8; wx += 16) {
        const lit = (Math.floor(wx + wy + building.windowSeed * 100) % 4) === 0;
        if (lit) {
          ctx.fillRect(wx, wy, 8, 11);
        }
      }
    }

    if (building.holes.length > 0) {
      ctx.globalCompositeOperation = "destination-out";
      for (const hole of building.holes) {
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255, 169, 104, 0.52)";
      ctx.lineWidth = 2;
      for (const hole of building.holes) {
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius - 1.5, 0.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

function drawGorilla(player, color, isActive) {
  ctx.save();
  ctx.shadowBlur = isActive ? 22 : 10;
  ctx.shadowColor = isActive ? color : "rgba(0, 0, 0, 0.3)";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 13, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(14, 19, 32, 0.88)";
  roundedRectPath(player.x - 18, player.y - 4, 36, 22, 6);
  ctx.fill();

  if (isActive && state.mode === "aiming" && !state.isPaused) {
    const angle = (player.angleDeg * Math.PI) / 180;
    const len = 42;
    ctx.strokeStyle = "#f9d87a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 20);
    ctx.lineTo(player.x + Math.cos(angle) * len, player.y - 20 - Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrajectoryPreview() {
  if (state.mode !== "aiming" || state.isPaused) {
    return;
  }

  const active = state.players[state.currentPlayerIndex];
  const angle = (active.angleDeg * Math.PI) / 180;
  let x = active.x;
  let y = active.y - 6;
  let vx = Math.cos(angle) * active.power;
  let vy = -Math.sin(angle) * active.power;
  let t = 0;

  ctx.save();
  ctx.fillStyle = "rgba(255, 232, 170, 0.68)";
  for (let i = 0; i < 18; i += 1) {
    const dt = 0.06;
    t += dt;
    vx += (state.turnConditions.wind + Math.sin(t * 11) * state.turnConditions.spin) * dt;
    vy += 520 * dt;
    x += vx * dt;
    y += vy * dt;
    if (x < 0 || x > GAME_CONSTANTS.WORLD_WIDTH || y > GAME_CONSTANTS.WORLD_HEIGHT) {
      break;
    }
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.6, 3 - i * 0.11), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBanana() {
  if (!state.banana) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "#ffe06e";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "rgba(255, 208, 120, 0.8)";
  ctx.beginPath();
  ctx.arc(state.banana.x, state.banana.y, state.banana.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 238, 186, 0.46)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.banana.x - state.banana.vx * 0.04, state.banana.y - state.banana.vy * 0.04);
  ctx.lineTo(state.banana.x, state.banana.y);
  ctx.stroke();
  ctx.restore();
}

function drawEffects() {
  for (const effect of state.effects) {
    const life = Math.max(0, effect.ttlMs / (effect.type === "player" ? 950 : 780));
    const radius = effect.type === "player" ? 18 + (1 - life) * 70 : 12 + (1 - life) * 46;
    ctx.save();
    ctx.globalAlpha = life;
    ctx.strokeStyle = effect.type === "player" ? "#ffd77f" : "#ff9a67";
    ctx.lineWidth = effect.type === "player" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHud() {
  if (state.mode === "title") {
    return;
  }

  drawCard(20, 20, 260, 82);
  drawCard(300, 20, 356, 82, {
    fill: "rgba(14, 23, 42, 0.64)"
  });
  drawCard(674, 20, 266, 82);

  const active = state.players[state.currentPlayerIndex];
  ctx.fillStyle = "#f8e9d1";
  ctx.font = "700 12px 'Manrope', sans-serif";
  ctx.fillStyle = "#ffd79c";
  ctx.fillText("SCOREBOARD", 40, 44);
  ctx.font = "800 26px 'Manrope', sans-serif";
  ctx.fillStyle = "#f8e9d1";
  ctx.fillText(`${state.scores[0]}`, 40, 76);
  ctx.fillText(`${state.scores[1]}`, 112, 76);
  ctx.font = "600 13px 'Manrope', sans-serif";
  ctx.fillStyle = "#a8d7ff";
  ctx.fillText("PLAYER 1", 40, 94);
  ctx.fillText("PLAYER 2", 112, 94);
  ctx.fillStyle = "#f8e9d1";
  ctx.font = "700 14px 'Manrope', sans-serif";
  ctx.fillText(`FIRST TO ${GAME_CONSTANTS.TARGET_SCORE}`, 168, 62);

  ctx.fillStyle = "#f8e9d1";
  ctx.font = "700 15px 'Manrope', sans-serif";
  ctx.fillText(`TURN // PLAYER ${state.currentPlayerIndex + 1}`, 320, 47);

  const statColumns = [
    { label: "WIND", value: state.turnConditions.wind.toFixed(1), x: 320, color: "#a8d7ff" },
    { label: "SPIN", value: state.turnConditions.spin.toFixed(1), x: 414, color: "#ffd6a3" },
    { label: "ANGLE", value: `${active.angleDeg.toFixed(0)}°`, x: 508, color: "#f8e9d1" },
    { label: "POWER", value: `${active.power.toFixed(0)}`, x: 596, color: "#f8e9d1" }
  ];
  for (const stat of statColumns) {
    ctx.fillStyle = "rgba(248, 233, 209, 0.7)";
    ctx.font = "600 11px 'Manrope', sans-serif";
    ctx.fillText(stat.label, stat.x, 66);
    ctx.fillStyle = stat.color;
    ctx.font = "800 18px 'Manrope', sans-serif";
    ctx.fillText(stat.value, stat.x, 89);
  }

  ctx.fillStyle = "#f8e9d1";
  ctx.font = "700 14px 'Manrope', sans-serif";
  ctx.fillText(state.isPaused ? "CONTROL DECK // PAUSED" : "CONTROL DECK", 694, 46);
  ctx.font = "500 12px 'Manrope', sans-serif";
  ctx.fillText("Arrows shape the throw", 694, 67);
  ctx.fillText("Space launch   P pause", 694, 84);
  ctx.fillText("R reset   F fullscreen", 694, 101);

  drawCard(20, 540, 920, 74, {
    fill: "rgba(10, 18, 34, 0.58)"
  });
  ctx.fillStyle = "#f8e9d1";
  ctx.font = "700 12px 'Manrope', sans-serif";
  ctx.fillStyle = "#ffd79c";
  ctx.fillText("SKYLINE CALL", 42, 565);
  ctx.fillStyle = "#f8e9d1";
  ctx.font = "600 16px 'Manrope', sans-serif";
  ctx.fillText(state.banner, 42, 590);
}

function drawTitleScreen() {
  if (state.mode !== "title") {
    return;
  }

  drawCard(86, 82, 788, 472, {
    fill: "rgba(8, 14, 29, 0.68)",
    stroke: "rgba(255, 205, 142, 0.34)",
    shadow: "rgba(0, 0, 0, 0.42)"
  });

  ctx.fillStyle = "#ffd79c";
  ctx.font = "800 22px 'Manrope', sans-serif";
  ctx.fillText("DETERMINISTIC CLASSIC REWORK", 124, 146);

  ctx.fillStyle = "#f9f1e0";
  ctx.font = "800 56px 'Alegreya SC', serif";
  ctx.fillText("GORILLAS", 120, 206);
  ctx.font = "700 42px 'Alegreya SC', serif";
  ctx.fillText("Random Banana Physics", 120, 252);

  ctx.font = "500 18px 'Manrope', sans-serif";
  ctx.fillStyle = "rgba(243, 233, 214, 0.94)";
  ctx.fillText("A rooftop duel staged like a cinematic evening poster.", 124, 294);
  ctx.fillText("Seeded wind and spin keep every run reproducible, but never flat.", 124, 322);

  drawCard(120, 360, 276, 142, {
    fill: "rgba(20, 31, 58, 0.74)"
  });
  drawCard(414, 360, 208, 142, {
    fill: "rgba(20, 31, 58, 0.74)"
  });
  drawCard(640, 360, 198, 142, {
    fill: "rgba(20, 31, 58, 0.74)"
  });

  ctx.fillStyle = "#ffd79c";
  ctx.font = "700 16px 'Manrope', sans-serif";
  ctx.fillText("CONTROLS", 140, 392);
  ctx.fillText("TWIST", 434, 392);
  ctx.fillText("READY", 660, 392);

  ctx.fillStyle = "#f9f1e0";
  ctx.font = "500 15px 'Manrope', sans-serif";
  ctx.fillText("Arrow Left / Right  change angle", 140, 422);
  ctx.fillText("Arrow Up / Down  tune power", 140, 447);
  ctx.fillText("Space  throw banana", 140, 472);
  ctx.fillText("P  pause   R  reset   F  fullscreen", 140, 497);

  ctx.fillText("Every round samples a new", 434, 426);
  ctx.fillText("wind and spin signature.", 434, 451);
  ctx.fillText("The skyline remembers", 434, 476);
  ctx.fillText("every crater you carve.", 434, 501);

  ctx.font = "800 19px 'Manrope', sans-serif";
  ctx.fillStyle = "#a8d7ff";
  ctx.fillText("PRESS ENTER OR SPACE", 660, 432);
  ctx.fillStyle = "#f9f1e0";
  ctx.font = "500 15px 'Manrope', sans-serif";
  ctx.fillText("to ignite the first arc", 660, 460);
  ctx.fillText("and start the duel", 660, 484);
}

function drawPauseOverlay() {
  if (!state.isPaused) {
    return;
  }

  ctx.fillStyle = "rgba(7, 13, 26, 0.56)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCard(284, 214, 392, 176, {
    fill: "rgba(10, 18, 34, 0.82)"
  });
  ctx.fillStyle = "#f9f1e0";
  ctx.font = "800 42px 'Alegreya SC', serif";
  ctx.fillText("Paused", 418, 274);
  ctx.font = "500 18px 'Manrope', sans-serif";
  ctx.fillText("The skyline holds its breath. Press P to continue.", 334, 320);
  ctx.fillText("Use R if you want a clean rematch.", 372, 352);
}

function drawGameOverOverlay() {
  if (state.mode !== "gameover") {
    return;
  }

  ctx.fillStyle = "rgba(7, 13, 26, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCard(232, 184, 496, 208, {
    fill: "rgba(10, 18, 34, 0.84)"
  });
  ctx.fillStyle = "#ffd79c";
  ctx.font = "800 20px 'Manrope', sans-serif";
  ctx.fillText("MATCH COMPLETE", 392, 228);
  ctx.fillStyle = "#f9f1e0";
  ctx.font = "800 50px 'Alegreya SC', serif";
  ctx.fillText(`Player ${state.winner + 1} Wins`, 312, 288);
  ctx.font = "500 18px 'Manrope', sans-serif";
  ctx.fillText("Press Enter to start a fresh skyline duel.", 322, 334);
  ctx.fillText("Press R to immediately reset the match.", 342, 360);
}

function draw() {
  drawBackground();
  drawWindRibbon();
  drawSkyline();
  drawTrajectoryPreview();
  drawGorilla(state.players[0], "#ff8f66", state.currentPlayerIndex === 0);
  drawGorilla(state.players[1], "#73d4ff", state.currentPlayerIndex === 1);
  drawBanana();
  drawEffects();
  drawHud();
  drawTitleScreen();
  drawPauseOverlay();
  drawGameOverOverlay();
}

const commandByKey = {
  ArrowLeft: "aimLeft",
  ArrowRight: "aimRight",
  ArrowUp: "powerUp",
  ArrowDown: "powerDown",
  " ": "throwBanana",
  Enter: "start",
  p: "togglePause",
  P: "togglePause",
  r: "reset",
  R: "reset"
};

async function toggleFullscreen() {
  if (!stageShell?.requestFullscreen) {
    return;
  }
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await stageShell.requestFullscreen();
}

window.addEventListener("keydown", (event) => {
  if (event.key === "f" || event.key === "F") {
    event.preventDefault();
    void toggleFullscreen();
    return;
  }

  const command = commandByKey[event.key];
  if (!command) {
    return;
  }
  event.preventDefault();
  input(state, command);
  draw();
});

document.addEventListener("fullscreenchange", () => {
  draw();
});

let previous = performance.now();
function frame(now) {
  const dt = Math.min(100, now - previous);
  previous = now;
  step(state, dt);
  draw();
  requestAnimationFrame(frame);
}

window.advanceTime = (ms) => {
  step(state, ms);
  draw();
};
window.render_game_to_text = () => renderGameToText(state);
window.__gameState = state;

document.fonts?.ready?.then(() => {
  draw();
});

draw();
requestAnimationFrame(frame);
