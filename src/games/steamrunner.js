/**
 * SteamRunner — browser adapter. Rendering, input, and the loop; physics and
 * rules live in `SteamRunnerCore`. Bundled to `steamrunner.js`.
 */
import { SteamRunnerCore, PLAYER } from "../core/steamrunner.js";
import { roundedRect, isLightTheme as isLight, isHighContrast, makeResponsiveCanvas } from "../platform/canvas.js";
import { GameLoop } from "../platform/loop.js";

const GAME = "steamrunner";
const STREAK_EVERY = 150;

(function start() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game-canvas"));
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  makeResponsiveCanvas(canvas);
  const common = window.KLGameCommon || {};
  const status = document.getElementById("game-status");
  const scoreEl = document.getElementById("game-score");
  const startBtn = document.getElementById("game-start-btn");
  const startOverlay = document.getElementById("game-start-overlay");

  document.body.dataset.game = GAME;
  // Recomputed each frame so the runner adapts when the canvas resizes (immersive).
  let ground = Math.max(250, canvas.height - 90);
  const redrawBoard = common.wire ? common.wire(GAME, () => core.score) : () => {};
  const flash = common.ui?.flash || (() => {});
  const feedback = common.ui?.feedback || (() => {});
  const levelUi = common.level || { set() {}, up() {} };
  const track = common.telemetry?.track || (() => {});

  const core = new SteamRunnerCore({ ground });
  let started = false;
  let paused = false;
  let scroll = 0;
  let puffs = [];

  function syncHud() {
    scoreEl.textContent = String(core.score);
    levelUi.set(core.level);
  }

  function reset() {
    core.reset(ground);
    paused = false;
    puffs = [];
    syncHud();
    status.textContent = "Tap, Jump button, or Space to jump";
    feedback("Chain jumps to survive longer. Hot streaks trigger flashes.");
  }

  function lose() {
    paused = true;
    track("game_over", { game: GAME, score: core.score, level: core.level });
    status.textContent = "You lost.";
    feedback("Crash detected. Want to play again? Press Play Again.");
    redrawBoard();
    window.dispatchEvent(new CustomEvent("kl-game-over"));
  }

  function jump() {
    if (core.jump()) puffs.push({ x: PLAYER.x, y: core.playerY, r: 6, a: 0.6 });
  }

  addEventListener(
    "keydown",
    (e) => {
      if (started && e.code === "Space") {
        e.preventDefault();
        jump();
      }
      if (!started && e.key === "Enter") {
        e.preventDefault();
        startBtn?.click();
      }
    },
    { passive: false },
  );
  canvas.addEventListener("pointerdown", () => {
    if (started) jump();
  });
  addEventListener("kl-game-action", (event) => {
    const action = event?.detail?.action;
    if (action === "start" && !started) {
      startBtn?.click();
      return;
    }
    if (["jump", "up", "tap"].includes(action)) jump();
  });
  addEventListener("kl-game-pause-toggle", () => {
    if (!started || core.lost) return;
    paused = !paused;
    status.textContent = paused ? "Paused" : "Back in play";
  });
  addEventListener("kl-game-quit", () => {
    if (!started) return;
    lose();
  });
  addEventListener("kl-game-replay", () => {
    started = true;
    startOverlay?.classList.add("hidden");
    reset();
    track("game_start", { game: GAME, mode: "replay" });
  });

  function previewAutoJump() {
    if (started || !core.alive || paused) return;
    const next = core.obstacles[0];
    if (next && next.x < PLAYER.x + 120 && core.grounded) jump();
  }

  // ---------- rendering ----------
  function palette() {
    const hc = isHighContrast();
    if (hc)
      return { sky0: "#000", sky1: "#000", frame: "#fff", ground: "#111", groundLine: "#fff", player: "#fff", playerGlow: "rgba(255,255,255,.6)", obs: "#facc15", obsTop: "#fde68a", glow: "rgba(250,204,21,.9)", label: "#fff", dim: "rgba(255,255,255,.85)" };
    if (isLight())
      return { sky0: "#eaf0f8", sky1: "#d6deea", frame: "rgba(214,139,72,.4)", ground: "#cbd5e6", groundLine: "rgba(214,139,72,.6)", player: "#2fb5a4", playerGlow: "rgba(47,181,164,.5)", obs: "#d68b48", obsTop: "#ecaa66", glow: "rgba(214,139,72,.4)", label: "#0f172a", dim: "rgba(15,23,42,.55)" };
    return { sky0: "#0c121b", sky1: "#070a10", frame: "rgba(95,212,197,.3)", ground: "#0e151e", groundLine: "rgba(95,212,197,.45)", player: "#5fd4c5", playerGlow: "rgba(95,212,197,.55)", obs: "#ecaa66", obsTop: "#f5c451", glow: "rgba(236,170,102,.5)", label: "#e8edf4", dim: "rgba(232,237,244,.55)" };
  }
  const rrect = (px, py, w, h, r) => roundedRect(ctx, px, py, w, h, r);

  function loop() {
    ground = Math.max(250, canvas.height - 90);
    core.ground = ground;
    const col = palette();
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, col.sky0);
    sky.addColorStop(1, col.sky1);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.frame;
    ctx.globalAlpha = 0.6;
    rrect(16, 16, canvas.width - 32, canvas.height - 32, 18);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.ground;
    ctx.fillRect(0, ground + 2, canvas.width, canvas.height - ground);
    ctx.strokeStyle = col.groundLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ground + 1);
    ctx.lineTo(canvas.width, ground + 1);
    ctx.stroke();
    if (core.alive && !paused) scroll = (scroll + (started ? 6 : 4)) % 60;
    ctx.strokeStyle = col.groundLine;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = -60 + scroll; gx < canvas.width; gx += 60) {
      ctx.moveTo(gx, ground + 18);
      ctx.lineTo(gx + 22, ground + 18);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (core.alive && !paused) {
      previewAutoJump();
      const result = core.step(canvas.width);
      syncHud();
      if (core.score > 0 && core.score % STREAK_EVERY === 0) {
        status.textContent = "Hot streak!";
        feedback("Hot streak! You are cooking now.");
        flash();
      }
      if (result.lost) {
        flash();
        lose();
      }
    }

    puffs.forEach((pf) => {
      pf.y -= 1.4;
      pf.x -= 1.2;
      pf.r += 0.6;
      pf.a -= 0.018;
    });
    puffs = puffs.filter((pf) => pf.a > 0);
    puffs.forEach((pf) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(200,210,220,${pf.a})`;
      ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
      ctx.fill();
    });

    core.obstacles.forEach((o) => {
      ctx.save();
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 12;
      rrect(o.x, ground - o.h, o.w, o.h, 4);
      ctx.fillStyle = col.obs;
      ctx.fill();
      ctx.restore();
      rrect(o.x, ground - o.h, o.w, o.h, 4);
      const g = ctx.createLinearGradient(o.x, ground - o.h, o.x, ground);
      g.addColorStop(0, col.obsTop);
      g.addColorStop(0.5, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(0,0,0,.2)");
      ctx.fillStyle = g;
      ctx.fill();
    });

    const py = core.playerY - PLAYER.height;
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.ellipse(PLAYER.x + PLAYER.width / 2, ground + 6, PLAYER.width * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = col.playerGlow;
    ctx.shadowBlur = 16;
    rrect(PLAYER.x, py, PLAYER.width, PLAYER.height, 7);
    ctx.fillStyle = col.player;
    ctx.fill();
    ctx.restore();
    rrect(PLAYER.x, py, PLAYER.width, PLAYER.height, 7);
    const pg = ctx.createLinearGradient(PLAYER.x, py, PLAYER.x, py + PLAYER.height);
    pg.addColorStop(0, "rgba(255,255,255,.4)");
    pg.addColorStop(0.5, "rgba(255,255,255,0)");
    pg.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = pg;
    ctx.fill();
  }

  startBtn?.addEventListener("click", () => {
    started = true;
    startOverlay?.classList.add("hidden");
    status.textContent = "Game started — tap, Jump button, or Space";
    reset();
    track("game_start", { game: GAME, mode: "start" });
  });

  reset();
  new GameLoop(canvas).run(loop);
})();
