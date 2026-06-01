import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // The pure game logic is unit-tested here; the browser adapters
      // (src/games, src/platform) are exercised by the Playwright smoke test.
      include: ["src/core/**"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
