'use strict';
/* Week 10's "power of machine learning" pictures, for a non-technical reader: few words, big numbers, every
 * picture drawn from data/facts.json (computed by code/steps.py), none typed by hand. Plain SVG at 1280x720.
 * Each picture is a panels figure: its parts arrive one per click, so each comes with the boxes it reveals.
 *
 *   ladderSvg()       one chart, one scatter, or a model of all ten: how often each gets the genre right
 *   kindsSvg()        five kinds of model, each as a small picture of what it does
 *   songsSvg()        each kind tried on the songs, as a small real chart
 *   achievedSvg()     what ML helped us do: six big numbers
 *   beforeAfterSvg()  without ML and with it, on one 0-100% scale
 *   hitsSvg()         100 songs picked at random against the model's 100 picks
 */
const D = require('./drawings.js');
const { NU, open, heading, text, wrap, FACTS: F, pct, n } = D;

const GREY = '#b9c0c8', SOFT = '#e6e9ed';
const CLUSTER = ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#d55e00'];
const big = (x, y, t, o = {}) => text(x, y, t, { font: NU.serif, size: o.size || 64, colour: o.colour || NU.red, anchor: o.anchor || 'start', weight: 700 });
const lines = (x, y, t, size, width, o = {}) => wrap(t, size, width).map((l, i) => text(x, y + i * size * 1.3, l, { size, ...o })).join('');
const card = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="${NU.rule}"/>`;
const close = out => { out.push('</svg>'); return out.join('\n'); };

/* ------------------------------------------------------------ icons, drawn at (0,0), about 60 across */
const stroke = (c = NU.navy, w = 3) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const ICONS = {
  dice: `<rect x="-26" y="-26" width="52" height="52" rx="10" ${stroke()}/>${[[-12, -12], [12, 12], [0, 0], [12, -12], [-12, 12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${NU.navy}"/>`).join('')}`,
  chart: `<path d="M-26 26 H26" ${stroke()}/><rect x="-20" y="-2" width="10" height="26" fill="${NU.navy}"/><rect x="-4" y="-16" width="10" height="40" fill="${NU.navy}"/><rect x="12" y="-26" width="10" height="50" fill="${NU.navy}"/>`,
  scatter: `<path d="M-26 -26 V26 H26" ${stroke()}/>${[[-14, 14], [-6, 4], [2, 8], [8, -6], [16, -14], [-10, -4], [14, 2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${NU.navy}"/>`).join('')}`,
  model: (() => {
    const L = [[-24, [-16, 0, 16]], [0, [-22, -8, 8, 22]], [24, [-10, 10]]];
    const e = []; for (let a = 0; a < 2; a++) for (const y1 of L[a][1]) for (const y2 of L[a + 1][1]) e.push(`<line x1="${L[a][0]}" y1="${y1}" x2="${L[a + 1][0]}" y2="${y2}" stroke="${GREY}" stroke-width="1.6"/>`);
    return e.join('') + L.map(([x, ys]) => ys.map(y => `<circle cx="${x}" cy="${y}" r="5.5" fill="${NU.red}"/>`).join('')).join('');
  })()
};

/* ------------------------------------------------------------ 1 the ladder */
const LADDER_TOP = 170, LADDER_ROW = 112;
function ladderSvg() {
  const L = F.ladder;
  const rows = [
    ['dice', 'Just guess', 'Always the commonest genre', F.baseline, GREY],
    ['chart', 'Read one chart', `The best rule from ${L.oneFeature} alone`, L.oneChart, GREY],
    ['scatter', 'Read one scatter plot', `Two numbers at once: ${L.scatterFeatures.join(' and ')}`, L.scatter, GREY],
    ['model', 'Ask a model', 'It weighs all ten numbers at once', F.accuracy, NU.red]];
  const out = [open(), heading('Why machine learning', 'How often can you name a song’s genre?')];
  out.push(text(64, 140, 'From its numbers alone, for thousands of songs nobody showed it before.', { size: 21, colour: NU.dim }));
  const x0 = 560, x1 = 1150, X = v => x0 + v * (x1 - x0);
  rows.forEach(([icon, name, how, v, c], i) => {
    const y = LADDER_TOP + i * LADDER_ROW + 52;
    out.push(`<g transform="translate(110 ${y})">${ICONS[icon]}</g>`);
    out.push(text(170, y - 6, name, { font: NU.serif, size: 30, colour: i === 3 ? NU.red : NU.ink }));
    out.push(text(170, y + 24, how, { size: 17, colour: NU.dim }));
    out.push(`<rect x="${x0}" y="${y - 26}" width="${(x1 - x0)}" height="52" rx="6" fill="${SOFT}"/>`);
    out.push(`<rect x="${x0}" y="${y - 26}" width="${(X(v) - x0).toFixed(1)}" height="52" rx="6" fill="${c}"/>`);
    out.push(text(X(v) + 14, y + 16, pct(v), { font: NU.serif, size: 42, weight: 700, colour: i === 3 ? NU.red : NU.navy }));
  });
  out.push(text(x0, LADDER_TOP + 4 * LADDER_ROW + 40, 'out of 100 songs, how many it gets right', { size: 16, colour: NU.dim }));
  return close(out);
}
const ladderBoxes = () => [0, 1, 2, 3].map(i => [40, LADDER_TOP + i * LADDER_ROW - 6, 1200, LADDER_ROW]);

/* ------------------------------------------------------------ 2 five kinds of model */
const dots = (pts, c, r = 5) => pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}"/>`).join('');
const rand = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const blob = (cx, cy, rx, ry, k, seed) => { const r = rand(seed); return Array.from({ length: k }, () => { const a = r() * 6.283, d = Math.sqrt(r()); return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d]; }); };
const KINDS = [
  ['Classification', 'Which label?', 'Is this email spam?', (w, h) => dots(blob(w * 0.28, h * 0.5, w * 0.16, h * 0.3, 12, 3), CLUSTER[0]) + dots(blob(w * 0.72, h * 0.5, w * 0.16, h * 0.3, 12, 7), CLUSTER[1]) + `<line x1="${w / 2}" y1="${h * 0.12}" x2="${w / 2}" y2="${h * 0.88}" stroke="${NU.red}" stroke-width="3" stroke-dasharray="7 5"/>`],
  ['Regression', 'How much?', 'How many minutes until the bus?', (w, h) => { const r = rand(11); const p = Array.from({ length: 16 }, (_, i) => [w * 0.12 + i * w * 0.05, h * 0.82 - i * h * 0.04 + (r() - 0.5) * h * 0.22]); return dots(p, NU.navy, 4.5) + `<line x1="${w * 0.1}" y1="${h * 0.84}" x2="${w * 0.92}" y2="${h * 0.18}" stroke="${NU.red}" stroke-width="3.5"/>`; }],
  ['Clustering', 'What groups are there?', 'Which customers shop alike?', (w, h) => [[0.27, 0.32], [0.72, 0.36], [0.48, 0.74]].map(([x, y], i) => dots(blob(w * x, h * y, w * 0.13, h * 0.16, 9, 20 + i), CLUSTER[i + 2])).join('')],
  ['Similarity', 'What is like this?', 'Play me a song like this one', (w, h) => { const r = rand(31); const p = Array.from({ length: 18 }, () => [w * (0.1 + r() * 0.8), h * (0.12 + r() * 0.76)]); const c = [w * 0.5, h * 0.5]; const near = p.map(q => [Math.hypot(q[0] - c[0], q[1] - c[1]), q]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]); return dots(p, GREY, 4.5) + near.map(q => `<line x1="${c[0]}" y1="${c[1]}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="${NU.red}" stroke-width="2.5"/>`).join('') + dots(near, NU.navy, 6) + `<path d="M${c[0]} ${c[1] - 12} l3.5 8 8.5 1 -6.5 5.6 2 8.4 -7.5 -4.4 -7.5 4.4 2 -8.4 -6.5 -5.6 8.5 -1 z" fill="${NU.red}"/>`; }],
  ['Anomaly detection', 'What is unusual?', 'Did I really make this payment?', (w, h) => dots(blob(w * 0.4, h * 0.55, w * 0.25, h * 0.3, 22, 41), GREY, 4.5) + `<circle cx="${w * 0.84}" cy="${h * 0.2}" r="6" fill="${NU.red}"/><circle cx="${w * 0.84}" cy="${h * 0.2}" r="17" fill="none" stroke="${NU.red}" stroke-width="2.5"/>`]
];
function panelsOf(eyebrow, title, sub, items, draw) {
  const out = [open(), heading(eyebrow, title)];
  if (sub) out.push(text(64, 134, sub, { size: 20, colour: NU.dim }));
  const k = items.length, gap = 18, w = (1152 - gap * (k - 1)) / k, top = 160, h = 500;
  items.forEach((it, i) => { const x = 64 + i * (w + gap); out.push(card(x, top, w, h)); out.push(draw(it, x, top, w, h)); });
  return close(out);
}
const rowBoxes = (k, top = 160, h = 500) => { const gap = 18, w = (1152 - gap * (k - 1)) / k; return Array.from({ length: k }, (_, i) => [64 + i * (w + gap) - 6, top - 6, w + 12, h + 12]); };
function kindsSvg() {
  return panelsOf('Which kind', 'Five kinds of machine learning', 'Each answers a different kind of question.', KINDS, ([name, q, eg, pic], x, top, w) => [
    `<g transform="translate(${x + 18} ${top + 20})">${pic(w - 36, 230)}</g>`,
    lines(x + 18, top + 300, name, 26, w - 30, { font: NU.serif, colour: NU.navy }),
    lines(x + 18, top + 375, q, 21, w - 30, { weight: 700, colour: NU.red }),
    lines(x + 18, top + 440, `“${eg}”`, 19, w - 30, { colour: NU.dim })].join(''));
}

