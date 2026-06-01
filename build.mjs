/**
 * Build: bundle the ESM source into the browser contract both shells expect
 * (`lab-common.js` defines window.KLGameCommon; each `<game>.js` is a self-running
 * IIFE), then emit the standalone static site into dist/.
 */
import { build } from "esbuild";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";

const GAMES = [
  { slug: "kettletris", title: "Kettletris", blurb: "Stack the blocks, clear the lines, keep the pressure up.", controls: "← → move · ↑ rotate · ↓ / Space drop · P pause · R restart" },
  { slug: "backlog", title: "Backlog", blurb: "Triage the queue before it overflows. Prioritize under pressure.", controls: "Drag / tap to sweep · Sweep button · P pause · R restart" },
  { slug: "steamrunner", title: "SteamRunner", blurb: "Keep the line moving and time your jumps. Don't stall the boiler.", controls: "Space / tap jump · Enter start · P pause · R restart" },
];

const TARGET = "es2020";

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
      <div class="stage">
        <canvas id="game-canvas" width="1200" height="720"></canvas>
        <div id="game-start-overlay" class="overlay">
          <button id="game-start-btn" class="btn" type="button">Start game</button>
          <p>${game.controls}</p>
        </div>
        <div id="game-feedback"></div>
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
