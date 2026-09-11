// Screenshots every preview screen with the system's own Edge/Chrome via
// playwright-core, so no browser download is needed.
//
//   npm run dev            (in another terminal)
//   node scripts/screenshot.mjs [names...]
//
// Writes .screenshots/<name>.png at 1440×900 (and <name>@phone.png at 400
// wide for the pages that matter on a phone). The folder is gitignored.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:5173";
const OUT = ".screenshots";

const SCREENS = {
  signin: "signin",
  home: "home",
  "home-empty": "home&empty=1",
  discover: "discover",
  "discover-empty": "discover&empty=1",
  prospects: "prospects",
  prospect: "prospect",
  candidate: "candidate",
  pipeline: "pipeline",
  "pipeline-empty": "pipeline&empty=1",
  clients: "clients",
  "clients-empty": "clients&empty=1",
  tasks: "tasks",
  "tasks-empty": "tasks&empty=1",
};
const PHONE = ["home", "discover", "prospects", "prospect"];

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCREENS);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true }).catch(() =>
  chromium.launch({ channel: "chrome", headless: true }),
);

const shoot = async (name, width, height, suffix = "") => {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/?preview=${SCREENS[name]}`, { waitUntil: "networkidle" });
  // Let the backdrop-filter and fonts settle before capturing.
  await page.waitForTimeout(400);
  const file = `${OUT}/${name}${suffix}.png`;
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log(`${file}${errors.length ? `  ⚠ ${errors.length} console error(s): ${errors[0]}` : ""}`);
};

for (const name of names) {
  if (!SCREENS[name]) {
    console.error(`unknown screen: ${name}`);
    continue;
  }
  await shoot(name, 1440, 900);
  if (PHONE.includes(name)) await shoot(name, 400, 860, "@phone");
}

await browser.close();
