#!/usr/bin/env node
/* Renders every slide of every AI Awareness Day deck to a PNG, so the whole
 * set can be reviewed at a glance rather than clicked through five times.
 *
 *   node AiAd27/contact-sheet.mjs                 # all five decks
 *   node AiAd27/contact-sheet.mjs --deck safe     # just one
 *   node AiAd27/contact-sheet.mjs --out /tmp/x    # somewhere other than AiAd27/preview
 *
 * Needs the dev server up (npm start). Renders through the app's own
 * SF.renderSlide against the app's own stylesheets — the same path
 * tools/visual-regression.mjs uses — so what comes out is what a projector
 * gets, not an approximation of it.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const deckArg = args.indexOf('--deck');
const only = deckArg >= 0 && args[deckArg + 1] ? args[deckArg + 1].toLowerCase() : null;
const outArg = args.indexOf('--out');
const OUT = outArg >= 0 && args[outArg + 1]
  ? path.resolve(args[outArg + 1])
  : path.join(__dirname, 'preview');
const URL_BASE = process.env.SLIDEFORGE_URL || 'http://localhost:8787';

const FILES = ['Safe', 'Smart', 'Creative', 'Responsible', 'Future']
  .filter((n) => !only || n.toLowerCase() === only)
  .map((n) => ({ name: n, file: path.join(__dirname, 'bundles', `AiAd27-${n}.sfbundle.json`) }));

if (!FILES.length) {
  console.error(`No deck matched "${only}". Try safe, smart, creative, responsible or future.`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

const res = await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
if (!res || !res.ok()) {
  console.error(`Could not reach ${URL_BASE} — is the dev server running? (npm start)`);
  await browser.close();
  process.exit(1);
}
await page.waitForFunction(() => window.SF && window.SF.renderSlide, null, { timeout: 20000 });

let total = 0;
for (const { name, file } of FILES) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${path.relative(ROOT, file)} — run: node AiAd27/build.js`);
    continue;
  }
  const deck = JSON.parse(fs.readFileSync(file, 'utf8')).decks[0];
  const dir = path.join(OUT, name.toLowerCase());
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    await page.evaluate(({ d, s }) => {
      let stage = document.getElementById('sheetStage');
      if (!stage) {
        stage = document.createElement('div');
        stage.id = 'sheetStage';
        Object.assign(stage.style, {
          position: 'fixed', top: '0', left: '0', width: '1280px', height: '720px', zIndex: '999999'
        });
        const noAnim = document.createElement('style');
        /* Freeze the cover motion and every build animation: a contact sheet
           is for judging layout and colour, and a half-played transition
           reads as a bug that is not there. */
        noAnim.textContent =
          '#sheetStage, #sheetStage * { animation: none !important; transition: none !important; }';
        document.head.appendChild(noAnim);
        document.body.appendChild(stage);
      }
      stage.innerHTML = '';
      const node = window.SF.renderSlide(d, s, { interactive: false, revealed: 99 });
      node.style.position = 'relative';
      stage.appendChild(node);
    }, { d: deck, s: slide });

    await page.waitForTimeout(90);
    const label = String(i + 1).padStart(2, '0') + '-' + slide.type +
      (slide.hidden ? '-hidden' : '');
    await page.locator('#sheetStage .slide').screenshot({
      path: path.join(dir, label + '.png'), animations: 'disabled'
    });
    total++;
  }
  console.log(`${name}: ${deck.slides.length} slides → ${path.relative(ROOT, dir)}`);
}

await browser.close();
console.log(`\n${total} slides rendered.`);
