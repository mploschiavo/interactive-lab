/**
 * Animation loop runner. Owns requestAnimationFrame for a game's tick and
 * **pauses automatically when the tab is hidden or the canvas scrolls off
 * screen** — so the attract/preview loop stays put visually but stops burning
 * CPU/battery when nobody can see it.
 */
export class GameLoop {
  constructor(canvas) {
    this._canvas = canvas;
    this._tick = null;
    this._raf = 0;
    this._visible = !document.hidden;
    this._onscreen = true;
  }

  /** Start running `tick(timestamp)` every frame (while visible + on-screen). */
  run(tick) {
    this._tick = tick;
    document.addEventListener("visibilitychange", () => {
      this._visible = !document.hidden;
      this._sync();
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          this._onscreen = entries[0].isIntersecting;
          this._sync();
        },
        { threshold: 0.01 },
      );
      io.observe(this._canvas);
    }
    this._sync();
  }

  _active() {
    return this._visible && this._onscreen;
  }

  _sync() {
    if (this._active()) this._start();
    else this._stop();
  }

  _start() {
    if (this._raf) return;
    const frame = (t) => {
      this._tick(t);
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  }

  _stop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }
}
