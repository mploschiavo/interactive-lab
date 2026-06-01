import { describe, it, expect } from "vitest";
import { SteamRunnerCore, PLAYER } from "../../src/core/steamrunner.js";

const zeroRng = () => 0;

describe("SteamRunnerCore", () => {
  it("starts alive on the ground", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300 });
    expect(core.alive).toBe(true);
    expect(core.grounded).toBe(true);
    expect(core.score).toBe(0);
  });

  it("jumps only when grounded", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300 });
    expect(core.jump()).toBe(true);
    expect(core.velocityY).toBeLessThan(0);
    core.playerY = 100; // airborne
    expect(core.jump()).toBe(false);
  });

  it("applies gravity and scores each step", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300, spawnBase: 999, spawnFloor: 999 });
    core.jump();
    const before = core.playerY;
    core.step(800);
    expect(core.score).toBe(1);
    expect(core.playerY).toBeLessThan(before); // moved up after jump
  });

  it("crashes into an overlapping obstacle", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300, spawnBase: 999, spawnFloor: 999 });
    core.obstacles.push({ x: PLAYER.x, w: 20, h: 30 });
    const result = core.step(800);
    expect(result.lost).toBe(true);
    expect(core.alive).toBe(false);
  });

  it("short-circuits stepping once dead", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300 });
    core.alive = false;
    expect(core.step(800)).toEqual({ lost: true });
  });

  it("spawns obstacles on its cadence", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300, spawnBase: 2, spawnFloor: 2 });
    core.step(800);
    core.step(800); // tick 2 → spawn
    expect(core.obstacles.length).toBeGreaterThan(0);
  });

  it("levels up once the score crosses the threshold", () => {
    const core = new SteamRunnerCore({ rng: zeroRng, ground: 300, levelByScore: 5, spawnBase: 999, spawnFloor: 999 });
    let leveled = false;
    for (let i = 0; i < 6; i++) leveled = core.step(800).leveledUp || leveled;
    expect(core.level).toBeGreaterThanOrEqual(2);
    expect(leveled).toBe(true);
  });
});
