#!/usr/bin/env node
'use strict';
/* Generates the AI Awareness Day 2027 brand assets into assets/brand/aiad27/.
 *
 *   node AiAd27/make-marks.js
 *
 * Five theme icons and one campaign lockup.
 *
 * THE ICONS ARE DRAWN AS SILHOUETTES, single-path where possible, and used as
 * CSS masks — so each one takes its colour from the theme token rather than
 * carrying a baked fill. One file per icon, five themes, no recolouring by
 * hand and no variant to keep in step.
 *
 * Why an icon at all: the brief requires that meaning is never carried by
 * colour alone. Every slide shows the theme NAME and its ICON together, so a
 * student who cannot separate teal from green still knows which starter they
 * are in.
 */
const fs = require('node:fs');
const path = require('node:path');

/* The strand colours, from the campaign brief. Baked into each icon rather
   than left to a CSS mask: the slide furniture needs the icon AND the strand
   name AND a timer, which is three things and there are only two pseudo-
   elements on a slide. Painting the icon here frees ::before to carry the
   name as text beside it, and ::after to sit top-right as the brief asks. */
const STRAND = {
  safe: '#00A6A6', smart: '#1F6FEB', creative: '#7A3FF2',
  responsible: '#F0A500', future: '#16A34A'
};

/* 24x24 viewBox, the grid these are drawn on. Kept coarse on purpose: at the
   30px they render in the corner, detail below about a 1.5px stroke fills in
   on a projector and the shape stops being readable. */
const ICONS = {
  /* Safe — a shield. */
  safe: 'M12 2 L21 6 V12 C21 16.8 17 20.6 12 22 C7 20.6 3 16.8 3 12 V6 Z',
  /* Smart — a lightbulb: glass, then the base as two bars. */
  smart: 'M12 2 A7 7 0 0 0 8 14.8 V17 h8 v-2.2 A7 7 0 0 0 12 2 Z M9 18.6 h6 v1.6 h-6 Z M10 21.2 h4 v1.4 h-4 Z',
  /* Creative — a four-point spark, the "made something" mark. */
  creative: 'M12 1 L14.4 8.6 L22 11 L14.4 13.4 L12 21 L9.6 13.4 L2 11 L9.6 8.6 Z',
  /* Responsible — scales: beam, post, two pans. */
  responsible: 'M11 2 h2 v3.2 h6.4 v1.8 H13 V20 h5 v2 H6 v-2 h5 V7 H4.6 V5.2 H11 Z'
    + ' M4.6 8.4 L1.4 15 h6.4 Z M19.4 8.4 L16.2 15 h6.4 Z',
  /* Future — a path turning upward into an arrow. */
  future: 'M3 21 C3 14 8 12 12 12 C16 12 18 10 18 6 h-3.4 L19.6 1 L24 6 h-3.4'
    + ' c0 6-4 8-8.6 8 C8.4 14 5.6 15.6 5.4 21 Z'
};

const OUT = path.join(__dirname, '..', 'assets', 'brand', 'aiad27');

function icon(name, d) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"
     fill="${STRAND[name]}" role="img" aria-label="${name} strand"><path d="${d}"/></svg>\n`;
}

/* The campaign lockup, for the title slide's logo slot only. Two lines: what
   the day is, and what it is asking. Ink, so it sits on the light ground the
   brief asks for — including on the printable version. */
function lockup() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 58" width="300" height="58"
     role="img" aria-label="AI Awareness Day 2027 — Keep Humans in the Loop">
  <text x="0" y="17" font-family="Inter, Helvetica, Arial, sans-serif" font-size="17"
        font-weight="800" letter-spacing="-0.3" fill="#14161A">AI Awareness Day 2027</text>
  <rect x="0" y="27" width="34" height="3" fill="#14161A"/>
  <text x="0" y="50" font-family="Inter, Helvetica, Arial, sans-serif" font-size="14.5"
        font-weight="600" letter-spacing="0.2" fill="#45484F">Keep Humans in the Loop</text>
</svg>\n`;
}

fs.mkdirSync(OUT, { recursive: true });
/* The 2026-style broken-rule marks are gone: the brief replaced that system
   with a theme icon plus a name. Remove them rather than leave two identities
   in one folder for somebody to pick the wrong one from. */
fs.readdirSync(OUT).filter((f) => /^aiad27-(safe|smart|creative|responsible|future)\.svg$/.test(f))
  .forEach((f) => fs.unlinkSync(path.join(OUT, f)));

let n = 0;
Object.keys(ICONS).forEach((key) => {
  fs.writeFileSync(path.join(OUT, `icon-${key}.svg`), icon(key, ICONS[key]), 'utf8');
  n++;
});
fs.writeFileSync(path.join(OUT, 'aiad27-lockup.svg'), lockup(), 'utf8');
n++;
console.log(`Wrote ${n} assets to assets/brand/aiad27/ — five theme icons and the campaign lockup.`);
