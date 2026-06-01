/**
 * Backlog — browser adapter. Rendering, pointer input, and the loop; rules live
 * in `BacklogCore`. Bundled to `backlog.js`.
 */
import { BacklogCore } from "../core/backlog.js";
import { roundedRect, isLightTheme as isLight, isHighContrast, makeResponsiveCanvas } from "../platform/canvas.js";
import { GameLoop } from "../platform/loop.js";

const GAME = "backlog";
const STREAK_EVERY = 80;

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
  const redrawBoard = common.wire ? common.wire(GAME, () => core.score) : () => {};
  const flash = common.ui?.flash || (() => {});
  const feedback = common.ui?.feedback || (() => {});
  const levelUi = common.level || { set() {}, up() {} };
  const track = common.telemetry?.track || (() => {});

  const core = new BacklogCore();
  let started = false;
  let paused = false;

  function syncHud() {
    scoreEl.textContent = String(core.score);
    levelUi.set(core.level);
  }

  function reset() {
    core.reset();
    paused = false;
    syncHud();
    status.textContent = "Clear the incoming queue";
    feedback("Sweep the queue with your pointer before overflow hits max.");
  }

  function lose() {
    paused = true;
    track("game_over", { game: GAME, score: core.score, level: core.level });
    status.textContent = "You lost.";
    feedback("Overflow hit the ceiling. Want to play again? Press Play Again.");
    redrawBoard();
    window.dispatchEvent(new CustomEvent("kl-game-over"));
  }

  function toCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (canvas.width / r.width),
      y: (clientY - r.top) * (canvas.height / r.height),
    };
  }

  function sweepAt(clientX, clientY) {
    const { x, y } = toCanvas(clientX, clientY);
    const before = core.score;
    core.sweep(x, y);
    if (core.score !== before) {
      levelUi.set(core.level);
      if (core.score % STREAK_EVERY === 0) {
        flash();
        status.textContent = "Queue streak!";
      }
    }
    syncHud();
  }

  canvas.addEventListener("pointermove", (e) => {
    if (started && !paused && !core.lost) sweepAt(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (started && !paused && !core.lost) sweepAt(e.clientX, e.clientY);
  });
  addEventListener(
    "keydown",
    (e) => {
      if (!started && e.key === "Enter") {
        e.preventDefault();
        startBtn?.click();
      }
    },
    { passive: false },
  );
  addEventListener("kl-game-action", (event) => {
    const action = event?.detail?.action;
    if (action === "start" && !started) {
      startBtn?.click();
      return;
    }
    if (action === "sweep" && started && !paused && !core.lost) {
      const r = canvas.getBoundingClientRect();
      sweepAt(r.left + r.width / 2, r.top + r.height * 0.65);
    }
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

  // ---------- rendering ----------
  function palette() {
    const hc = isHighContrast();
    if (hc)
      return { bg0: "#000", bg1: "#000", frame: "#fff", orb: "#facc15", orbCore: "#fff", glow: "rgba(250,204,21,.9)", label: "#fff", dim: "rgba(255,255,255,.8)", meterOk: "#34d399", meterHot: "#fb7185", track: "rgba(255,255,255,.18)" };
    if (isLight())
      return { bg0: "#eef1f6", bg1: "#dde3ee", frame: "rgba(214,139,72,.45)", orb: "#d68b48", orbCore: "#fbe3c8", glow: "rgba(214,139,72,.35)", label: "#0f172a", dim: "rgba(15,23,42,.55)", meterOk: "#2fb5a4", meterHot: "#e11d48", track: "rgba(15,23,42,.12)" };
    return { bg0: "#0b0f15", bg1: "#06080c", frame: "rgba(95,212,197,.32)", orb: "#ecaa66", orbCore: "#fbe3c8", glow: "rgba(236,170,102,.45)", label: "#e8edf4", dim: "rgba(232,237,244,.55)", meterOk: "#5fd4c5", meterHot: "#fb7185", track: "rgba(255,255,255,.12)" };
  }
  const rrect = (px, py, w, h, r) => roundedRect(ctx, px, py, w, h, r);
  function backdrop(col) {
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, col.bg0);
    bg.addColorStop(1, col.bg1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.5, canvas.height * 0.12, canvas.width / 2, canvas.height * 0.5, canvas.width * 0.6);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, isLight() ? "rgba(15,23,42,.08)" : "rgba(0,0,0,.4)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.frame;
    ctx.globalAlpha = 0.6;
    rrect(16, 16, canvas.width - 32, canvas.height - 32, 18);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function orb(t, col) {
    ctx.save();
    ctx.shadowColor = col.glow;
    ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(t.x - t.r * 0.35, t.y - t.r * 0.4, t.r * 0.1, t.x, t.y, t.r);
    g.addColorStop(0, col.orbCore);
    g.addColorStop(0.45, col.orb);
    g.addColorStop(1, col.orb);
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.35, Math.max(1.5, t.r * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  function meter(col) {
    const w = Math.round(canvas.width * 0.22);
    const h = 14;
    const px = canvas.width - w - 34;
    const py = 34;
    const f = Math.min(1, core.overflow / core.overflowLimit);
    rrect(px, py, w, h, 7);
    ctx.fillStyle = col.track;
    ctx.fill();
    if (f > 0) {
      rrect(px, py, Math.max(h, w * f), h, 7);
      ctx.fillStyle = f > 0.66 ? col.meterHot : col.meterOk;
      ctx.fill();
    }
    ctx.fillStyle = col.dim;
    ctx.font = "600 13px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`OVERFLOW ${core.overflow}/${core.overflowLimit}`, px + w, py - 6);
    ctx.textAlign = "left";
  }

  function loop() {
    const col = palette();
    if (!paused && !core.lost) {
      const result = core.step(canvas.width, canvas.height, !started);
      if (!started) syncHud();
      if (result.lost) {
        flash();
        lose();
      }
    }
    backdrop(col);
    core.tasks.forEach((t) => orb(t, col));
    meter(col);
    ctx.fillStyle = col.dim;
    ctx.font = "600 14px ui-monospace, monospace";
    ctx.fillText(started ? "Sweep the pointer to clear tasks" : "Preview running…", 34, canvas.height - 28);
    if (!core.lost) status.textContent = `Overflow ${core.overflow}`;
  }

  startBtn?.addEventListener("click", () => {
    started = true;
    startOverlay?.classList.add("hidden");
    status.textContent = "Game started — drag, tap, or use Sweep button";
    reset();
    track("game_start", { game: GAME, mode: "start" });
  });

  reset();
  new GameLoop(canvas).run(loop);
})();
