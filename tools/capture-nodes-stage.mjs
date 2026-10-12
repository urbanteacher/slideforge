#!/usr/bin/env node
/* A Nodes stage, captured section by section, tab by tab, exactly as the app draws it, for a
 * presentation (tools/build-nodes-stage-deck.js turns the captures into a SlideForge deck).
 *
 *   node tools/capture-nodes-stage.mjs critical-text 3 [base URL]
 *
 * Every section of every tab becomes a picture shaped for a slide: a section too tall is cut between
 * its own parts (down to a table's rows if need be), and a short note travels with the section beside
 * it. Plus the states a reader would click through: the case's other face, and each of the stage's
 * three answers. Each picture's words go into the manifest, for the speaker notes.
 * Writes assets/lesson/nodes/<framework>-<stage>/NN.png and manifest.json. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const [fw = 'critical-text', slug = '3', base = 'http://localhost:3021'] = process.argv.slice(2);
const OUT = `assets/lesson/nodes/${fw}-${slug}`;
const TABS = ['recall', 'stage', 'visual', 'answer', 'marks', 'analysis'];
const VIEW_H = 1800;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: VIEW_H }, deviceScaleFactor: 2 });
await page.goto(`${base}/framework/${fw}/${slug}`, { waitUntil: 'networkidle' });
/* The stage alone, full width: the framework diagram beside it is hidden for the capture, so wide parts
   (the SOLO grid) fit and every picture is shaped for a slide. */
await page.addStyleTag({ content: '.explorer-main, .site-header, .fw-switch, .breadcrumbs, .framework-page > h1, .framework-page > .lede, .framework-page > .eyebrow { display: none !important; } .explorer { display: block !important; } .explorer-panel { max-width: 880px !important; width: 880px !important; margin: 0 auto !important; }' });
await page.waitForTimeout(600);
const head = await page.$eval('.explorer-detail-head', (e) => ({
  eyebrow: e.querySelector('.eyebrow')?.textContent.trim() ?? '',
  title: e.querySelector('.explorer-title')?.textContent.trim() ?? '',
  ask: e.querySelector('.explorer-ask')?.textContent.trim() ?? '',
}));
const tabs = await page.$$eval('[role=tab][id^=panel-tab-]', (els) => els.map((e) => ({ id: e.id.replace('panel-tab-', ''), label: e.textContent.trim() })));
const panelW = (await (await page.$('#panel-panel')).boundingBox()).width;
/* A picture taller than this (CSS px) reads too small on a 16:9 slide, so it is cut. */
const MAX_H = Math.round(panelW * 0.56);
/* A block shorter than this travels with the section beside it, so no slide is a thin strip. */
const SMALL = Math.round(MAX_H * 0.4);

const shots = [];
let n = 0;
const text = async (el) => (await el.innerText().catch(() => '')).trim();
const titleOf = (el) => el.$eval('h2, .recall-h', (h) => h.textContent.trim()).catch(() => '');

/** The pieces of an element, each no taller than MAX_H where its own parts allow. */
async function pieces(el, depth = 0) {
  const b = await el.boundingBox();
  if (!b || b.height < 2) return [];
  if (b.height <= MAX_H || depth > 5) return [el];
  const kids = await el.$$(':scope > *');
  if (!kids.length) return [el];
  const out = [];
  for (const k of kids) out.push(...(await pieces(k, depth + 1)));
  return out.length ? out : [el];
}

/** One picture of a run of elements, clipped to the frame's width, so a card keeps its sides. */
async function grab(frame, els, title, tab, extra = {}) {
  await els[0].evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -24));
  await page.waitForTimeout(150);
  const fb = await frame.boundingBox();
  const first = await els[0].boundingBox(), last = await els[els.length - 1].boundingBox();
  const y0 = Math.max(fb.y, first.y - 14, 0), y1 = Math.min(fb.y + fb.height, last.y + last.height + 14, VIEW_H);
  if (y1 - y0 < 8) return;
  const file = `${String(++n).padStart(2, '0')}.png`;
  await page.screenshot({ path: `${OUT}/${file}`, clip: { x: fb.x - 2, y: y0, width: fb.width + 4, height: y1 - y0 } });
  const words = [];
  for (const e of els) words.push(await text(e));
  shots.push({ tab, title, file, text: words.filter(Boolean).join('\n'), ...extra });
}

