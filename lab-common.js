/*
 * Kettle Logic — Interactive Lab common runtime.
 *
 * Provides the minimal `window.KLGameCommon` API the games expect. Deliberately
 * SELF-CONTAINED and PRIVACY-FRIENDLY: leaderboards persist to localStorage only,
 * there is NO network access and NO keys/secrets of any kind. Safe to host as a
 * fully static site.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const LB_KEY = (game) => "kl.lab.lb." + game;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function loadScores(game) {
    try { return JSON.parse(localStorage.getItem(LB_KEY(game)) || "[]"); } catch (_) { return []; }
  }
  function saveScores(game, rows) {
    try { localStorage.setItem(LB_KEY(game), JSON.stringify(rows.slice(0, 10))); } catch (_) {}
  }
  function renderBoard(game) {
    const el = $("game-leaderboard");
    if (!el) return;
    const rows = loadScores(game).sort((a, b) => b.score - a.score).slice(0, 10);
    el.innerHTML = rows.length
      ? rows.map((r, i) => `<li><span>${i + 1}. ${escapeHtml(r.name)}</span><b>${r.score}</b></li>`).join("")
      : '<li class="empty">No scores yet — be the first.</li>';
  }

  let audioCtx = null;
  function beep(freq) {
    if (localStorage.getItem("kl.lab.muted") === "1") return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = freq || 440;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.05);
    } catch (_) {}
  }

  window.KLGameCommon = {
    /** Wire localStorage leaderboard + score submission; returns a re-render fn. */
    wire(game, scoreFn) {
      renderBoard(game);
      const form = $("score-form");
      const name = $("score-name");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const score = Math.max(0, Math.floor((scoreFn && scoreFn()) || 0));
          const who = ((name && name.value) || "Anon").trim().slice(0, 12) || "Anon";
          const rows = loadScores(game);
          rows.push({ name: who, score: score });
          rows.sort((a, b) => b.score - a.score);
          saveScores(game, rows);
          renderBoard(game);
          const st = $("game-status");
          if (st) st.textContent = "Saved: " + who + " · " + score;
        });
      }
      return () => renderBoard(game);
    },
    level: {
      set(n) { const el = $("game-level"); if (el) el.textContent = String(n); },
      up() { const el = $("game-level"); if (el) el.textContent = String((parseInt(el.textContent, 10) || 1) + 1); },
    },
    sound: { beep },
    steam: { puff() {} },
    ui: {
      flash(msg) { const st = $("game-status"); if (st && msg) st.textContent = msg; },
      feedback(msg) { const el = $("game-feedback"); if (el) el.textContent = msg || ""; },
    },
    telemetry: { track() { /* intentionally no network — no keys, no tracking */ } },
    balance: { get() { return {}; } },
    performance: { makeFramePacer() { return () => true; } },
  };
})();
