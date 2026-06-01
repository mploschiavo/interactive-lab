/**
 * Build: bundle the ESM source into the browser contract both shells expect
 * (`lab-common.js` defines window.KLGameCommon; each `<game>.js` is a self-running
 * IIFE), then emit the standalone static site into dist/.
 */
import { build } from "esbuild";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";

const GAMES = [
  {
    slug: "kettletris", title: "Kettletris",
    blurb: "Stack the blocks, clear the lines, keep the pressure up.",
    controls: "← → move · ↑ rotate · ↓ / Space drop · P pause · R restart",
    pad: { dpad: true, face: [{ action: "rotate", key: "A", sub: "rotate" }, { action: "drop", key: "B", sub: "drop" }] },
  },
  {
    slug: "backlog", title: "Backlog",
    blurb: "Triage the queue before it overflows. Prioritize under pressure.",
    controls: "Drag / tap to sweep · Sweep button · P pause · R restart",
    pad: { dpad: false, face: [{ action: "sweep", key: "Sweep", wide: true }] },
  },
  {
    slug: "steamrunner", title: "SteamRunner",
    blurb: "Keep the line moving and time your jumps. Don't stall the boiler.",
    controls: "Space / tap jump · Enter start · P pause · R restart",
    pad: { dpad: false, face: [{ action: "jump", key: "Jump", wide: true }] },
  },
];

const TARGET = "es2020";

// On-screen gamepad: D-pad (left), system row (center), face buttons (right).
function dpadHtml() {
  return `        <div class="pad__dir" aria-label="Direction pad">
          <button class="dpad dpad--up" type="button" data-kl-action="rotate" aria-label="Rotate">▲</button>
          <button class="dpad dpad--left" type="button" data-kl-repeat="left" aria-label="Move left">◀</button>
          <button class="dpad dpad--right" type="button" data-kl-repeat="right" aria-label="Move right">▶</button>
          <button class="dpad dpad--down" type="button" data-kl-repeat="down" aria-label="Soft drop">▼</button>
        </div>`;
}
function faceHtml(face) {
  const btns = face
    .map(
      (f) =>
        `          <button class="facebtn${f.wide ? " facebtn--wide" : ""}" type="button" data-kl-action="${f.action}" aria-label="${f.sub || f.key}"><b>${f.key}</b>${f.sub ? `<span>${f.sub}</span>` : ""}</button>`,
    )
    .join("\n");
  return `        <div class="pad__face">\n${btns}\n        </div>`;
}
function padHtml(game) {
  const dir = game.pad.dpad ? dpadHtml() : '        <div class="pad__dir pad__dir--empty"></div>';
  return `      <div class="pad" role="group" aria-label="Game controls">
${dir}
        <div class="pad__sys">
          <button class="sysbtn" type="button" data-kl-fullscreen aria-label="Play fullscreen">⛶</button>
          <button class="sysbtn" type="button" data-kl-pause aria-label="Pause / resume">⏸</button>
          <button class="sysbtn" type="button" data-kl-restart aria-label="Restart">↻</button>
          <button class="sysbtn" type="button" data-kl-mute aria-pressed="false" aria-label="Sound">🔊</button>
          <button class="sysbtn sysbtn--exit" type="button" data-kl-exit aria-label="Exit fullscreen">✕</button>
        </div>
${faceHtml(game.pad.face)}
      </div>`;
}

function gamePage(game) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${game.title} — Kettle Logic Lab</title>
    <meta name="description" content="${game.title} — ${game.blurb} Play it in your browser; scores stay local." />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="wrap">
      <header class="lab-bar">
        <a class="lab-brand" href="./index.html"><b>Kettle</b> <span>Logic Lab</span></a>
        <a class="lab-back" href="./index.html">← all games</a>
      </header>
      <h1 class="game-title">${game.title}</h1>
      <p class="game-blurb">${game.blurb}</p>
      <div class="hud">
        <span>Score <b id="game-score">0</b></span>
        <span>Level <b id="game-level">1</b></span>
        <span id="game-status">Ready</span>
      </div>
      <div class="play">
        <div class="stage">
          <canvas id="game-canvas" width="1200" height="720"></canvas>
          <div id="game-start-overlay" class="overlay">
            <button id="game-start-btn" class="btn" type="button">Start game</button>
            <p>${game.controls}</p>
            <button class="btn btn--ghost" type="button" data-kl-fullscreen>⛶ Play fullscreen</button>
          </div>
          <div id="game-over" class="overlay hidden">
            <p class="overlay__title">Game over</p>
            <button class="btn" type="button" data-kl-restart>Play again</button>
          </div>
          <div id="game-feedback"></div>
        </div>
${padHtml(game)}
      </div>
      <p class="controls">${game.controls}</p>
      <section class="scores">
        <h2>Local high scores</h2>
        <ol id="game-leaderboard" class="board"></ol>
        <form id="score-form" class="scoreform">
          <input id="score-name" placeholder="Your name" maxlength="12" aria-label="Your name" />
          <button class="btn" type="submit">Save score</button>
        </form>
      </section>
    </div>
    <script src="./lab/lab-common.js"></script>
    <script src="./lab/${game.slug}.js"></script>
    <script src="./lab/controls.js"></script>
  </body>
</html>
`;
}

function indexPage() {
  const cards = GAMES.map(
    (g) => `        <a class="card" href="./${g.slug}.html"><h3>${g.title}</h3><p>${g.blurb}</p></a>`,
  ).join("\n");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kettle Logic — Interactive Lab</title>
    <meta name="description" content="Small browser games from Kettle Logic. Vanilla JS, no backend, scores stay local." />
    <link rel="icon" href="./favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="wrap">
      <header class="lab-bar">
        <span class="lab-brand"><b>Kettle</b> <span>Logic Lab</span></span>
        <a class="lab-back" href="https://kettlelogic.com">kettlelogic.com →</a>
      </header>
      <h1 class="game-title">Interactive Lab</h1>
      <p class="game-blurb">Small browser games we built for fun — and as a portfolio of how we build. Vanilla JS, no backend, scores stay on your device.</p>
      <div class="cards">
${cards}
      </div>
    </div>
  </body>
</html>
`;
}

async function main() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist/lab", { recursive: true });

  await build({
    entryPoints: GAMES.map((g) => `src/games/${g.slug}.js`),
    outdir: "dist/lab",
    bundle: true,
    format: "iife",
    target: TARGET,
    minify: true,
    legalComments: "none",
  });
  await build({
    entryPoints: ["src/platform/controls.js"],
    outfile: "dist/lab/controls.js",
    bundle: true,
    format: "iife",
    target: TARGET,
    minify: true,
    legalComments: "none",
  });
  await build({
    entryPoints: ["src/platform/runtime.js"],
    outfile: "dist/lab/lab-common.js",
    bundle: true,
    format: "iife",
    target: TARGET,
    minify: true,
    legalComments: "none",
  });

  await copyFile("src/styles/style.css", "dist/style.css");
  await copyFile("favicon.svg", "dist/favicon.svg");
  await writeFile("dist/index.html", indexPage());
  for (const game of GAMES) await writeFile(`dist/${game.slug}.html`, gamePage(game));

  process.stdout.write("build: dist/ ready (lab/lab-common.js + 3 games, site pages)\n");
}

main().catch((err) => {
  process.stderr.write(`${err}\n`);
  process.exit(1);
});
