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
