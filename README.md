# Kettle Logic — Interactive Lab

Small browser games we built for fun, and as a portfolio of how we build. Three
vanilla-JS canvas games — **Kettletris**, **Backlog**, and **SteamRunner** — with
a tiny shared runtime.

**Self-contained and privacy-friendly by design:** there is **no build step, no
backend, no network access, and no keys/secrets**. High scores persist to the
browser's `localStorage` only. Safe to host as a fully static site.

## Run it

It's static — just serve the folder (or open `index.html` directly):

```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

## What's here

| File | Purpose |
|---|---|
| `index.html` | launcher (game cards) |
| `kettletris.html` / `backlog.html` / `steamrunner.html` | one page per game |
| `kettletris.js` / `backlog.js` / `steamrunner.js` | the games (canvas) |
| `lab-common.js` | minimal `window.KLGameCommon` runtime: localStorage leaderboard, optional beep, no-op telemetry — **no network** |
| `style.css` | self-contained dark theme |

## Controls

Keyboard-first (also click **Start**). Arrow keys + Space, `P` to pause, `R` to
restart. Each game shows its controls on the start overlay.

## Deploy

It's a static site, so any static host works. Packaged for containers too:

```bash
# Docker
docker build -t interactive-lab . && docker run -p 8090:80 interactive-lab

# Docker Compose  ->  http://localhost:8090/
docker compose up

# Kubernetes (microk8s / k8s)
kubectl apply -f k8s.yaml
```

The image is a tiny nginx serving the static files — no build step, no runtime
deps, no env/secrets.

## License / use

© Kettle Logic. Authored by Kettle Logic; reuse permitted for the author.

---

Live on the site: **[kettlelogic.com/lab](https://kettlelogic.com/lab/)**.
