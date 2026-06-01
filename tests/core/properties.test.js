import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { KettletrisCore, WIDTH, HEIGHT } from "../../src/core/kettletris.js";
import { BacklogCore } from "../../src/core/backlog.js";
import { SteamRunnerCore, PLAYER } from "../../src/core/steamrunner.js";

// Small seeded PRNG so fast-check controls the game's randomness deterministically.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("KettletrisCore invariants", () => {
  const action = fc.constantFrom("left", "right", "down", "rotate", "drop");

  it("holds its invariants under any sequence of moves", () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 80 }), fc.integer(), (actions, seed) => {
        const core = new KettletrisCore({ rng: mulberry32(seed) });
        for (const a of actions) {
          if (core.lost) break;
          if (a === "left") core.move(-1, 0);
          else if (a === "right") core.move(1, 0);
          else if (a === "down") core.move(0, 1);
          else if (a === "rotate") core.rotate();
          else core.hardDrop();

          // board only ever holds 0/1 and never keeps a completed row (clearLines ran)
          for (const row of core.board) {
            expect(row.every((c) => c === 0 || c === 1)).toBe(true);
            expect(row.every((c) => c === 1)).toBe(false);
          }
          // the active piece is always inside the well
          const p = core.piece;
          for (let y = 0; y < p.matrix.length; y++) {
            for (let cx = 0; cx < p.matrix[0].length; cx++) {
              if (!p.matrix[y][cx]) continue;
              expect(p.x + cx).toBeGreaterThanOrEqual(0);
              expect(p.x + cx).toBeLessThan(WIDTH);
              expect(p.y + y).toBeLessThan(HEIGHT);
            }
          }
          expect(core.score).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});

describe("BacklogCore invariants", () => {
  it("score/overflow only rise; sweep never adds tasks; loss implies overflow at limit", () => {
    const op = fc.oneof(
      fc.record({ kind: fc.constant("step") }),
      fc.record({ kind: fc.constant("sweep"), x: fc.double({ min: 0, max: 800, noNaN: true }), y: fc.double({ min: 0, max: 600, noNaN: true }) }),
    );
    fc.assert(
      fc.property(fc.array(op, { maxLength: 120 }), fc.integer(), (ops, seed) => {
        const core = new BacklogCore({ rng: mulberry32(seed) });
        let score = 0;
        let overflow = 0;
        for (const o of ops) {
          const before = core.tasks.length;
          if (o.kind === "step") core.step(800, 600, false);
          else expect(core.sweep(o.x, o.y)).toBeLessThanOrEqual(before > 0 ? before : 0);
          expect(core.score).toBeGreaterThanOrEqual(score);
          expect(core.overflow).toBeGreaterThanOrEqual(overflow);
          score = core.score;
          overflow = core.overflow;
          if (core.lost) expect(core.overflow).toBeGreaterThanOrEqual(core.overflowLimit);
        }
      }),
    );
  });
});

describe("SteamRunnerCore invariants", () => {
  const op = fc.constantFrom("step", "jump");
  it("score only rises, the player never falls below ground, death implies lost", () => {
    fc.assert(
      fc.property(fc.array(op, { maxLength: 120 }), fc.integer(), (ops, seed) => {
        const core = new SteamRunnerCore({ rng: mulberry32(seed), ground: 300 });
        let score = 0;
        for (const o of ops) {
          if (o === "jump") core.jump();
          else core.step(800);
          expect(core.playerY).toBeLessThanOrEqual(core.ground);
          expect(core.score).toBeGreaterThanOrEqual(score);
          score = core.score;
          if (!core.alive) expect(core.lost).toBe(true);
        }
        expect(PLAYER.x).toBeGreaterThan(0);
      }),
    );
  });
});