/* ------------------------------------------------------------ 3 each kind on our songs */
function bars(w, h, pairs, max = 1, fmt = pct) {
  const bw = (w - 40) / pairs.length;
  return pairs.map(([label, v, c], i) => {
    const bh = (h - 70) * v / max, x = 20 + i * bw + bw * 0.15, y = h - 40 - bh;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}"/>` +
      text(x + bw * 0.35, y - 10, fmt(v), { font: NU.serif, size: 26, weight: 700, anchor: 'middle', colour: c === NU.red ? NU.red : NU.navy }) +
      text(x + bw * 0.35, h - 14, label, { size: 15, anchor: 'middle', colour: NU.dim });
  }).join('') + `<line x1="10" y1="${h - 40}" x2="${w - 10}" y2="${h - 40}" stroke="${NU.rule}" stroke-width="2"/>`;
}
function scatterOf(w, h, pts, colour) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const [ax, bx] = [Math.min(...xs), Math.max(...xs)], [ay, by] = [Math.min(...ys), Math.max(...ys)];
  return pts.map(p => `<circle cx="${(8 + (p[0] - ax) / (bx - ax) * (w - 16)).toFixed(1)}" cy="${(h - 8 - (p[1] - ay) / (by - ay) * (h - 16)).toFixed(1)}" r="${colour(p).r}" fill="${colour(p).c}" opacity="${colour(p).o}"/>`).join('');
}
function songsSvg() {
  const like = F.likeBlindingLights;
  const items = [
    ['Classification', `Names the genre ${pct(F.accuracy)} of the time; guessing manages ${pct(F.baseline)}.`, (w, h) => bars(w, h, [['guessing', F.baseline, GREY], ['the model', F.accuracy, NU.red]])],
    ['Regression', `Popularity: off by ${F.popularityMAE.toFixed(1)} points, guessing ${F.guessMeanMAE.toFixed(1)}. It barely helps.`, (w, h) => bars(w, h, [['guessing', F.guessMeanMAE, GREY], ['the model', F.popularityMAE, NU.navy]], 25, v => v.toFixed(1))],
    ['Clustering', 'Five groups of songs, found with no labels given.', (w, h) => scatterOf(w, h, F.clusterMap, p => ({ c: CLUSTER[p[2]], r: 2.6, o: 0.8 }))],
    ['Similarity', 'The nearest songs to Blinding Lights, on all ten numbers.', (w, h) => {
      const c = [w / 2, h * 0.45], at = [[w * 0.12, h * 0.16], [w * 0.88, h * 0.26], [w * 0.4, h * 0.86]];
      return at.map((p, i) => `<line x1="${c[0]}" y1="${c[1]}" x2="${p[0]}" y2="${p[1]}" stroke="${NU.red}" stroke-width="2.5"/><circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${NU.navy}"/>` +
        text(p[0] + [-4, 4, 16][i], p[1] + [-16, -16, 6][i], like[i].name, { size: 14, anchor: ['start', 'end', 'start'][i], weight: 700 })).join('') +
        `<circle cx="${c[0]}" cy="${c[1]}" r="14" fill="${NU.red}"/>` + text(c[0] - 10, c[1] + 32, 'Blinding Lights', { size: 15, anchor: 'end', weight: 700, colour: NU.red });
    }],
    ['Anomaly detection', `In red, all ${n(F.anomalies.flagged)} songs it flags as odd (1%); in grey, a sample of the rest.`, (w, h) => scatterOf(w, h, F.oddMap, p => p[2] ? { c: NU.red, r: 3.2, o: 0.95 } : { c: GREY, r: 2.4, o: 0.6 }) + text(w - 6, h - 4, 'length →', { size: 12, anchor: 'end', colour: NU.dim }) + text(6, 14, '↑ tempo', { size: 12, colour: NU.dim })]
  ];
  // the anomaly map: tempo up, length along
  items[4][2] = (w, h) => scatterOf(w, h, F.oddMap.map(p => [p[1], p[0], p[2]]), p => p[2] ? { c: NU.red, r: 2, o: 0.9 } : { c: GREY, r: 2.6, o: 0.7 }) + text(w - 6, h - 4, 'length →', { size: 12, anchor: 'end', colour: NU.dim }) + text(6, 14, '↑ tempo', { size: 12, colour: NU.dim });
  return panelsOf('On our data', 'Each kind, tried on the songs', 'The same 28,356 songs, five questions. Every picture is computed.', items, ([name, say, pic], x, top, w) => [
    `<g transform="translate(${x + 14} ${top + 16})">${pic(w - 28, 250)}</g>`,
    lines(x + 18, top + 310, name, 22, w - 30, { font: NU.serif, colour: NU.navy }),
    lines(x + 18, top + 360, say, 17, w - 30)].join(''));
}

