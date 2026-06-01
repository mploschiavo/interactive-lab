/**
 * On-screen controls + game-over overlay for the standalone site. Touch users
 * (and mouse) get buttons that dispatch the same `kl-game-*` events the games
 * already listen for, so the games stay keyboard-first but become fully playable
 * without a keyboard. Safe no-op if the control elements aren't present.
 */
const MUTE_KEY = "kl.lab.muted";

function fireAction(action) {
  window.dispatchEvent(new CustomEvent("kl-game-action", { detail: { action } }));
}

function syncMuteLabel(btn) {
  const muted = localStorage.getItem(MUTE_KEY) === "1";
  btn.setAttribute("aria-pressed", String(muted));
  btn.textContent = muted ? "🔇 Muted" : "🔊 Sound";
}

export function wireControls() {
  // Action buttons (left/right/rotate/drop/jump/sweep) → kl-game-action.
  for (const btn of document.querySelectorAll("[data-kl-action]")) {
    btn.addEventListener("click", () => fireAction(btn.dataset.klAction));
  }

  document
    .querySelector("[data-kl-pause]")
    ?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("kl-game-pause-toggle")));

  document
    .querySelector("[data-kl-restart]")
    ?.addEventListener("click", () => window.dispatchEvent(new CustomEvent("kl-game-replay")));

  const mute = document.querySelector("[data-kl-mute]");
  if (mute) {
    syncMuteLabel(mute);
    mute.addEventListener("click", () => {
      const muted = localStorage.getItem(MUTE_KEY) === "1";
      localStorage.setItem(MUTE_KEY, muted ? "0" : "1");
      syncMuteLabel(mute);
    });
  }

  // Game-over overlay: the game dispatches `kl-game-over` on loss.
  const over = document.getElementById("game-over");
  if (over) {
    window.addEventListener("kl-game-over", () => over.classList.remove("hidden"));
    window.addEventListener("kl-game-replay", () => over.classList.add("hidden"));
    over.querySelector("[data-kl-restart]")?.addEventListener("click", () => over.classList.add("hidden"));
  }
}

wireControls();
