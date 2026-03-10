import { GAME_CONSTANTS, createGame, input, renderGameToText, step } from "./game-core.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const state = createGame(20260310);

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1f3c68");
  gradient.addColorStop(1, "#10213f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffea9b";
  ctx.beginPath();
  ctx.arc(120, 100, 32, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkyline() {
  for (let i = 0; i < state.skyline.length; i += 1) {
    const building = state.skyline[i];
    const shade = i % 2 === 0 ? "#253b5c" : "#304b73";
    ctx.fillStyle = shade;
    ctx.fillRect(building.x, building.y, building.width, building.height);

    ctx.fillStyle = "rgba(255, 243, 185, 0.65)";
    const startY = building.y + 14;
    for (let wy = startY; wy < GAME_CONSTANTS.WORLD_HEIGHT - 18; wy += 22) {
      for (let wx = building.x + 8; wx < building.x + building.width - 10; wx += 16) {
        if (((wx + wy + i * 7) % 3) === 0) {
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }
  }
}

function drawGorilla(player, color, isActive) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 10, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#17222f";
  ctx.fillRect(player.x - player.radius - 2, player.y - 2, player.radius * 2 + 4, 18);

  if (isActive && state.mode === "aiming") {
    const angle = (player.angleDeg * Math.PI) / 180;
    const len = 34;
    ctx.strokeStyle = "#ffd56a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 18);
    ctx.lineTo(player.x + Math.cos(angle) * len, player.y - 18 - Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawBanana() {
  if (!state.banana) {
    return;
  }
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(state.banana.x, state.banana.y, state.banana.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud() {
  ctx.fillStyle = "rgba(9, 16, 30, 0.6)";
  ctx.fillRect(16, 14, 928, 66);

  ctx.fillStyle = "#f1f4ff";
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("GORILLAS // RANDOM BANANA PHYSICS", 28, 42);

  const active = state.players[state.currentPlayerIndex];
  ctx.font = "16px Trebuchet MS";
  ctx.fillText(`P1 ${state.scores[0]}`, 30, 68);
  ctx.fillText(`P2 ${state.scores[1]}`, 140, 68);
  ctx.fillText(`Turn: P${state.currentPlayerIndex + 1}`, 250, 68);
  ctx.fillText(`Angle: ${active.angleDeg.toFixed(0)}°`, 352, 68);
  ctx.fillText(`Power: ${active.power.toFixed(0)}`, 458, 68);
  ctx.fillText(`Wind: ${state.turnConditions.wind.toFixed(1)}`, 566, 68);
  ctx.fillText(`Spin: ${state.turnConditions.spin.toFixed(1)}`, 680, 68);
  ctx.fillText(`Mode: ${state.mode}${state.isPaused ? " (paused)" : ""}`, 790, 68);

  if (state.isPaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Trebuchet MS";
    ctx.fillText("PAUSED", 360, 320);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Press P to resume", 390, 356);
  }

  if (state.mode === "gameover") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 46px Trebuchet MS";
    ctx.fillText(`PLAYER ${state.winner + 1} WINS`, 280, 300);
    ctx.font = "22px Trebuchet MS";
    ctx.fillText("Press Enter to restart", 350, 340);
  }
}

function draw() {
  drawBackground();
  drawSkyline();
  drawGorilla(state.players[0], "#ff8f66", state.currentPlayerIndex === 0);
  drawGorilla(state.players[1], "#67c7ff", state.currentPlayerIndex === 1);
  drawBanana();
  drawHud();
}

const commandByKey = {
  ArrowLeft: "aimLeft",
  ArrowRight: "aimRight",
  ArrowUp: "powerUp",
  ArrowDown: "powerDown",
  " ": "throwBanana",
  p: "togglePause",
  P: "togglePause",
  r: "reset",
  R: "reset",
  Enter: "restart"
};

window.addEventListener("keydown", (event) => {
  const command = commandByKey[event.key];
  if (!command) {
    return;
  }
  event.preventDefault();
  input(state, command);
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

draw();
requestAnimationFrame(frame);