/* ------------------------------------------------------------ 4 what ML helped us do */
const TILE = { top: 150, w: 368, h: 250, gap: 24 };
const tileAt = i => [64 + (i % 3) * (TILE.w + TILE.gap), TILE.top + Math.floor(i / 3) * (TILE.h + TILE.gap)];
function achievedSvg() {
  const tiles = [
    [`${Math.round(F.accuracy / F.baseline)}×`, 'better than guessing at naming a song’s genre'],
    [`${pct(F.chartRecall.rock)} → ${pct(F.recall.rock)}`, 'of rock songs recognised: one chart, then the model'],
    ['5', 'groups of songs found, with nobody saying what to look for'],
    [`3 of ${n(F.tracks)}`, 'songs picked out as most like Blinding Lights'],
    [n(F.anomalies.flagged), 'odd songs flagged at once, the ones we found by eye among them'],
    [`${F.hitLift}×`, 'more hits in its shortlist than in a random pick']];
  const out = [open(), heading('What it helped us do', 'What did machine learning help us do?')];
  tiles.forEach(([num, say], i) => {
    const [x, y] = tileAt(i);
    out.push(card(x, y, TILE.w, TILE.h));
    out.push(big(x + 28, y + 100, num, { size: num.length > 6 ? 50 : 72 }));
    out.push(lines(x + 28, y + 160, say, 21, TILE.w - 56, { colour: NU.ink }));
  });
  return close(out);
}
const achievedBoxes = () => Array.from({ length: 6 }, (_, i) => { const [x, y] = tileAt(i); return [x - 6, y - 6, TILE.w + 12, TILE.h + 12]; });

