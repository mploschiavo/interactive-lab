# Kettle Logic — Interactive Lab

Small browser games we built for fun, and as a portfolio of how we build. Three
vanilla-JS canvas games — **Kettletris**, **Backlog**, and **SteamRunner** — each
split into a **testable, dependency-free logic core** and a thin browser adapter
(canvas rendering + input).

**Privacy-friendly by design:** no backend, no network, no keys. High scores
persist to the browser's `localStorage` only. The built site is fully static.

## Layout

```
src/
  core/        pure game logic — no DOM, no canvas, RNG injected (unit-tested)
  games/       browser adapters — canvas rendering, input, animation loop
  platform/    runtime.js → window.KLGameCommon (leaderboard, audio, HUD)
  styles/      self-contained dark theme
build.mjs      esbuild: bundles core+adapter per game, emits the static site
tests/core/    Vitest unit tests for each game core
deploy/k8s/    Deployment (2 replicas, probes, non-root) + Service
```

## Develop

```bash
npm install
npm run lint     # eslint
npm test         # vitest unit tests on the cores, coverage-gated (90% / 85% branch)
npm run build    # → dist/ (static site + dist/lab/*.js bundles)
npm run dev      # build + serve dist/ on http://localhost:8000
```

## Run the built site

`dist/` is static — serve it with any static host, or:

```bash
npm run build && python3 -m http.server 8000 --directory dist
```

## Deploy

```bash
docker build -t interactive-lab . && docker run -p 8090:8080 interactive-lab
# or Kubernetes:
kubectl apply -k deploy/k8s
```

## This repo is the source of truth for the games

The same game bundles power the lab on **[kettlelogic.com/lab](https://kettlelogic.com/lab/)**.
The site vendors the built files (`dist/lab/lab-common.js` + `dist/lab/<game>.js`)
into its own shell — so the games are maintained **here**, once. See
[ARCHITECTURE.md](./ARCHITECTURE.md).

## License

MIT — see [LICENSE](./LICENSE).
