/**
 * On-screen controls for touch + mouse, an immersive/fullscreen play mode, and
 * the game-over overlay. Everything fires the existing `kl-game-*` events, so
 * the games stay keyboard-first but become first-class on a phone.
 *
 *   [data-kl-action="x"]   tap → one kl-game-action {action:x}
 *   [data-kl-repeat="x"]   press-and-hold → repeats kl-game-action {action:x}
 *   [data-kl-pause]        → kl-game-pause-toggle
 *   [data-kl-restart]      → kl-game-replay
 *   [data-kl-mute]         → toggle localStorage mute
 *   [data-kl-fullscreen]   → enter immersive (CSS fullscreen + real FS where possible)
 *   [data-kl-exit]         → leave immersive
 *
 * Safe no-op if the elements aren't present.
 */
const MUTE_KEY = "kl.lab.muted";
const REPEAT_MS = 90;
const IMMERSIVE_CLASS = "kl-immersive";

function fireAction(action) {
  window.dispatchEvent(new CustomEvent("kl-game-action", { detail: { action } }));
}

function wireTap() {
  for (const btn of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("[data-kl-action]"))) {
    btn.addEventListener("click", () => fireAction(btn.dataset.klAction));
  }
}

function wireHold() {
  for (const btn of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("[data-kl-repeat]"))) {
    let timer = null;
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      fireAction(btn.dataset.klRepeat);
      stop();
      timer = setInterval(() => fireAction(btn.dataset.klRepeat), REPEAT_MS);
    });
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) {
      btn.addEventListener(ev, stop);
    }
  }
}

function wireSystem() {
  for (const b of document.querySelectorAll("[data-kl-pause]")) {
    b.addEventListener("click", () => window.dispatchEvent(new CustomEvent("kl-game-pause-toggle")));
  }
  for (const b of document.querySelectorAll("[data-kl-restart]")) {
    b.addEventListener("click", () => window.dispatchEvent(new CustomEvent("kl-game-replay")));
  }

  const mute = /** @type {HTMLElement | null} */ (document.querySelector("[data-kl-mute]"));
  if (mute) {
    const sync = () => {
      const muted = localStorage.getItem(MUTE_KEY) === "1";
      mute.setAttribute("aria-pressed", String(muted));
      mute.title = muted ? "Muted" : "Sound on";
    };
    sync();
    mute.addEventListener("click", () => {
      localStorage.setItem(MUTE_KEY, localStorage.getItem(MUTE_KEY) === "1" ? "0" : "1");
      sync();
    });
  }
}

function setImmersive(on) {
  document.body.classList.toggle(IMMERSIVE_CLASS, on);
  if (on) {
    // Go fullscreen in whatever orientation the device is held; the layout
    // adapts to portrait/landscape and re-flows when the user rotates. (We do
    // NOT lock orientation — that forced an unwanted auto-rotate to landscape.)
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}

function wireImmersive() {
  for (const b of document.querySelectorAll("[data-kl-fullscreen]")) {
    b.addEventListener("click", () => setImmersive(true));
  }
  for (const b of document.querySelectorAll("[data-kl-exit]")) {
    b.addEventListener("click", () => setImmersive(false));
  }
  // If the OS leaves real fullscreen, drop the immersive class too.
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) document.body.classList.remove(IMMERSIVE_CLASS);
  });
}

function wireGameOver() {
  const over = document.getElementById("game-over");
  if (!over) return;
  window.addEventListener("kl-game-over", () => over.classList.remove("hidden"));
  window.addEventListener("kl-game-replay", () => over.classList.add("hidden"));
  over.querySelector("[data-kl-restart]")?.addEventListener("click", () => over.classList.add("hidden"));
}

export function wireControls() {
  wireTap();
  wireHold();
  wireSystem();
  wireImmersive();
  wireGameOver();
}

wireControls();
