#!/usr/bin/env node
/* Does every slide actually fit on a 1280x720 stage?
 *
 *   node AiAd27/check-fit.mjs
 *
 * Overflow is the failure mode these decks are most exposed to: the content
 * came from PowerPoint text boxes that were free to spill, and a slide that
 * runs 40px past the bottom looks fine in an editor thumbnail and loses its
 * last line on the wall. The links slide lost Young Minds and Samaritans that
 * way — the two entries a student in difficulty most needs.
 *
 * Measures the rendered slide rather than guessing from character counts, and
 * checks the two things that go wrong: content taller or wider than the stage,
 * and any element sticking out past the slide's own edges.
 *
 * Needs the dev server up (npm start). Exits non-zero if anything overflows.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL_BASE = process.env.SLIDEFORGE_URL || 'http://localhost:8787';
const NAMES = ['Safe', 'Smart', 'Creative', 'Responsible', 'Future'];

/* A couple of pixels of slack: sub-pixel rounding on a scaled stage routinely
   reports 720.4, and failing a build on that would make this check noise. */
const SLACK = 3;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

const res = await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
if (!res || !res.ok()) {
  console.error(`Could not reach ${URL_BASE} — is the dev server running? (npm start)`);
  await browser.close();
  process.exit(1);
}
await page.waitForFunction(() => window.SF && window.SF.renderSlide, null, { timeout: 20000 });

let checked = 0;
const bad = [];

for (const name of NAMES) {
  const file = path.join(__dirname, 'bundles', `AiAd27-${name}.sfbundle.json`);
  if (!fs.existsSync(file)) continue;
  const deck = JSON.parse(fs.readFileSync(file, 'utf8')).decks[0];

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const report = await page.evaluate(({ d, s, slack }) => {
      let stage = document.getElementById('fitStage');
      if (!stage) {
        stage = document.createElement('div');
        stage.id = 'fitStage';
        Object.assign(stage.style, {
          position: 'fixed', top: '0', left: '0', width: '1280px', height: '720px', zIndex: '999999'
        });
        const noAnim = document.createElement('style');
        noAnim.textContent =
          '#fitStage, #fitStage * { animation: none !important; transition: none !important; }';
        document.head.appendChild(noAnim);
        document.body.appendChild(stage);
      }
      stage.innerHTML = '';
      /* revealed: 99 so progressive slides are measured fully built — a
         half-revealed cards slide always fits and proves nothing. */
      const node = window.SF.renderSlide(d, s, { interactive: false, revealed: 99 });
      node.style.position = 'relative';
      stage.appendChild(node);

      const out = { over: [], scroll: null };
      const box = node.getBoundingClientRect();

      const pad = node.querySelector('.pad') || node;
      if (pad.scrollHeight > pad.clientHeight + slack ||
          pad.scrollWidth > pad.clientWidth + slack) {
        out.scroll = {
          h: pad.scrollHeight, ch: pad.clientHeight,
          w: pad.scrollWidth, cw: pad.clientWidth
        };
      }

      /* Anything whose painted box leaves the slide. Decoration is excluded:
         the theme art is bled off the corner on purpose, and so is any
         element the renderer marked aria-hidden. */
      node.querySelectorAll('.pad *').forEach((elem) => {
        if (elem.closest('[aria-hidden="true"]')) return;
        if (!elem.textContent.trim()) return;
        const r = elem.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.bottom > box.bottom + slack || r.right > box.right + slack ||
            r.top < box.top - slack || r.left < box.left - slack) {
          out.over.push({
            cls: elem.className || elem.tagName.toLowerCase(),
            text: elem.textContent.trim().slice(0, 44),
            past: Math.round(Math.max(r.bottom - box.bottom, r.right - box.right,
              box.top - r.top, box.left - r.left))
          });
        }
      });
      /* Only the outermost offender per slide: a line that overflows drags
         every ancestor out with it, and ten rows of the same fault is noise. */
      out.over = out.over.slice(0, 3);
      return out;
    }, { d: deck, s: slide, slack: SLACK });

    checked++;
    if (report.scroll || report.over.length) {
      bad.push({ deck: name, n: i + 1, type: slide.type, hidden: !!slide.hidden, report });
    }
  }
}

await browser.close();

if (!bad.length) {
  console.log(`${checked} slides checked — everything fits on a 1280x720 stage.`);
  process.exit(0);
}

console.log(`${checked} slides checked — ${bad.length} with a problem:\n`);
for (const b of bad) {
  console.log(`${b.deck} slide ${b.n} (${b.type}${b.hidden ? ', hidden' : ''})`);
  if (b.report.scroll) {
    const s = b.report.scroll;
    console.log(`    content ${s.w}x${s.h} in a ${s.cw}x${s.ch} pad`);
  }
  for (const o of b.report.over) {
    console.log(`    "${o.text}" — ${o.past}px past the edge [${o.cls}]`);
  }
}
process.exit(1);
