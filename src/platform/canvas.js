/**
 * Shared canvas + theme helpers used by every game adapter (previously
 * copy-pasted into each). Pure drawing utilities — no game state.
 */

/** Trace a rounded-rectangle path on `ctx` (caller fills/strokes). */
export function roundedRect(ctx, px, py, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(px + rad, py);
  ctx.arcTo(px + w, py, px + w, py + h, rad);
  ctx.arcTo(px + w, py + h, px, py + h, rad);
  ctx.arcTo(px, py + h, px, py, rad);
  ctx.arcTo(px, py, px + w, py, rad);
  ctx.closePath();
}

/** True when the page is in (or prefers) light mode. */
export function isLightTheme() {
  const mode = document.documentElement.getAttribute("data-theme") || "system";
  if (mode === "light") return true;
  if (mode === "dark") return false;
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
}

/** True when the user asked for reduced motion (suppress shake/heavy effects). */
export function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** True when the document is in high-contrast game mode. */
export function isHighContrast() {
  return document.documentElement.classList.contains("game-contrast-high");
}

/**
 * Keep a game canvas's backing store matched to how it's displayed. In immersive
 * play the canvas fills the screen, so we size it to its on-screen box (×DPR,
 * capped) and the game lays out to fill it — no more letterboxed board. Outside
 * immersive it stays at the fixed authoring resolution. Re-fits on resize,
 * orientation change, and when immersive toggles.
 */
export function makeResponsiveCanvas(canvas, baseWidth = 1200, baseHeight = 720, maxDpr = 2) {
  const apply = () => {
    if (document.body.classList.contains("kl-immersive")) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    } else if (canvas.width !== baseWidth || canvas.height !== baseHeight) {
      canvas.width = baseWidth;
      canvas.height = baseHeight;
    }
  };
  apply();
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);
  new MutationObserver(apply).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return apply;
}
