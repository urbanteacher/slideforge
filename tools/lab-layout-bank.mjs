#!/usr/bin/env node
/* The Layout bank's content, for the lab (SlideForge Studio).
 *
 * The lab builds these slides itself, from its own layouts (lab/src/model/fromSlideForge.ts);
 * what it needs from SlideForge is only what each slide says — its type, title, points, table,
 * chart data, notes — and the pictures it shows. This reads the lesson through SlideForge's own
 * buildLesson, keeps the content fields, embeds the pictures it names, and writes one file.
 * Nothing is measured off the screen.
 *
 *   SF_URL=http://localhost:8787 node tools/lab-layout-bank.mjs [lesson]
 *     → lab/src/assets/layout-bank.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const LESSON = process.argv[2] || 'layout-bank';
const SF_URL = process.env.SF_URL || 'http://localhost:8787';
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(SF_URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.SF && window.SF.buildLesson);
const deck = await page.evaluate((key) => {
  const d = window.SF.buildLesson(key);
  // The fields that say what a slide is; player and editor state stay behind.
  const drop = new Set(['id', 'videoStart', 'videoEnd', 'videoLoop', 'videoMuted', 'videoAutoplay', 'correct', 'timeLimit', 'points',
    'imageSide', 'imageFit', 'tableHeader', 'chartUnit', 'buildMode', 'transition', 'layers']);
  const empty = (v) => v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  // A gallery's layers are its pictures, not editor state, so they stay; so does how they fit.
  const keep = (s, k) => s.type === 'gallery' && (k === 'layers' || k === 'imageFit');
  const slides = d.slides.map((s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => (keep(s, k) || !drop.has(k)) && !empty(v))));
  return { key, title: d.title, theme: d.theme, slides };
}, LESSON);
await browser.close();

// Every picture and clip the slides name, embedded, so the lab needs nothing from SlideForge's server.
const images = {};
const walk = (v) => {
  if (typeof v === 'string') {
    const m = v.match(/^(assets\/[^?#]+\.(jpe?g|png|svg|webp|gif|mp4|webm))/i);
    if (m && !images[m[1]] && existsSync(root + m[1])) images[m[1]] = `data:${MIME[m[2].toLowerCase()]};base64,${readFileSync(root + m[1]).toString('base64')}`;
  } else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
};
deck.slides.forEach(walk);

const out = root + 'lab/src/assets/layout-bank.json';
writeFileSync(out, JSON.stringify({ ...deck, images }));
const counts = {};
deck.slides.forEach((s) => { counts[s.type] = (counts[s.type] || 0) + 1; });
console.log(`${deck.slides.length} slides, ${Object.keys(images).length} pictures → ${out} (${(JSON.stringify({ ...deck, images }).length / 1e6).toFixed(2)} MB)`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
