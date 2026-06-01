# Contributing

Thanks for taking a look. This repo is the **source of truth for the games**; the
versions on [kettlelogic.com/lab](https://kettlelogic.com/lab/) are built from here
and vendored into the site.

## Setup

```bash
npm install
npm run dev        # build + serve dist/ at http://localhost:8000
```

## Before you push

```bash
npm run lint       # eslint (flat config)
npm run typecheck  # tsc --checkJs (types via JSDoc)
npm test           # vitest unit + property tests on the cores (coverage-gated 90/85)
npm run test:e2e   # playwright: each game on desktop + mobile
npm run build      # → dist/
```

CI runs all of the above on every push/PR.

## Layout & conventions

```
src/core/        pure game logic — NO DOM/canvas/timers, RNG injected (this is what tests drive)
src/games/       browser adapters — canvas rendering, input, the loop
src/platform/    runtime (KLGameCommon), shared canvas helpers, the loop, on-screen controls
build.mjs        esbuild bundling + static-site generation
tests/core/      unit + property-based tests
tests/e2e/       Playwright smoke (*.spec.js)
```

- **Keep game rules in `src/core`** and DOM/rendering in `src/games`. New rules get a
  unit test (and ideally a property/invariant); the core must stay free of `window`/
  `document`/`canvas`.
- Add controls by dispatching the existing `kl-game-*` events — don't reach into a
  game's internals from the page.
- No runtime dependencies, no network, no tracking. Scores are `localStorage` only.

## Releasing

Push a `vX.Y.Z` tag — `release.yml` builds + pushes the image to GHCR and cuts a
GitHub release.
