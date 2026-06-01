/**
 * Backlog — pure game logic. Tasks rise from the bottom; sweep the pointer to
 * clear them before the overflow meter fills. No DOM/canvas; RNG + dimensions
 * are injected so the core is deterministic and testable.
 */

const DEFAULTS = {
  overflowLimit: 8,
  scorePerTask: 8,
  levelByScore: 240,
  spawnBase: 30,
  spawnFloor: 12,
  spawnPerLevel: 2,
};

export class BacklogCore {
  constructor(options = {}) {
    this._rng = options.rng ?? Math.random;
    this._config = { ...DEFAULTS, ...options };
    this.reset();
  }

  reset() {
    this.score = 0;
    this.overflow = 0;
    this.level = 1;
    this.lost = false;
    this.tasks = [];
    this._tick = 0;
  }

  get overflowLimit() {
    return this._config.overflowLimit;
  }

  _spawnInterval() {
    return Math.max(
      this._config.spawnFloor,
      this._config.spawnBase - (this.level - 1) * this._config.spawnPerLevel,
    );
  }

  /** Advance one frame. `preview` true → auto-clears one task (idle attract loop). */
  step(width, height, preview = false) {
    if (this.lost) return { lost: true };
    this._tick++;
    if (this._tick % this._spawnInterval() === 0) {
      this.tasks.push({
        x: 30 + this._rng() * (width - 60),
        y: height + 10,
        r: 12 + this._rng() * 12,
        v: 1 + this._rng() * 1.8 + this.level * 0.18,
      });
    }
    for (const task of this.tasks) task.y -= task.v;
    if (preview && this.tasks.length) {
      const target = this.tasks[Math.floor(this._rng() * this.tasks.length)];
      this.score += 4;
      this.tasks = this.tasks.filter((t) => t !== target);
    }
    let overflowed = 0;
    this.tasks = this.tasks.filter((t) => {
      if (t.y < -20) {
        this.overflow++;
        overflowed++;
        return false;
      }
      return true;
    });
    if (this.overflow >= this._config.overflowLimit) this.lost = true;
    return { overflowed, lost: this.lost };
  }

  /** Clear any task whose disc contains (mx, my). Returns how many were cleared. */
  sweep(mx, my) {
    let cleared = 0;
    this.tasks = this.tasks.filter((t) => {
      const hit = (t.x - mx) ** 2 + (t.y - my) ** 2 <= (t.r + 4) ** 2;
      if (hit) {
        cleared++;
        this.score += this._config.scorePerTask;
      }
      return !hit;
    });
    if (cleared) this._syncLevel();
    return cleared;
  }

  _syncLevel() {
    const next = Math.max(1, Math.floor(this.score / this._config.levelByScore) + 1);
    if (next > this.level) {
      this.level = next;
      return true;
    }
    return false;
  }
}
