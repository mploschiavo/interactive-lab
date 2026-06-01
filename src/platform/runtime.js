/**
 * Browser runtime exposed to the games as `window.KLGameCommon`.
 *
 * Self-contained and privacy-friendly by design: leaderboards persist to
 * localStorage only — NO network, NO keys, NO tracking. Bundled to
 * `lab-common.js`; loaded before each game on both the standalone site and the
 * kettlelogic.com lab shell (identical DOM contract).
 */

const byId = (id) => document.getElementById(id);
const leaderboardKey = (game) => `kl.lab.lb.${game}`;
const MUTE_KEY = "kl.lab.muted";
const MAX_ROWS = 10;
const NAME_MAX = 12;

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"]/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
  );
}

function loadScores(game) {
  try {
    return JSON.parse(localStorage.getItem(leaderboardKey(game)) || "[]");
  } catch {
    return [];
  }
}

function saveScores(game, rows) {
  try {
    localStorage.setItem(leaderboardKey(game), JSON.stringify(rows.slice(0, MAX_ROWS)));
  } catch {
    /* storage disabled — scores simply don't persist */
  }
}

function renderBoard(game) {
  const el = byId("game-leaderboard");
  if (!el) return;
  const rows = loadScores(game)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ROWS);
  el.innerHTML = rows.length
    ? rows
        .map((r, i) => `<li><span>${i + 1}. ${escapeHtml(r.name)}</span><b>${r.score}</b></li>`)
        .join("")
    : '<li class="empty">No scores yet — be the first.</li>';
}

let audioCtx = null;
function beep(freq) {
  if (localStorage.getItem(MUTE_KEY) === "1") return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = Number(freq) || 440;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch {
    /* audio unavailable — silent */
  }
}

function wire(game, scoreFn) {
  renderBoard(game);
  const form = byId("score-form");
  const nameInput = byId("score-name");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const score = Math.max(0, Math.floor((scoreFn && scoreFn()) || 0));
      const who = (((nameInput && nameInput.value) || "Anon").trim().slice(0, NAME_MAX)) || "Anon";
      const rows = loadScores(game);
      rows.push({ name: who, score });
      rows.sort((a, b) => b.score - a.score);
      saveScores(game, rows);
      renderBoard(game);
      const status = byId("game-status");
      if (status) status.textContent = `Saved: ${who} · ${score}`;
    });
  }
  return () => renderBoard(game);
}

export const KLGameCommon = {
  wire,
  level: {
    set(n) {
      const el = byId("game-level");
      if (el) el.textContent = String(n);
    },
    up() {
      const el = byId("game-level");
      if (el) el.textContent = String((parseInt(el.textContent, 10) || 1) + 1);
    },
  },
  sound: { beep },
  steam: { puff() {} },
  ui: {
    flash(msg) {
      const st = byId("game-status");
      if (st && msg) st.textContent = msg;
    },
    feedback(msg) {
      const el = byId("game-feedback");
      if (el) el.textContent = msg || "";
    },
  },
  telemetry: { track() {} }, // intentionally no network — no keys, no tracking
  balance: { get() { return {}; } },
  performance: { makeFramePacer() { return () => true; } },
};

window.KLGameCommon = KLGameCommon;
