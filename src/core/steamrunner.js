/**
 * SteamRunner — pure game logic. A runner jumps over obstacles that scroll in
 * from the right; survival scores over time. No DOM/canvas; RNG + ground line
 * are injected so the core is deterministic and testable.
 */

const DEFAULTS = {
  gravity: 0.62,
  jumpVelocity: -11,
  levelByScore: 260,
  spawnBase: 52,
  spawnFloor: 26,
  spawnPerLevel: 2,
  obstacleBaseSpeed: 3.6,
  obstacleSpeedPerLevel: 0.22,
};

export const PLAYER = { x: 110, width: 26, height: 38 };

export class SteamRunnerCore {
  constructor(options = {}) {
    this._rng = options.rng ?? Math.random;
    this._config = { ...DEFAULTS, ...options };
    this.ground = options.ground ?? 250;
    this.reset();
  }

  reset(ground = this.ground) {
    this.ground = ground;
    this.score = 0;
    this.level = 1;
    this.alive = true;
    this.lost = false;
    this.velocityY = 0;
    this.playerY = ground;
    this.obstacles = [];
    this._tick = 0;
  }

  get grounded() {
    return this.playerY >= this.ground - 0.1;
  }

  jump() {
    if (this.grounded && this.alive) {
      this.velocityY = this._config.jumpVelocity;
      return true;
    }
    return false;
  }

  _spawnInterval() {
    return Math.max(
      this._config.spawnFloor,
      this._config.spawnBase - (this.level - 1) * this._config.spawnPerLevel,
    );
  }

  /** Advance one frame against a canvas of `width`. Returns {leveledUp, lost}. */
  step(width) {
    if (!this.alive) return { lost: true };
    this._tick++;
    if (this._tick % this._spawnInterval() === 0) {
      this.obstacles.push({
        x: width + 10,
        w: 16 + this._rng() * 20,
        h: 20 + this._rng() * 36,
      });
    }
    const speed =
      this._config.obstacleBaseSpeed + (this.level - 1) * this._config.obstacleSpeedPerLevel;
    for (const o of this.obstacles) o.x -= speed;
    this.obstacles = this.obstacles.filter((o) => o.x > -30);

    this.velocityY += this._config.gravity;
    this.playerY = Math.min(this.ground, this.playerY + this.velocityY);
    this.score += 1;
    const leveledUp = this._syncLevel();

    if (this._collides()) {
      this.alive = false;
      this.lost = true;
    }
    return { leveledUp, lost: this.lost };
  }

  _collides() {
    const p = PLAYER;
    for (const o of this.obstacles) {
      if (
        p.x < o.x + o.w &&
        p.x + p.width > o.x &&
        this.playerY - p.height < this.ground + o.h &&
        this.playerY > this.ground - o.h
      ) {
        return true;
      }
    }
    return false;
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
