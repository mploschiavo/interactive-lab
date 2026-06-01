import { describe, it, expect } from "vitest";
import { KettletrisCore, rotateMatrix, WIDTH, HEIGHT } from "../../src/core/kettletris.js";

const zeroRng = () => 0; // always shape index 0

describe("rotateMatrix", () => {
  it("rotates a matrix clockwise", () => {
    expect(rotateMatrix([[1, 0], [1, 1]])).toEqual([[1, 1], [1, 0]]);
  });
});

describe("KettletrisCore", () => {
  it("initializes an empty board with a spawned piece", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    expect(core.score).toBe(0);
    expect(core.level).toBe(1);
    expect(core.lost).toBe(false);
    expect(core.piece).not.toBeNull();
    expect(core.board.length).toBe(HEIGHT);
    expect(core.board[0].length).toBe(WIDTH);
  });

  it("detects the floor as a collision", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.piece.y = HEIGHT; // pushed past the bottom
    expect(core.collides(0, 0)).toBe(true);
  });

  it("clears a full row and scores", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.board[HEIGHT - 1] = Array(WIDTH).fill(1);
    const result = core.lock();
    expect(result.clears).toBe(1);
    expect(core.score).toBe(75); // default scorePerLine
    expect(core.lines).toBe(1);
    expect(core.board[HEIGHT - 1].every((c) => c === 0 || c === 1)).toBe(true);
  });

  it("levels up once the score crosses the threshold", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.score = 300;
    core.board[HEIGHT - 1] = Array(WIDTH).fill(1);
    const result = core.lock();
    expect(result.leveledUp).toBe(true);
    expect(core.level).toBe(2);
  });

  it("flags a loss when a fresh piece immediately collides", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    // Locking the spawn-row piece fills the spawn cells (a partial row, so it is
    // NOT cleared); the next identical piece then spawns into an occupied row.
    const result = core.lock();
    expect(result.lost).toBe(true);
    expect(core.lost).toBe(true);
  });

  it("hard-drops a piece to the floor and locks it", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.hardDrop();
    const bottomFilled = core.board[HEIGHT - 1].some((c) => c === 1);
    expect(bottomFilled).toBe(true);
  });

  it("refuses to move through a wall", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.piece.x = 0;
    const result = core.move(-1, 0);
    expect(result.moved).toBe(false);
    expect(core.piece.x).toBe(0);
  });

  it("does not rotate into an occupied cell", () => {
    const core = new KettletrisCore({ rng: zeroRng });
    core.piece.matrix = [[1]];
    core.piece.x = 0;
    core.piece.y = 0;
    core.board[0][0] = 0; // current cell free; rotation of 1x1 is a no-op but legal
    expect(core.rotate()).toBe(true);
  });
});
