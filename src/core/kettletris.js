/**
 * Kettletris — pure game logic. No DOM, no canvas, no timers.
 *
 * The renderer reads this state and draws it; the game entry drives `step()` and
 * `act()`. Randomness is injected so tests are deterministic.
 */

export const WIDTH = 10;
export const HEIGHT = 14;

export const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];

// Brand-leaning jewel palette (copper / teal / amber) instead of stock neon.
export const SHAPE_COLORS = [
  "#5fd4c5", "#ecaa66", "#a78bfa", "#34d399", "#fb7185", "#f5c451", "#67a9ff",
];

const DEFAULTS = { scorePerLine: 75, levelByScore: 300 };

export function rotateMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
}

export class KettletrisCore {
  constructor(options = {}) {
    this._rng = options.rng ?? Math.random;
    this._config = { ...DEFAULTS, ...options };
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.lost = false;
    this.piece = null;
    this.nextIndex = this._randomShapeIndex();
    this.spawn();
  }

  _randomShapeIndex() {
    return Math.floor(this._rng() * SHAPES.length);
  }

  spawn() {
    const index = this.nextIndex;
    this.nextIndex = this._randomShapeIndex();
    const matrix = SHAPES[index].map((row) => [...row]);
    this.piece = {
      x: Math.floor((WIDTH - matrix[0].length) / 2),
      y: 0,
      matrix,
      color: SHAPE_COLORS[index % SHAPE_COLORS.length],
    };
  }

  collides(dx, dy, matrix = this.piece.matrix) {
    for (let y = 0; y < matrix.length; y++) {
      for (let cx = 0; cx < matrix[0].length; cx++) {
        if (!matrix[y][cx]) continue;
        const nx = this.piece.x + cx + dx;
        const ny = this.piece.y + y + dy;
        if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  /** Drop distance to where the active piece would land (for the ghost). */
  ghostDrop() {
    let gy = 0;
    while (!this.collides(0, gy + 1)) gy++;
    return gy;
  }

  /** Move; if a downward move is blocked, lock and return the lock result. */
  move(dx, dy) {
    if (!this.collides(dx, dy)) {
      this.piece.x += dx;
      this.piece.y += dy;
      return { moved: true };
    }
    if (dy > 0) return this.lock();
    return { moved: false };
  }

  rotate() {
    const rotated = rotateMatrix(this.piece.matrix);
    if (this.collides(0, 0, rotated)) return false;
    this.piece.matrix = rotated;
    return true;
  }

  hardDrop() {
    while (!this.collides(0, 1)) this.piece.y += 1;
    return this.lock();
  }

  lock() {
    const { matrix, x, y } = this.piece;
    for (let r = 0; r < matrix.length; r++) {
      for (let cx = 0; cx < matrix[0].length; cx++) {
        if (matrix[r][cx] && y + r >= 0) this.board[y + r][x + cx] = 1;
      }
    }
    const clears = this._clearLines();
    let leveledUp = false;
    if (clears > 0) {
      this.lines += clears;
      this.score += clears * this._config.scorePerLine;
      leveledUp = this._maybeLevelUp();
    }
    this.spawn();
    if (this.collides(0, 0)) this.lost = true;
    return { clears, leveledUp, lost: this.lost };
  }

  _clearLines() {
    let clears = 0;
    for (let y = HEIGHT - 1; y >= 0; y--) {
      if (this.board[y].every(Boolean)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(WIDTH).fill(0));
        clears++;
        y++;
      }
    }
    return clears;
  }

  _maybeLevelUp() {
    const next = Math.max(1, Math.floor(this.score / this._config.levelByScore) + 1);
    if (next > this.level) {
      this.level = next;
      return true;
    }
    return false;
  }
}
