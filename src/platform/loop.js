/**
 * Fixed-timestep animation loop. Owns requestAnimationFrame and invokes the
 * game's tick at a **fixed 60 Hz regardless of the display's refresh rate** — so
 * the games play at the same speed on 60/90/120 Hz screens (a per-frame loop ran
 * ~2× too fast on a 120 Hz phone). Catches up after a stutter (bounded so it
 * can't spiral) and **pauses when the tab is hidden or the canvas is off-screen**.
 */
const STEP_MS = 1000 / 60;
const MAX_CATCHUP_STEPS = 5;
const MAX_FRAME_MS = 250;

export class GameLoop {
  constructor(canvas) {
    this._canvas = canvas;
    this._tick = null;
    this._raf = 0;
    this._visible = !document.hidden;
    this._onscreen = true;
    this._last = null;
    this._acc = 0;
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
    this._last = null;
    const frame = (t) => {
      this._raf = requestAnimationFrame(frame);
      if (this._last === null) this._last = t;
      let elapsed = t - this._last;
      this._last = t;
      if (elapsed > MAX_FRAME_MS) elapsed = STEP_MS; // returned from a long pause
      this._acc += elapsed;
      let steps = 0;
      while (this._acc >= STEP_MS && steps < MAX_CATCHUP_STEPS) {
        this._tick(t);
        this._acc -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_CATCHUP_STEPS) this._acc = 0; // fell behind — drop the backlog
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