/* ------------------------------------------------------------ 5 before and after */
const BA = { top: 200, row: 92 };
function beforeAfterSvg() {
  const rows = [
    ['Genre named right', F.ladder.oneChart, F.accuracy, 'one chart', 'the model'],
    ['Rock songs recognised', F.chartRecall.rock, F.recall.rock, 'one chart', 'the model'],
    ['R&B songs recognised', F.chartRecall['r&b'], F.recall['r&b'], 'one chart', 'the model'],
    ['Hits among its picks', F.hitShare, F.hitPrecision, 'at random', 'the model']];
  const out = [open(), heading('Before and after', 'What machine learning changed')];
  const x0 = 470, x1 = 1170, X = v => x0 + v * (x1 - x0);
  out.push(`<circle cx="${x0}" cy="146" r="10" fill="${GREY}"/>`, text(x0 + 18, 152, 'without machine learning', { size: 18, colour: NU.dim }));
  out.push(`<circle cx="${x0 + 300}" cy="146" r="10" fill="${NU.red}"/>`, text(x0 + 318, 152, 'with machine learning', { size: 18, colour: NU.red, weight: 700 }));
  rows.forEach(([label, a, b], i) => {
    const y = BA.top + i * BA.row + 40;
    out.push(text(64, y + 9, label, { font: NU.serif, size: 28 }));
    out.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${SOFT}" stroke-width="10" stroke-linecap="round"/>`);
    out.push(`<line x1="${X(a)}" y1="${y}" x2="${X(b)}" y2="${y}" stroke="${NU.red}" stroke-width="6" opacity="0.45"/>`);
    out.push(`<circle cx="${X(a)}" cy="${y}" r="13" fill="${GREY}"/>`, `<circle cx="${X(b)}" cy="${y}" r="15" fill="${NU.red}"/>`);
    out.push(text(X(a), y - 22, pct(a, a < 0.05 && a > 0 ? 1 : 0), { size: 17, anchor: 'middle', colour: NU.dim }));
    out.push(text(X(b), y - 24, pct(b), { font: NU.serif, size: 26, weight: 700, anchor: 'middle', colour: NU.red }));
  });
  const y = BA.top + 4 * BA.row + 40;
  out.push(text(64, y + 9, 'Popularity predicted', { font: NU.serif, size: 28 }));
  out.push(text(x0, y + 9, `Off by ${F.guessMeanMAE.toFixed(1)} points before, ${F.popularityMAE.toFixed(1)} after. It barely helped, and saying so is part of the story.`, { size: 19, colour: NU.dim }));
  out.push(text(x0, BA.top + 5 * BA.row + 34, '0%', { size: 14, colour: NU.dim }), text(x1, BA.top + 5 * BA.row + 34, '100%', { size: 14, anchor: 'end', colour: NU.dim }));
  return close(out);
}
const beforeAfterBoxes = () => Array.from({ length: 5 }, (_, i) => [40, BA.top + i * BA.row - 4, 1200, BA.row]);

