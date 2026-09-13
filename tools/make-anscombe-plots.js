#!/usr/bin/env node
'use strict';
/* Draws Anscombe's quartet as four SVGs for the LDSCI6253 lecture.
 *
 *   node tools/make-anscombe-plots.js
 *
 * SVG rather than PNG so the plots stay crisp on a lecture-theatre projector
 * at any size, and so they are diffable text in the repo. The numbers are
 * Anscombe's own (1973); the fitted line is the same for all four — y = 3 +
 * 0.5x — which is the whole point of the slide, so it is drawn identically
 * rather than refitted per panel.
 */
const fs = require('node:fs');
const path = require('node:path');

const X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const SETS = [
  { id: 'I',   note: 'a straight relationship',      x: X, y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68] },
  { id: 'II',  note: 'a curve, not a line',          x: X, y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74] },
  { id: 'III', note: 'one point drags the line',     x: X, y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73] },
  { id: 'IV',  note: 'one point makes the line',     x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8],
                                                      y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89] }
];

/* Northeastern London's palette, so the plots and the slides agree. */
const RED = '#c8102e', NAVY = '#0c3354', INK = '#14181f', DIM = '#5a6572', RULE = 'rgba(12,51,84,.18)';

const W = 760, H = 570, M = { t: 34, r: 34, b: 66, l: 72 };
/* One scale for all four panels: comparing them is the exercise, and four
   different axes would quietly make that impossible. */
const XLIM = [0, 20], YLIM = [0, 14];

const px = v => M.l + (v - XLIM[0]) / (XLIM[1] - XLIM[0]) * (W - M.l - M.r);
const py = v => H - M.b - (v - YLIM[0]) / (YLIM[1] - YLIM[0]) * (H - M.t - M.b);

function svg(set) {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Avenir Next, Avenir, Segoe UI, sans-serif">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);

  for (let g = XLIM[0]; g <= XLIM[1]; g += 5) {
    parts.push(`<line x1="${px(g)}" y1="${py(YLIM[0])}" x2="${px(g)}" y2="${py(YLIM[1])}" stroke="${RULE}" stroke-width="1"/>`);
  }
  for (let g = YLIM[0]; g <= YLIM[1]; g += 2) {
    parts.push(`<line x1="${px(XLIM[0])}" y1="${py(g)}" x2="${px(XLIM[1])}" y2="${py(g)}" stroke="${RULE}" stroke-width="1"/>`);
    parts.push(`<text x="${M.l - 14}" y="${py(g) + 7}" font-size="19" fill="${DIM}" text-anchor="end">${g}</text>`);
  }
  for (let g = XLIM[0]; g <= XLIM[1]; g += 5) {
    parts.push(`<text x="${px(g)}" y="${H - M.b + 32}" font-size="19" fill="${DIM}" text-anchor="middle">${g}</text>`);
  }

  parts.push(`<line x1="${px(XLIM[0])}" y1="${py(3 + 0.5 * XLIM[0])}" x2="${px(XLIM[1])}" y2="${py(3 + 0.5 * XLIM[1])}" stroke="${NAVY}" stroke-width="3.5" stroke-linecap="round"/>`);

  set.x.forEach((xv, i) => {
    parts.push(`<circle cx="${px(xv).toFixed(1)}" cy="${py(set.y[i]).toFixed(1)}" r="9" fill="${RED}" stroke="#ffffff" stroke-width="2.5"/>`);
  });

  parts.push(`<text x="${M.l}" y="${M.t + 6}" font-size="30" font-weight="700" fill="${INK}">${set.id}</text>`);
  parts.push(`<text x="${M.l + 34}" y="${M.t + 6}" font-size="20" fill="${DIM}">${set.note}</text>`);
  parts.push(`<text x="${W - M.r}" y="${H - 14}" font-size="16" fill="${DIM}" text-anchor="end">mean x 9 · mean y 7.5 · r 0.816 · y = 3 + 0.5x</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}

const outDir = path.join(__dirname, '..', 'assets', 'lesson', 'anscombe');
fs.mkdirSync(outDir, { recursive: true });
SETS.forEach(set => {
  const file = path.join(outDir, 'anscombe-' + set.id.toLowerCase() + '.svg');
  fs.writeFileSync(file, svg(set), 'utf8');
  console.log('Wrote ' + path.relative(path.join(__dirname, '..'), file));
});
