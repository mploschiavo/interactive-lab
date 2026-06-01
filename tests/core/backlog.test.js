import { describe, it, expect } from "vitest";
import { BacklogCore } from "../../src/core/backlog.js";

const zeroRng = () => 0;

describe("BacklogCore", () => {
  it("starts empty", () => {
    const core = new BacklogCore({ rng: zeroRng });
    expect(core.score).toBe(0);
    expect(core.overflow).toBe(0);
    expect(core.tasks).toEqual([]);
    expect(core.lost).toBe(false);
  });

  it("clears a task under the pointer and scores", () => {
    const core = new BacklogCore({ rng: zeroRng });
    core.tasks.push({ x: 100, y: 100, r: 12, v: 1 });
    const cleared = core.sweep(100, 100);
    expect(cleared).toBe(1);
    expect(core.score).toBe(8); // default scorePerTask
    expect(core.tasks).toHaveLength(0);
  });

  it("misses a sweep outside the disc", () => {
    const core = new BacklogCore({ rng: zeroRng });
    core.tasks.push({ x: 100, y: 100, r: 12, v: 1 });
    expect(core.sweep(400, 400)).toBe(0);
    expect(core.tasks).toHaveLength(1);
  });

  it("counts overflow when a task escapes the top", () => {
    const core = new BacklogCore({ rng: zeroRng });
    core.tasks.push({ x: 50, y: -100, r: 12, v: 1 });
    core.step(800, 600);
    expect(core.overflow).toBe(1);
  });

  it("loses when overflow reaches the limit", () => {
    const core = new BacklogCore({ rng: zeroRng, overflowLimit: 2 });
    core.overflow = 1;
    core.tasks.push({ x: 50, y: -100, r: 12, v: 1 });
    const result = core.step(800, 600);
    expect(result.lost).toBe(true);
    expect(core.lost).toBe(true);
  });

  it("short-circuits stepping once lost", () => {
    const core = new BacklogCore({ rng: zeroRng });
    core.lost = true;
    expect(core.step(800, 600)).toEqual({ lost: true });
  });

  it("auto-clears a task in preview mode", () => {
    const core = new BacklogCore({ rng: zeroRng });
    core.tasks.push({ x: 50, y: 300, r: 12, v: 1 });
    core.step(800, 600, true);
    expect(core.score).toBeGreaterThan(0);
    expect(core.tasks).toHaveLength(0);
  });

  it("spawns tasks on its cadence", () => {
    const core = new BacklogCore({ rng: zeroRng, spawnBase: 3, spawnFloor: 3 });
    core.step(800, 600);
    core.step(800, 600);
    expect(core.tasks).toHaveLength(0);
    core.step(800, 600); // tick 3 → spawn
    expect(core.tasks).toHaveLength(1);
  });
});
