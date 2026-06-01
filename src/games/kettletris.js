/**
 * Kettletris — browser adapter. Owns the canvas rendering, input, and animation
 * loop; all game rules live in `KettletrisCore`. Bundled to `kettletris.js`.
 */
import {
  KettletrisCore,
  SHAPES,
  SHAPE_COLORS,
  WIDTH as W,
  HEIGHT as H,
} from "../core/kettletris.js";
import { roundedRect, isLightTheme as isLight, isHighContrast, prefersReducedMotion } from "../platform/canvas.js";
import { GameLoop } from "../platform/loop.js";

const GAME = "kettletris";

(function start() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const common = window.KLGameCommon || {};
  const status = document.getElementById("game-status");
  const scoreEl = document.getElementById("game-score");
  const startBtn = document.getElementById("game-start-btn");
  const startOverlay = document.getElementById("game-start-overlay");

  document.body.dataset.game = GAME;
  const redrawBoard = common.wire ? common.wire(GAME, () => core.score) : () => {};
  const beep = common.sound?.beep || (() => {});
  const flash = common.ui?.flash || (() => {});
  const feedback = common.ui?.feedback || (() => {});
  const levelUi = common.level || { set() {}, up() {} };
  const track = common.telemetry?.track || (() => {});

  const core = new KettletrisCore();
  let started = false;
  let paused = false;
  let last = 0;
  let shake = 0;

  function syncHud() {
    scoreEl.textContent = String(core.score);
    levelUi.set(core.level);
  }

  function reset() {
    paused = false;
    shake = 0;
    core.reset();
    syncHud();
    status.textContent = "Move with arrows or touch controls · P pauses";
    feedback("Line up clears. Big clears trigger bonus flash.");
  }

  function handleLoss() {
    paused = true;
    track("game_over", { game: GAME, score: core.score, level: core.level });
    status.textContent = "Oops, you lost. The kettle boiled over.";
    feedback("Pressure dropped. Time for another steam-powered comeback.");
    redrawBoard();
    window.dispatchEvent(new CustomEvent("kl-game-over"));
  }

  function afterLock(result) {
    syncHud();
    if (result.clears) {
      beep("lock");
      flash();
      shake = prefersReducedMotion() ? 0 : Math.min(10, result.clears * 3);
      status.textContent =
        result.clears >= 4 ? "TETRIS! Massive clear." : `${result.clears} line${result.clears > 1 ? "s" : ""} cleared`;
    }
    if (result.leveledUp) feedback(`Level ${core.level}! Drop speed increased.`);
    if (result.lost) handleLoss();
  }

  function act(action) {
    if (!core.piece || core.lost) return;
    if ((!started || paused) && action !== "start") return;
    if (action === "left") core.move(-1, 0);
    else if (action === "right") core.move(1, 0);
    else if (action === "down") {
      const r = core.move(0, 1);
      if (r.clears !== undefined) afterLock(r);
    } else if (action === "rotate" || action === "up") {
      if (core.rotate()) beep("rotate");
    } else if (action === "drop") {
      afterLock(core.hardDrop());
    }
  }

  addEventListener(
    "keydown",
    (e) => {
      if (!core.piece) return;
      if ((!started || paused) && !["Enter", "r", "R"].includes(e.key)) return;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") act("left");
      else if (e.key === "ArrowRight") act("right");
      else if (e.key === "ArrowDown") act("down");
      else if (e.key === "ArrowUp") act("rotate");
      else if (e.key === " ") act("drop");
      else if (e.key === "Enter" && !started) startBtn?.click();
    },
    { passive: false },
  );

  addEventListener("kl-game-action", (event) => {
    const action = event?.detail?.action;
    if (action === "start" && !started) {
      startBtn?.click();
      return;
    }
    act(action);
  });
  addEventListener("kl-game-pause-toggle", () => {
    if (!started || core.lost) return;
    paused = !paused;
    status.textContent = paused ? "Paused" : "Back in play";
  });
  addEventListener("kl-game-quit", () => {
    if (!started) return;
    handleLoss();
  });
  addEventListener("kl-game-replay", () => {
    started = true;
    startOverlay?.classList.add("hidden");
    reset();
    track("game_start", { game: GAME, mode: "replay" });
  });

  function previewMove() {
    if (started || !core.piece || paused) return;
    const r = Math.random();
    if (r < 0.3) core.move(-1, 0);
    else if (r < 0.6) core.move(1, 0);
    else if (r < 0.75) core.rotate();
  }

  // ---------- rendering ----------
  function boardMetrics() {
    const minPad = 34;
    const gap = Math.round(canvas.height * 0.04);
    const cellH = Math.floor((canvas.height - minPad * 2) / H);
    const cell = Math.max(20, Math.min(cellH, Math.floor((canvas.width - minPad * 2 - gap) / (W + 4.6))));
    const boardW = W * cell;
    const boardH = H * cell;
    const railW = Math.round(cell * 4.2);
    const groupW = boardW + gap + railW;
    const ox = Math.floor((canvas.width - groupW) / 2);
    const oy = Math.floor((canvas.height - boardH) / 2);
    return { cell, ox, oy, boardW, boardH, railX: ox + boardW + gap, railW, gap };
  }

  function palette() {
    const hc = isHighContrast();
    if (hc)
      return { bg0: "#000", bg1: "#000", well: "rgba(255,255,255,.06)", frame: "#ffffff", grid: "rgba(255,255,255,.30)", fixed: "#f8fafc", ghost: "rgba(255,255,255,.9)", rail: "rgba(255,255,255,.06)", railLine: "#ffffff", label: "#ffffff", dim: "rgba(255,255,255,.8)" };
    if (isLight())
      return { bg0: "#eef1f6", bg1: "#dfe4ee", well: "rgba(255,255,255,.72)", frame: "rgba(214,139,72,.55)", grid: "rgba(15,23,42,.10)", fixed: "#8b6df0", ghost: "rgba(15,23,42,.28)", rail: "rgba(255,255,255,.66)", railLine: "rgba(214,139,72,.5)", label: "#0f172a", dim: "rgba(15,23,42,.55)" };
    return { bg0: "#0b0f15", bg1: "#06080c", well: "rgba(20,28,38,.55)", frame: "rgba(214,139,72,.45)", grid: "rgba(255,255,255,.055)", fixed: "#d08c55", ghost: "rgba(236,170,102,.32)", rail: "rgba(18,24,33,.6)", railLine: "rgba(95,212,197,.4)", label: "#e8edf4", dim: "rgba(232,237,244,.55)" };
  }

  const rrect = (px, py, w, h, r) => roundedRect(ctx, px, py, w, h, r);

  function tile(px, py, size, base, opt = {}) {
    const pad = Math.max(1, size * 0.06);
    const s = size - pad * 2;
    const rad = Math.max(3, size * 0.18);
    if (opt.ghost) {
      rrect(px + pad, py + pad, s, s, rad);
      ctx.lineWidth = Math.max(1.5, size * 0.07);
      ctx.strokeStyle = base;
      ctx.setLineDash([Math.max(3, size * 0.16), Math.max(3, size * 0.16)]);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    if (opt.glow) {
      ctx.save();
      ctx.shadowColor = opt.glow;
      ctx.shadowBlur = size * 0.5;
    }
    rrect(px + pad, py + pad, s, s, rad);
    ctx.fillStyle = base;
    ctx.fill();
    if (opt.glow) ctx.restore();
    rrect(px + pad, py + pad, s, s, rad);
    const g = ctx.createLinearGradient(px, py, px, py + size);
    g.addColorStop(0, "rgba(255,255,255,.30)");
    g.addColorStop(0.46, "rgba(255,255,255,.05)");
    g.addColorStop(0.54, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,.26)");
    ctx.fillStyle = g;
    ctx.fill();
    rrect(px + pad + 1, py + pad + 1, s - 2, s - 2, rad - 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.stroke();
  }

  function draw(t) {
    const drop = Math.max(120, 360 - (core.level - 1) * 24);
    if (t && t - last > (started ? drop : 320)) {
      last = t;
      if (!paused) {
        previewMove();
        if (started) {
          const r = core.move(0, 1);
          if (r.clears !== undefined) afterLock(r);
        }
      }
    }
    const col = palette();
    const { ox, oy, cell, boardW, boardH, railX, railW } = boardMetrics();

    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, col.bg0);
    bg.addColorStop(1, col.bg1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vg = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.42, canvas.height * 0.15, canvas.width / 2, canvas.height * 0.5, canvas.width * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, isLight() ? "rgba(15,23,42,.10)" : "rgba(0,0,0,.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake *= 0.82;
      if (shake < 0.4) shake = 0;
    }

    const pad = Math.round(cell * 0.42);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.5)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    rrect(ox - pad, oy - pad, boardW + pad * 2, boardH + pad * 2, 18);
    ctx.fillStyle = col.well;
    ctx.fill();
    ctx.restore();
    rrect(ox - pad, oy - pad, boardW + pad * 2, boardH + pad * 2, 18);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = col.frame;
    ctx.stroke();
    rrect(ox - 2, oy - 2, boardW + 4, boardH + 4, 8);
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.frame;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    for (let i = 1; i < W; i++) {
      ctx.moveTo(ox + i * cell, oy);
      ctx.lineTo(ox + i * cell, oy + boardH);
    }
    for (let j = 1; j < H; j++) {
      ctx.moveTo(ox, oy + j * cell);
      ctx.lineTo(ox + boardW, oy + j * cell);
    }
    ctx.stroke();
    rrect(ox - 1, oy - 1, boardW + 2, boardH + 2, 6);
    ctx.save();
    ctx.clip();

    for (let i = 0; i < W; i++)
      for (let j = 0; j < H; j++) if (core.board[j][i]) tile(ox + i * cell, oy + j * cell, cell, col.fixed, {});

    const piece = core.piece;
    if (piece && started) {
      const gy = core.ghostDrop();
      if (gy > 0)
        for (let y = 0; y < piece.matrix.length; y++)
          for (let cx = 0; cx < piece.matrix[0].length; cx++)
            if (piece.matrix[y][cx]) tile(ox + (piece.x + cx) * cell, oy + (piece.y + gy + y) * cell, cell, col.ghost, { ghost: true });
    }
    if (piece) {
      for (let y = 0; y < piece.matrix.length; y++)
        for (let cx = 0; cx < piece.matrix[0].length; cx++)
          if (piece.matrix[y][cx]) tile(ox + (piece.x + cx) * cell, oy + (piece.y + y) * cell, cell, piece.color, { glow: piece.color });
    }
    ctx.restore();

    const ry = oy - pad;
    const rh = boardH + pad * 2;
    const rcell = Math.round(cell * 0.74);
    rrect(railX, ry, railW, rh, 16);
    ctx.fillStyle = col.rail;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.railLine;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.dim;
    ctx.font = `600 ${Math.round(cell * 0.3)}px ui-monospace, monospace`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("NEXT", railX + railW * 0.16, ry + cell * 0.9);
    const nm = SHAPES[core.nextIndex];
    const nw = nm[0].length * rcell;
    const npx = railX + (railW - nw) / 2;
    const npy = ry + rh * 0.18;
    for (let y = 0; y < nm.length; y++)
      for (let cx = 0; cx < nm[0].length; cx++) if (nm[y][cx]) tile(npx + cx * rcell, npy + y * rcell, rcell, SHAPE_COLORS[core.nextIndex % SHAPE_COLORS.length], {});
    ctx.strokeStyle = col.railLine;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(railX + railW * 0.14, ry + rh * 0.56);
    ctx.lineTo(railX + railW * 0.86, ry + rh * 0.56);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.dim;
    ctx.font = `600 ${Math.round(cell * 0.3)}px ui-monospace, monospace`;
    ctx.fillText("LINES", railX + railW * 0.16, ry + rh * 0.7);
    ctx.fillStyle = col.label;
    ctx.font = `700 ${Math.round(cell * 0.92)}px ui-monospace, monospace`;
    ctx.fillText(String(core.lines), railX + railW * 0.16, ry + rh * 0.86);

    ctx.restore();
  }

  startBtn?.addEventListener("click", () => {
    started = true;
    paused = false;
    startOverlay?.classList.add("hidden");
    status.textContent = "Game started — keyboard enabled";
    reset();
    track("game_start", { game: GAME, mode: "start" });
  });

  reset();
  new GameLoop(canvas).run(draw);
})();