/** A section as pictures: whole when it fits, otherwise cut between its pieces. */
async function shoot(el, title, tab, extra = {}) {
  const b = await el.boundingBox();
  if (!b || b.height < 8) return;
  if (b.height <= MAX_H) return grab(el, [el], title, tab, extra);
  const ps = await pieces(el);
  let group = [], top = 0, k = 0;
  for (const p of ps) {
    const pb = await p.boundingBox();
    if (!pb) continue;
    if (group.length && pb.y + pb.height - top > MAX_H) {
      await grab(el, group, k ? `${title} (continued)` : title, tab, extra);
      group = []; k++;
    }
    if (!group.length) top = (await p.boundingBox()).y;
    group.push(p);
  }
  if (group.length) await grab(el, group, k ? `${title} (continued)` : title, tab, extra);
}

for (const { id, label } of tabs) {
  if (!TABS.includes(id)) continue;
  await page.click(`#panel-tab-${id}`);
  await page.waitForTimeout(id === 'visual' ? 3000 : 1200);
  const panel = await page.$('#panel-panel');
  const establish = await page.$eval('#panel-panel > .tab-establish', (e) => e.textContent.trim()).catch(() => '');
  shots.push({ tab: label, section: true, establish });
  const blocks = await page.$$('#panel-panel > *:not(.tab-establish)');
  // Short notes wait for the next section and are pictured with it.
  let held = [];
  const flushHeld = async () => {
    if (!held.length) return;
    const named = [];
    for (const h of held) named.push(await titleOf(h));
    await grab(panel, held, named.filter(Boolean).join(' · '), label); held = [];
  };
  for (const el of blocks) {
    const cls = (await el.getAttribute('class')) ?? '';
    const b = await el.boundingBox();
    if (!b || b.height < 4) continue;
    const title = await titleOf(el);
    if (b.height < SMALL && !cls.includes('answers') && !(await el.$('.advert-turn'))) {
      if (held.length) { const hb = await held[0].boundingBox(); if (b.y + b.height - hb.y > MAX_H) await flushHeld(); }
      held.push(el); continue;
    }
    // A section with a case card: its front, then its back.
    if (await el.$('.advert-turn')) {
      await flushHeld();
      await shoot(el, title || label, label, { state: 'front' });
      await (await el.$('.advert-turn')).click();
      await page.waitForTimeout(900);
      // The back: the case card alone, not the section again.
      const card = await el.$('figure') ?? await el.$('.advert-flip');
      await grab(card, [card], `${title || label}: the back of the case`, label, { state: 'back' });
      await (await el.$('.advert-turn')).click().catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }
    // The three answers: one picture each.
    if (cls.includes('answers')) {
      await flushHeld();
      for (const btn of await el.$$('.tbtn')) {
        const name = (await btn.textContent()).trim();
        if (!/^Student/.test(name)) continue;
        await btn.click();
        await page.waitForTimeout(500);
        await shoot(el, `Answers: ${name}`, label, { answer: name });
      }
      continue;
    }
    // A note held back joins this section when they fit together; otherwise it goes on its own.
    if (held.length) {
      const hb = await held[0].boundingBox();
      if (b.y + b.height - hb.y <= MAX_H) {
        const named = [];
        for (const h of held) named.push(await titleOf(h));
        await grab(panel, [...held, el], [...named, title].filter(Boolean).join(' · '), label); held = []; continue;
      }
      await flushHeld();
    }
    await shoot(el, title, label);
  }
  await flushHeld();
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ from: `${base}/framework/${fw}/${slug}`, live: `https://the-teaching-model.vercel.app/framework/${fw}/${slug}`, head, panelW, shots }, null, 2));
console.log(`${shots.filter((s) => !s.section).length} pictures in ${tabs.length} tabs, panel ${Math.round(panelW)}px · ${OUT}`);
await browser.close();