/* ------------------------------------------------------------ 6 a hundred picks */
function hitsSvg() {
  const random = Math.round(F.hitShare * 100), model = Math.round(F.hitPrecision * 100);
  const grid = (x, y, k) => Array.from({ length: 100 }, (_, i) => `<circle cx="${x + (i % 10) * 34}" cy="${y + Math.floor(i / 10) * 34}" r="13" fill="${i < k ? NU.red : SOFT}"/>`).join('');
  const out = [open(), heading('A shortlist of hits', 'Pick 100 songs. How many will be hits?')];
  [[110, 'At random', random, 'about 2 hits in every 100 songs'], [710, 'The model’s picks', model, `about ${model} hits in every 100 it picks`]].forEach(([x, name, k, say]) => {
    out.push(text(x, 175, name, { font: NU.serif, size: 30, colour: k === model ? NU.red : NU.ink }));
    out.push(grid(x + 14, 220, k));
    out.push(big(x, 610, String(k), { size: 56, colour: k === model ? NU.red : NU.navy }), text(x + 80, 600, say, { size: 19, colour: NU.dim }));
  });
  out.push(text(64, 670, `A hit: popularity 80 or more. The model still misses most hits: it finds ${F.hitsFoundCount} of ${F.hitsInTest}. Useful as a shortlist, not as a crystal ball.`, { size: 18, colour: NU.dim }));
  return close(out);
}
const hitsBoxes = () => [[90, 150, 540, 480], [690, 150, 540, 480]];

module.exports = { ladderSvg, ladderBoxes, kindsSvg, songsSvg, achievedSvg, achievedBoxes, beforeAfterSvg, beforeAfterBoxes, hitsSvg, hitsBoxes, rowBoxes };
