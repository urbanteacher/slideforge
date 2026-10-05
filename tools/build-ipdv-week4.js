#!/usr/bin/env node
'use strict';

/* Week 4 · The Power of Colour (LDSCI6253), built as a portable bundle.
 *
 *   python3 tools/extract-ipdv-week4-images.py   # once: pictures from the PDFs
 *   node tools/build-ipdv-week4.js
 *
 * Writes lessons/04_Lecture_IPDV_Colour.sfbundle.json, ready for File → Import.
 * The lesson is defined here rather than in js/lessons.js while it is being
 * built ten slides at a time; the plan is docs/ipdv-week4-colour-plan.md and
 * the slide order follows Week4_Colour_Lecture_Plan.md.
 *
 * One design rule runs through the deck: everything the deck draws for itself
 * is Northeastern navy, red and warm white, so any other colour on screen is
 * the colour being studied. The pictures this tool draws (the pinned cases,
 * the fruit strip) follow it too. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const memory = new Map();
global.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
global.window = { localStorage: global.localStorage };
require(path.join(root, 'js/model.js'));
const SF = global.window.SF;

const DIR = 'assets/lesson/ipdv/week4';
/* Phone games, polls and word clouds. Off for now: the slides that carried
   them still ask their question, answered by hands up. Set true to bring every
   one back exactly as authored. */
const INTERACTIVE = false;
const asset = name => `${DIR}/${name}`;
const NU = {
  red: '#c8102e', navy: '#0c3354', navyDeep: '#071f35', paper: '#fbfaf8',
  ink: '#14181f', dim: '#5a6572',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif"
};

/* ------------------------------------------------------------ pictures */

function dataUri(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
  return `data:image/${mime};base64,${fs.readFileSync(path.join(root, file)).toString('base64')}`;
}

function jpegSize(file) {
  const buf = fs.readFileSync(path.join(root, file));
  /* A PNG keeps its size in the IHDR chunk; the stripes image is a PNG. */
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  for (let i = 2; i < buf.length;) {
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  throw new Error(`${file}: no JPEG size`);
}

/** Fit a picture inside a box, centred, keeping its shape. */
function fit(file, x, y, w, h) {
  const { w: iw, h: ih } = jpegSize(file);
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* Slide 8. The three cases pinned to a navy board, like evidence waiting for
   the end of the lecture. Each print leans a little; the red tab is the only
   colour the deck adds. */
function parkItBoard() {
  const cases = [
    ['A', 'Ancestry map', 'map-ancestry.jpg', -3.2],
    ['B', 'Profitable markets', 'map-markets.jpg', 1.8],
    ['C', 'Fly the nest', 'chart-fly-the-nest.jpg', -1.4]
  ];
  const cardW = 440, cardH = 420, gap = 60, top = 170;
  const left = (1600 - (cardW * 3 + gap * 2)) / 2;
  const prints = cases.map(([letter, label, file, turn], i) => {
    const x = left + i * (cardW + gap);
    const cx = x + cardW / 2, cy = top + cardH / 2;
    const box = fit(asset(file), x + 22, top + 22, cardW - 44, cardH - 110);
    return `
  <g transform="rotate(${turn} ${cx} ${cy})">
    <rect x="${x + 8}" y="${top + 12}" width="${cardW}" height="${cardH}" fill="#000" opacity=".35"/>
    <rect x="${x}" y="${top}" width="${cardW}" height="${cardH}" fill="${NU.paper}"/>
    <image href="${dataUri(asset(file))}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"/>
    <text x="${x + 22}" y="${top + cardH - 34}" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">${esc(label)}</text>
    <rect x="${x + cardW - 86}" y="${top - 18}" width="64" height="64" fill="${NU.red}"/>
    <text x="${x + cardW - 54}" y="${top + 27}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="36" fill="#fff">${letter}</text>
    <circle cx="${cx}" cy="${top + 4}" r="11" fill="${NU.red}" stroke="#fff" stroke-width="3"/>
  </g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.navyDeep}"/>
  <text x="${left}" y="104" font-family="${NU.sans}" font-weight="600" font-size="26" letter-spacing="6" fill="#fff" opacity=".6">PARKED UNTIL THE END OF THE LECTURE</text>
  <line x1="${left}" y1="126" x2="${left + 120}" y2="126" stroke="${NU.red}" stroke-width="6"/>${prints}
</svg>
`;
}

/* Slide 10, first step. The three fruit pictures side by side and lettered,
   so the room can predict before any of them is explained. */
function fruitStrip() {
  const files = [['A', 'Lightness only', 'fruit-lightness.jpg'],
    ['B', 'Colour only', 'fruit-colour-only.jpg'],
    ['C', 'Both', 'fruit-full.jpg']];
  const w = 470, h = 300, gap = 45, top = 170;
  const left = (1600 - (w * 3 + gap * 2)) / 2;
  const panels = files.map(([letter, label, file], i) => {
    const x = left + i * (w + gap);
    return `
  <image href="${dataUri(asset(file))}" x="${x}" y="${top}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="${x + w / 2}" cy="${top - 70}" r="44" fill="${NU.red}"/>
  <text x="${x + w / 2}" y="${top - 55}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="44" fill="#fff">${letter}</text>
  <text x="${x + w / 2}" y="${top + h + 62}" text-anchor="middle" font-family="${NU.serif}" font-size="38" fill="${NU.ink}">${esc(label)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>${panels}
  </svg>
`;
}

/* Slides 9–10. A photograph on the deck's own navy, letterboxed so a wide
   picture keeps its shape, with a quiet step label above it. The bottom of
   the frame is left clear for the caption bar. */
function photoPanel(file, label) {
  const box = fit(asset(file), 0, 96, 1600, 640);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.navyDeep}"/>
  <image href="${dataUri(asset(file))}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"/>
  <text x="64" y="64" font-family="${NU.sans}" font-weight="600" font-size="24" letter-spacing="6" fill="#fff" opacity=".65">${esc(label)}</text>
  <line x1="64" y1="80" x2="160" y2="80" stroke="${NU.red}" stroke-width="5"/>
</svg>
`;
}

/* Slide 12. The takeaway the fruit was for: lightness answers where, colour
   answers what, and you need both. One word over each picture does the
   teaching; the caption bar says the rule. */
function fruitTakeaway() {
  const cols = [['WHERE', 'Lightness: shapes and edges', 'fruit-lightness.jpg'],
    ['WHAT', 'Colour: which fruit is which', 'fruit-colour-only.jpg'],
    ['BOTH', 'Where and what together', 'fruit-full.jpg']];
  const w = 460, h = 291, gap = 50, top = 230;
  const left = (1600 - (w * 3 + gap * 2)) / 2;
  const panels = cols.map(([word, line, file], i) => {
    const x = left + i * (w + gap);
    const last = i === cols.length - 1;
    return `
  <text x="${x}" y="${top - 48}" font-family="${NU.serif}" font-size="76" fill="${last ? NU.red : NU.navy}">${word}</text>
  <image href="${dataUri(asset(file))}" x="${x}" y="${top}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
  <text x="${x}" y="${top + h + 46}" font-family="${NU.sans}" font-size="28" fill="${NU.ink}">${esc(line)}</text>`;
  }).join('');
  const ops = [['+', left + w + gap / 2], ['=', left + 2 * w + gap * 1.5]].map(([op, x]) =>
    `<text x="${x}" y="${top + h / 2 + 18}" text-anchor="middle" font-family="${NU.sans}" font-size="52" font-weight="300" fill="${NU.dim}">${op}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>${panels}${ops}
</svg>
`;
}

/* Slide 3. Last week's route drawn through one dataset the room already
   knows: TfL daily cycle hires (Lab 1), 2024. Six panels, read left to right
   and top to bottom. Panel 5 is where today lives, so it alone gets the red
   rule; its heatmap is the only data colour on the slide. Grid values are
   mean hires per day, month × weekday, computed from
   lessons/tfl-daily-cycle-hires.xlsx. */
const HIRES_2024 = [
  [17966, 19110, 21483, 20041, 18678, 14900, 12891], [21941, 23343, 21593, 19203, 19769, 16936, 14424],
  [23443, 21760, 25875, 23959, 19693, 19264, 14488], [22026, 24176, 24886, 25106, 23390, 22138, 18039],
  [23291, 24023, 28479, 29241, 25755, 27429, 26657], [28549, 31516, 32178, 31615, 28498, 24851, 27130],
  [27692, 30117, 32383, 31650, 26243, 25099, 25174], [27710, 30850, 31108, 29070, 28578, 24289, 25848],
  [25948, 30262, 29429, 27167, 24960, 26816, 21539], [25125, 27809, 30678, 31082, 27320, 23638, 19699],
  [24618, 25791, 26751, 27176, 24950, 19985, 17399], [18545, 19376, 23263, 18047, 17174, 12036, 10965]
];
/* ColorBrewer Blues, interpolated in sRGB: a lightness ramp, darker = more. */
const BLUES = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'];
function ramp(t) {
  const x = Math.max(0, Math.min(1, t)) * (BLUES.length - 1);
  const i = Math.min(BLUES.length - 2, Math.floor(x)), f = x - i;
  const a = BLUES[i], b = BLUES[i + 1];
  const ch = k => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f);
  return '#' + [1, 3, 5].map(k => ch(k).toString(16).padStart(2, '0')).join('');
}

function pipeline(focus = null) {
  const W = 450, H = 300, gap = 45, left = 80;
  const pos = i => ({ x: left + (i % 3) * (W + gap), y: (i < 3 ? 190 : 545) });
  const mono = "'SF Mono', Menlo, Consolas, monospace";
  const head = (i, label, red) => {
    const { x, y } = pos(i);
    return `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#fff" stroke="${red ? NU.red : 'rgba(12,51,84,.18)'}" stroke-width="${red ? 4 : 1.5}"/>
  <circle cx="${x + 30}" cy="${y + 32}" r="17" fill="${red ? NU.red : NU.navy}"/>
  <text x="${x + 30}" y="${y + 39}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="18" fill="#fff">${i + 1}</text>
  <text x="${x + 58}" y="${y + 40}" font-family="${NU.sans}" font-weight="700" font-size="21" letter-spacing="3" fill="${red ? NU.red : NU.navy}">${label}</text>`;
  };
  const foot = (i, text) => { const { x, y } = pos(i); return `<text x="${x + 22}" y="${y + H - 18}" font-family="${NU.sans}" font-size="19" fill="${NU.dim}">${esc(text)}</text>`; };
  const groups = [];
  let parts;

  // 1 · raw data
  { parts = groups[0] = []; const { x, y } = pos(0);
    const lines = ['2024-01-01,8212', '2024-01-02,9769', '2024-01-03,15255', '2024-01-04,12987', '2024-01-05,15430', '… 361 more lines'];
    parts.push(head(0, 'RAW DATA'), ...lines.map((l, k) => `<text x="${x + 30}" y="${y + 84 + k * 29}" font-family="${mono}" font-size="21" fill="${k === 5 ? NU.dim : NU.ink}">${l}</text>`), foot(0, 'Records as they arrive: TfL daily hires')); }

  // 2 · table
  { parts = groups[1] = []; const { x, y } = pos(1);
    const cols = [['Date', 0], ['Month', 120], ['Day', 220], ['Hires', 300]];
    const rows = [['1 Jan', 'Jan', 'Mon', '8,212'], ['2 Jan', 'Jan', 'Tue', '9,769'], ['3 Jan', 'Jan', 'Wed', '15,255'], ['4 Jan', 'Jan', 'Thu', '12,987']];
    parts.push(head(1, 'TABLE'));
    cols.forEach(([c, dx]) => parts.push(`<text x="${x + 30 + dx}" y="${y + 88}" font-family="${NU.sans}" font-weight="700" font-size="20" fill="${NU.navy}">${c}</text>`));
    parts.push(`<line x1="${x + 26}" y1="${y + 100}" x2="${x + W - 26}" y2="${y + 100}" stroke="${NU.navy}" stroke-width="1.5"/>`);
    rows.forEach((r, k) => r.forEach((v, j) => parts.push(`<text x="${x + 30 + cols[j][1]}" y="${y + 132 + k * 30}" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">${v}</text>`)));
    parts.push(foot(1, 'Items in rows, attributes in columns')); }

  // 3 · types
  { parts = groups[2] = []; const { x, y } = pos(2);
    const types = [['Date', 'ordered · time'], ['Month', 'ordinal · cyclic'], ['Day', 'ordinal · cyclic'], ['Hires', 'quantitative']];
    parts.push(head(2, 'TYPES'));
    types.forEach(([a, t], k) => parts.push(
      `<text x="${x + 30}" y="${y + 92 + k * 42}" font-family="${NU.sans}" font-weight="700" font-size="21" fill="${NU.ink}">${a}</text>`,
      `<rect x="${x + 140}" y="${y + 70 + k * 42}" width="${t.length * 10.5 + 24}" height="30" rx="15" fill="none" stroke="${NU.navy}" stroke-width="1.5"/>`,
      `<text x="${x + 152}" y="${y + 91 + k * 42}" font-family="${NU.sans}" font-size="18" fill="${NU.navy}">${t}</text>`));
    parts.push(foot(2, 'Name each attribute’s type')); }

  // 4 · question
  { parts = groups[3] = []; const { x, y } = pos(3);
    parts.push(head(3, 'QUESTION'),
      `<path d="M${x + 34} ${y + 74} h${W - 68} v112 h-${W - 160} l-30 30 v-30 h-${62} z" fill="${NU.paper}" stroke="${NU.navy}" stroke-width="1.5"/>`,
      `<text x="${x + 56}" y="${y + 120}" font-family="${NU.serif}" font-size="31" fill="${NU.ink}">When do Londoners</text>`,
      `<text x="${x + 56}" y="${y + 160}" font-family="${NU.serif}" font-size="31" fill="${NU.ink}">hire the most bikes?</text>`,
      foot(3, 'The task: find the peak')); }

  // 5 · visualisation (today)
  { parts = groups[4] = []; const { x, y } = pos(4);
    const flat = HIRES_2024.flat(), lo = Math.min(...flat), hi = Math.max(...flat);
    const cw = 25, chh = 23, gx = x + 80, gy = y + 66;
    parts.push(head(4, 'VISUALISATION', true));
    'MTWTFSS'.split('').forEach((d, j) => parts.push(`<text x="${gx - 14}" y="${gy + j * chh + 17}" text-anchor="end" font-family="${NU.sans}" font-size="15" fill="${NU.dim}">${d}</text>`));
    'JFMAMJJASOND'.split('').forEach((m, i) => {
      parts.push(`<text x="${gx + i * cw + cw / 2}" y="${gy + 7 * chh + 20}" text-anchor="middle" font-family="${NU.sans}" font-size="15" fill="${NU.dim}">${m}</text>`);
      HIRES_2024[i].forEach((v, j) => parts.push(`<rect x="${gx + i * cw}" y="${gy + j * chh}" width="${cw - 2}" height="${chh - 2}" fill="${ramp((v - lo) / (hi - lo))}"/>`));
    });
    parts.push(`<rect x="${x + W - 112}" y="${y + 18}" width="92" height="30" fill="${NU.red}"/>`,
      `<text x="${x + W - 66}" y="${y + 39}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="17" letter-spacing="2" fill="#fff">TODAY</text>`,
      foot(4, 'Hires per day: darker means more')); }

  // 6 · insight
  { parts = groups[5] = []; const { x, y } = pos(5);
    parts.push(head(5, 'INSIGHT'),
      `<text x="${x + 30}" y="${y + 104}" font-family="${NU.serif}" font-size="31" fill="${NU.ink}">Summer midweek is busiest.</text>`,
      `<text x="${x + 30}" y="${y + 150}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">About 32,000 hires on a July Wednesday:</text>`,
      `<text x="${x + 30}" y="${y + 180}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">three times a December Sunday.</text>`,
      foot(5, 'What the reader now knows')); }

  // arrows: across each row, and the turn from 3 down to 4
  const arrows = [];
  for (const i of [0, 1, 3, 4]) { const { x, y } = pos(i); const ax = x + W + 8, ay = y + H / 2;
    arrows.push(`<path d="M${ax} ${ay} h${gap - 20} m-9 -9 l9 9 l-9 9" fill="none" stroke="${NU.dim}" stroke-width="2.5"/>`); }
  { const a = pos(2), b = pos(3);
    arrows.push(`<path d="M${a.x + W / 2} ${a.y + H + 6} V${a.y + H + 28} H${b.x + W / 2} V${b.y - 10} m-9 -9 l9 9 l9 -9" fill="none" stroke="${NU.dim}" stroke-width="2.5" stroke-dasharray="7 6"/>`); }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.paper}"/>
  <text x="${left}" y="92" font-family="${NU.serif}" font-size="54" fill="${NU.ink}">From raw data to insight</text>
  <text x="${left}" y="138" font-family="${NU.sans}" font-size="24" fill="${NU.dim}">One dataset all the way through: TfL daily cycle hires, 2024 (Lab 1)</text>
  ${groups.map((g, i) => `<g opacity="${focus === null || focus === i ? 1 : 0.16}">${g.join('')}</g>`).join('\n  ')}
  <g opacity="${focus === null ? 1 : 0.3}">${arrows.join('')}</g>
</svg>
`;
}

/* Slides 5–7. A case fills the screen: the chart as large as the slide's
   height allows, on navy so nothing competes with it, and a small red tag in
   the bottom-left corner instead of a caption bar. */
function casePanel(file, letter) {
  const box = fit(asset(file), 0, 0, 1600, 900);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.navyDeep}"/>
  <image href="${dataUri(asset(file))}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${box.x + 18}" y="${box.y + box.h - 62}" width="150" height="44" fill="${NU.red}"/>
  <text x="${box.x + 93}" y="${box.y + box.h - 32}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="3" fill="#fff">CASE ${letter}</text>
</svg>
`;
}

/* ================================================== batch 2: slides 11–20 */

const svgOpen = bg => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${bg}"/>`;
const heading = (title, sub, fill = NU.ink, x = 80) =>
  `<text x="${x}" y="92" font-family="${NU.serif}" font-size="54" fill="${fill}">${esc(title)}</text>` +
  (sub ? `<text x="${x}" y="138" font-family="${NU.sans}" font-size="24" fill="${fill === NU.ink ? NU.dim : fill}" opacity="${fill === NU.ink ? 1 : 0.7}">${esc(sub)}</text>` : '');
const dimmed = (groups, focus) => groups.map((g, i) => `<g opacity="${focus === null || focus === i ? 1 : 0.16}">${g}</g>`).join('\n  ');
function seeded(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* Machado, Oliveira & Fernandes (2009), severity 1, applied in linear RGB —
   the deutan matrix is the one Week 3's scales experiment uses. */
const CVD = {
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
};
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const hexRgb = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const rgbHex = c => '#' + c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
function simulate(hex, kind) {
  if (!kind) return hex;
  const l = hexRgb(hex).map(toLin);
  return rgbHex(CVD[kind].map(r => toSrgb(Math.max(0, Math.min(1, r[0] * l[0] + r[1] * l[1] + r[2] * l[2])))));
}

/* Slide 11. A field of dots, quartered A–D. In the grey field the red dot is
   the only colour; in the mixed field colour is everywhere, including an
   orange-red decoy. The two targets sit in different quarters. */
const POP_MIXED = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#9c755f', '#bab0ac'];
const POP_TARGET = '#d7191c';
function popBody(mixed, target) {
  const rand = seeded(mixed ? 77 : 41);
  const dots = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
    if (rand() < 0.18) continue;
    const x = 150 + c * 118 + (rand() - 0.5) * 50, y = 150 + r * 118 + (rand() - 0.5) * 50;
    const isT = c === target[0] && r === target[1];
    const fill = isT ? POP_TARGET : mixed ? POP_MIXED[Math.floor(rand() * POP_MIXED.length)] : '#a3abb4';
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="19" fill="${fill}"/>`);
  }
  const q = [['A', 70, 90], ['B', 1530, 90], ['C', 70, 845], ['D', 1530, 845]]
    .map(([l, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="44" fill="${NU.navy}" opacity=".35">${l}</text>`).join('');
  return `<line x1="800" y1="40" x2="800" y2="860" stroke="${NU.navy}" stroke-opacity=".2" stroke-width="3" stroke-dasharray="10 10"/>
  <line x1="40" y1="475" x2="1560" y2="475" stroke="${NU.navy}" stroke-opacity=".2" stroke-width="3" stroke-dasharray="10 10"/>
  ${q}${dots.join('')}`;
}
const popField = (mixed, target) => `${svgOpen('#ffffff')}
  ${popBody(mixed, target)}
  <rect x="620" y="14" width="360" height="52" fill="${NU.red}"/>
  <text x="800" y="50" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="24" letter-spacing="3" fill="#fff">FIND THE RED DOT</text>
</svg>
`;
/* Slide 25. What the two flashes showed, and why. Round 1 is pop-out: one
   distinct colour is found in parallel, whatever the number of dots. Round 2
   breaks it by similarity, not by conjunction: red is one colour among many
   and a decoy is close to it (Duncan & Humphreys, 1989; Munzner 5.5.4). */
function popTakeaway() {
  const thumb = (x, mixed, target, word, lines) => `
  <rect x="${x - 4}" y="166" width="648" height="372" fill="none" stroke="${NU.navy}" stroke-opacity=".2" stroke-width="2"/>
  <svg x="${x}" y="170" width="640" height="364" viewBox="0 0 1600 910"><rect width="1600" height="910" fill="#fff"/>${popBody(mixed, target)}</svg>
  <text x="${x}" y="596" font-family="${NU.serif}" font-size="40" fill="${NU.ink}">${word}</text>
  ${lines.map((l, k) => `<text x="${x}" y="${636 + k * 32}" font-family="${NU.sans}" font-size="24" fill="${NU.dim}">${esc(l)}</text>`).join('')}`;
  return `${svgOpen(NU.paper)}
  ${heading('Colour only highlights when it is scarce')}
  ${thumb(120, false, [2, 4], 'Scarce', ['Red is the only colour, so it pops out:', 'found at a glance, however many dots.'])}
  ${thumb(840, true, [9, 1], 'Everywhere', ['Red is one colour among many, and one is close', 'to it. Nothing pops out: you search dot by dot.'])}
  <rect x="116" y="728" width="1368" height="68" fill="#fff" stroke="${NU.red}" stroke-width="3"/>
  <text x="144" y="772" font-family="${NU.sans}" font-size="27" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.red}">In a chart:</tspan> give colour to the <tspan font-weight="700">one</tspan> thing you want seen first, and keep the rest grey.</text>
  <text x="120" y="850" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">Munzner, Ch. 5.5.4 (Popout) · Treisman &amp; Gelade (1980) · Duncan &amp; Humphreys (1989)</text>
</svg>
`;
}

/* Slide 12. The four jobs colour does, each with a chart that does it. */
function fourJobs(focus) {
  const W = 340, gap = 33, left = 80, top = 185, H = 600;
  const jobs = [
    ['Label', 'IDENTITY', 'Separate categories', 'Different hues: different things'],
    ['Measure', 'ORDER', 'Show how much', 'Darker means more'],
    ['Highlight', 'ATTENTION', 'Direct the eye', 'One colour against grey'],
    ['Mean', 'ASSOCIATION', 'Carry a meaning', 'Hot and cold, loss, brand']
  ];
  const minis = [
    (x, y) => ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1'].map((c, k) => { const h = [150, 210, 120, 180][k];
      return `<rect x="${x + 40 + k * 66}" y="${y + 230 - h}" width="48" height="${h}" fill="${c}"/>`; }).join('') +
      `<line x1="${x + 26}" y1="${y + 231}" x2="${x + W - 26}" y2="${y + 231}" stroke="${NU.ink}" stroke-width="2"/>`,
    (x, y) => { let o = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) o += `<rect x="${x + 36 + c * 46}" y="${y + 30 + r * 50}" width="42" height="46" fill="${ramp((c + r) / 8)}"/>`; return o; },
    (x, y) => { const rand = seeded(5); let o = '';
      for (let k = 0; k < 6; k++) { const pts = []; let v = 60 + rand() * 120;
        for (let t = 0; t < 8; t++) { v += (rand() - 0.5) * 50 + (k === 5 ? 14 : 0); pts.push(`${x + 30 + t * 40},${y + 230 - Math.max(10, Math.min(220, v))}`); }
        o += `<polyline points="${pts.join(' ')}" fill="none" stroke="${k === 5 ? NU.red : '#b9c0c8'}" stroke-width="${k === 5 ? 6 : 3}"/>`; }
      return o; },
    (x, y) => { const rand = seeded(9); let o = '';
      const RDBU = ['#2166ac', '#4393c3', '#92c5de', '#d1e5f0', '#fddbc7', '#f4a582', '#d6604d', '#b2182b'];
      for (let k = 0; k < 28; k++) { const t = Math.max(0, Math.min(0.999, k / 34 + (rand() - 0.5) * 0.35 + (k > 20 ? 0.25 : 0)));
        o += `<rect x="${x + 30 + k * 10}" y="${y + 20}" width="10" height="212" fill="${RDBU[Math.floor(t * RDBU.length)]}"/>`; }
      return o; }
  ];
  const groups = jobs.map(([word, kind, line1, line2], i) => {
    const x = left + i * (W + gap);
    return `<rect x="${x}" y="${top}" width="${W}" height="${H}" fill="#fff" stroke="rgba(12,51,84,.18)" stroke-width="1.5"/>
    <text x="${x + 30}" y="${top + 74}" font-family="${NU.serif}" font-size="50" fill="${NU.ink}">${word}</text>
    <text x="${x + 30}" y="${top + 112}" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="3" fill="${NU.red}">${kind}</text>
    ${minis[i](x, top + 140)}
    <text x="${x + 30}" y="${top + 450}" font-family="${NU.sans}" font-weight="600" font-size="26" fill="${NU.ink}">${line1}</text>
    <text x="${x + 30}" y="${top + 488}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">${line2}</text>`;
  });
  return `${svgOpen(NU.paper)}
  ${heading('Four jobs colour does in a chart', 'Most bad charts give colour the wrong job')}
  ${dimmed(groups, focus)}
</svg>
`;
}

/* Slide 13. Light to colour in three states: the spectrum, the three cone
   curves over it, then 580 nm read as three numbers. Curve shapes are
   Gaussian stand-ins with the peaks of Stockman & Sharpe (2000). */
function waveRgb(w) {
  let r = 0, g = 0, b = 0;
  if (w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; }
  else if (w < 510) { g = 1; b = -(w - 510) / 20; } else if (w < 580) { r = (w - 510) / 70; g = 1; }
  else if (w < 645) { r = 1; g = -(w - 645) / 65; } else { r = 1; }
  const f = w < 420 ? 0.3 + 0.7 * (w - 380) / 40 : w > 645 ? 0.3 + 0.7 * (700 - w) / 55 : 1;
  return rgbHex([r, g, b].map(c => 255 * Math.pow(c * f, 0.8)));
}
const CONES = [['S', 442, 22, '#3f63d9'], ['M', 541, 38, '#2e9e4f'], ['L', 566, 42, '#d64532']];
const cone = (w, [, peak, sd]) => Math.exp(-((w - peak) ** 2) / (2 * sd * sd));
function lightToColour(step) {
  const x0 = 110, x1 = 1170, wx = w => x0 + (w - 380) / 320 * (x1 - x0);
  const by = 650, cy0 = 260, cy1 = 610;
  const stops = []; for (let w = 380; w <= 700; w += 10) stops.push(`<stop offset="${((w - 380) / 320).toFixed(3)}" stop-color="${waveRgb(w)}"/>`);
  const ticks = []; for (let w = 400; w <= 700; w += 50) ticks.push(`<line x1="${wx(w)}" y1="${by + 62}" x2="${wx(w)}" y2="${by + 72}" stroke="${NU.dim}" stroke-width="2"/><text x="${wx(w)}" y="${by + 98}" text-anchor="middle" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${w}</text>`);
  const curves = CONES.map(c => { const pts = []; for (let w = 380; w <= 700; w += 4) pts.push(`${wx(w).toFixed(1)},${(cy1 - cone(w, c) * (cy1 - cy0)).toFixed(1)}`);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${c[3]}" stroke-width="5"/>
    <text x="${wx(c[1])}" y="${cy0 - 14}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="28" fill="${c[3]}">${c[0]}</text>`; }).join('');
  const W580 = 580, reads = CONES.map(c => cone(W580, c));
  const side = step < 2 ? `
  <text x="1260" y="300" font-family="${NU.serif}" font-size="64" fill="${NU.ink}">120m</text>
  <text x="1260" y="338" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">rods: night vision, no colour</text>
  <text x="1260" y="460" font-family="${NU.serif}" font-size="64" fill="${NU.red}">6m</text>
  <text x="1260" y="498" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">cones: colour, packed into</text>
  <text x="1260" y="526" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">the centre of your gaze</text>` : `
  <rect x="1250" y="235" width="280" height="370" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="1274" y="282" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="3" fill="${NU.navy}">AT 580 nm</text>
  ${CONES.map((c, k) => `<text x="1274" y="${352 + k * 80}" font-family="${NU.sans}" font-weight="700" font-size="28" fill="${c[3]}">${c[0]}</text>
  <rect x="1312" y="${328 + k * 80}" width="${(reads[k] * 190).toFixed(1)}" height="30" fill="${c[3]}"/>
  <text x="${1320 + reads[k] * 190}" y="${352 + k * 80}" font-family="${NU.sans}" font-size="22" fill="${NU.ink}">${reads[k].toFixed(2)}</text>`).join('')}
  <rect x="1274" y="555" width="40" height="30" fill="${waveRgb(580)}"/>
  <text x="1326" y="579" font-family="${NU.sans}" font-size="22" fill="${NU.ink}">seen as yellow</text>`;
  const titles = [
    ['Colour isn’t in the light', 'Light is just wavelengths. Your eyes see about 380–700 nm of them'],
    ['Three kinds of cone', 'Short, medium and long: each answers its own band of the spectrum'],
    ['Yellow is three numbers', 'L high, M high, S almost none. Your brain reads the mix: trichromacy']
  ];
  return `${svgOpen(NU.paper)}
  <defs><linearGradient id="spec" x1="0" x2="1">${stops.join('')}</linearGradient></defs>
  ${heading(...titles[step])}
  <rect x="${x0}" y="${by}" width="${x1 - x0}" height="56" fill="url(#spec)"/>
  ${ticks.join('')}
  <text x="${x1}" y="${by + 132}" text-anchor="end" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">wavelength (nm)</text>
  ${step >= 1 ? curves : ''}
  ${step >= 2 ? `<line x1="${wx(W580)}" y1="${cy0 - 40}" x2="${wx(W580)}" y2="${by + 56}" stroke="${NU.ink}" stroke-width="3" stroke-dasharray="8 6"/>` +
    CONES.map((c, k) => `<circle cx="${wx(W580)}" cy="${cy1 - reads[k] * (cy1 - cy0)}" r="10" fill="${c[3]}" stroke="#fff" stroke-width="3"/>`).join('') : ''}
  ${side}
</svg>
`;
}

/* Slide 14. Three cones recoded into three opposite pairs (Hering, 1878). */
function opponent() {
  const cones = { S: [250, 300, '#3f63d9'], M: [250, 470, '#2e9e4f'], L: [250, 640, '#d64532'] };
  const ch = [
    ['Light – dark', 'L + M', ['#111111', '#ffffff'], [['L', '+'], ['M', '+']]],
    ['Red – green', 'L − M', ['#d1323c', '#2f9e55'], [['L', '+'], ['M', '−']]],
    ['Blue – yellow', 'S − (L + M)', ['#2f59d9', '#f2d230'], [['S', '+'], ['L', '−'], ['M', '−']]]
  ];
  const cx = 820, cw = 560;
  const links = []; const bars = [];
  ch.forEach(([name, formula, [a, b], ins], i) => {
    const y = 250 + i * 190;
    bars.push(`<defs><linearGradient id="ch${i}" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect x="${cx}" y="${y}" width="${cw}" height="80" fill="url(#ch${i})" stroke="rgba(12,51,84,.25)"/>
    <text x="${cx}" y="${y - 16}" font-family="${NU.serif}" font-size="36" fill="${NU.ink}">${name}</text>
    <text x="${cx + cw}" y="${y - 16}" text-anchor="end" font-family="${NU.sans}" font-size="24" fill="${NU.dim}">${formula}</text>`);
    ins.forEach(([c, sign], k) => {
      const [x, yc] = cones[c]; const ex = cx - 14, ey = y + 40;
      const add = sign === '+';
      links.push(`<line x1="${x + 64}" y1="${yc}" x2="${ex}" y2="${ey + (k - (ins.length - 1) / 2) * 16}" stroke="${add ? NU.navy : NU.red}" stroke-opacity="${add ? 0.55 : 0.85}" stroke-width="3"${add ? '' : ' stroke-dasharray="9 7"'}/>`);
    });
  });
  const coneSvg = Object.entries(cones).map(([k, [x, y, c]]) => `<circle cx="${x}" cy="${y}" r="60" fill="${c}"/><text x="${x}" y="${y + 14}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="40" fill="#fff">${k}</text>`).join('');
  return `${svgOpen(NU.paper)}
  ${heading('Three cones, three channels', 'After the cones, the signal is recoded into opposite pairs (Hering, 1878)')}
  <text x="250" y="210" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="3" fill="${NU.navy}">CONES</text>
  ${links.join('')}${coneSvg}${bars.join('')}
  <line x1="420" y1="760" x2="480" y2="760" stroke="${NU.navy}" stroke-opacity=".55" stroke-width="3"/>
  <text x="492" y="768" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">adds</text>
  <line x1="580" y1="760" x2="640" y2="760" stroke="${NU.red}" stroke-width="3" stroke-dasharray="9 7"/>
  <text x="652" y="768" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">subtracts</text>
  <text x="80" y="845" font-family="${NU.sans}" font-size="26" fill="${NU.ink}">Each channel runs between two opposites, so nothing looks <tspan font-weight="700">reddish-green</tspan> or <tspan font-weight="700">bluish-yellow</tspan>.</text>
</svg>
`;
}

/* Slide 15. One line chart, three series, seen four ways. The series are
   identified only by a legend, as so many published charts are. */
function cvdGrid() {
  const series = [['North', '#d62728'], ['South', '#2ca02c'], ['East', '#1f77b4']];
  const rand = seeded(15);
  const data = series.map((_, k) => { let v = 40 + k * 12; return Array.from({ length: 12 }, () => (v = Math.max(8, Math.min(92, v + (rand() - 0.47) * 16)))); });
  const views = [[null, 'Typical colour vision'], ['deutan', 'Deuteranopia · no M cones'], ['protan', 'Protanopia · no L cones'], ['tritan', 'Tritanopia · no S cones']];
  const panels = views.map(([kind, title], i) => {
    const x = 80 + (i % 2) * 740, y = 175 + Math.floor(i / 2) * 345, w = 700, h = 320;
    const px = v => y + h - 34 - v / 100 * (h - 100);
    const lines = data.map((d, k) => `<polyline points="${d.map((v, t) => `${(x + 40 + t * 50).toFixed(1)},${px(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${simulate(series[k][1], kind)}" stroke-width="5" stroke-linejoin="round"/>`).join('');
    const legend = series.map(([n, c], k) => `<rect x="${x + w - 150}" y="${y + 66 + k * 34}" width="26" height="14" fill="${simulate(c, kind)}"/><text x="${x + w - 114}" y="${y + 80 + k * 34}" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">${n}</text>`).join('');
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="rgba(12,51,84,.18)"/>
    <text x="${x + 24}" y="${y + 40}" font-family="${NU.sans}" font-weight="700" font-size="24" fill="${i ? NU.ink : NU.navy}">${title}</text>
    <line x1="${x + 36}" y1="${y + h - 30}" x2="${x + 610}" y2="${y + h - 30}" stroke="${NU.dim}" stroke-width="1.5"/>
    ${lines}${legend}`;
  }).join('\n  ');
  return `${svgOpen(NU.paper)}
  ${heading('The same chart, four ways of seeing it', 'Simulated with Machado, Oliveira & Fernandes (2009). Which line is North?', NU.ink, 130)}
  ${panels}
</svg>
`;
}

/* Slides 16 and 17. Simultaneous contrast: one grey on two grounds, then the
   same effect inside a heatmap. The reveal joins the two with a bar of the
   same colour, as Albers did. */
function albers(reveal) {
  const inner = '#8a8a8a';
  return `${svgOpen(NU.paper)}
  ${reveal ? '' : heading('Which inner square is lighter?')}
  <rect x="160" y="140" width="560" height="560" fill="#262626"/>
  <rect x="880" y="140" width="560" height="560" fill="#e6e6e6"/>
  ${reveal ? `<rect x="540" y="370" width="520" height="100" fill="${inner}"/>` : ''}
  <rect x="340" y="320" width="200" height="200" fill="${inner}"/>
  <rect x="1060" y="320" width="200" height="200" fill="${inner}"/>
  <text x="440" y="760" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="34" fill="${NU.ink}">Left</text>
  <text x="1160" y="760" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="34" fill="${NU.ink}">Right</text>
  ${reveal ? `<text x="800" y="830" text-anchor="middle" font-family="${NU.serif}" font-size="40" fill="${NU.red}">One grey, ${inner}. The neighbours changed it.</text>` : ''}
</svg>
`;
}

function heatValues() {
  const rand = seeded(17), cols = 12, rows = 7, v = [];
  for (let r = 0; r < rows; r++) { v.push([]); for (let c = 0; c < cols; c++) {
    const base = c < 6 ? 0.86 : 0.14;
    v[r].push(Math.max(0.02, Math.min(0.98, base + (rand() - 0.5) * 0.16))); } }
  v[3][2] = 0.5; v[3][9] = 0.5;
  return v;
}
function contrastHeatmap(reveal) {
  const v = heatValues(), cw = 92, chh = 84, gx = (1600 - 12 * cw) / 2 - 60, gy = 160;
  const cells = []; v.forEach((row, r) => row.forEach((val, c) => cells.push(`<rect x="${gx + c * cw}" y="${gy + r * chh}" width="${cw - 3}" height="${chh - 3}" fill="${ramp(val)}"/>`)));
  const tag = (c, label) => `<text x="${gx + c * cw + cw / 2 - 1}" y="${gy + 3 * chh + chh / 2 + 12}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="34" fill="${NU.ink}">${label}</text>`;
  const legend = [0, 0.25, 0.5, 0.75, 1].map((t, k) => `<rect x="${gx + 12 * cw + 50}" y="${gy + (4 - k) * 116}" width="50" height="113" fill="${ramp(t)}"/><text x="${gx + 12 * cw + 112}" y="${gy + (4 - k) * 116 + 64}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">${Math.round(t * 100)}</text>`).join('');
  const bar = reveal ? `<rect x="${gx + 2 * cw + cw / 2}" y="${gy + 3 * chh + 22}" width="${7 * cw}" height="${chh - 47}" fill="${ramp(0.5)}"/>` : '';
  const note = reveal ? `<text x="${gx}" y="${gy + 7 * chh + 70}" font-family="${NU.serif}" font-size="38" fill="${NU.red}">P and Q are both 50. Your eye read each one against its neighbours.</text>` : '';
  return `${svgOpen(NU.paper)}
  ${reveal ? '' : heading('Which cell holds the higher value: P or Q?')}
  ${cells.join('')}${bar}${tag(2, 'P')}${tag(9, 'Q')}${legend}${note}
</svg>
`;
}

/* Slide 19. Hue, lightness and saturation, lit one row at a time. */
function hls(focus) {
  const rows = [
    ['Hue', ['#d7191c', '#f08a24', '#e3cf3a', '#1a9641', '#2b83ba', '#7b3294'], 'Which colour family', 'Identity channel', 'Best for categories'],
    ['Lightness', ['#eff3ff', '#c6dbef', '#9ecae1', '#4292c6', '#2171b5', '#08306b'], 'How light or dark', 'Magnitude channel', 'Best for ordered and quantitative'],
    ['Saturation', ['#8a8f94', '#7c8fa3', '#6c90b5', '#5a91c8', '#4592da', '#2a93ee'], 'How vivid or grey', 'Magnitude, but weak', 'Ordered, only a few steps']
  ];
  const groups = rows.map(([name, sw, a, b, c], i) => {
    const y = 200 + i * 205;
    return `<text x="80" y="${y + 80}" font-family="${NU.serif}" font-size="48" fill="${NU.ink}">${name}</text>
    ${sw.map((col, k) => `<rect x="${380 + k * 118}" y="${y}" width="106" height="130" fill="${col}"/>`).join('')}
    <text x="1120" y="${y + 36}" font-family="${NU.sans}" font-weight="600" font-size="28" fill="${NU.ink}">${a}</text>
    <text x="1120" y="${y + 74}" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="2" fill="${NU.red}">${b.toUpperCase()}</text>
    <text x="1120" y="${y + 110}" font-family="${NU.sans}" font-size="24" fill="${NU.dim}">${c}</text>`;
  });
  return `${svgOpen(NU.paper)}
  ${heading('Three dimensions of colour', 'Hue answers “what kind?”. Lightness answers “how much?” · Munzner, Ch. 10')}
  ${dimmed(groups, focus)}
</svg>
`;
}

/* Slide 20. Five swatches to put in order, lettered and shuffled. */
const HUE_ORDER = [['C', '#d7191c'], ['E', '#e3cf3a'], ['A', '#1a9641'], ['D', '#2b83ba'], ['B', '#7b3294']];
const LIGHT_ORDER = [['B', '#c6dbef'], ['D', '#9ecae1'], ['A', '#4292c6'], ['E', '#2171b5'], ['C', '#08306b']];
function swatchRow(order) {
  const byLetter = [...order].sort((a, b) => a[0].localeCompare(b[0]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1420 420" width="1420" height="420">
  ${byLetter.map(([l, c], k) => `<rect x="${10 + k * 282}" y="10" width="250" height="300" fill="${c}"/>
  <text x="${135 + k * 282}" y="400" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="72" fill="${NU.ink}">${l}</text>`).join('')}
</svg>
`;
}

/* Slide 19's briefing. Students are about to be shown a picture for two
   seconds and asked about it, so they need to know the task, the answer
   format and the reason first. The quartered square is the key to A–D. */
function popBriefing(round) {
  const steps = round === 1 ? [
    ['Look', 'A field of dots fills the screen for two seconds.'],
    ['Find', 'One dot is red. Find it before it disappears.'],
    ['Answer', INTERACTIVE ? 'On your phone: which quarter was it in, A, B, C or D?' : 'Hands up: which quarter was it in, A, B, C or D?']
  ] : [
    ['Same task', 'Two seconds, one red dot, the same four quarters.'],
    ['One change', 'Watch what is different about the other dots.'],
    ['Answer', INTERACTIVE ? 'On your phone again: A, B, C or D?' : 'Hands up again: A, B, C or D?']
  ];
  const why = round === 1
    ? ['Why: we are testing whether colour lets your eye find something', 'without searching for it. Two seconds is not long enough to search.']
    : ['Why: if colour did the work last time, it should do it again.', 'Notice how sure you feel this time.'];
  const key = [['A', 0, 0], ['B', 1, 0], ['C', 0, 1], ['D', 1, 1]].map(([l, c, r]) =>
    `<rect x="${1140 + c * 170}" y="${250 + r * 170}" width="164" height="164" fill="#fff" stroke="${NU.navy}" stroke-opacity=".3" stroke-width="2"/>
  <text x="${1222 + c * 170}" y="${350 + r * 170}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="60" fill="${NU.navy}">${l}</text>`).join('');
  return `${svgOpen(NU.paper)}
  <text x="80" y="76" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="5" fill="${NU.red}">${round === 1 ? 'EXPERIMENT · ROUND 1' : 'EXPERIMENT · ROUND 2'}</text>
  <text x="80" y="146" font-family="${NU.serif}" font-size="58" fill="${NU.ink}">${round === 1 ? 'Can you find it in two seconds?' : 'Again. One thing changes'}</text>
  ${steps.map(([h, t], k) => `<circle cx="112" cy="${292 + k * 140}" r="32" fill="${NU.navy}"/>
  <text x="112" y="${303 + k * 140}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="30" fill="#fff">${k + 1}</text>
  <text x="170" y="${290 + k * 140}" font-family="${NU.serif}" font-size="40" fill="${NU.ink}">${h}</text>
  <text x="170" y="${328 + k * 140}" font-family="${NU.sans}" font-size="26" fill="${NU.dim}">${esc(t)}</text>`).join('\n  ')}
  ${key}
  <text x="1307" y="630" text-anchor="middle" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">the four quarters</text>
  <rect x="80" y="700" width="1440" height="120" fill="#fff" stroke="${NU.red}" stroke-width="3"/>
  <text x="112" y="752" font-family="${NU.sans}" font-size="27" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.red}">${esc(why[0].split(':')[0])}:</tspan>${esc(why[0].slice(why[0].indexOf(':') + 1))}</text>
  <text x="112" y="792" font-family="${NU.sans}" font-size="27" fill="${NU.ink}">${esc(why[1])}</text>
</svg>
`;
}

/* A photograph filling the screen on navy, with a small red tag in the
   corner, as the cases do. */
function taggedPhoto(file, label, place = 'bottom') {
  const box = fit(asset(file), 0, 0, 1600, 900);
  const w = Math.round(label.length * 15.5 + 44);
  /* In the navy margin when the picture leaves one wide enough, so the tag
     never covers the picture's own labels; otherwise in its corner. */
  const tx = box.x >= w + 36 ? 18 : box.x + 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <rect width="1600" height="900" fill="${NU.navyDeep}"/>
  <image href="${dataUri(asset(file))}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${tx}" y="${place === 'top' ? Math.max(18, box.y - 62) : box.y + box.h - 62}" width="${w}" height="44" fill="${NU.red}"/>
  <text x="${tx + w / 2}" y="${place === 'top' ? Math.max(18, box.y - 62) + 30 : box.y + box.h - 32}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="3" fill="#fff">${esc(label)}</text>
</svg>
`;
}

/* Slide 31. The four jobs applied to one dataset: Case C's fly-the-nest data
   (Eurostat 2022) has a category to label (region) and a number to measure
   (age leaving home). Right column: each job gets its channel. Wrong column:
   the channels swapped, shades for categories and rainbow hues for a number,
   which is exactly what Case C did. */
const NEST = [['FI', 'Nordic', 21.3], ['SE', 'Nordic', 21.4], ['DK', 'Nordic', 21.7], ['NL', 'Western', 23.0], ['FR', 'Western', 23.4], ['DE', 'Western', 23.8],
  ['CZ', 'Central & East', 25.9], ['HU', 'Central & East', 27.1], ['PL', 'Central & East', 28.9], ['IT', 'Southern', 30.0], ['ES', 'Southern', 30.3], ['GR', 'Southern', 30.7]];
const REGIONS = ['Nordic', 'Western', 'Central & East', 'Southern'];
const REGION_HUES = ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1'];
const REGION_SHADES = ['#dadaeb', '#bcbddc', '#807dba', '#4a1486'];
const NEST_BINS = [[23, '#4064ad', 'under 23'], [25, '#8cc152', '23–25'], [27, '#f5c242', '25–27'], [29, '#f0954a', '27–29'], [31, '#d63a3a', '29–31'], [99, '#7b3f9e', 'over 31']];
const lum = hex => { const [r, g, b] = hexRgb(hex).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function jobsExample() {
  const tw = 88, th = 62, tg = 6;
  const panel = (x, y, fill) => NEST.map(([code, region, age], i) => {
    const c = fill(region, age), tx = x + (i % 6) * (tw + tg), ty = y + Math.floor(i / 6) * (th + tg);
    return `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" fill="${c}"/><text x="${tx + tw / 2}" y="${ty + th / 2 + 9}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="24" fill="${lum(c) > 0.35 ? NU.ink : '#fff'}">${code}</text>`;
  }).join('');
  /* Legend entries placed one after another by label length, so long
     names never run into the next swatch. */
  const legend = (x, y, items, size) => { let at = x; return items.map(([c, l]) => {
    const out = `<rect x="${at}" y="${y}" width="20" height="20" fill="${c}"/><text x="${at + 27}" y="${y + 17}" font-family="${NU.sans}" font-size="${size}" fill="${NU.ink}">${esc(l)}</text>`;
    at += 27 + l.length * size * 0.56 + 18; return out; }).join(''); };
  const swatches = (x, y, items) => legend(x, y, items, 18);
  const bins = (x, y) => legend(x, y, NEST_BINS.map(([, c, l]) => [c, l]), 16);
  const verdict = (x, y, ok, text) => `<text x="${x}" y="${y}" font-family="${NU.sans}" font-size="23" fill="${NU.ink}"><tspan font-weight="700" fill="${ok ? NU.navy : NU.red}">${ok ? '✓' : '✗'}</tspan>  ${esc(text)}</text>`;
  const cx = [390, 975], ry = [235, 560];
  const regionHue = r => REGION_HUES[REGIONS.indexOf(r)], regionShade = r => REGION_SHADES[REGIONS.indexOf(r)];
  const ageRamp = (r, a) => ramp((a - 21) / 10), ageBin = (r, a) => NEST_BINS.find(([max]) => a < max)[1];
  const grad = []; for (let k = 0; k <= 10; k++) grad.push(`<stop offset="${k / 10}" stop-color="${ramp(k / 10)}"/>`);
  return `${svgOpen(NU.paper)}
  <defs><linearGradient id="age" x1="0" x2="1">${grad.join('')}</linearGradient></defs>
  ${heading('One dataset, two jobs', 'Age young people leave home, 2022 (Eurostat): the data behind Case C')}
  <text x="${cx[0]}" y="205" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="4" fill="${NU.navy}">✓  RIGHT CHANNEL</text>
  <text x="${cx[1]}" y="205" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="4" fill="${NU.red}">✗  CHANNELS SWAPPED</text>
  <line x1="80" y1="535" x2="1560" y2="535" stroke="${NU.navy}" stroke-opacity=".15" stroke-width="2"/>

  <text x="80" y="${ry[0] + 44}" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Label</text>
  <text x="80" y="${ry[0] + 82}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">Which region?</text>
  <text x="80" y="${ry[0] + 112}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">A category</text>
  ${panel(cx[0], ry[0], regionHue)}
  ${swatches(cx[0], ry[0] + 148, REGIONS.map((r, k) => [REGION_HUES[k], r]))}
  ${verdict(cx[0], ry[0] + 215, true, 'Four hues: four different regions, none ranked')}
  ${panel(cx[1], ry[0], regionShade)}
  ${swatches(cx[1], ry[0] + 148, REGIONS.map((r, k) => [REGION_SHADES[k], r]))}
  ${verdict(cx[1], ry[0] + 215, false, 'Shades of one hue: is Southern “more”?')}

  <text x="80" y="${ry[1] + 44}" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">Measure</text>
  <text x="80" y="${ry[1] + 82}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">How old on leaving?</text>
  <text x="80" y="${ry[1] + 112}" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">A quantity</text>
  ${panel(cx[0], ry[1], ageRamp)}
  <rect x="${cx[0]}" y="${ry[1] + 150}" width="300" height="22" fill="url(#age)"/>
  <text x="${cx[0] + 312}" y="${ry[1] + 168}" font-family="${NU.sans}" font-size="18" fill="${NU.ink}">21 → 31 years</text>
  ${verdict(cx[0], ry[1] + 215, true, 'Lighter to darker: older reads at a glance')}
  ${panel(cx[1], ry[1], ageBin)}
  ${bins(cx[1], ry[1] + 150)}
  ${verdict(cx[1], ry[1] + 215, false, 'Rainbow hues: is orange older than green?')}
</svg>
`;
}

/* The six palette types from Figma's guide (2025 deck p10), each judged by
   the data job it suits and shown on real data the room already knows:
   TfL daily cycle hires (lessons/tfl-daily-cycle-hires.xlsx) and the
   fly-the-nest ages from Case C (Eurostat 2022). The wheel is the painter's
   RYB wheel, because that is the wheel these harmonies are defined on. */
const RYB = ['#e2231a', '#f15a22', '#f7941d', '#fcb913', '#fff200', '#8dc63f', '#00a651', '#00a99d', '#0072bc', '#2e3192', '#662d91', '#9e1f63'];
const TFL_MONTHLY = { 2022: [749, 750, 1057, 1031, 1201, 1280, 1316, 1260, 801, 864, 726, 472],
  2023: [571, 613, 631, 647, 821, 885, 809, 778, 847, 790, 665, 474], 2024: [559, 568, 647, 685, 823, 869, 884, 872, 792, 831, 712, 527] };
const TFL_CHANGE = [-2.2, -7.4, 2.7, 5.9, 0.2, -1.7, 9.3, 12.0, -6.5, 5.2, 7.0, 11.0];
const TFL_DAYTYPE = { Weekday: [19464, 21076, 22791, 23843, 26375, 30471, 29675, 29405, 27477, 28592, 25814, 19252],
  Saturday: [14900, 16936, 19264, 22138, 27429, 24851, 25099, 24289, 26816, 23638, 19985, 12036],
  Sunday: [12891, 14424, 14488, 18039, 26657, 27130, 25174, 25848, 21539, 19699, 17399, 10965] };
const YLGNBU = ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'];
const stepRamp = (stops, t) => stops[Math.max(0, Math.min(stops.length - 1, Math.round(t * (stops.length - 1))))];

function wheel(cx, cy, picks) {
  const r = 52, ri = 28, seg = [];
  for (let k = 0; k < 12; k++) {
    const a0 = (k - 0.5) / 12 * 2 * Math.PI - Math.PI / 2, a1 = (k + 0.5) / 12 * 2 * Math.PI - Math.PI / 2;
    const p = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
    seg.push(`<path d="M${p(ri, a0)} L${p(r, a0)} A${r},${r} 0 0 1 ${p(r, a1)} L${p(ri, a1)} A${ri},${ri} 0 0 0 ${p(ri, a0)} Z" fill="${RYB[k]}" opacity="${picks.includes(k) ? 1 : 0.18}"/>`);
  }
  const pts = picks.map(k => { const a = k / 12 * 2 * Math.PI - Math.PI / 2; return [cx + 40 * Math.cos(a), cy + 40 * Math.sin(a)]; });
  const shape = pts.length > 1 ? `<polygon points="${pts.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${NU.ink}" stroke-width="2"/>` : '';
  return seg.join('') + shape + pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#fff" stroke="${NU.ink}" stroke-width="2"/>`).join('');
}

function sixPalettes(focus, isolate = false) {
  const W = 470, H = 345, gap = 25, left = 80, tops = [168, 538];
  const months = 'JFMAMJJASOND';
  const axisMonths = (x, y, w) => months.split('').map((m, i) => `<text x="${(x + (i + 0.5) * w / 12).toFixed(1)}" y="${y}" text-anchor="middle" font-family="${NU.sans}" font-size="13" fill="${NU.dim}">${m}</text>`).join('');
  const lines = (x, y, w, h, series, lo, hi) => series.map(([vals, colour, width]) =>
    `<polyline points="${vals.map((v, i) => `${(x + (i + 0.5) * w / 12).toFixed(1)},${(y + h - (v - lo) / (hi - lo) * h).toFixed(1)}`).join(' ')}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linejoin="round"/>`).join('');
  const key = (x, y, items) => { let at = x; return items.map(([c, l]) => { const o = `<rect x="${at}" y="${y - 11}" width="14" height="14" fill="${c}"/><text x="${at + 20}" y="${y + 1}" font-family="${NU.sans}" font-size="14" fill="${NU.ink}">${l}</text>`; at += 28 + l.length * 7.6; return o; }).join(''); };

  const types = [
    { name: 'Monochromatic', job: 'MEASURE', picks: [8], scenario: 'Bike hires per day, TfL 2024 (month × weekday)',
      verdict: ['✓', 'One hue, light to dark: the safest sequential scale'],
      chart: (x, y) => { const flat = HIRES_2024.flat(), lo = Math.min(...flat), hi = Math.max(...flat); let o = '';
        for (let j = 0; j < 7; j++) for (let i = 0; i < 12; i++) o += `<rect x="${x + i * 35}" y="${y + j * 19}" width="33" height="17" fill="${ramp((HIRES_2024[i][j] - lo) / (hi - lo))}"/>`;
        return o + axisMonths(x, y + 150, 420); } },
    { name: 'Analogous', job: 'MEASURE', picks: [4, 5, 6, 7, 8], scenario: 'Age young people leave home, Eurostat 2022',
      verdict: ['✓', 'Neighbours work when lightness climbs too'],
      chart: (x, y) => NEST.map(([code, , age], i) => { const c = stepRamp(YLGNBU, (age - 21) / 10), tx = x + (i % 6) * 70, ty = y + Math.floor(i / 6) * 62;
        return `<rect x="${tx}" y="${ty}" width="66" height="58" fill="${c}"/><text x="${tx + 33}" y="${ty + 36}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="18" fill="${lum(c) > 0.35 ? NU.ink : '#fff'}">${code}</text>`; }).join('') +
        key(x, y + 150, [[YLGNBU[1], 'younger'], [YLGNBU[7], 'older']]) },
    { name: 'Complementary', job: 'DIVERGE', picks: [2, 8], scenario: 'Hires against 2023, by month (TfL)',
      verdict: ['⚠', 'Up vs down from a middle. Blue–orange, not red–green'],
      chart: (x, y) => { const mid = y + 66; let o = `<line x1="${x}" y1="${mid}" x2="${x + 420}" y2="${mid}" stroke="${NU.ink}" stroke-width="1.5"/>`;
        TFL_CHANGE.forEach((v, i) => { const h = Math.abs(v) / 12 * 60; o += `<rect x="${x + i * 35 + 5}" y="${v >= 0 ? mid - h : mid}" width="25" height="${h.toFixed(1)}" fill="${v >= 0 ? '#2c7bb6' : '#e66101'}"/>`; });
        return o + axisMonths(x, y + 150, 420) + key(x, y - 14, [['#2c7bb6', 'more than 2023'], ['#e66101', 'fewer']]); } },
    { name: 'Split-complementary', job: 'HIGHLIGHT', picks: [8, 1, 3], scenario: '2024 against 2022 and 2023, monthly hires (TfL)',
      verdict: ['✓', 'One hue leads; the others stay quiet'],
      chart: (x, y) => lines(x, y, 420, 125, [[TFL_MONTHLY[2022], '#fdb863', 3], [TFL_MONTHLY[2023], '#f4a582', 3], [TFL_MONTHLY[2024], '#2c7bb6', 6]], 400, 1350) +
        axisMonths(x, y + 150, 420) + key(x, y - 14, [['#2c7bb6', '2024'], ['#f4a582', '2023'], ['#fdb863', '2022']]) },
    { name: 'Triadic', job: 'LABEL', picks: [0, 4, 8], scenario: 'Weekday, Saturday and Sunday hires, 2024 (TfL)',
      verdict: ['✓', 'Three equal categories. Check they differ in lightness'],
      chart: (x, y) => lines(x, y, 420, 125, [[TFL_DAYTYPE.Weekday, '#c51b2b', 4], [TFL_DAYTYPE.Saturday, '#e6ab02', 4], [TFL_DAYTYPE.Sunday, '#2c5aa0', 4]], 10000, 31000) +
        axisMonths(x, y + 150, 420) + key(x, y - 14, [['#c51b2b', 'Weekday'], ['#e6ab02', 'Saturday'], ['#2c5aa0', 'Sunday']]) },
    { name: 'Square', job: 'LABEL', picks: [0, 3, 6, 9], scenario: 'Mean age leaving home by region, Eurostat 2022',
      verdict: ['⚠', 'Four hues is near the limit: label directly'],
      chart: (x, y) => { const mean = REGIONS.map(r => { const a = NEST.filter(n => n[1] === r).map(n => n[2]); return a.reduce((p, q) => p + q, 0) / a.length; });
        const cols = ['#d7301f', '#f0a202', '#1a9850', '#6a51a3'];
        return mean.map((m, k) => { const h = (m - 18) / 14 * 125; return `<rect x="${x + k * 105}" y="${y + 125 - h}" width="80" height="${h.toFixed(1)}" fill="${cols[k]}"/>
          <text x="${x + k * 105 + 40}" y="${y + 118 - h}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="15" fill="${NU.ink}">${m.toFixed(1)}</text>
          <text x="${x + k * 105 + 40}" y="${y + 150}" text-anchor="middle" font-family="${NU.sans}" font-size="14" fill="${NU.dim}">${REGIONS[k].replace(' & East', '/East')}</text>`; }).join(''); } }
  ];
  const groups = types.map((t, i) => {
    const x = left + (i % 3) * (W + gap), y = tops[Math.floor(i / 3)];
    return `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="#fff" stroke="rgba(12,51,84,.18)" stroke-width="1.5"/>
    <text x="${x + 22}" y="${y + 44}" font-family="${NU.serif}" font-size="31" fill="${NU.ink}">${t.name}</text>
    <text x="${x + 22}" y="${y + 74}" font-family="${NU.sans}" font-weight="700" font-size="16" letter-spacing="3" fill="${NU.red}">${t.job}</text>
    ${wheel(x + W - 66, y + 64, t.picks)}
    ${t.chart(x + 25, y + 134)}
    <text x="${x + 22}" y="${y + H - 44}" font-family="${NU.sans}" font-size="15" fill="${NU.dim}">${esc(t.scenario)}</text>
    <text x="${x + 22}" y="${y + H - 16}" font-family="${NU.sans}" font-size="17" fill="${NU.ink}"><tspan font-weight="700" fill="${t.verdict[0] === '✓' ? NU.navy : NU.red}">${t.verdict[0]}</tspan>  ${esc(t.verdict[1])}</text>`;
  });
  if (isolate) {
    /* The zoom: the one panel alone, the view cropped round it at 16:9 so it
       fills the screen at about two and a half times its size. A breadcrumb
       above it says where the room is in the six. */
    const x = left + (focus % 3) * (W + gap), y = tops[Math.floor(focus / 3)];
    const m = 26, top = 34, cw = Math.max(W + 2 * m, (H + 2 * m + top) * 16 / 9), ch = cw * 9 / 16;
    const vx = x + W / 2 - cw / 2, vy = y - top / 2 + H / 2 - ch / 2;
    const k = cw / 1600;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${cw.toFixed(1)} ${ch.toFixed(1)}" width="1600" height="900">
  <rect x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${NU.paper}"/>
  <text x="${(vx + 40 * k).toFixed(1)}" y="${(vy + 52 * k).toFixed(1)}" font-family="${NU.sans}" font-weight="700" font-size="${(22 * k).toFixed(1)}" letter-spacing="${(4 * k).toFixed(1)}" fill="${NU.red}">SIX PALETTE TYPES · ${focus + 1} OF 6</text>
  ${groups[focus]}
</svg>
`;
  }
  return `${svgOpen(NU.paper)}
  ${heading('Six palette types, six data jobs', 'The painter’s harmonies, judged by what the data needs · real data: TfL cycle hires, Eurostat')}
  ${dimmed(groups, focus)}
</svg>
`;
}

function drawBatch2() {
  return {
    'popout-brief-1.svg': popBriefing(1),
    'popout-brief-2.svg': popBriefing(2),
    'parrots-full.svg': taggedPhoto('parrots-cvd.jpg', 'COLOUR BLINDNESS'),
    'cubes-full.svg': taggedPhoto('cubes-illusion.jpg', 'COLOUR CONSTANCY'),
    'cubes-reveal-full.svg': taggedPhoto('cubes-reveal.jpg', 'COLOUR CONSTANCY · REVEAL'),
    'popout-grey.svg': popField(false, [2, 4]),
    'popout-mixed.svg': popField(true, [9, 1]),
    'popout-takeaway.svg': popTakeaway(),
    ...Object.fromEntries([0, 1, 2, 3, null].map((f, i) => [`four-jobs-${i + 1}.svg`, fourJobs(f)])),
    ...Object.fromEntries([0, 1, 2].map(i => [`light-${i + 1}.svg`, lightToColour(i)])),
    'jobs-example.svg': jobsExample(),
    'palette-types-full.svg': taggedPhoto('palette-types.jpg', 'SIX PALETTE TYPES'),
    'six-palettes.svg': sixPalettes(null),
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`six-palettes-zoom-${i + 1}.svg`, sixPalettes(i, true)])),
    'opponent.svg': opponent(),
    'cvd-grid.svg': cvdGrid(),
    'albers.svg': albers(false),
    'albers-reveal.svg': albers(true),
    'cells.svg': contrastHeatmap(false),
    'cells-reveal.svg': contrastHeatmap(true),
    ...Object.fromEntries([0, 1, 2, null].map((f, i) => [`hls-${i + 1}.svg`, hls(f)])),
    'order-hue.svg': swatchRow(HUE_ORDER),
    'order-lightness.svg': swatchRow(LIGHT_ORDER)
  };
}

/* ================================================== batch 3: plan slides 21–30 */

/* CIE LCh → sRGB, clipped. Used to build palettes of known lightness, so the
   categorical-rules slide can show "same lightness" honestly. */
function lchToHex(L, C, h) {
  const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = t => t ** 3 > 0.008856 ? t ** 3 : (116 * t - 16) / 903.3;
  const X = 0.95047 * inv(fx), Y = L > 8 ? fy ** 3 : L / 903.3, Z = 1.08883 * inv(fz);
  const lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
  return rgbHex(lin.map(c => toSrgb(Math.max(0, Math.min(1, c)))));
}
/** The grey with the same CIE lightness: what a greyscale print shows. */
function greyOf(hex) { const [r, g, b] = hexRgb(hex).map(toLin); const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const v = toSrgb(Y); return rgbHex([v, v, v]); }
function lstar(hex) { const [r, g, b] = hexRgb(hex).map(toLin); const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; return Math.round(116 * (Y > 216 / 24389 ? Math.cbrt(Y) : (24389 / 27 * Y + 16) / 116) - 16); }

/* Vocabulary: HSL claims these six are equally light. The greyscale row
   underneath, computed from CIE lightness, says otherwise. */
const HSL_ROW = [['Red', '#ff0000', 0], ['Yellow', '#ffff00', 60], ['Green', '#00ff00', 120], ['Cyan', '#00ffff', 180], ['Blue', '#0000ff', 240], ['Magenta', '#ff00ff', 300]];
function hslLies(step) {
  const w = 200, gap = 26, left = (1600 - (6 * w + 5 * gap)) / 2;
  return `${svgOpen(NU.paper)}
  ${heading('Why HSL lies', 'Every swatch below is hsl(hue, 100%, 50%): “lightness 50%” in every colour picker')}
  ${HSL_ROW.map(([name, hex, h], k) => { const x = left + k * (w + gap);
    return `<rect x="${x}" y="200" width="${w}" height="200" fill="${hex}"/>
  <text x="${x}" y="436" font-family="${NU.sans}" font-weight="700" font-size="24" fill="${NU.ink}">${name}</text>
  <text x="${x}" y="466" font-family="${NU.sans}" font-size="19" fill="${NU.dim}">hsl(${h}, 100%, 50%)</text>
  ${step ? `<rect x="${x}" y="510" width="${w}" height="150" fill="${greyOf(hex)}"/>
  <text x="${x}" y="696" font-family="${NU.sans}" font-size="22" fill="${NU.ink}">perceived L* <tspan font-weight="700">${lstar(hex)}</tspan></text>` : ''}`; }).join('')}
  ${step ? `<text x="${left}" y="790" font-family="${NU.serif}" font-size="38" fill="${NU.red}">Same “50%”: yellow is three times lighter than blue.</text>
  <text x="${left}" y="836" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">That is why a rainbow scale gets false bright bands at yellow and cyan.</text>` :
    `<text x="${left}" y="600" font-family="${NU.serif}" font-size="40" fill="${NU.ink}">Same lightness? Click to print them in greyscale.</text>`}
</svg>
`;
}

/* Use: the same five colours as large areas, small dots and thin lines.
   Distinct as squares, they merge as marks shrink; saturating them for small
   marks restores the difference (Munzner p224; Szafir 2018). */
const SIZE_MUTED = ['#86a8c8', '#94bf9a', '#b9a6cf', '#d3ab86', '#c99a9f'];
const SIZE_STRONG = ['#1f5fa8', '#1f8a3c', '#6e3fa3', '#c96a12', '#b8243a'];
function sizeChanges() {
  const rows = [['Large areas', 'muted colours'], ['Small dots', 'the same muted colours'], ['Thin lines', 'the same muted colours'], ['Small dots, fixed', 'saturated colours']];
  const rand = seeded(21);
  const dots = (x, y, cols) => { let o = ''; for (let k = 0; k < 60; k++) o += `<circle cx="${(x + rand() * 900).toFixed(1)}" cy="${(y + 10 + rand() * 90).toFixed(1)}" r="6" fill="${cols[k % 5]}"/>`; return o; };
  const body = [
    (x, y) => SIZE_MUTED.map((c, k) => `<rect x="${x + k * 184}" y="${y}" width="170" height="110" fill="${c}"/>`).join(''),
    (x, y) => dots(x, y, SIZE_MUTED),
    (x, y) => SIZE_MUTED.map((c, k) => { const pts = []; for (let t = 0; t <= 18; t++) pts.push(`${x + t * 50},${(y + 20 + k * 18 + Math.sin(t * 0.7 + k) * 10).toFixed(1)}`); return `<polyline points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="2"/>`; }).join(''),
    (x, y) => dots(x, y, SIZE_STRONG)
  ];
  return `${svgOpen(NU.paper)}
  ${heading('Size changes everything', 'Five colours, three sizes. Can you still count five?')}
  ${rows.map(([a, b], i) => { const y = 180 + i * 172;
    return `<text x="80" y="${y + 52}" font-family="${NU.serif}" font-size="34" fill="${i === 3 ? NU.navy : NU.ink}">${a}</text>
  <text x="80" y="${y + 88}" font-family="${NU.sans}" font-size="20" fill="${i === 3 ? NU.red : NU.dim}">${b}</text>
  ${body[i](520, y)}`; }).join('\n  ')}
  <line x1="80" y1="684" x2="1520" y2="684" stroke="${NU.navy}" stroke-opacity=".15" stroke-width="2"/>
</svg>
`;
}

/* Choose: the painter's wheel against the eye. */
function wheelVsEye() {
  const box = fit(asset('colour-wheel.jpg'), 110, 200, 520, 500);
  const hues = [['Red', '#ff0000'], ['Yellow', '#ffff00'], ['Green', '#00ff00'], ['Cyan', '#00ffff'], ['Blue', '#0000ff'], ['Magenta', '#ff00ff']];
  return `${svgOpen(NU.paper)}
  ${heading('The painter’s wheel vs your eye', 'The art-class wheel was built for mixing paint, not for reading data')}
  <rect x="80" y="180" width="660" height="560" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <image href="${dataUri(asset('colour-wheel.jpg'))}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"/>
  <text x="80" y="790" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">The painter’s wheel (red, yellow, blue)</text>
  <text x="80" y="828" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">Built for mixing paint. Its complementary pair is red–green.</text>
  <rect x="860" y="180" width="660" height="560" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="890" y="232" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="3" fill="${NU.navy}">HOW LIGHT FULL-STRENGTH HUES LOOK</text>
  ${hues.map(([n, c], k) => { const L = lstar(c), y = 270 + k * 72;
    return `<rect x="890" y="${y}" width="44" height="44" fill="${c}"/><rect x="950" y="${y + 6}" width="${(L * 3.9).toFixed(1)}" height="32" fill="${greyOf(c)}" stroke="rgba(0,0,0,.15)"/>
  <text x="${960 + L * 3.9}" y="${y + 31}" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">${n} ${L}</text>`; }).join('')}
  <text x="890" y="718" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">Red and green share one channel: 1 in 12 men can’t separate them.</text>
  <text x="860" y="790" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">Your eye (opponent channels)</text>
  <text x="860" y="828" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">Built for reading. Equal steps should look equally different.</text>
</svg>
`;
}

/* Map: the three families of colour map, lit one at a time. */
const RDBU7 = ['#b2182b', '#ef8a62', '#fddbc7', '#f7f7f7', '#d1e5f0', '#67a9cf', '#2166ac'];
const CAT6 = ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1', '#edc948', '#9c755f'];
function threeFamilies(focus) {
  const rows = [
    ['Sequential', 'Low → high', 'Ordered or quantitative', 'Lightness does the work; hue may shift a little', 'Rainfall · income · population density', BLUES],
    ['Diverging', 'Two directions from a middle', 'Ordered + midpoint', 'Zero, average or 50%: a middle that means something', 'Profit and loss · temperature anomaly · vote swing', RDBU7],
    ['Categorical', 'Different, not more', 'Nominal: no order', 'Distinct hues, equal status, at most 6–12', 'Product line · country · party', CAT6]
  ];
  const groups = rows.map(([name, short, type, rule, eg, pal], i) => { const y = 190 + i * 230;
    return `<text x="80" y="${y + 50}" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">${name}</text>
    <text x="80" y="${y + 86}" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="3" fill="${NU.red}">${type.toUpperCase()}</text>
    ${pal.map((c, k) => `<rect x="${560 + k * (420 / pal.length)}" y="${y + 10}" width="${420 / pal.length + 0.5}" height="90" fill="${c}"/>`).join('')}
    ${i === 1 ? `<line x1="770" y1="${y}" x2="770" y2="${y + 110}" stroke="${NU.ink}" stroke-width="3"/><text x="770" y="${y + 138}" text-anchor="middle" font-family="${NU.sans}" font-size="18" fill="${NU.ink}">midpoint</text>` : ''}
    <text x="1030" y="${y + 40}" font-family="${NU.sans}" font-weight="600" font-size="26" fill="${NU.ink}">${esc(short)}</text>
    <text x="1030" y="${y + 76}" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${esc(rule)}</text>
    <text x="1030" y="${y + 108}" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">${esc(eg)}</text>`; });
  return `${svgOpen(NU.paper)}
  ${heading('Three families of colour map', 'Measure, measure from a middle, label: the data’s structure picks the family · Brewer (1994)')}
  ${dimmed(groups, focus)}
</svg>
`;
}

/* Map: the categorical debate. Rule A keeps lightness constant (equal
   salience); Rule B varies it (discriminable, survives greyscale). The second
   state prints both in greyscale. */
const RULE_A = [20, 80, 140, 200, 260, 320].map(h => lchToHex(68, 42, h));
const RULE_B = [[35, 45, 270], [55, 60, 30], [72, 55, 130], [88, 60, 85], [45, 45, 330], [62, 40, 200]].map(([L, C, h]) => lchToHex(L, C, h));
function categoricalRules(step) {
  const panel = (x, title, rule, pal, good) => `
  <rect x="${x}" y="180" width="680" height="${step ? 560 : 400}" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="${x + 28}" y="236" font-family="${NU.serif}" font-size="38" fill="${NU.ink}">${title}</text>
  <text x="${x + 28}" y="274" font-family="${NU.sans}" font-size="21" fill="${NU.dim}">${esc(rule)}</text>
  ${pal.map((c, k) => `<rect x="${x + 28 + k * 104}" y="300" width="96" height="120" fill="${c}"/>`).join('')}
  <text x="${x + 28}" y="456" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">lightness L* ${pal.map(lstar).join(' · ')}</text>
  ${step ? `<text x="${x + 28}" y="512" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="3" fill="${NU.navy}">IN GREYSCALE</text>
  ${pal.map((c, k) => `<rect x="${x + 28 + k * 104}" y="528" width="96" height="120" fill="${greyOf(c)}"/>`).join('')}
  <text x="${x + 28}" y="700" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${good ? NU.navy : NU.red}">${good ? '✓' : '✗'}</tspan>  ${good ? 'Still six greys you can tell apart' : 'One grey: the categories vanish'}</text>` : ''}`;
  return `${svgOpen(NU.paper)}
  ${heading('Two respected rules. Which is right?', 'Categorical colours: keep lightness equal, or vary it?')}
  ${panel(80, 'Rule A', 'Vary hue; keep lightness and saturation constant', RULE_A, false)}
  ${panel(840, 'Rule B', 'Vary hue, lightness and saturation', RULE_B, true)}
  ${step ? `<text x="80" y="800" font-family="${NU.serif}" font-size="34" fill="${NU.red}">It’s a trade-off. A protects equal importance; B protects telling them apart.</text>
  <text x="80" y="844" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">In practice: vary lightness modestly, and label the categories directly.</text>` :
    `<text x="80" y="660" font-family="${NU.sans}" font-size="26" fill="${NU.ink}">Rule A: no category looks more important. Rule B: they stay distinct for colour-blind readers, greyscale prints and small marks.</text>`}
</svg>
`;
}

/* Map: Warming Stripes. Real data only: the official image goes in
   assets/lesson/ipdv/week4/warming-stripes-uk.png (showyourstripes.info,
   CC BY 4.0). Until it is there, the slide says so rather than inventing a
   climate record. */
const STRIPES = asset('warming-stripes-uk.png');
function stripesSlide() {
  const have = fs.existsSync(path.join(root, STRIPES));
  if (have) return taggedPhoto('warming-stripes-uk.png', 'WARMING STRIPES · UK');
  return `${svgOpen(NU.navyDeep)}
  <rect x="200" y="220" width="1200" height="380" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-dasharray="14 10"/>
  <text x="800" y="390" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="34" fill="#fff">UK warming stripes go here</text>
  <text x="800" y="440" text-anchor="middle" font-family="${NU.sans}" font-size="24" fill="#fff" opacity=".75">Download from showyourstripes.info (Ed Hawkins, CC BY 4.0)</text>
  <text x="800" y="476" text-anchor="middle" font-family="${NU.sans}" font-size="24" fill="#fff" opacity=".75">and save as assets/lesson/ipdv/week4/warming-stripes-uk.png</text>
</svg>
`;
}

/* The ordering test without phones: each swatch row on its own slide, with
   the instruction, ordered out loud by the room. */
function orderPanel(file, title, sub) {
  return `${svgOpen(NU.paper)}
  ${heading(title, sub)}
  <image href="${dataUri(asset(file))}" x="90" y="250" width="1420" height="420"/>
</svg>
`;
}

/* Plan slide 25 without phones: five datasets as cards, then the answers
   and the reason each is debatable. The answer depends on the task, not only
   on the data (Munzner's abstraction level). */
const CLASSIFY = [
  ['Quarterly company profit', 'including losses', 'Diverging', 'Midpoint 0. Sequential only if profit is always positive'],
  ['Customer satisfaction', 'rated 1–10', 'Sequential', 'Or diverging, if 5 is a true neutral. Ask what 5 means'],
  ['Brexit result by area', 'share voting Leave', 'Diverging', 'Midpoint 50%. Show only the winner and it is categorical'],
  ['Global temperature', 'anomaly against 1961–90', 'Diverging', 'Midpoint at the baseline average'],
  ['Smartphone brands', 'the best seller in each country', 'Categorical', 'One brand’s share would be sequential']
];
function classifyCards(reveal) {
  const W = 274, gap = 18, left = 80;
  const famColour = { Sequential: BLUES[5], Diverging: RDBU7[0], Categorical: CAT6[3] };
  return `${svgOpen(NU.paper)}
  ${heading('Sequential, diverging or categorical?', reveal ? 'The answer depends on the task, not only on the data' : 'Decide for each before the next click')}
  ${CLASSIFY.map(([name, detail, fam, why], i) => { const x = left + i * (W + gap);
    return `<rect x="${x}" y="190" width="${W}" height="560" fill="#fff" stroke="rgba(12,51,84,.18)" stroke-width="1.5"/>
  <text x="${x + 22}" y="236" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="3" fill="${NU.red}">${i + 1}</text>
  <foreignObject x="${x + 22}" y="250" width="${W - 44}" height="200"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${NU.serif.replace(/"/g, "'")};font-size:32px;line-height:1.15;color:${NU.ink}">${esc(name)}</div>
  <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${NU.sans.replace(/"/g, "'")};font-size:21px;line-height:1.3;color:${NU.dim};margin-top:10px">${esc(detail)}</div></foreignObject>
  ${reveal ? `<rect x="${x + 22}" y="470" width="${W - 44}" height="60" fill="${famColour[fam]}"/>
  <text x="${x + W / 2}" y="510" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="24" fill="#fff">${fam}</text>
  <foreignObject x="${x + 22}" y="548" width="${W - 44}" height="190"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${NU.sans.replace(/"/g, "'")};font-size:20px;line-height:1.35;color:${NU.ink}">${esc(why)}</div></foreignObject>`
    : `<text x="${x + W / 2}" y="560" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="30" fill="${NU.navy}" opacity=".35">S · D · C ?</text>`}`; }).join('\n  ')}
</svg>
`;
}

function drawBatch3() {
  return {
    'hsl-lies-1.svg': hslLies(0), 'hsl-lies-2.svg': hslLies(1),
    'classify-1.svg': classifyCards(false), 'classify-2.svg': classifyCards(true),
    'order-hue-slide.svg': orderPanel('order-hue.svg', 'Put these in order, least to most', 'Call out the letters. Then we compare answers'),
    'order-lightness-slide.svg': orderPanel('order-lightness.svg', 'Now these, least to most', 'Call out the letters again'),
    'size-changes.svg': sizeChanges(),
    'wheel-vs-eye.svg': wheelVsEye(),
    ...Object.fromEntries([0, 1, 2, null].map((f, i) => [`families-${i + 1}.svg`, threeFamilies(f)])),
    'cat-rules-1.svg': categoricalRules(0), 'cat-rules-2.svg': categoricalRules(1),
    'stripes.svg': stripesSlide(),
    'dw-us-map-full.svg': taggedPhoto('dw-us-map.jpg', 'AGREE OR DISAGREE? · SEQUENTIAL', 'top'),
    'dw-likert-full.svg': taggedPhoto('dw-likert.jpg', 'AGREE OR DISAGREE? · DIVERGING', 'top'),
    'dw-bars-full.svg': taggedPhoto('dw-bars.jpg', 'AGREE OR DISAGREE? · CATEGORICAL', 'top')
  };
}

/* ================================================== batch 4: plan slides 31–40 */

const clamp01 = x => Math.max(0, Math.min(1, x));
const jetColour = t => rgbHex([1.5 - Math.abs(4 * t - 3), 1.5 - Math.abs(4 * t - 2), 1.5 - Math.abs(4 * t - 1)].map(c => 255 * clamp01(c)));
const VIRIDIS = ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'];
const TURBO = ['#30123b', '#4145ab', '#4675ed', '#39a2fc', '#1bcfd4', '#24eca6', '#61fc6c', '#a4fc3b', '#d1e834', '#f3c63a', '#fe9b2d', '#f36315', '#d93806', '#b11901', '#7a0402'];
function stopsColour(stops, t) {
  const x = clamp01(t) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = hexRgb(stops[i]), b = hexRgb(stops[i + 1]);
  return rgbHex(a.map((v, k) => v + (b[k] - v) * f));
}

/* Sequential: the rainfall opener (Heller Weather, via Mylonas p39). */
function rainfallPair() {
  const a = fit(asset('rainfall-a.jpg'), 60, 200, 720, 420), b = fit(asset('rainfall-b.jpg'), 820, 200, 720, 420);
  return `${svgOpen(NU.paper)}
  ${heading('Same rain, two colour maps', 'Where is the heaviest rainfall? How sure are you?')}
  <image href="${dataUri(asset('rainfall-a.jpg'))}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/>
  <image href="${dataUri(asset('rainfall-b.jpg'))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="60" y="680" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">A · Rainbow</text>
  <text x="820" y="680" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">B · One hue, light to dark</text>
  <text x="60" y="830" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">hellerweather.com, via Mylonas (LDSCI5209) p39</text>
</svg>
`;
}

/* Sequential: the rainbow debate on real data. The 2024 TfL hires heatmap in
   jet, viridis and turbo, each with its lightness profile; the second state
   prints all three in greyscale. */
function rainbowDebate(grey) {
  const maps = [['Jet (rainbow)', jetColour, '✗', ['False bands at yellow and cyan;', 'lightness goes up, then down']],
    ['Viridis', t => stopsColour(VIRIDIS, t), '✓', ['Lightness climbs steadily, so order', 'survives greyscale and colour blindness']],
    ['Turbo', t => stopsColour(TURBO, t), '⚠', ['A smoother rainbow with nameable hues,', 'but still dark at both ends']]];
  const flat = HIRES_2024.flat(), lo = Math.min(...flat), hi = Math.max(...flat);
  const cols = maps.map(([name, fn, mark, line], c) => {
    const x = 80 + c * 490, cw = 36, ch = 30;
    let cells = '';
    for (let j = 0; j < 7; j++) for (let i = 0; i < 12; i++) { const col = fn((HIRES_2024[i][j] - lo) / (hi - lo)); cells += `<rect x="${x + i * cw}" y="${220 + j * ch}" width="${cw - 2}" height="${ch - 2}" fill="${grey ? greyOf(col) : col}"/>`; }
    const pts = []; for (let k = 0; k <= 40; k++) { const t = k / 40; pts.push(`${(x + t * 430).toFixed(1)},${(560 - lstar(fn(t)) * 1.1).toFixed(1)}`); }
    let strip = ''; for (let k = 0; k < 43; k++) { const col = fn(k / 42); strip += `<rect x="${x + k * 10}" y="590" width="10.5" height="22" fill="${grey ? greyOf(col) : col}"/>`; }
    return `<text x="${x}" y="200" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">${name}</text>
  ${cells}
  <line x1="${x}" y1="560" x2="${x + 430}" y2="560" stroke="${NU.dim}" stroke-opacity=".4"/><line x1="${x}" y1="450" x2="${x + 430}" y2="450" stroke="${NU.dim}" stroke-opacity=".2"/>
  <polyline points="${pts.join(' ')}" fill="none" stroke="${NU.ink}" stroke-width="3"/>
  <text x="${x + 434}" y="456" font-family="${NU.sans}" font-size="14" fill="${NU.dim}">L* 100</text>
  ${strip}
  <text x="${x}" y="660" font-family="${NU.sans}" font-size="20" fill="${NU.ink}"><tspan font-weight="700" fill="${mark === '✓' ? NU.navy : NU.red}">${mark}</tspan>  ${esc(line[0])}</text>
  <text x="${x + 26}" y="688" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">${esc(line[1])}</text>`;
  });
  return `${svgOpen(NU.paper)}
  ${heading(grey ? 'The rainbow debate, in greyscale' : 'The rainbow debate', 'TfL bike hires per day, 2024, three ways. The line under each is its lightness, low to high')}
  ${cols.join('\n  ')}
  <text x="80" y="790" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">${esc(grey ? 'Only viridis still runs dark to light. Jet’s busiest days and quietest days come out the same grey.' : 'Borland & Taylor (2007), “Rainbow color map (still) considered harmful” · van der Walt & Smith (2015), viridis · Google (2019), turbo')}</text>
</svg>
`;
}

/* Sequential: binning changes the story. Case C's 27 countries, sorted by
   age, classed into five colours three ways. */
const NEST_ALL = [['FI', 21.3], ['SE', 21.4], ['DK', 21.7], ['EE', 22.7], ['NL', 23.0], ['FR', 23.4], ['DE', 23.8], ['LT', 24.7], ['AT', 25.3], ['CZ', 25.9],
  ['BE', 26.3], ['LV', 26.8], ['LU', 26.8], ['IE', 26.9], ['HU', 27.1], ['CY', 27.5], ['RO', 27.7], ['PL', 28.9], ['SI', 29.4], ['PT', 29.7], ['IT', 30.0],
  ['MT', 30.1], ['ES', 30.3], ['BG', 30.3], ['GR', 30.7], ['SK', 30.8], ['HR', 33.4]];
function jenks(values, k) {
  const n = values.length, cost = (a, b) => { const s = values.slice(a, b + 1), m = s.reduce((p, q) => p + q, 0) / s.length; return s.reduce((p, q) => p + (q - m) ** 2, 0); };
  const best = Array.from({ length: k + 1 }, () => Array(n).fill(Infinity)), cut = Array.from({ length: k + 1 }, () => Array(n).fill(0));
  for (let j = 0; j < n; j++) best[1][j] = cost(0, j);
  for (let c = 2; c <= k; c++) for (let j = c - 1; j < n; j++) for (let i = c - 1; i <= j; i++) {
    const v = best[c - 1][i - 1] + cost(i, j); if (v < best[c][j]) { best[c][j] = v; cut[c][j] = i; } }
  const starts = []; let j = n - 1; for (let c = k; c >= 2; c--) { const i = cut[c][j]; starts.unshift(i); j = i - 1; }
  return values.map((_, idx) => starts.filter(st => idx >= st).length);
}
const BLUES5 = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
function binning() {
  const v = NEST_ALL.map(n => n[1]), lo = Math.min(...v), hi = Math.max(...v);
  const schemes = [
    ['Equal interval', 'Five equal steps of 2.4 years', v.map(x => Math.min(4, Math.floor((x - lo) / ((hi - lo) / 5)))), 'Croatia stands alone; most countries look middling'],
    ['Quantile', 'A fifth of the countries in each colour', v.map((_, i) => Math.floor(i * 5 / v.length)), 'Differences look evenly spread, even tiny ones'],
    ['Natural breaks', 'Breaks placed at the gaps (Jenks)', jenks(v, 5), 'Clusters stand out: the Nordic early leavers, the South late']
  ];
  const rows = schemes.map(([name, how, cls, story], r) => { const y = 210 + r * 210;
    return `<text x="80" y="${y}" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">${name}</text>
  <text x="400" y="${y}" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${how}</text>
  ${NEST_ALL.map(([code], i) => { const c = BLUES5[cls[i]]; return `<rect x="${80 + i * 53}" y="${y + 20}" width="50" height="62" fill="${c}"/><text x="${105 + i * 53}" y="${y + 57}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="16" fill="${lum(c) > 0.35 ? NU.ink : '#fff'}">${code}</text>`; }).join('')}
  <text x="80" y="${y + 118}" font-family="${NU.sans}" font-size="22" fill="${NU.ink}">${esc(story)}</text>
  ${(() => { let at = 1520; return [4, 3, 2, 1, 0].map(c => { const vs = v.filter((_, i) => cls[i] === c); if (!vs.length) return '';
    const label = `${Math.min(...vs).toFixed(1)}–${Math.max(...vs).toFixed(1)}`, w = label.length * 9.4 + 30; at -= w;
    return `<rect x="${at}" y="${y + 103}" width="16" height="16" fill="${BLUES5[c]}" stroke="rgba(0,0,0,.2)"/><text x="${at + 21}" y="${y + 117}" font-family="${NU.sans}" font-size="16" fill="${NU.dim}">${label}</text>`; }).join(''); })()}`; });
  return `${svgOpen(NU.paper)}
  ${heading('Binning changes the story', 'Same data, same five blues: age leaving home, 27 EU countries, sorted youngest to oldest (Eurostat 2022)')}
  ${rows.join('\n  ')}
</svg>
`;
}

/* Categorical: how many colours can people tell apart? Fourteen years of
   real TfL hires as fourteen hues, against grey with two highlighted. */
const TFL_YEARS = {2011: [403, 398, 556, 674, 722, 639, 708, 642, 685, 709, 597, 409], 2012: [494, 482, 818, 649, 927, 859, 1014, 1163, 1015, 857, 727, 513], 2013: [566, 517, 505, 658, 750, 814, 999, 904, 702, 674, 514, 444], 2014: [494, 523, 758, 806, 891, 1053, 1183, 1055, 1059, 908, 715, 580], 2015: [584, 549, 701, 839, 900, 1040, 1135, 1043, 903, 885, 685, 608], 2016: [586, 598, 664, 763, 1014, 963, 1188, 1158, 1053, 945, 711, 659], 2017: [638, 619, 820, 918, 993, 1098, 1132, 994, 935, 974, 792, 534], 2018: [646, 576, 605, 825, 1113, 1182, 1253, 1058, 1008, 978, 738, 585], 2019: [686, 699, 792, 890, 1007, 1006, 1152, 1054, 966, 852, 729, 592], 2020: [710, 641, 554, 591, 1121, 1159, 1170, 1153, 1138, 848, 760, 589], 2021: [410, 511, 749, 944, 922, 1184, 1168, 1111, 1220, 1111, 945, 667], 2022: [749, 750, 1057, 1031, 1201, 1280, 1316, 1260, 801, 864, 726, 472], 2023: [571, 613, 631, 647, 821, 885, 809, 778, 847, 790, 665, 474], 2024: [559, 568, 647, 685, 823, 869, 884, 872, 792, 831, 712, 527]};
const HUES14 = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
function howMany() {
  const years = Object.keys(TFL_YEARS);
  const chart = (x, colourOf, labelled) => {
    const px = m => x + 20 + m * 52, py = v => 640 - (v - 350) / 1000 * 400;
    const lines = years.map((y, k) => `<polyline points="${TFL_YEARS[y].map((v, m) => `${px(m)},${py(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${colourOf(y, k)}" stroke-width="${labelled.includes(y) ? 5 : 2.5}"/>`);
    const order = years.filter(y => !labelled.includes(y)).concat(labelled);
    const sorted = order.map(y => lines[years.indexOf(y)]).join('');
    const tags = labelled.map((y, k) => `<text x="${px(11) + 10}" y="${py(TFL_YEARS[y][11]) + 7 + (labelled.length > 1 ? (k ? -12 : 12) : 0)}" font-family="${NU.sans}" font-weight="700" font-size="20" fill="${colourOf(y)}">${y}</text>`).join('');
    return sorted + tags + 'JFMAMJJASOND'.split('').map((m, i) => `<text x="${px(i)}" y="672" text-anchor="middle" font-family="${NU.sans}" font-size="15" fill="${NU.dim}">${m}</text>`).join('');
  };
  const legend = years.map((y, k) => `<rect x="${80 + (k % 7) * 92}" y="${700 + Math.floor(k / 7) * 30}" width="16" height="16" fill="${HUES14[k]}"/><text x="${102 + (k % 7) * 92}" y="${714 + Math.floor(k / 7) * 30}" font-family="${NU.sans}" font-size="16" fill="${NU.ink}">${y}</text>`).join('');
  return `${svgOpen(NU.paper)}
  ${heading('How many colours can people tell apart?', 'TfL bike hires per month, 2011–2024: one line per year')}
  <text x="80" y="210" font-family="${NU.serif}" font-size="30" fill="${NU.ink}">14 years, 14 hues</text>
  ${chart(80, (y, k) => HUES14[k ?? Object.keys(TFL_YEARS).indexOf(y)], [])}
  ${legend}
  <text x="860" y="210" font-family="${NU.serif}" font-size="30" fill="${NU.ink}">Grey, and two that matter</text>
  ${chart(860, y => (y === '2024' ? '#2c7bb6' : y === '2022' ? '#e66101' : '#c9ced3'), ['2022', '2024'])}
  <text x="860" y="716" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">Group, highlight two or three, use small multiples, or label directly</text>
  <text x="80" y="820" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">About 6–12 distinguishable hues, background included, and fewer for small marks (Munzner, Ch. 10).</text>
</svg>
`;
}

/* Mean: colours that match the concept (Lin et al., 2013). Illustrative
   numbers, labelled as such: the point is the colour, not the values. */
const FRUIT = [['Banana', 42, '#f2d43d'], ['Apple', 35, '#d8342c'], ['Orange', 27, '#f08a24'], ['Grape', 18, '#6b3fa0'], ['Lime', 12, '#7cc242']];
function semantic() {
  const shuffled = ['#6b3fa0', '#7cc242', '#d8342c', '#f2d43d', '#f08a24'];
  const chart = (x, title, cols, ok) => `<text x="${x}" y="220" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">${title}</text>
  ${FRUIT.map(([n, v], i) => `<text x="${x}" y="${300 + i * 82}" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">${n}</text>
  <rect x="${x + 120}" y="${270 + i * 82}" width="${v * 11}" height="50" fill="${cols[i]}"/>`).join('')}
  <text x="${x}" y="720" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${ok ? NU.navy : NU.red}">${ok ? '✓' : '✗'}</tspan>  ${ok ? 'Read without the labels: banana is yellow' : 'Every bar fights its fruit'}</text>`;
  return `${svgOpen(NU.paper)}
  ${heading('Use the colour the concept already has', 'Fruit sales, illustrative numbers · readers are faster when colours match concepts (Lin et al., 2013)')}
  ${chart(80, 'Matched', FRUIT.map(f => f[2]), true)}
  ${chart(860, 'Shuffled', shuffled, false)}
  <text x="80" y="820" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">What is the natural colour for the Liberal Democrats? For temperature? For profit?</text>
</svg>
`;
}

/* Mean: darker means more, usually (Schloss et al., 2019). The same heatmap
   on white and on black. */
function darkIsMore() {
  const flat = HIRES_2024.flat(), lo = Math.min(...flat), hi = Math.max(...flat);
  const panel = (x, bg, fg, label) => { let o = `<rect x="${x}" y="180" width="680" height="520" fill="${bg}"/>
  <text x="${x + 30}" y="236" font-family="${NU.serif}" font-size="32" fill="${fg}">${label}</text>`;
    for (let j = 0; j < 7; j++) for (let i = 0; i < 12; i++) o += `<rect x="${x + 70 + i * 46}" y="${270 + j * 46}" width="43" height="43" fill="${ramp((HIRES_2024[i][j] - lo) / (hi - lo))}"/>`;
    return o + `<text x="${x + 70}" y="${640}" font-family="${NU.sans}" font-size="20" fill="${fg}">Which months were busiest?</text>`; };
  return `${svgOpen(NU.paper)}
  ${heading('Darker means more… usually', 'Same data, same scale (darker = more hires), two backgrounds')}
  ${panel(80, '#ffffff', NU.ink, 'On white')}
  ${panel(840, '#111111', '#ffffff', 'On black')}
  <text x="80" y="780" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">People expect darker to mean more, but on a dark background the expectation can flip (Schloss et al., 2019).</text>
  <text x="80" y="818" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">The right direction for your scale depends on your background.</text>
</svg>
`;
}

/* Mean: culture changes the reading. One illustrative price series, coloured
   by Western and by mainland Chinese market convention. */
function marketColours() {
  const rand = seeded(37); let p = 100; const days = [];
  for (let d = 0; d < 26; d++) { const o = p; p = p + (rand() - 0.42) * 8; days.push([o, p]); }
  const all = days.flat(), lo = Math.min(...all) - 2, hi = Math.max(...all) + 2;
  const chart = (x, up, down, title, note) => `<text x="${x}" y="220" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">${title}</text>
  <text x="${x}" y="254" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${note}</text>
  ${days.map(([o, c], d) => { const y1 = 660 - (Math.max(o, c) - lo) / (hi - lo) * 360, h = Math.max(3, Math.abs(c - o) / (hi - lo) * 360);
    return `<rect x="${x + d * 26}" y="${y1.toFixed(1)}" width="20" height="${h.toFixed(1)}" fill="${c >= o ? up : down}"/>`; }).join('')}`;
  return `${svgOpen(NU.paper)}
  ${heading('Culture changes the reading', 'One price series (illustrative), two market conventions')}
  ${chart(80, '#1a9850', '#d73027', 'London, New York', 'Green = price up, red = down')}
  ${chart(860, '#d73027', '#1a9850', 'Shanghai, Shenzhen', 'Red = price up, green = down')}
  <text x="80" y="760" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">Same data, opposite colours. Read with the wrong convention, the story runs backwards.</text>
  <text x="80" y="798" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">And a red–green pair fails 1 in 12 men either way: add arrows or position.</text>
</svg>
`;
}

/* Mean: two philosophies of house palette (Datawrapper, via the 2025 deck p21). */
function brandWheels() {
  const wheels = [['brand-wheel-a.jpg', 'New York Times', 'Flexible: every corner of the wheel'], ['brand-wheel-b.jpg', 'Financial Times', 'Brand-led: a few hues, shades of each'], ['brand-wheel-c.jpg', 'The Economist', 'Brand-led: red and blue, then shades']];
  return `${svgOpen(NU.paper)}
  ${heading('House palettes: two philosophies', 'Each dot is a colour used in the publication’s charts · Datawrapper')}
  ${wheels.map(([f, n, l], i) => { const b = fit(asset(f), 80 + i * 490, 190, 440, 460);
    return `<image href="${dataUri(asset(f))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="${80 + i * 490}" y="700" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">${n}</text>
  <text x="${80 + i * 490}" y="736" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${l}</text>`; }).join('')}
  <text x="80" y="820" font-family="${NU.sans}" font-size="24" fill="${NU.ink}">Fewer hues: a recognisable brand, but harder categorical charts. How would the FT show seven political parties?</text>
</svg>
`;
}

/* Mean: brand colour in action, the 2025 deck's Netflix and HBO pair. */
function netflixPair() {
  const a = fit(asset('netflix-hbo-lines.jpg'), 70, 180, 700, 560), b = fit(asset('netflix-hbo-bars.jpg'), 830, 180, 700, 560);
  return `${svgOpen(NU.paper)}
  ${heading('Brand colour in action', 'Netflix challenges HBO at the 2017 Emmys: two charts, two jobs for colour')}
  <image href="${dataUri(asset('netflix-hbo-lines.jpg'))}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/>
  <image href="${dataUri(asset('netflix-hbo-bars.jpg'))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="70" y="790" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.navy}">Highlight:</tspan> two brand colours, everyone else muted</text>
  <text x="830" y="790" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.navy}">Measure:</tspan> light vs dark orange for 2016 vs 2017</text>
</svg>
`;
}

/* A slide still to build: the plan's content, clearly marked, so the whole
   shape of the lecture is visible in the deck while it is being written. */
function placeholderCard(title, lines) {
  return `${svgOpen(NU.paper)}
  <rect x="60" y="40" width="1480" height="820" fill="none" stroke="${NU.red}" stroke-width="4" stroke-dasharray="18 12"/>
  <rect x="100" y="80" width="190" height="46" fill="${NU.red}"/>
  <text x="195" y="111" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="4" fill="#fff">TO BUILD</text>
  <text x="100" y="230" font-family="${NU.serif}" font-size="64" fill="${NU.ink}">${esc(title)}</text>
  ${lines.map((l, k) => `<text x="100" y="${330 + k * 56}" font-family="${NU.sans}" font-size="30" fill="${NU.dim}">·  ${esc(l)}</text>`).join('')}
</svg>
`;
}

function drawBatch4() {
  return {
    'todo-grey.svg': placeholderCard('Start with grey', ['A busy multi-colour chart, then grey plus one highlight', 'The Times examples; GLA City Intelligence guidelines', 'Completes the Highlight job (slide 24)']),
    'todo-wcag.svg': placeholderCard('Don’t rely on colour alone', ['WCAG 1.4.1 Use of Color', '1.4.11 Non-text contrast 3:1 · 1.4.3 Text contrast 4.5:1', 'A red/green line chart, then labels and line styles']),
    'todo-redundant.svg': placeholderCard('Redundant encoding toolkit', ['Direct labels instead of legends', 'Shape or dash patterns as well as hue', 'Lightness differences · annotations']),
    'todo-tests.svg': placeholderCard('The two tests', ['Greyscale: does it still work?', 'Colour blindness: Chrome DevTools or Coblis', 'The projector is a third test']),
    'todo-tools.svg': placeholderCard('Tools, matched to the job', ['ColorBrewer · Colorgorical · chroma.js', 'Adobe Color · Stanford colour-name analyser', 'Pairs pick a scheme for one classify dataset']),
    'todo-altair.svg': placeholderCard('Colour in Altair', ['viridis · redblue with domainMid=0 · tableau10', 'alt.condition to highlight · type=quantile', ':Q :O :N pick sensible defaults']),
    'todo-fix.svg': placeholderCard('Fix the opening maps', ['Groups take Case A, B or C', 'Data type and task · colour-map family and why', 'One accessibility improvement']),
    'todo-checklist.svg': placeholderCard('Colour checklist', ['Attribute type? Is colour the right channel?', 'Lightness ordering? 6–12 categories? Greyscale and CVD?', 'Not colour alone? Meaning, culture, background? Scarce?']),
    'rainfall-pair.svg': rainfallPair(),
    'rainbow-debate-1.svg': rainbowDebate(false), 'rainbow-debate-2.svg': rainbowDebate(true),
    'cvd-wheels-full.svg': taggedPhoto('cvd-wheels.jpg', 'COMMON MISTAKES · THE RAINBOW'),
    'binning.svg': binning(),
    'how-many.svg': howMany(),
    'treemap-1-full.svg': taggedPhoto('dw-treemap-1.jpg', 'AGREE OR DISAGREE? · TREEMAP', 'top'),
    'treemap-2-full.svg': taggedPhoto('dw-treemap-2.jpg', 'AGREE OR DISAGREE? · TREEMAP', 'top'),
    'semantic.svg': semantic(),
    'dark-is-more.svg': darkIsMore(),
    'market-colours.svg': marketColours(),
    'psychology-full.svg': taggedPhoto('colour-psychology.jpg', 'POPULAR CLAIMS'),
    'brand-wheels.svg': brandWheels(),
    'netflix-pair.svg': netflixPair()
  };
}

/* ================================================== batch 5: the remaining plan slides */

const monthsAxis = (x0, step, y) => 'JFMAMJJASOND'.split('').map((m, i) => `<text x="${x0 + i * step}" y="${y}" text-anchor="middle" font-family="${NU.sans}" font-size="16" fill="${NU.dim}">${m}</text>`).join('');
function lineChart(x0, y0, w, h, series, lo, hi) {
  const step = w / 11, py = v => y0 + h - (v - lo) / (hi - lo) * h;
  return series.map(([vals, colour, width, dash]) => `<polyline points="${vals.map((v, i) => `${(x0 + i * step).toFixed(1)},${py(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${colour}" stroke-width="${width || 3}"${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"/>`).join('') + monthsAxis(x0, step, y0 + h + 30);
}

/* Use · start with grey: six years of TfL hires, coloured everywhere, then
   grey with the one year that has a story. */
const GREY_YEARS = ['2019', '2020', '2021', '2022', '2023', '2024'];
function greyFirst(step) {
  const cols = ['#4e79a7', '#e15759', '#59a14f', '#f28e2b', '#b07aa1', '#edc948'];
  const series = GREY_YEARS.map((y, k) => [TFL_YEARS[y], step ? (y === '2020' ? '#2c7bb6' : '#c9ced3') : cols[k], step && y === '2020' ? 6 : 3]);
  const ordered = step ? series.filter((_, k) => GREY_YEARS[k] !== '2020').concat([series[1]]) : series;
  const legend = step ? '' : GREY_YEARS.map((y, k) => `<rect x="${1220}" y="${250 + k * 44}" width="22" height="22" fill="${cols[k]}"/><text x="1254" y="${268 + k * 44}" font-family="${NU.sans}" font-size="22" fill="${NU.ink}">${y}</text>`).join('');
  const py = v => 200 + 500 - (v - 400) / 1000 * 500;
  const note = step ? `<text x="${120 + 3 * 92}" y="${py(591) + 46}" font-family="${NU.sans}" font-weight="700" font-size="22" fill="#2c7bb6">2020: lockdown emptied March and April,</text>
  <text x="${120 + 3 * 92}" y="${py(591) + 74}" font-family="${NU.sans}" font-weight="700" font-size="22" fill="#2c7bb6">then hires jumped in May</text>` : '';
  return `${svgOpen(NU.paper)}
  ${heading(step ? 'Start with grey. Then colour the story' : 'Colour everywhere: what is the story?', 'TfL bike hires per month, thousands, 2019–2024')}
  ${lineChart(120, 200, 1012, 500, ordered, 400, 1400)}
  ${legend}${note}
</svg>
`;
}

function newsrooms() {
  const a = fit(asset('times-examples.jpg'), 70, 180, 700, 580), b = fit(asset('city-intelligence.jpg'), 830, 180, 700, 580);
  return `${svgOpen(NU.paper)}
  ${heading('How newsrooms do it', 'Build in grey first; add colour only where the eye should go')}
  <image href="${dataUri(asset('times-examples.jpg'))}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/>
  <image href="${dataUri(asset('city-intelligence.jpg'))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="70" y="800" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.navy}">The Times:</tspan> a few hues, the same meaning in every chart</text>
  <text x="830" y="800" font-family="${NU.sans}" font-size="22" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.navy}">GLA City Intelligence:</tspan> grey for context, colour for the point</text>
</svg>
`;
}

/* Check · don't rely on colour alone. Weekday against Sunday hires: a
   red/green pair, then lightness, dash and direct labels. */
function colourAlone(step) {
  const wk = TFL_DAYTYPE.Weekday, su = TFL_DAYTYPE.Sunday;
  const red = '#d62728', green = '#2ca02c';
  const main = step
    ? lineChart(110, 210, 800, 440, [[wk, NU.navy, 5], [su, '#e08214', 5, '14 9']], 9000, 32000) +
      `<text x="922" y="${210 + 440 - (wk[11] - 9000) / 23000 * 440 + 8}" font-family="${NU.sans}" font-weight="700" font-size="22" fill="${NU.navy}">Weekday</text>
  <text x="922" y="${210 + 440 - (su[11] - 9000) / 23000 * 440 + 8}" font-family="${NU.sans}" font-weight="700" font-size="22" fill="#b5650c">Sunday</text>`
    : lineChart(110, 210, 800, 440, [[wk, red, 4], [su, green, 4]], 9000, 32000) +
      `<rect x="640" y="220" width="20" height="20" fill="${red}"/><text x="668" y="237" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">Weekday</text>
  <rect x="770" y="220" width="20" height="20" fill="${green}"/><text x="798" y="237" font-family="${NU.sans}" font-size="20" fill="${NU.ink}">Sunday</text>`;
  const inset = step ? '' : `<rect x="1060" y="200" width="460" height="300" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="1080" y="236" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="2" fill="${NU.red}">SAME CHART, DEUTERANOPIA</text>
  ${lineChart(1090, 260, 400, 170, [[wk, simulate(red, 'deutan'), 3], [su, simulate(green, 'deutan'), 3]], 9000, 32000)}`;
  const rules = `<text x="1060" y="${step ? 260 : 560}" font-family="${NU.sans}" font-weight="700" font-size="20" letter-spacing="2" fill="${NU.navy}">WCAG 2.x</text>
  <text x="1060" y="${step ? 300 : 600}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}"><tspan font-weight="700">1.4.1</tspan> Colour is never the only signal</text>
  <text x="1060" y="${step ? 336 : 636}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}"><tspan font-weight="700">1.4.11</tspan> Marks: 3:1 against neighbours</text>
  <text x="1060" y="${step ? 372 : 672}" font-family="${NU.sans}" font-size="21" fill="${NU.ink}"><tspan font-weight="700">1.4.3</tspan> Text: 4.5:1 contrast</text>`;
  return `${svgOpen(NU.paper)}
  ${heading(step ? 'Fixed: lightness, line style and labels' : 'Don’t rely on colour alone', 'TfL bike hires per day, 2024: weekdays against Sundays')}
  ${main}${inset}${rules}
  ${step ? `<text x="1060" y="460" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">Dark solid against light dashed:</text>
  <text x="1060" y="490" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">readable in greyscale, in any colour</text>
  <text x="1060" y="520" font-family="${NU.sans}" font-size="21" fill="${NU.ink}">vision, and with the legend gone.</text>` : ''}
</svg>
`;
}

/* Check · the redundant encoding toolkit: one small chart, four techniques. */
function redundantToolkit() {
  const S = [['Weekday', TFL_DAYTYPE.Weekday], ['Saturday', TFL_DAYTYPE.Saturday], ['Sunday', TFL_DAYTYPE.Sunday]];
  const mini = (x, y, styles, label, extra) => {
    const py = v => y + 190 - (v - 10000) / 22000 * 170;
    return `<rect x="${x}" y="${y - 70}" width="680" height="320" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="${x + 24}" y="${y - 28}" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">${label}</text>
  ${S.map(([n, v], k) => { const st = styles[k]; return `<polyline points="${v.map((q, i) => `${x + 30 + i * 40},${py(q).toFixed(1)}`).join(' ')}" fill="none" stroke="${st[0]}" stroke-width="${st[1]}"${st[2] ? ` stroke-dasharray="${st[2]}"` : ''}/>`; }).join('')}
  ${extra(py)}`;
  };
  const endLabels = (x, cols) => py => S.map(([n, v], k) => `<text x="${x + 30 + 11 * 40 + 10}" y="${py(v[11]) + 6 + (k - 1) * 20}" font-family="${NU.sans}" font-weight="700" font-size="18" fill="${cols[k]}">${n}</text>`).join('');
  return `${svgOpen(NU.paper)}
  ${heading('Redundant encoding toolkit', 'Say it twice: every one of these also helps readers with perfect colour vision')}
  ${mini(80, 250, [['#4e79a7', 3], ['#f28e2b', 3], ['#59a14f', 3]], 'Direct labels, not a legend', endLabels(80, ['#4e79a7', '#f28e2b', '#59a14f']))}
  ${mini(840, 250, [[NU.ink, 3], [NU.ink, 3, '10 7'], [NU.ink, 3, '2 6']], 'Line style or shape as well as hue', endLabels(840, [NU.ink, NU.ink, NU.ink]))}
  ${mini(80, 620, [['#08306b', 4], ['#4292c6', 4], ['#9ecae1', 4]], 'Different lightness, not just hue', endLabels(80, ['#08306b', '#4292c6', '#6aa8cf']))}
  ${mini(840, 620, [['#c9ced3', 3], ['#c9ced3', 3], ['#2c7bb6', 5]], 'Annotate the point', py => `<text x="${840 + 30 + 4 * 40}" y="${py(TFL_DAYTYPE.Sunday[4]) - 18}" font-family="${NU.sans}" font-weight="700" font-size="18" fill="#2c7bb6">Sundays catch up in May</text>`)}
</svg>
`;
}

/* Check · the two tests, applied. */
function twoTests() {
  const bars = (x, y, pal, grey) => pal.slice(0, 5).map((c, k) => `<rect x="${x + k * 56}" y="${y + 120 - [90, 120, 60, 100, 75][k]}" width="46" height="${[90, 120, 60, 100, 75][k]}" fill="${grey ? greyOf(c) : c}"/>`).join('');
  const pair = (x, y, a, b, kind) => `<rect x="${x}" y="${y}" width="120" height="70" fill="${simulate(a, kind)}"/><rect x="${x + 130}" y="${y}" width="120" height="70" fill="${simulate(b, kind)}"/>`;
  return `${svgOpen(NU.paper)}
  ${heading('The two tests', 'Run both on every chart before anyone else sees it')}
  <rect x="80" y="180" width="680" height="520" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="110" y="232" font-family="${NU.serif}" font-size="36" fill="${NU.ink}">1 · Greyscale</text>
  <text x="110" y="268" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">Desaturate it. Does it still work?</text>
  ${bars(110, 300, RULE_A)}${bars(420, 300, RULE_A, true)}
  ${bars(110, 470, RULE_B)}${bars(420, 470, RULE_B, true)}
  <text x="110" y="640" font-family="${NU.sans}" font-size="20" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.red}">✗</tspan> top: one grey  <tspan font-weight="700" fill="${NU.navy}">✓</tspan> bottom: five greys</text>
  <rect x="840" y="180" width="680" height="520" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <text x="870" y="232" font-family="${NU.serif}" font-size="36" fill="${NU.ink}">2 · Colour blindness</text>
  <text x="870" y="268" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">Simulate it. Can you still tell them apart?</text>
  <text x="870" y="320" font-family="${NU.sans}" font-size="18" fill="${NU.dim}">typical</text><text x="1170" y="320" font-family="${NU.sans}" font-size="18" fill="${NU.dim}">deuteranopia</text>
  ${pair(870, 335, '#d62728', '#2ca02c')}${pair(1170, 335, '#d62728', '#2ca02c', 'deutan')}
  ${pair(870, 470, '#2166ac', '#e08214')}${pair(1170, 470, '#2166ac', '#e08214', 'deutan')}
  <text x="870" y="640" font-family="${NU.sans}" font-size="20" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.red}">✗</tspan> red–green merges  <tspan font-weight="700" fill="${NU.navy}">✓</tspan> blue–orange survives</text>
  <text x="80" y="770" font-family="${NU.sans}" font-size="23" fill="${NU.ink}"><tspan font-weight="700">How:</tspan> Chrome DevTools → Rendering → Emulate vision deficiencies, or Coblis (color-blindness.com).</text>
  <text x="80" y="812" font-family="${NU.sans}" font-size="23" fill="${NU.ink}"><tspan font-weight="700">Third test:</tspan> this room’s projector. The pale end of your sequential scale may just have vanished.</text>
</svg>
`;
}

/* Build · tools matched to the job, with the screenshots from both decks. */
function toolsGrid() {
  const tools = [['tool-colorbrewer.jpg', 'ColorBrewer 2.0', 'Map palettes, with CVD and print filters'],
    ['tool-colorgorical.jpg', 'Colorgorical', 'Distinct, pleasing categorical palettes'],
    ['tool-chroma.jpg', 'chroma.js palette helper', 'Custom ramps, lightness-corrected, CVD check'],
    ['tool-adobe.jpg', 'Adobe Color', 'Harmonies, plus an accessibility tab'],
    ['tool-colour-names.jpg', 'Colour-name analyser', 'Do your categories have distinct names?']];
  return `${svgOpen(NU.paper)}
  ${heading('Tools, matched to the job', 'Pick by the job, not by the prettiest palette')}
  ${tools.map(([f, n, l], i) => { const x = i < 3 ? 80 + i * 490 : 325 + (i - 3) * 490, y = i < 3 ? 175 : 525;
    const b = fit(asset(f), x, y, 450, 230);
    return `<rect x="${x}" y="${y}" width="450" height="230" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <image href="${dataUri(asset(f))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="${x}" y="${y + 266}" font-family="${NU.serif}" font-size="28" fill="${NU.ink}">${n}</text>
  <text x="${x}" y="${y + 298}" font-family="${NU.sans}" font-size="18" fill="${NU.dim}">${esc(l)}</text>`; }).join('')}
</svg>
`;
}

/* Build · colour in Altair: the code, with each line's job alongside. */
function altairCode() {
  const lines = [
    ['import altair as alt', ''],
    ['', ''],
    ['# Sequential: quantitative magnitude', ''],
    ["alt.Color('rent:Q', scale=alt.Scale(scheme='viridis'))", 'MEASURE'],
    ['', ''],
    ['# Diverging: a meaningful midpoint at zero', ''],
    ["alt.Color('profit:Q', scale=alt.Scale(scheme='redblue', domainMid=0))", 'DIVERGE'],
    ['', ''],
    ['# Categorical: nominal groups', ''],
    ["alt.Color('region:N', scale=alt.Scale(scheme='tableau10'))", 'LABEL'],
    ['', ''],
    ['# Highlight: grey everything except one', ''],
    ["alt.condition(alt.datum.brand == 'Netflix',", 'HIGHLIGHT'],
    ["              alt.value('#E50914'), alt.value('lightgrey'))", ''],
    ['', ''],
    ['# Classed scale: binning is a choice', ''],
    ["alt.Color('rent:Q', scale=alt.Scale(type='quantile', scheme='blues'))", 'BINNING']
  ];
  const mono = "'SF Mono', Menlo, Consolas, monospace";
  return `${svgOpen(NU.paper)}
  ${heading('Colour in Altair', 'The type suffix (:Q, :O, :N) already picks sensible defaults: last week’s attribute types, paying off')}
  <rect x="80" y="170" width="1180" height="660" fill="${NU.navyDeep}"/>
  ${lines.map(([code, tag], k) => `<text x="110" y="${215 + k * 36}" font-family="${mono}" font-size="22" fill="${code.startsWith('#') ? '#8fa6bd' : '#ffffff'}" xml:space="preserve">${esc(code)}</text>${tag ? `<rect x="1290" y="${190 + k * 36}" width="${tag.length * 14 + 30}" height="34" fill="${NU.red}"/><text x="1305" y="${214 + k * 36}" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="2" fill="#fff">${tag}</text>` : ''}`).join('\n  ')}
</svg>
`;
}

/* Fix · the three parked cases, then the expected answers. */
function fixCases(step) {
  const cases = [['A', 'map-ancestry.jpg', 'Ancestry map',
      ['Counts per country: quantitative', 'Normalise by population, then one-hue', 'sequential, or drop colour, keep labels']],
    ['B', 'map-markets.jpg', 'Profitable markets',
      ['Percentage: quantitative', 'Grey sea; data in a hue unlike the basemap;', 'label every bin; say what white means']],
    ['C', 'chart-fly-the-nest.jpg', 'Fly the nest',
      ['Age bins: ordered', 'A sequential ramp, or drop colour and', 'sort the countries as a bar chart']]];
  return `${svgOpen(NU.paper)}
  ${heading(step ? 'Fix the opening maps: our answers' : 'Fix the opening maps', step ? 'Compare with your group’s answer' : 'In groups: one case each. Three questions, five minutes')}
  ${cases.map(([l, f, n, ans], i) => { const x = 80 + i * 490; const b = fit(asset(f), x, 180, 450, step ? 250 : 330);
    return `<rect x="${x}" y="180" width="450" height="${step ? 250 : 330}" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <image href="${dataUri(asset(f))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <rect x="${x}" y="164" width="96" height="40" fill="${NU.red}"/><text x="${x + 48}" y="191" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="18" letter-spacing="2" fill="#fff">CASE ${l}</text>
  <text x="${x}" y="${step ? 476 : 556}" font-family="${NU.serif}" font-size="30" fill="${NU.ink}">${n}</text>
  ${step ? ans.map((a, k) => `<text x="${x}" y="${520 + k * 34}" font-family="${NU.sans}" font-size="20" fill="${k ? NU.ink : NU.navy}"${k ? '' : ' font-weight="700"'}>${esc(a)}</text>`).join('') : ''}`; }).join('')}
  ${step ? `<text x="80" y="800" font-family="${NU.serif}" font-size="32" fill="${NU.red}">For Case C, sorting beats any colour: position is the strongest channel.</text>`
    : ['1 · What is the data type, and what is the task?', '2 · Which colour-map family would you use, and why?', '3 · One accessibility improvement'].map((q, k) => `<text x="80" y="${640 + k * 50}" font-family="${NU.sans}" font-size="28" fill="${NU.ink}">${q}</text>`).join('')}
</svg>
`;
}

/* Fix · the checklist, each question tied to the part that taught it. */
function checklist() {
  const items = [['What type is the attribute: categorical, ordered, or diverging around a meaningful middle?', 'Map'],
    ['Is colour the right channel, or would position do it better?', 'Use'],
    ['Is lightness doing the ordering work?', 'Vocabulary'],
    ['At most 6–12 categories, the rest grouped or greyed?', 'Map'],
    ['Does it pass the greyscale and colour-blindness tests?', 'Check'],
    ['Is information carried by more than colour alone?', 'Check'],
    ['Do the colours fit the meaning, the culture and the background?', 'Mean'],
    ['Is colour scarce enough to highlight what matters?', 'Notice']];
  return `${svgOpen(NU.paper)}
  ${heading('Colour checklist', 'Eight questions for any chart. Each one is a part of today')}
  ${items.map(([q, part], k) => { const x = k < 4 ? 80 : 820, y = 200 + (k % 4) * 150;
    const lines = []; q.split(' ').forEach(w => { const last = lines[lines.length - 1]; if (last && (last + ' ' + w).length <= 40) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); });
    return `<circle cx="${x + 30}" cy="${y + 26}" r="28" fill="${NU.navy}"/><text x="${x + 30}" y="${y + 37}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="28" fill="#fff">${k + 1}</text>
  ${lines.map((l, j) => `<text x="${x + 80}" y="${y + 22 + j * 32}" font-family="${NU.sans}" font-size="25" fill="${NU.ink}">${esc(l)}</text>`).join('')}
  <text x="${x + 80}" y="${y + 30 + lines.length * 32}" font-family="${NU.sans}" font-weight="700" font-size="16" letter-spacing="3" fill="${NU.red}">${part.toUpperCase()}</text>`; }).join('')}
</svg>
`;
}

/* Build · the palette lab, made from the 2025 deck's own activities: ColorBrewer
   (p37), Adobe Color with a student account (p39) and the chroma.js helper
   (p40). Pairs go family → pick → harmonise → test, on one classify dataset. */
function paletteLab() {
  const steps = [
    ['Decide', '1 min', '', 'Your dataset: sequential, diverging or categorical? Write it down first.', null],
    ['Pick', '3 min', 'colorbrewer2.org', 'Set classes and family. Tick colourblind safe and print friendly. Note the scheme and hex codes.', 'tool-colorbrewer.jpg'],
    ['Harmonise', '2 min', 'color.adobe.com · student account', 'Categorical: try triadic. Diverging: complementary, but not red–green. Open the accessibility tab.', 'tool-adobe.jpg'],
    ['Test', '2 min', 'gka.github.io/palettes', 'Paste your hex codes. Simulate deut. and prot. Tick correct lightness: did anything change?', 'tool-chroma.jpg']
  ];
  return `${svgOpen(NU.paper)}
  <text x="80" y="76" font-family="${NU.sans}" font-weight="700" font-size="22" letter-spacing="5" fill="${NU.red}">PALETTE LAB · PAIRS · 8 MINUTES</text>
  <text x="80" y="140" font-family="${NU.serif}" font-size="56" fill="${NU.ink}">Pick it, harmonise it, test it</text>
  ${steps.map(([h, t, url, line, shot], k) => { const y = 190 + k * 132;
    const thumb = shot ? (() => { const b = fit(asset(shot), 1290, y, 230, 112); return `<rect x="1290" y="${y}" width="230" height="112" fill="#fff" stroke="rgba(12,51,84,.18)"/><image href="${dataUri(asset(shot))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`; })() : '';
    return `<circle cx="112" cy="${y + 44}" r="32" fill="${NU.navy}"/><text x="112" y="${y + 55}" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="30" fill="#fff">${k + 1}</text>
  <text x="170" y="${y + 40}" font-family="${NU.serif}" font-size="38" fill="${NU.ink}">${h}</text>
  <text x="${170 + h.length * 21 + 20}" y="${y + 40}" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${t}</text>
  ${url ? `<text x="560" y="${y + 40}" font-family="${NU.sans}" font-weight="700" font-size="26" fill="${NU.red}">${esc(url)}</text>` : ''}
  <text x="170" y="${y + 80}" font-family="${NU.sans}" font-size="23" fill="${NU.ink}">${esc(line)}</text>${thumb}`; }).join('\n  ')}
  <rect x="80" y="730" width="1440" height="100" fill="#fff" stroke="${NU.red}" stroke-width="3"/>
  <text x="110" y="772" font-family="${NU.sans}" font-size="25" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.red}">Why:</tspan> the order of today in eight minutes. The data picks the family; the tools pick the hues; the tests decide.</text>
  <text x="110" y="808" font-family="${NU.sans}" font-size="25" fill="${NU.ink}">Keep your hex codes: they start your Lab 4 house palette.</text>
</svg>
`;
}

function labDatasets() {
  const sets = CLASSIFY.map(([name, detail]) => [name, detail]);
  return `${svgOpen(NU.paper)}
  ${heading('Your dataset', 'Number off around the room: pair 1 takes dataset 1, pair 6 starts again at 1')}
  ${sets.map(([n, d], i) => { const x = 80 + i * 292;
    return `<rect x="${x}" y="200" width="274" height="380" fill="#fff" stroke="rgba(12,51,84,.18)" stroke-width="1.5"/>
  <circle cx="${x + 137}" cy="280" r="50" fill="${NU.red}"/><text x="${x + 137}" y="298" text-anchor="middle" font-family="${NU.sans}" font-weight="700" font-size="48" fill="#fff">${i + 1}</text>
  <foreignObject x="${x + 20}" y="350" width="234" height="220"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${NU.serif.replace(/"/g, "'")};font-size:30px;line-height:1.15;color:${NU.ink};text-align:center">${esc(n)}</div>
  <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${NU.sans.replace(/"/g, "'")};font-size:20px;line-height:1.3;color:${NU.dim};text-align:center;margin-top:10px">${esc(d)}</div></foreignObject>`; }).join('')}
  <text x="80" y="680" font-family="${NU.sans}" font-size="26" fill="${NU.ink}"><tspan font-weight="700" fill="${NU.navy}">Go:</tspan> colorbrewer2.org  ·  color.adobe.com  ·  gka.github.io/palettes</text>
  <text x="80" y="730" font-family="${NU.sans}" font-size="24" fill="${NU.dim}">Finished early? Try Colorgorical for a categorical palette, and compare.</text>
</svg>
`;
}

function labShare() {
  return `${svgOpen(NU.paper)}
  ${heading('Share', 'Two or three pairs put their palette on screen')}
  <rect x="80" y="220" width="1440" height="300" fill="#fff" stroke="${NU.navy}" stroke-width="2"/>
  <text x="130" y="320" font-family="${NU.serif}" font-size="46" fill="${NU.ink}">“We used <tspan fill="${NU.red}">[scheme]</tspan> because the data is</text>
  <text x="130" y="390" font-family="${NU.serif}" font-size="46" fill="${NU.ink}"><tspan fill="${NU.red}">[type]</tspan>, and it <tspan fill="${NU.red}">[passed / failed]</tspan> the test because</text>
  <text x="130" y="460" font-family="${NU.serif}" font-size="46" fill="${NU.red}">[reason]<tspan fill="${NU.ink}">.”</tspan></text>
  <text x="80" y="610" font-family="${NU.sans}" font-size="26" fill="${NU.ink}">Listen for: a family that matches the data, lightness doing the ordering, no red–green pair,</text>
  <text x="80" y="648" font-family="${NU.sans}" font-size="26" fill="${NU.ink}">and a palette that still works in the simulation.</text>
</svg>
`;
}

/* The 2025 deck's slides restored: the brain diagram (p16) with its claim
   now cited, and psychological impact (p13 and p25) side by side. */
function brainVsColour() {
  const b = fit(asset('brain-colour.jpg'), 80, 170, 640, 620);
  const lines = ['Colour is processed early, in parallel,', 'across your whole field of view.', '',
    'An odd colour is found in under about', '200–250 ms: before you search,', 'and before you read a word.', '',
    'That is why colour is so powerful for', 'highlighting, and why it only works', 'when it is scarce.'];
  return `${svgOpen(NU.paper)}
  ${heading('The brain vs colour', 'From the eye to colour areas in the brain: the route the red dot just took')}
  <rect x="80" y="170" width="640" height="620" fill="#fff" stroke="rgba(12,51,84,.18)"/>
  <image href="${dataUri(asset('brain-colour.jpg'))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  ${lines.map((l, k) => `<text x="800" y="${240 + k * 46}" font-family="${k < 2 ? NU.serif : NU.sans}" font-size="${k < 2 ? 38 : 28}" fill="${k >= 7 ? NU.red : NU.ink}">${esc(l)}</text>`).join('')}
  <text x="800" y="780" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">Healey &amp; Enns (2012); Treisman &amp; Gelade (1980)</text>
</svg>
`;
}

function psychImpact() {
  const a = fit(asset('warm-cool.jpg'), 80, 170, 700, 470), b = fit(asset('brand-psychology.jpg'), 820, 170, 700, 470);
  return `${svgOpen(NU.paper)}
  ${heading('Psychological impact', 'Warm and cool colours, and how brands use them')}
  <image href="${dataUri(asset('warm-cool.jpg'))}" x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}"/>
  <image href="${dataUri(asset('brand-psychology.jpg'))}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
  <text x="80" y="700" font-family="${NU.sans}" font-size="25" fill="${NU.ink}"><tspan font-weight="700" fill="#d7301f">Warm</tspan> (red, orange, yellow): energy, urgency, attention</text>
  <text x="80" y="742" font-family="${NU.sans}" font-size="25" fill="${NU.ink}"><tspan font-weight="700" fill="#2c7bb6">Cool</tspan> (blue, green, purple): calm, trust, professionalism</text>
  <text x="80" y="806" font-family="${NU.sans}" font-size="23" fill="${NU.dim}">Associations, not laws: they shift with culture and context. Treat them as hypotheses about your audience.</text>
</svg>
`;
}

/* Mean · our own examples after the 2025 infographics, so the effect is
   seen on a chart rather than read as a claim. */
function barsPanel(x, y, w, h, vals, colourOf, lo, hi, zero) {
  const bw = w / vals.length, py = v => y + h - (v - lo) / (hi - lo) * h;
  const base = zero === undefined ? y + h : py(zero);
  return vals.map((v, i) => { const top = Math.min(py(v), base), ht = Math.abs(py(v) - base);
    return `<rect x="${(x + i * bw + 4).toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${Math.max(2, ht).toFixed(1)}" fill="${colourOf(v, i)}"/>`; }).join('') +
    (zero === undefined ? '' : `<line x1="${x}" y1="${base}" x2="${x + w}" y2="${base}" stroke="${NU.ink}" stroke-width="1.5"/>`) +
    'JFMAMJJASOND'.split('').map((m, i) => `<text x="${(x + (i + 0.5) * bw).toFixed(1)}" y="${y + h + 28}" text-anchor="middle" font-family="${NU.sans}" font-size="16" fill="${NU.dim}">${m}</text>`).join('');
}

function warmCoolExample() {
  const v = TFL_MONTHLY[2024];
  return `${svgOpen(NU.paper)}
  ${heading('Warm or cool: does colour change the message?', 'TfL bike hires per month, 2024 (thousands). The same numbers twice')}
  <text x="80" y="210" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">Warm</text>
  ${barsPanel(80, 240, 660, 400, v, () => '#d7301f', 0, 950)}
  <text x="860" y="210" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">Cool</text>
  ${barsPanel(860, 240, 660, 400, v, () => '#2c7bb6', 0, 950)}
  <text x="80" y="750" font-family="${NU.sans}" font-size="25" fill="${NU.ink}">Which one looks like a problem? Nothing in the data changed.</text>
  <text x="80" y="790" font-family="${NU.sans}" font-size="25" fill="${NU.ink}"><tspan font-weight="700" fill="#d7301f">Warm</tspan> pulls attention and reads as urgent; <tspan font-weight="700" fill="#2c7bb6">cool</tspan> reads as calm and stable. Choose on purpose.</text>
</svg>
`;
}

/* An illustrative seat map: the same picture read by two audiences. */
function twoAudiences() {
  const rand = seeded(91), seats = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { if ((r === 0 || r === 5) && (c === 0 || c === 8)) continue; seats.push([r, c, rand() < 0.62]); }
  const map = x => seats.map(([r, c, red]) => `<rect x="${x + c * 64 + (r % 2) * 32}" y="${230 + r * 62}" width="58" height="56" rx="6" fill="${red ? '#d7301f' : '#2c7bb6'}"/>`).join('');
  const reds = seats.filter(s => s[2]).length;
  return `${svgOpen(NU.paper)}
  ${heading('Same map, two audiences', `One illustrative result: ${reds} red seats, ${seats.length - reds} blue`)}
  ${map(90)}${map(870)}
  <text x="90" y="660" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">An audience in London reads:</text>
  <text x="90" y="704" font-family="${NU.sans}" font-weight="700" font-size="28" fill="#d7301f">“Labour won.” Red is the left.</text>
  <text x="870" y="660" font-family="${NU.serif}" font-size="34" fill="${NU.ink}">An audience in Washington reads:</text>
  <text x="870" y="704" font-family="${NU.sans}" font-weight="700" font-size="28" fill="#d7301f">“The Republicans won.” Red is the right.</text>
  <text x="90" y="800" font-family="${NU.sans}" font-size="25" fill="${NU.ink}">Same picture, opposite story. The legend, not the colour, has to say what red means.</text>
</svg>
`;
}

/* Real data: monthly TfL hires against 2023. Traffic-light colours add a
   verdict the data doesn't contain; a neutral pair just says up or down. */
function judgementExample() {
  const v = TFL_CHANGE;
  return `${svgOpen(NU.paper)}
  ${heading('Colour adds a judgement', 'TfL bike hires against 2023, % change by month. Real data, two colourings')}
  <text x="80" y="210" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">Traffic lights</text>
  ${barsPanel(80, 240, 660, 380, v, x => (x >= 0 ? '#1a9850' : '#d73027'), -13, 13, 0)}
  <text x="860" y="210" font-family="${NU.serif}" font-size="32" fill="${NU.ink}">Neutral pair</text>
  ${barsPanel(860, 240, 660, 380, v, x => (x >= 0 ? '#2c7bb6' : '#e66101'), -13, 13, 0)}
  <text x="80" y="720" font-family="${NU.sans}" font-size="24" fill="${NU.ink}"><tspan font-weight="700" fill="#d73027">Red</tspan> and <tspan font-weight="700" fill="#1a9850">green</tspan> say good and bad: February and September look like failures. And 1 in 12 men can’t tell them apart.</text>
  <text x="80" y="760" font-family="${NU.sans}" font-size="24" fill="${NU.ink}"><tspan font-weight="700" fill="#2c7bb6">Blue</tspan> and <tspan font-weight="700" fill="#e66101">orange</tspan> say only up and down. Save alarm colours for data that is alarming.</text>
</svg>
`;
}

function drawBatch5() {
  return {
    'grey-first-1.svg': greyFirst(0), 'grey-first-2.svg': greyFirst(1),
    'newsrooms.svg': newsrooms(),
    'colour-alone-1.svg': colourAlone(0), 'colour-alone-2.svg': colourAlone(1),
    'redundant.svg': redundantToolkit(),
    'two-tests.svg': twoTests(),
    'tools.svg': toolsGrid(),
    'altair.svg': altairCode(),
    'fix-cases-1.svg': fixCases(0), 'fix-cases-2.svg': fixCases(1),
    'checklist.svg': checklist(),
    'warm-cool-example.svg': warmCoolExample(), 'two-audiences.svg': twoAudiences(), 'judgement-example.svg': judgementExample(),
    'brain-vs-colour.svg': brainVsColour(),
    'psych-impact.svg': psychImpact(),
    'hue-family-full.svg': taggedPhoto('hue-family.jpg', 'HUE: THE COLOUR FAMILY'),
    'city-intelligence-full.svg': taggedPhoto('city-intelligence.jpg', 'CITY INTELLIGENCE · DATA DESIGN GUIDELINES'),
    'colours-by-culture-full.svg': taggedPhoto('colours-by-culture.jpg', 'COLOURS BY CULTURE'),
    'palette-lab.svg': paletteLab(), 'palette-lab-datasets.svg': labDatasets(), 'palette-lab-share.svg': labShare()
  };
}

function drawPictures() {
  const out = {
    'pipeline.svg': pipeline(),
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => [`pipeline-${i + 1}.svg`, pipeline(i)])),
    'case-a.svg': casePanel('map-ancestry.jpg', 'A'),
    'case-b.svg': casePanel('map-markets.jpg', 'B'),
    'case-c.svg': casePanel('chart-fly-the-nest.jpg', 'C'),
    'park-it.svg': parkItBoard(),
    'fruit-abc.svg': fruitStrip(),
    'fruit-where-what.svg': fruitTakeaway(),
    'tiger-panel-grey.svg': photoPanel('tiger-grey.jpg', '01 · NO COLOUR'),
    'tiger-panel-colour.svg': photoPanel('tiger-colour.jpg', '02 · COLOUR')
  };
  Object.assign(out, drawBatch2(), drawBatch3(), drawBatch4(), drawBatch5());
  for (const [name, svg] of Object.entries(out)) {
    /* A bare & makes the whole SVG invalid, and the slide renders blank. */
    const bad = svg.replace(/data:[^"]+/g, '').match(/&(?![a-zA-Z]+;|#\d+;)/);
    if (bad) throw new Error(`${name}: unescaped & in the drawing`);
    fs.writeFileSync(path.join(root, DIR, name), svg);
  }
}

const PIPELINE_STEPS = [
  '1 · Raw data: 366 lines, a date and a count. Nothing is a chart yet.',
  '2 · Table: items in rows (days), attributes in columns.',
  '3 · Types: Month and Day are ordinal and cyclic; Hires is quantitative. This is the step that decides the colour.',
  '4 · Question: the task is to find the peak.',
  '5 · Visualisation: a heatmap. Hires is quantitative, so it gets a lightness ramp: darker means more. Today is about this step.',
  '6 · Insight: summer midweek is busiest, about 32,000 hires on a July Wednesday, three times a December Sunday.',
  'All six lit: one route, raw data to insight. Colour sits at step 5, but step 3 decided it.'
];
const PIPELINE_NOTES = '2 min across seven clicks. Each click lights one stage and dims the rest; the last click lights them all.\n' +
  '1 Raw data: 366 lines, a date and a count. 2 Table: items in rows, attributes in columns. ' +
        '3 Types: Month and Day are ordinal and cyclic; Hires is quantitative. 4 The question decides the task: find the peak. ' +
        '5 The visualisation: a heatmap, and its colour is today’s subject. 6 The insight the reader leaves with.\n' +
        'SAY: "Last week we classified attributes as categorical, ordinal or quantitative. Today you’ll see why that matters: ' +
        'the attribute type decides which colour map you’re allowed to use. Hires is quantitative, so it gets a lightness ramp: darker means more."\n' +
        'Munzner’s nested model sits behind it: domain → abstraction → idiom → algorithm. Fix carried over: the 2025 deck spelt the name "Manzner".\n' +
        'Data: mean hires per day by month and weekday, 2024, from lessons/tfl-daily-cycle-hires.xlsx (TfL / London Datastore).';

/* ------------------------------------------------------------ the lesson */

const QUICK = { defaultTime: 0, scoreboard: false, scoreSlide: false, intro: false, howTo: false, confidence: false };
const GAMES = [
  { ref: 'popout-1', title: 'Quick · Where was the red dot?', style: 'choice', settings: QUICK,
    questions: [{ question: 'Which quarter was the red dot in?', options: ['A · top left', 'B · top right', 'C · bottom left', 'D · bottom right'], correct: 2, timeLimit: 10,
      explanation: 'Bottom left. Two seconds was plenty: one colour among grey pops out at a glance.' }] },
  { ref: 'popout-2', title: 'Quick · And this time?', style: 'choice', settings: QUICK,
    questions: [{ question: 'Which quarter was the red dot in?', options: ['A · top left', 'B · top right', 'C · bottom left', 'D · bottom right'], correct: 1, timeLimit: 10,
      explanation: 'Top right. With colour everywhere, two seconds was not enough: the red dot no longer pops out.' }] },
  { ref: 'opponent', title: 'Check · Picture it', style: 'choice', settings: QUICK,
    questions: [{ question: 'Which of these colours can you NOT picture?', options: ['A reddish yellow', 'A bluish red', 'A reddish green', 'A greenish blue'], correct: 2,
      explanation: 'Reddish yellow is orange, bluish red is purple, greenish blue is teal. Red and green are the two ends of one channel, so a reddish green can’t exist.' }] },
  { ref: 'classify', title: 'Quick-fire · Which family?', style: 'choice', settings: QUICK,
    questions: [
      { question: 'Quarterly company profit, including losses', options: ['Sequential', 'Diverging', 'Categorical'], correct: 1,
        explanation: 'Diverging, midpoint 0: profit one way, loss the other. If the company never lost money, sequential would do.' },
      { question: 'Customer satisfaction, rated 1–10', options: ['Sequential', 'Diverging', 'Categorical'], correct: 0,
        explanation: 'Sequential, unless 5 is a true neutral for the business. Then diverging. Ask what 5 means.' },
      { question: 'Brexit referendum by area: the share voting Leave', options: ['Sequential', 'Diverging', 'Categorical'], correct: 1,
        explanation: 'Diverging, midpoint 50%. Show only the winner (Remain or Leave) and it becomes categorical: same data, a different question.' },
      { question: 'Global temperature anomaly against the 1961–90 average', options: ['Sequential', 'Diverging', 'Categorical'], correct: 1,
        explanation: 'Diverging, midpoint at the baseline average: warmer one way, colder the other.' },
      { question: 'The best-selling smartphone brand in each country', options: ['Sequential', 'Diverging', 'Categorical'], correct: 2,
        explanation: 'Categorical: brands have no order. One brand’s share by country would be sequential.' }
    ] },
  { ref: 'order', title: 'Quick · Put them in order', style: 'order', settings: { ...QUICK, explainStyle: 'slide' },
    questions: [
      { question: 'Order these swatches from least to most.', options: HUE_ORDER.map(([l]) => l),
        image: asset('order-hue.svg'), imageAlt: 'Five coloured swatches lettered A to E: green, purple, red, blue, yellow', imageLayout: 'first',
        explanation: 'There is no perceptual answer. The order marked here is the rainbow, red to purple: a convention you learnt, not something you see.' },
      { question: 'Now order these from least to most.', options: LIGHT_ORDER.map(([l]) => l),
        image: asset('order-lightness.svg'), imageAlt: 'Five blue swatches of different lightness lettered A to E', imageLayout: 'first',
        explanation: 'Lightest to darkest: B, D, A, E, C. Darker reads as more, and almost everyone agrees.' }
    ] }
];



const FAMILY_NOTES = [
  'SEQUENTIAL, in depth. Low to high: lightness does the work and hue may shift a little. Rainfall, income, density. Then a real map to judge.',
  'DIVERGING, in depth. Two directions from a meaningful midpoint. SAY: "Is the midpoint meaningful? Zero, average and 50% are. The median of whatever you happened to collect usually isn’t." Then a survey chart and the warming stripes.',
  'CATEGORICAL, in depth. Distinct groups with no order: hue, equal status, at most 6–12. Then a bar chart to judge, two rules that disagree, and what mark size does.',
  '2 min. The overview. The jobs become three families: MEASURE becomes sequential, MEASURE FROM A MIDDLE becomes diverging, LABEL becomes categorical. ' +
    'Week 2 named them; now they have their reasons. We classify five datasets, then take each family in turn.\nSource: Brewer (1994); Harrower & Brewer (2003); Munzner Fig. 10.6.'
];

const SIX_NOTES = [
        '6 min: bird’s-eye, one zoom per type on real data, then bird’s-eye again.\nMONOCHROMATIC → MEASURE. One hue from light to dark: the TfL hires heatmap from slide 3. ' +
          'The safest sequential scale: lightness carries the order, nothing competes.',
        'ANALOGOUS → MEASURE. Neighbouring hues, yellow through green to blue, on the Case C ages. It works only because lightness climbs with it (this is ColorBrewer YlGnBu). ' +
          'Neighbouring hues at equal lightness would lose the order.',
        'COMPLEMENTARY → DIVERGE. Opposites meet at a middle: months where hires rose against 2023 in blue, fell in orange. ' +
          'Perfect for up/down, profit/loss, agree/disagree. But the painter’s classic complementary pair is red–green, the one pair 1 in 12 men can’t separate. Use blue–orange.',
        'SPLIT-COMPLEMENTARY → HIGHLIGHT. One hue leads (2024 in blue) and the two neighbours of its opposite stay pale (2022, 2023). ' +
          'The story is the blue line; the others are context. Remember: colour highlights only when it is scarce.',
        'TRIADIC → LABEL. Three evenly spaced hues for three equal, unrelated categories: weekday, Saturday and Sunday hires. ' +
          'Check they also differ in lightness so they survive greyscale and colour blindness: here red, gold and blue do.',
        'SQUARE → LABEL. Four evenly spaced hues for four categories: mean age by region. ' +
          'That is near the useful limit for small marks (Munzner: about six or seven hues for small, separate marks), so label the bars rather than rely on a legend.',
        'All six.\nSAY: "Harmony rules make palettes pleasing. They don’t make them readable. Pick the palette by the data’s job: ' +
          'measure with one hue or neighbours that climb in lightness, diverge with two opposites, label with evenly spaced hues, highlight with one hue against quiet ones."\n' +
          'Data: TfL daily cycle hires (London Datastore), lessons/tfl-daily-cycle-hires.xlsx; Eurostat 2022 as printed in Case C.'
];

const LESSON = {
  key: 'ipdv-col',
  title: 'LDSCI6253 Week 4 · The Power of Colour',
  theme: 'northeastern',
  org: 'Northeastern University London',
  logo: 'assets/brand/nu-london-logo.png',
  logoOn: 'all',
  logoSize: 'small',
  games: GAMES,
  slides: [
    /* ---------------------------------------------------- 0 · Opening */
    { type: 'title', title: 'The Power of Colour',
      subtitle: 'LDSCI6253 Advanced Information Presentation & Visualisation · Week 4',
      notes: 'Up as they arrive.\n' +
        'The question for the whole session: why does colour matter so much in data visualisation? ' +
        'By the end they should be able to answer it in their own words.' },

    { type: 'content', title: 'Before we start',
      bullets: [
        'Reading\tMunzner, Visualization Analysis and Design, Chapter 10: Map Color and Other Channels',
        'Worksheets\tOn Canvas by midday on the Friday after the lab',
        'Stuck?\tAsk early. Don’t wait until the last minute',
        'Balance\tPlan the week, not the night before'
      ],
      notes: '1 min. Week 2 promised "Week 4 is a whole lecture on colour". This is it.\n' +
        'READING. The 2025 deck listed Chapters 4 and 10. Chapter 4 is validation; Chapter 10 is the colour chapter. ' +
        'The course overview lists 10–12. Decide before teaching (plan §9, D1).' },

    /* Slide 3 builds one stage at a time: the stage being talked about is lit
       and the rest are dimmed, then every stage lights up together. Each state
       is its own slide; the ones after the first cut with no transition, so
       the room sees one picture changing. */
    ...PIPELINE_STEPS.map((step, i) => ({ type: 'image', title: 'From raw data to insight',
      subtitle: 'TfL daily cycle hires, 2024',
      image: asset(i < 6 ? `pipeline-${i + 1}.svg` : 'pipeline.svg'), imageFit: 'contain',
      design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: i ? step : PIPELINE_NOTES })),

    /* The bridge from Week 3: students knew the data types but not how they
       lead to a chart. Drawn, narrated and stitched by tools/video-which-chart/. */
    { type: 'video', title: 'Which chart? Think before you draw',
      subtitle: '5-minute explainer · Munzner’s What, Why, How on TfL 2024 data',
      video: asset('which-chart.mp4'), videoPoster: asset('which-chart-poster.jpg'), design: { capStyle: 'none' },
      notes: '5 min. WHY: slide 3 ends at "pick the chart", and students struggle to get from data types to a chart choice (pie or bar, line or scatter). ' +
        'WHAT: a 5-minute explainer in three signposts. WHAT: items, attributes and N, O, Q, and is it time? WHY: action plus target. HOW: the channel ranking, then expressive and effective. ' +
        'It then tests both questions on the Lab 1 TfL 2024 file. HOW: play it straight through; it ends on four new scenarios.\n' +
        'HANDS UP on the end card, then ask for the reason. 1 Week split (4 parts, sums to 100%): a pie can work, a 100% stacked bar compares better. ' +
        '2 Rent in eight boroughs: a sorted bar. 3 Temperature across October: a line, because days are a sequence. 4 Hours against mark: a scatter, because each dot is a pair of measures with no order.\n' +
        'Every bar and dot is plotted from the real file. Average hire time is the file’s mean per month.' },

    { type: 'content', title: 'By the end of today you can',
      bullets: [
        'Explain\thow your eyes turn light into colour, and why colour is always relative',
        'Distinguish\thue, lightness and saturation, and which suits which data',
        'Choose\ta sequential, diverging or categorical colour map, and justify it',
        'Critique\ta chart’s colour, including who it shuts out',
        'Build\tan accessible colour scale in Altair, and test it'
      ],
      progressive: true,
      notes: '1 min.\n' +
        'SAY: "Outcome 4 is what you’ll do in the next five minutes, badly, and in the last ten minutes, well."' },

    /* ---------------------------------------------------- 1 · Hook */
    { type: 'image', title: 'Case A · What is colour doing here?',
      subtitle: 'US ancestry by European country · ACS 2019',
      image: asset('case-a.svg'), imageFit: 'cover',
      body: 'Red, yellow, green and tan are political-map colours. They encode no data.\n' +
        'Red reads as danger or alarm, yet it is handed out at random.\n' +
        'The numbers do all the work; colour adds noise, and implies groups that aren’t there.\n' +
        'Raw counts, not normalised by population: not a colour problem, but a choropleth problem.',
      design: { capStyle: 'none' },
      feedback: { kind: 'wordcloud', prompt: 'One word: what is colour doing here?', options: [], max: 1 },
      notes: '2.5 min. ASK first, collect the cloud, then flip (⇄) for the points.\n' +
        'Expect "nothing", "decoration", "countries". The lesson: colour that means nothing still says something.\n' +
        'Source: 2025 Week 4 deck p6.' },

    { type: 'image', title: 'Case B · What is colour doing here?',
      subtitle: 'Most profitable markets, percentage of goods sold',
      image: asset('case-b.svg'), imageFit: 'cover',
      body: 'The sequential blue matches the blue sea: data and basemap share a hue.\n' +
        'The lightest classes melt into the pale land.\n' +
        'The legend labels only its ends, 12% and 31%.\n' +
        'Is a white country “no data” or “low”? The map can’t say.',
      design: { capStyle: 'none' },
      notes: '2.5 min. Hands up, then flip.\n' +
        'ASK: "Spain is white. Low profit, or no data?" Nobody can answer, which is the point.\n' +
        'Source: 2025 Week 4 deck p7.' },

    { type: 'image', title: 'Case C · What is colour doing here?',
      subtitle: 'When Europeans fly the nest · Eurostat 2022',
      image: asset('case-c.svg'), imageFit: 'cover',
      body: 'The data are ordered age bins; the colours are unordered rainbow hues.\n' +
        'Red (29–31) and purple (over 31) are hard to tell apart, and purple wraps back towards blue.\n' +
        'Bubble size and position mean nothing.\n' +
        '“Parantel” for parental: check the small things too.',
      design: { capStyle: 'none' },
      notes: '2 min.\n' +
        'ASK: "Which colour means oldest? How did you know?" They had to read the legend, because hue has no order.\n' +
        'Source: 2025 Week 4 deck p8.' },

    { type: 'image', title: 'Park them. We fix all three at the end.',
      subtitle: 'You could tell something was wrong before you could say why',
      image: asset('park-it.svg'), imageFit: 'cover',
      design: { capStyle: 'bar' },
      notes: '30 s.\n' +
        'SAY: "Notice that you could tell something was wrong before you could say why. ' +
        'Today is about building the vocabulary for the why." They come back in the last section.' },

    /* ---------------------------------------------------- 2 · Notice: colour finds things, and only when it is scarce */
    { type: 'section', title: 'What does colour do for your eye?', subtitle: 'Part 1 · Notice',
      notes: '20 s. Before any theory: three quick experiments on the room.' },

    { type: 'image', title: 'Name the danger',
      subtitle: 'Count to three',
      image: asset('tiger-panel-grey.svg'), imageFit: 'cover',
      design: { capStyle: 'bar' },
      notes: '45 s. Say nothing; count three in your head, then click.\n' +
        'SAY: "Primate colour vision is often argued to have evolved partly for spotting ripe fruit and things that stand out against foliage. ' +
        'Colour is a detection system before it is a decoration system."\n' +
        'Source: Mylonas, Week 4 Colour (LDSCI5209) p5, wildlifesos.org.' },

    { type: 'image', title: 'Colour finds it for you. Unless you are a deer',
      subtitle: 'With two cone types, a deer sees this orange as green · Fennell et al. (2019)',
      image: asset('tiger-panel-colour.svg'), imageFit: 'cover',
      design: { capStyle: 'bar' },
      notes: '45 s.\n' +
        'The deer: orange works as camouflage because deer are dichromats (Fennell et al., 2019, J. R. Soc. Interface). ' +
        'Plant it now; colour vision deficiency comes back in Section 3, where about 1 in 12 men in the room see a little like the deer.\n' +
        'Source: Mylonas, Week 4 Colour (LDSCI5209) p6, wildlifesos.org.' },

    { type: 'image', title: 'Predict: which one will be hardest to read?',
      subtitle: 'Name the fruits · Stockman & Brainard (2009)',
      image: asset('fruit-abc.svg'), imageFit: 'contain',
      body: 'A · Lightness only: you can see every shape and edge, but not which fruit is which.\n' +
        'B · Colour only: you know there are oranges and apples, but the edges are gone. Most people find B hardest.\n' +
        'C · Both: the full picture.',
      design: { capStyle: 'bar' },
      feedback: { kind: 'poll', prompt: 'Which one will be hardest to read?',
        options: ['A · Lightness only', 'B · Colour only', 'C · Both'], hold: true },
      notes: '1.5 min. Poll first, results held; then reveal the bars and flip (⇄).\n' +
        'Most predict A. The surprise is B: without lightness there are no edges.\n' +
        'Source: Mylonas, Week 4 Colour (LDSCI5209) p7–9, after Stockman & Brainard (2009).' },

    { type: 'image', title: 'Lightness shows where. Hue shows what.',
      subtitle: 'Remember this split: it becomes the rule for encoding data',
      image: asset('fruit-where-what.svg'), imageFit: 'cover',
      design: { capStyle: 'bar' },
      notes: '1 min.\n' +
        'SAY: "Lightness gives you shape and edges. Colour gives you identity. Remember this split, ' +
        'because it becomes the rule for encoding data: lightness for how much, hue for which one."' },

    { type: 'image', title: 'Can you find it in two seconds?',
      image: asset('popout-brief-1.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1 min. Read the three steps aloud and point at the quarters key. Phones out now, joined, before the flash.\n' +
        'SAY: "We’re testing whether colour lets your eye find something without searching. Two seconds isn’t long enough to search, ' +
        'so if you find it, colour did the work." Don’t say yet what changes in round 2.' },

    { type: 'image', title: 'Find the red dot',
      image: asset('popout-grey.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      notes: (INTERACTIVE ? '' : 'Click away after two seconds, then ASK: "Hands up: A? B? C? D?" Expect almost everyone on C.\n') +
        '2 s only. SAY: "You get two seconds. Find the red dot." Count two, then click on.\n' +
        'Flashing it, rather than leaving it up, is the point: if colour pops out, two seconds is plenty.' },

    { type: 'game', gameRef: 'popout-1',
      notes: '30 s. Ten seconds to answer from memory. Expect near-unanimous C.' },

    { type: 'image', title: 'Again. One thing changes',
      image: asset('popout-brief-2.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '20 s. SAY: "Same task, same two seconds. One thing changes. Ready?" Then click.' },

    { type: 'image', title: 'Find the red dot',
      image: asset('popout-mixed.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      notes: (INTERACTIVE ? '' : 'Click away after two seconds, then hands up again. Expect the room to split: the answer is B.\n') +
        '2 s only. SAY: "Same again. Two seconds." Then click on.' },

    { type: 'game', gameRef: 'popout-2',
      notes: '30 s. Expect the answers to scatter: there is an orange-red decoy, and colour is everywhere.' },

    { type: 'image', title: 'Colour only highlights when it is scarce',
      image: asset('popout-takeaway.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: (INTERACTIVE ? '1.5 min. Show the bars from both rounds first: round 1 near-unanimous, round 2 scattered.\n' : '1.5 min. Recall the two shows of hands: round 1 near-unanimous, round 2 scattered.\n') +
        'ROUND 1, POP-OUT. SAY: "Some features, colour among them, are processed in parallel across your whole field of view. ' +
        'One red dot among grey is found in about the same time however many dots there are. Two seconds is too short to search, ' +
        'so if you found it, colour did the work." (Treisman & Gelade, 1980; Munzner p109: one red item "immediately noticed from a sea of gray ones").\n' +
        'ROUND 2, WHY IT BROKE. SAY: "The red didn’t change. Its surroundings did. Red was now one colour among many, and one dot was an orange-red close to it. ' +
        'Pop-out depends on how different the target is from everything around it." This is similarity, not a harder target: ' +
        'search slows when distractors resemble the target and differ from each other (Duncan & Humphreys, 1989; Munzner p109–110: popout "is not an all-or-nothing phenomenon").\n' +
        'SO WHAT. SAY: "In a chart, give colour to the one thing you want seen first, and keep the rest grey. Colour everything and you highlight nothing." ' +
        'This sets up Start with grey and the Netflix chart later.' },

    { type: 'image', title: 'The brain vs colour',
      image: asset('brain-vs-colour.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. Why the red dot was so fast. SAY: "Your brain processes colour before you are conscious of looking: an odd colour is found in a fraction of a second, faster than reading. ' +
        'That is why colour is so powerful for highlighting key insights, and why it stops working when everything is coloured."\n' +
        'Fix carried over: the 2025 deck quoted "about 200 milliseconds, faster than reading" without a source. Pre-attentive features such as hue are detected in under about 200–250 ms (Healey & Enns, 2012; Treisman & Gelade, 1980).\n' +
        'Source: 2025 Week 4 deck p16 (brain diagram).' },

    /* ---------------------------------------------------- 3 · See: how light becomes three channels, and who loses one */
    { type: 'section', title: 'Where does colour come from?', subtitle: 'Part 2 · See',
      notes: '20 s. From light, to three cones, to three channels in the brain.' },

    ...[0, 1, 2].map(i => ({ type: 'image', title: 'From light to colour',
      image: asset(`light-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: [
        '3 min across three clicks.\nSAY: "Colour isn’t in the light. Light has wavelengths, and colour is what your brain builds from them." ' +
          'About 120 million rods (night vision, no colour) and about 6 million cones, packed into the fovea.\nSource: Mylonas p12–13.',
        'Three cone types, short, medium and long, each sensitive to its own overlapping band. ' +
          'Curve shapes are simplified; the peaks follow Stockman & Sharpe (2000), about 440, 540 and 565 nm.\nSource: Mylonas p14.',
        'SAY: "Light at 580 nm. L answers strongly, M a little less, S almost not at all. Those three numbers are all your brain gets, ' +
          'and it reads that mix as yellow. That is trichromacy. Your screen exploits it: three lights, red, green and blue, are enough to fake every colour."'
      ][i] })),

    { type: 'image', title: 'Three cones, three channels',
      image: asset('opponent.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min.\nSAY: "After the cones, the signal is recoded into three opponent channels: light–dark, red–green and blue–yellow. ' +
        'That is why you can’t imagine a reddish green. It is also why the perceptual opposites are red–green and blue–yellow, ' +
        'not the painter’s complementaries; we come back to that."\nLightness carries edges and detail; the two colour channels are coarser (Munzner p220).\n' +
        'Source: Mylonas p17, after Hering (1878/1964).' },

    { type: 'game', gameRef: 'opponent',
      notes: '1 min. Let them try to picture each one. Reddish-green is the one nobody can: the red–green channel can’t point both ways at once.' },

    { type: 'image', title: 'Colour vision deficiency', subtitle: 'The same parrots, four ways of seeing',
      image: asset('parrots-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'Deuteranomaly: the M cones are shifted, so reds and greens drift together. The most common form, about 5% of men.\n' +
        'Protanopia: no L cones. Red loses its brightness and turns dark olive.\n' +
        'Tritanopia: no S cones. Blue and yellow are the pair that goes. Rare.\n' +
        '-anomaly means a cone type is shifted; -opia means it is missing.',
      notes: '1 min. The world first, then the chart on the next slide.\n' +
        'SAY: "Same photograph, four eyes. Deuteranomaly: the M cones are shifted, so reds and greens drift together. ' +
        'Protanopia: no L cones, so red goes dark olive. Tritanopia: no S cones, so blue and yellow are the ones that go." ' +
        'Remember the deer and the tiger: this is what two cone types does.\n' +
        '-anomaly means a cone type is shifted; -opia means it is missing.\n' +
        'Source: 2025 Week 4 deck p15, credited there to The Sun (2017). Your plan suggests replacing that source: ' +
        'a Coblis (color-blindness.com) simulation of any photo does the same job with a better credit.' },

    { type: 'image', title: 'The same chart, four ways of seeing it',
      image: asset('cvd-grid.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      body: 'About 8% of men and 0.5% of women have a colour vision deficiency; rates are highest in people of Northern European descent (Munzner p235).\n' +
        'Most forms affect the red–green channel: deuteranomaly alone is about 5% of men.\n' +
        '-anomaly: a cone type is shifted. -opia: it is missing.\n' +
        'Confusions aren’t only red/green: also red/black, blue/purple, light green/white, brown/green (Munzner p235).',
      notes: '2.5 min. ASK: "In each panel, which line is North?" In the deuteranopia and protanopia panels North and South merge; in tritanopia, South and East close up.\n' +
        'SAY: "In a lecture hall of 60, expect two or three people to see your red/green chart as one colour, and never ask them to put a hand up."\n' +
        'Flip (⇄) for the numbers. Simulation: Machado, Oliveira & Fernandes (2009), severity 1, as in Week 3’s scales experiment.' },

    /* ---------------------------------------------------- 4 · Doubt: colour deceives */
    { type: 'section', title: 'Can you trust what you see?', subtitle: 'Part 3 · Doubt',
      notes: '20 s. The same colour can look different. Albers, then a heatmap, then your brain correcting the light.' },

    { type: 'quote', body: 'In order to use colour effectively it is necessary to recognise that it deceives continually.',
      subtitle: 'Josef Albers, Interaction of Color (1963)',
      notes: '20 s. SAY: "Albers spent a career showing that the same colour looks different depending on its neighbours."' },

    { type: 'image', title: 'Which inner square is lighter?',
      image: asset('albers.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Which inner square is lighter?', options: ['Left', 'Right', 'They are the same'], hold: true },
      notes: '1 min. Vote with the picture up, show the bars, then click on to the reveal. Most say Left.' },

    { type: 'image', title: 'One grey. The neighbours changed it',
      image: asset('albers-reveal.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'none',
      notes: '30 s. The bar of the same grey joins the two squares, and the difference disappears.\nSource: after Albers (1963) and Mylonas p21–22.' },

    { type: 'image', title: 'Which cell holds the higher value: P or Q?',
      image: asset('cells.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Which cell holds the higher value?', options: ['P', 'Q', 'They are the same'], hold: true },
      notes: '1.5 min. Vote with the picture up, then show the bars. P sits among dark cells and looks lighter; Q sits among light cells and looks darker. ' +
        'Few say "the same", which is the answer.' },

    { type: 'image', title: 'P and Q are both 50',
      image: asset('cells-reveal.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'none',
      notes: '1.5 min.\nSAY: "Your readers aren’t reading colour values. They’re reading colour relative to the neighbourhood. ' +
        'That is why colour is a weak channel for precise comparison, and why position beats colour in Munzner’s ranking."\n' +
        'Munzner p223: on a non-uniform background people tell apart fewer than five lightness steps. ' +
        'The fixes: print the value, use fewer steps, add a cell border. Makeover map B fails exactly here.' },

    { type: 'image', title: 'Colour constancy', subtitle: 'Cubes illusion, Vladusich (2021)',
      image: asset('cubes-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'One cube sits in yellow light, the other in blue.\nPick a tile on each that looks a different colour from the other. Are they?',
      notes: 'OPTIONAL, 1.5 min with the next slide.\nASK: "One cube sits in yellow light, the other in blue. Pick a tile on each that looks a different colour from the other. Are they?"\nSource: Mylonas p25.' },

    { type: 'image', title: 'The same colour: your brain discounted the light', subtitle: 'Cubes illusion, Vladusich (2021)',
      image: asset('cubes-reveal-full.svg'), imageFit: 'cover', design: { capStyle: 'none' }, transition: 'none',
      body: 'The joining bar shows the two tiles are the same colour.\n' +
        'Your brain estimates the light falling on each cube and discounts it: colour constancy.\n' +
        'In charts: shading, 3D lighting and tinted overlays change the colours people read.',
      notes: 'OPTIONAL.\nSAY: "Your brain tries to discount the lighting. Brilliant for survival, terrible for reading a heatmap under a shaded overlay." ' +
        'Remember the dress from Week 2: that was colour constancy disagreeing with itself. Shading on 3D charts does the same to data colours.\nSource: Mylonas p26.' },

    /* ---------------------------------------------------- 5 · Vocabulary: hue, lightness, saturation */
    { type: 'section', title: 'What is a colour made of?', subtitle: 'Part 4 · Vocabulary',
      notes: '20 s. Three dimensions, and the one that has no order.' },

    ...[0, 1, 2, 3].map(i => ({ type: 'image', title: 'Three dimensions of colour',
      image: asset(`hls-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: [
        '3 min across four clicks.\nHUE: which colour family. An identity channel: best for categories (Munzner p224).',
        'LIGHTNESS: how light or dark. A magnitude channel: best for ordered and quantitative data. People reliably order it.',
        'SATURATION: how vivid or grey. Also a magnitude channel, but weak: about three distinguishable steps (Munzner p223).',
        'All three.\nSAY: "This table is the whole lecture in miniature. Hue answers what kind. Lightness answers how much."'
      ][i] })),
    { type: 'image', title: 'Hue: the colour family',
      image: asset('hue-family-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'A different hue is a different family: use it for categories.\nDecreasing saturation keeps the family but greys it.\nA darker value keeps the family but deepens it: use that for order.',
      notes: '1 min. Your 2025 diagram of the three dimensions on one hue. SAY: "Hue says which family. Saturation and darkness stay inside the family, so they can say how much."\n' +
        'Source: 2025 Week 4 deck p19.' },

    { type: 'image', title: 'The painter’s wheel vs your eye',
      image: asset('wheel-vs-eye.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. The first of two colour models you already know that mislead you; HSL is next.\n' +
        'SAY: "The wheel on the left is the art-class model, built for mixing paint. On the right is what your eye does with full-strength hues: ' +
        'yellow nearly white, blue nearly black, and red and green on one channel." The painter’s complementary pair, red–green, is the pair 1 in 12 men can’t separate.\n' +
        'ASK: "If equal steps round the wheel looked equally different, would yellow and blue be this far apart in lightness?"\n' +
        'Harmonies (complementary, triadic…) come back in Build, as a tool for choosing hues within a colour map.\n' +
        'Fix carried over: the 2025 deck’s analogous example read "Blue-Blue-Green-Green"; it is blue, blue-green, green.\nSource: 2025 Week 4 deck p9.' },

    ...[0, 1].map(i => ({ type: 'image', title: 'Why HSL lies',
      image: asset(`hsl-lies-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: i ? 'The greyscale row is each colour’s CIE lightness. HSL says all six are 50%; your eye says yellow is 97 and blue is 32.\n' +
          'SAY: "This is exactly why a rainbow scale creates false bright bands around yellow and cyan." ASK: "If yellow sits in the middle of your scale, where will the eye think the peak is?"'
        : '2 min across two clicks. Every colour picker has an L slider; these six are all at 50%. ASK: "Are they equally light?" Then click to print them in greyscale.' })),
    ...(INTERACTIVE ? [] : [
      { type: 'image', title: 'Put these in order, least to most', image: asset('order-hue-slide.svg'), imageFit: 'contain', design: { capStyle: 'none' },
        notes: '1.5 min. Hands up, or call out: take three or four different orders from the room. Expect no agreement. ' +
          'The rainbow order (red, yellow, green, blue, purple: C, E, A, D, B) is a convention you learnt, not something you see.' },
      { type: 'image', title: 'Now these, least to most', image: asset('order-lightness-slide.svg'), imageFit: 'contain', design: { capStyle: 'none' },
        notes: '1.5 min. Lightest to darkest: B, D, A, E, C. Almost everyone agrees.\n' +
          'SAY: "Everyone agrees on the second ordering and nobody agrees on the first. That is the empirical case against rainbow scales for quantitative data." (Munzner p224, Figure 10.5.)' }
    ]),

    { type: 'game', gameRef: 'order',
      notes: '3 min. Hues first, then lightness. Show the reveal after each.\n' +
        'The hue round has no perceptual answer: the "correct" order set here is the rainbow, a learned convention. ' +
        'Expect the room to scatter on hue and agree on lightness.\n' +
        'SAY: "Everyone agrees on the second ordering and nobody agrees on the first. That is the empirical case against rainbow scales for quantitative data." ' +
        '(Munzner p224, Figure 10.5.)' }
,

    /* ---------------------------------------------------- 6 · Use: the jobs colour does */
    { type: 'section', title: 'What jobs can colour do in a chart?', subtitle: 'Part 5 · Use',
      notes: '20 s. Label, measure, highlight, mean; what happens when the jobs are swapped; then the three families of colour map the jobs become.' },
    ...[0, 1, 2, 3, 4].map(i => ({ type: 'image', title: 'Four jobs colour does in a chart',
      image: asset(`four-jobs-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: [
        '2 min across five clicks, one job lit per click. This is where the vocabulary pays off.\nLABEL: separate categories. Hue is an identity channel (the last section): different hues say different things, with equal status.',
        'MEASURE: show magnitude. Lightness is a magnitude channel: everyone ordered the greys, nobody agreed on the hues. So darker reads as more.',
        'HIGHLIGHT: direct attention. One colour against grey: remember the red dot, it only works when colour is scarce.',
        'MEAN: carry associations. Warming stripes: blue cold, red hot. Also danger, loss, brand. Meaning is learned, so it varies by audience.',
        'All four.\nSAY: "Most bad charts mix these jobs up. They use label colours to show measure data, as the fly-the-nest chart did."'
      ][i] })),
    { type: 'image', title: 'Start with grey',
      image: asset('grey-first-1.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2.5 min across three slides. ASK: "Six years of hires. What is the story?" Nobody can say: every line shouts.' },
    { type: 'image', title: 'Start with grey',
      image: asset('grey-first-2.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'none',
      notes: 'SAY: "Same chart, grey first, then colour for the one line with a story: 2020, when lockdown emptied March and April and hires jumped in May." ' +
        'This completes the Highlight job and pays off the red dot (slide 24): colour works when it is scarce.\nData: TfL daily cycle hires, monthly totals.' },
    { type: 'image', title: 'How newsrooms do it',
      image: asset('newsrooms.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1 min. SAY: "Professional newsrooms often build charts in grey first and add colour only where they want the eye to go. The Times keeps a limited palette with consistent meanings." ' +
        'ASK: "In the City Intelligence guidelines, what is grey for, and what is blue for?"\nSource: The Times (2021) and data.london.gov.uk City Intelligence guidelines, 2025 deck p18 and p24.' },

    { type: 'image', title: 'City Intelligence data design guidelines',
      image: asset('city-intelligence-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'Review the guidelines: colour scheme, text and layout.\nWhat is grey for? What is blue for?\nWhich colours carry the data, and which carry the context?\nHow do the same rules work on a light and a dark background?',
      notes: '3 min. The GLA’s own chart guidelines for London data. In pairs, review them for colour scheme, text and layout (the 2025 deck’s activity), then take answers.\n' +
        'Expected: grey for context and axes, one strong colour for the point, the same styling on light and dark grounds, and consistent titles and labels.\n' +
        'Source: data.london.gov.uk/blog/city-intelligence-data-design-guidelines, 2025 deck p24.' },

    { type: 'image', title: 'One dataset, two jobs',
      image: asset('jobs-example.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2.5 min. The data behind Case C, twelve countries. It has two things to show: a category (region) and a quantity (age leaving home).\n' +
        'LEFT, RIGHT CHANNEL. Label: four distinct hues, so four regions that are different and equal. Measure: one lightness ramp, so darker is older and Southern Europe jumps out without the legend.\n' +
        'RIGHT, CHANNELS SWAPPED. Label with shades of one hue and the regions look ranked: is Southern "more" than Nordic? ' +
        'Measure with rainbow hues and nobody can say whether orange is older than green without reading the legend. That second panel is exactly what Case C did.\n' +
        'ASK: "Cover the legends. Which panels still work?" The two left ones do: hue says which, lightness says how much.\n' +
        'Data: Eurostat 2022, average age young people leave the parental household, values as printed in Case C.' },

    /* ---------------------------------------------------- 6 · Map: which colour map for which data */
    { type: 'section', title: 'Which colour map for which data?', subtitle: 'Part 6 · Map',
      notes: '20 s. The jobs become three families. We see all three, then go through them one at a time with real charts.' },
    { type: 'image', title: 'Three families of colour map',
      image: asset('families-4.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: FAMILY_NOTES[3] },
    ...(INTERACTIVE ? [] : [{ type: 'image', title: 'Classify these: sequential, diverging or categorical?',
      image: asset('classify-1.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. Predict first: hands up for each card, S, D or C? Let satisfaction (2) and Brexit (3) split the room and take one reason from each side. ' +
        'Don’t reveal yet: we check these predictions after the three families.' }]),

    { type: 'game', gameRef: 'classify',
      notes: '4 min, five quick votes. Two are deliberately arguable (satisfaction, Brexit): let the bars split, then debate.\n' +
        'SAY at the end: "Notice that the answer depends on the task, not just the data. That is Munzner’s abstraction level at work."\n' +
        'Fix carried over: the 2025 deck labelled the Brexit example "diverging" without qualification.' },
    /* Sequential, in depth */
    { type: 'image', title: 'Three families of colour map',
      image: asset('families-1.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: FAMILY_NOTES[0] },

    { type: 'image', title: 'Sequential: agree or disagree?',
      image: asset('dw-us-map-full.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Datawrapper says the right-hand map is better. Agree?', options: ['Agree', 'Disagree'], hold: true },
      notes: '1.5 min.\nSAY: "On the left, a reader has to learn the legend: orange means low. On the right, darker means more, and nobody needs the legend to see the pattern. ' +
        'With a good sequential scale the legend is for precision; with a bad one it is needed just for meaning."\nSource: Datawrapper blog (Lisa Charlotte Muth), 2025 deck p31.' },

    { type: 'image', title: 'Same rain, two colour maps',
      image: asset('rainfall-pair.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. ASK: "Where is the heaviest rain?" On A the eye goes to the bright yellow band; on B to the darkest green. ' +
        'Then: "Which one could you read in greyscale?"\nSource: hellerweather.com, “Data visualization and the overused rainbow color table”, via Mylonas p39.' },

    ...[0, 1].map(i => ({ type: 'image', title: 'The rainbow debate',
      image: asset(`rainbow-debate-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : {}),
      notes: i ? 'Greyscale. Only viridis still runs dark to light. In jet, the busiest summer days and the quietest winter Sundays come out similar greys, because jet is dark at both ends.\n' +
          'ASK: "Weather presenters still use rainbows. Habit, or is there a task where a rainbow helps?" Possible answers: naming bands ("the red area"), reading exact values off a legend, familiarity.'
        : '3 min across two clicks. Real data: the TfL 2024 heatmap from slide 3 in three colour maps. The line under each is its CIE lightness from low to high.\n' +
          'AGAINST THE RAINBOW (jet): false boundaries at yellow and cyan, lightness up then down, and it fails for colour-blind readers (Borland & Taylor, 2007).\n' +
          'VIRIDIS (van der Walt & Smith, 2015): built in a perceptually uniform space; lightness climbs steadily, so it survives greyscale and colour blindness.\n' +
          'TURBO (Google, 2019): keeps the rainbow’s many nameable hues with smoother lightness, but is still dark at both ends, so not for order.' })),

    { type: 'image', title: 'Common mistakes: the rainbow',
      image: asset('cvd-wheels-full.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      body: 'The rainbow has no inherent order: hue is an identity channel.\nYellow looks brighter than blue even at the same value, so it makes false peaks.\nColour-blind readers lose whole bands of it.',
      notes: '1.5 min. The rainbow wheel as two colour-blind readers see it: whole bands merge.\n' +
        'SAY: "Rainbow has no inherent order; yellow looks brighter than blue at the same value; and colour-blind readers can’t separate parts of it." ' +
        'Three problems, three earlier lessons: the ordering test, why HSL lies, and the parrots.\nSource: 2025 Week 4 deck p17.' },

    { type: 'image', title: 'Binning changes the story',
      image: asset('binning.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '3 min. Same data, same colours, three different stories.\nEQUAL INTERVAL: Croatia sits alone in the darkest class and most countries look middling. ' +
        'QUANTILE: a fifth in each class, so small differences look as big as large ones. NATURAL BREAKS: classes follow the gaps in the data, so clusters stand out.\n' +
        'SAY: "The bins are an editorial decision." ASK: "Which version would a campaign about young people stuck at home choose? Which would a government choose?"\n' +
        'Altair: scale=alt.Scale(type=\'quantile\') or \'quantize\' (equal interval); natural breaks need thresholds computed first (type=\'threshold\').\nData: Eurostat 2022 as printed in Case C, EU-27 average left out.' },

    /* Diverging, in depth */
    { type: 'image', title: 'Three families of colour map',
      image: asset('families-2.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: FAMILY_NOTES[1] },

    { type: 'image', title: 'Diverging: agree or disagree?',
      image: asset('dw-likert-full.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Datawrapper says the right-hand chart is better. Agree?', options: ['Agree', 'Disagree'], hold: true },
      notes: '1.5 min.\nSAY: "Likert data is ordered and has a neutral middle: the textbook diverging case. In the not-ideal version, agree and disagree are similar teals ' +
        'that the eye groups together, which is semantically backwards."\nSource: Datawrapper blog, 2025 deck p32.' },

    { type: 'image', title: 'Warming stripes', subtitle: 'Ed Hawkins, #ShowYourStripes (2018)',
      image: asset('stripes.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Is this good data visualisation?', options: ['Yes', 'No', 'It depends'], hold: true },
      notes: '3 min. The UK, 1884–2025: one stripe per year. The 1961–2010 average is the boundary between blue and red, and the scale spans ±3 standard deviations of 1901–2000 temperatures (showyourstripes.info). A diverging scale with no axes, no numbers and no legend, shared millions of times.\n' +
        'ASK: "Is this good data visualisation? What does it gain by removing everything? What does it lose?" Then: "Would it work with a rainbow scale?"\n' +
        'It pits communication against precision. Blue to red works because the midpoint (the average) is meaningful and lightness is symmetrical.\n' +
        'Image: Ed Hawkins, University of Reading, showyourstripes.info, CC BY 4.0. UK data: Met Office (HadUK).' },

    /* Categorical, in depth */
    { type: 'image', title: 'Three families of colour map',
      image: asset('families-3.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: FAMILY_NOTES[2] },

    { type: 'image', title: 'Categorical: agree or disagree?',
      image: asset('dw-bars-full.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      feedback: { kind: 'poll', prompt: 'Datawrapper says the right-hand chart is better. Agree?', options: ['Agree', 'Disagree'], hold: true },
      notes: '1.5 min.\nSAY: "Shades of one blue imply an order that doesn’t exist. Is Egypt less than Pakistan? Different hues say different things, equal status." ' +
        'Same lesson as One dataset, two jobs.\nSource: Datawrapper blog, 2025 deck p30. The two treemap pairs (p33–34) are optional extras.' },

    ...[0, 1].map(i => ({ type: 'image', title: 'Two respected rules. Which is right?',
      image: asset(`cat-rules-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i ? { transition: 'none' } : { feedback: { kind: 'poll', prompt: 'Which rule is right?', options: ['Rule A', 'Rule B', 'Both, it depends'], hold: true } }),
      notes: i ? 'The greyscale row settles part of it: Rule A’s six colours are one grey; Rule B’s stay apart.\n' +
          'RESOLUTION: it is a trade-off. Rule A protects equal salience; Rule B protects discriminability, especially for colour-blind readers, greyscale printing and small marks. ' +
          'In practice: vary lightness modestly and use direct labels.\nBonus: the 2025 deck’s "nominal" example swatches don’t actually have constant lightness either.'
        : '2.5 min. Both rules appear in respected sources, and your own 2025 deck states both (p35 and p36). Vote first, then click to print both palettes in greyscale.\n' +
          'Rule A palette: CIE L* 68 for all six. Rule B: L* from 35 to 88.' })),

    { type: 'image', title: 'Size changes everything',
      image: asset('size-changes.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. ASK: "In each row, can you still count five colours?"\n' +
        'SAY: "Colours that are distinct as large areas merge as small marks. The colour difference needed to tell two apart grows as marks shrink (Szafir, 2018). ' +
        'The rule of thumb: muted colours for big areas, saturated colours for small marks." The last row is the fix.\n' +
        'Munzner p224: use bright, saturated colours for small regions and pastels for large backgrounds. This is why the label job has a limit.' },

    { type: 'image', title: 'How many colours can people tell apart?',
      image: asset('how-many.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2.5 min. Real data: TfL monthly hires, one line per year. ASK: "On the left, which line is 2020?" Nobody can say without hunting through the legend.\n' +
        'SAY: "Roughly 6–12 distinguishable categorical colours, including background and default colours, and fewer for small marks (Munzner, Ch. 10). ' +
        'You will sometimes hear the 7-colour rule, borrowed from Miller’s 7±2. That was about memory, not colour."\n' +
        'With 15 categories: group them, highlight two or three and grey the rest, use small multiples, or label directly. The right panel does the second and the last.\n' +
        'Fix carried over: the 2025 deck’s 7-colour slide had the speaker note "Explain that…" left on it.' },

    ...[1, 2].map(i => ({ type: 'image', title: 'Treemaps: is colour even needed?',
      image: asset(`treemap-${i}-full.svg`), imageFit: 'contain', design: { capStyle: 'none' },
      ...(i === 2 ? { transition: 'none' } : {}),
      notes: i === 1 ? 'OPTIONAL, 2 min with the next. SAY: "The better version maps darkness to size: redundant encoding. It reinforces the message, but it spends a channel." ' +
          'ASK: "Could colour encode something else, such as growth rate? When is redundancy a virtue, and when is it waste?"\nSource: Datawrapper blog, 2025 deck p33.'
        : 'OPTIONAL. The second pair: the same question.\nSource: Datawrapper blog, 2025 deck p34.' })),
    { type: 'image', title: 'Three families of colour map · summary',
      image: asset('families-4.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: 'All three again.\nSAY: "The question isn’t which looks nicer. It’s what the data’s structure says: low to high, two ways from a middle, or different with no order." Next: the palette types designers use, judged by these jobs.' },
    ...(INTERACTIVE ? [] : [{ type: 'image', title: 'Classify these: the answers',
      image: asset('classify-2.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. Back to the predictions from the start of this part. Each answer, and why two are debatable.\n' +
        'SAY: "Notice that the answer depends on the task, not just the data. That is Munzner’s abstraction level at work."\n' +
        'Fix carried over: the 2025 deck labelled the Brexit example "diverging" without qualification.' }]),


    /* ---------------------------------------------------- 7 · Mean: what colour says */
    { type: 'section', title: 'What does colour say?', subtitle: 'Part 7 · Mean',
      notes: '20 s. Colour carries meaning before anyone reads a label: matched to concepts, light or dark, cultural, branded.' },

    { type: 'image', title: 'Psychological impact',
      image: asset('psych-impact.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. SAY: "Warm and cool colours sit on opposite sides of the wheel. Warm colours read as energy, urgency and attention; cool colours as calm, trust and professionalism. ' +
        'Brands lean on this: look at which sectors pick blue." Then add the caution that the next slides develop: these are associations, not laws.\n' +
        'Source: 2025 Week 4 deck p13 and p25.' },

    { type: 'image', title: 'Warm or cool: does colour change the message?',
      image: asset('warm-cool-example.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. Our own example after the infographic. Real data, TfL 2024 monthly hires, drawn twice. ASK: "Which one looks like a problem?" Most say the red one, though the numbers are identical.\n' +
        'SAY: "Warm colours pull attention and read as urgency; cool colours read as calm. Neither is wrong, but the colour is making a claim the data doesn’t."' },

    { type: 'image', title: 'Colours by culture',
      image: asset('colours-by-culture-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'Colour meanings aren’t universal.\nRed means danger in many Western contexts, and luck and prosperity in China.\nFor a global audience, research your colour choices, and let labels fix the meaning.',
      notes: '1.5 min. SAY: "Colour meanings aren’t universal. Red means luck and prosperity in China but danger in Western contexts. If you’re creating visualisations for global audiences, research your colour choices."\n' +
        'This popular chart is a starting point, not evidence: it generalises whole regions. The next slide is about how much of this research supports.\nSource: 2025 Week 4 deck p26.' },

    { type: 'image', title: 'Same map, two audiences',
      image: asset('two-audiences.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. An illustrative seat map, the same picture for two audiences. SAY: "In London, red is Labour, the left. In Washington, red is the Republicans, the right. Same map, opposite story."\n' +
        'ASK: "What does your chart need so nobody reads it backwards?" A legend or direct labels that say what each colour means. The seat counts are invented; the conventions are real.' },

    { type: 'image', title: 'Culture changes the reading',
      image: asset('market-colours.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. SAY: "Same data, opposite colours. A Chinese investor reading a Western chart, or the reverse, may get the story backwards. This is the strongest data-vis example of cultural colour meaning."\n' +
        'Also: red is Labour in London and Republican in Washington. The price series is illustrative.' },

    { type: 'image', title: 'Colour psychology: handle with care',
      image: asset('psychology-full.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      body: 'These associations are popular claims, rarely cited.\nAcross about 30 nations, colour–emotion links are broadly shared but shaped by language and place (Jonauskaite et al., 2020).\nTreat them as hypotheses to test with your audience, and let context fix the meaning.',
      notes: '2 min. Labelled POPULAR CLAIMS on purpose.\nSAY: "Infographics like this are everywhere and rarely cite evidence. A large study across about 30 nations (Jonauskaite et al., 2020) found colour–emotion associations are broadly shared, ' +
        'red with love and anger for example, but also shaped by language and geography. So they are neither universal laws nor purely cultural: treat them as hypotheses to test with your audience."\n' +
        'ASK: "Red means danger and love in Western culture. How does a reader know which you mean?" Context.\nSource: geeksforgeeks.org via the 2025 deck p27.' },

    { type: 'image', title: 'Colour adds a judgement',
      image: asset('judgement-example.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. Real data: TfL monthly hires against 2023. ASK: "In the left chart, which months went badly?" February and September look like failures, but a fall in bike hires isn’t a failure unless your story says so.\n' +
        'SAY: "Traffic-light colours add a verdict. A neutral pair like blue and orange says only up and down. Save alarm colours for data that is alarming." ' +
        'It also fixes red–green for colour-blind readers.' },

    { type: 'image', title: 'Use the colour the concept already has',
      image: asset('semantic.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. SAY: "Readers interpret charts faster when colours match concepts (Lin et al., 2013). Use meaning when it exists, and don’t fight it."\n' +
        'ASK: "What’s the natural colour for the Liberal Democrats? For temperature? For profit?"\nThe fruit numbers are illustrative: the point is the colour.' },

    { type: 'image', title: 'Darker means more… usually',
      image: asset('dark-is-more.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. Same TfL heatmap, same scale, two backgrounds. ASK: "Which months were busiest?" On white, almost everyone points at the dark summer cells. On black, some will point at the light cells.\n' +
        'SAY: "People tend to read darker as more, the dark-is-more bias, but on dark backgrounds the expectation can flip (Schloss et al., 2019). The right direction depends on your background."' },

    { type: 'image', title: 'House palettes: two philosophies',
      image: asset('brand-wheels.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min. SAY: "The NYT has a huge flexible palette that covers every use case. The FT and The Economist use very few hues, with shades of each. Fewer hues means a recognisable brand, but harder categorical charts."\n' +
        'ASK: "If you designed for the FT, how would you show seven political parties?" (Shades of a few hues, labels, or position rather than colour.)\nSource: Datawrapper blog, “Colors for data vis style guides”, 2025 deck p20–21.' },

    { type: 'image', title: 'Brand colour in action',
      image: asset('netflix-pair.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. SAY: "In the line chart, brand colour does the storytelling: the black and red lines are the story and everything else recedes. In the Statista chart, light versus dark orange encodes 2016 versus 2017, a small ordered use of lightness."\n' +
        'Fix carried over: the 2025 deck had stray text about sequential schemes on this slide.\nSource: 2025 deck p22–23 (Statista).' },

    /* ---------------------------------------------------- 8 · Check: accessibility */
    { type: 'section', title: 'Who can’t read your chart?', subtitle: 'Part 8 · Check',
      notes: '20 s. Accessibility, opened by the colour vision deficiency chart from Part 2.' },
    { type: 'image', title: 'Who can’t read your chart?',
      image: asset('cvd-grid.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1 min. The chart from Part 2 again. ASK: "Now you know the jobs and the colour maps: what would you change so every panel works?" ' +
        'Different lightness, direct labels, and no red–green pair. The next slides turn that into rules and tests.' },
    { type: 'image', title: 'Don’t rely on colour alone',
      image: asset('colour-alone-1.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '2 min across two clicks. Weekdays against Sundays in red and green, with only a legend. The inset is the same chart as a deuteranope sees it: two near-identical lines.\n' +
        'WCAG 2.x: 1.4.1 Use of Color (colour must not be the only way information is conveyed); 1.4.11 Non-text Contrast (graphical objects 3:1 against neighbours); 1.4.3 Contrast (text 4.5:1).' },
    { type: 'image', title: 'Don’t rely on colour alone',
      image: asset('colour-alone-2.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'none',
      notes: 'The fix: dark solid against light dashed, labelled at the end of each line. It now works in greyscale, for colour-blind readers, and without a legend.' },
    { type: 'image', title: 'Redundant encoding toolkit',
      image: asset('redundant.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. Four ways to say it twice: direct labels, line style or shape, lightness differences, annotation.\n' +
        'SAY: "Every one of these also helps readers with perfect colour vision. Accessible design is usually just better design."' },
    { type: 'image', title: 'The two tests',
      image: asset('two-tests.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. GREYSCALE: desaturate it; does it still work? COLOUR BLINDNESS: in Chrome DevTools open Rendering → Emulate vision deficiencies, or use Coblis.\n' +
        'SAY: "This room’s projector is a third test. The pale end of your sequential scale may have just vanished."' },

    /* ---------------------------------------------------- 9 · Build: tools, harmonies, Altair */
    { type: 'section', title: 'How do you build it?', subtitle: 'Part 9 · Build',
      notes: '20 s. Tools, harmonies as a way to pick hues within a colour map, and Altair.' },
    { type: 'image', title: 'Tools, matched to the job',
      image: asset('tools.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '5 min with the activity. ColorBrewer for maps (with colour-blind and print filters); Colorgorical for categorical palettes; chroma.js for custom ramps with lightness correction and a CVD check; ' +
        'Adobe Color for harmonies and its accessibility tab; the Stanford colour-name analyser to check categories have distinct names.\n' +
        'The hands-on comes after the palette types: the Palette lab uses ColorBrewer, Adobe Color and chroma.js.\n' +
        'Check: Colorgorical appears at vrl.cs.brown.edu/color and vrl-v2.cs.brown.edu/color; confirm which resolves.\nSource: 2025 deck p37–40; Mylonas p41–43.' },
    { type: 'image', title: 'Six palette types', subtitle: 'Figma resource library',
      image: asset('palette-types-full.svg'), imageFit: 'cover', design: { capStyle: 'none' },
      body: 'Complementary: opposite hues. Strong contrast.\nAnalogous: neighbouring hues. Calm, close together.\nMonochromatic: one hue, lighter and darker.\n' +
        'Split: one hue and the two neighbours of its opposite.\nTriadic: three evenly spaced hues.\nSquare: four evenly spaced hues.\n' +
        'All six are defined on the painter’s wheel. The next slides test each on data.',
      notes: '1 min. The six harmonies designers learn: monochromatic, analogous, complementary, split-complementary, triadic, square. ' +
        'They are defined on the painter’s colour wheel and they make palettes pleasing. The question for us is what each one is for when the colours carry data.\n' +
        'Source: 2025 Week 4 deck p10, figma.com/resource-library/types-of-color-palettes.' },
    /* Bird's-eye, then one zoom per type (the panel alone, filling the
       screen), then bird's-eye again for the summary. */
    { type: 'image', title: 'Six palette types, six data jobs',
      image: asset('six-palettes.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: SIX_NOTES[0].split('\n')[0] + '\nBIRD’S-EYE first: let the room scan all six for ten seconds. ASK: "Which of these would you use to show a profit and loss?" Then zoom into each.' },
    /* (opt) the six zooms */
    ...[0, 1, 2, 3, 4, 5].map(i => ({ type: 'image', title: `Six palette types · ${['Monochromatic', 'Analogous', 'Complementary', 'Split-complementary', 'Triadic', 'Square'][i]}`,
      image: asset(`six-palettes-zoom-${i + 1}.svg`), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: i ? SIX_NOTES[i] : SIX_NOTES[0].split('\n').slice(1).join('\n') })),
    { type: 'image', title: 'Six palette types, six data jobs · summary',
      image: asset('six-palettes.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'zoom',
      notes: SIX_NOTES[6] },
    { type: 'image', title: 'Palette lab: pick it, harmonise it, test it',
      image: asset('palette-lab.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1 min to brief, 8 min of work. Pairs, laptops or phones. Point at the three URLs.\n' +
        'Built from the 2025 deck’s own activities: ColorBrewer 2.0 (p37), Adobe Color with a student account (p39) and the chroma.js palette helper (p40).\n' +
        'Adobe hint from the 2025 deck: complementary colours give strong contrast but can vibrate or clash; analogous feel harmonious but may lack contrast; triadic balance the two.' },

    { type: 'image', title: 'Palette lab: your dataset',
      image: asset('palette-lab-datasets.svg'), imageFit: 'contain', design: { capStyle: 'none' }, timeLimit: 480,
      notes: '8 min on the clock. Number pairs off 1–5 around the room. Circulate: check each pair has written its family down before opening ColorBrewer.\n' +
        'Expected: 1 diverging (e.g. RdBu, PuOr), 2 sequential or diverging (Blues, or PuOr if 5 is neutral), 3 diverging around 50%, 4 diverging (RdBu reversed: blue cold, red warm), 5 categorical (Set2, Dark2; check lightness varies).' },

    { type: 'image', title: 'Palette lab: share',
      image: asset('palette-lab-share.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '3 min. Two or three pairs share screens and read the sentence. Pick at least one pair whose palette failed the test: the failure is the best teaching moment.\n' +
        'They keep the hex codes for the Lab 4 house palette.' },

    { type: 'image', title: 'Colour in Altair',
      image: asset('altair.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '3 min. SAY: "The data type suffix, :Q, :O or :N, makes Altair pick sensible default scales. That is attribute typing from last week, paying off." ' +
        '"domainMid is how you guarantee a diverging midpoint sits where it should." Natural breaks need thresholds computed first (type=\'threshold\').\nLab 4 uses all five.' },

    /* ---------------------------------------------------- 10 · Fix: the cases, the checklist, the close */
    { type: 'section', title: 'Can you fix it?', subtitle: 'Part 10 · Fix',
      notes: '20 s. Back to the three parked cases, then the checklist and the close.' },
    { type: 'image', title: 'Fix the opening maps',
      image: asset('fix-cases-1.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '6 min. Back to the three parked cases. Groups take one case each and answer three questions: data type and task; colour-map family and why; one accessibility improvement.' },
    { type: 'image', title: 'Fix the opening maps: our answers',
      image: asset('fix-cases-2.svg'), imageFit: 'contain', design: { capStyle: 'none' }, transition: 'none',
      notes: '3 min. CASE A: normalise by population, then a single-hue sequential scale, or drop colour and keep the labels. ' +
        'CASE B: make the sea neutral grey, give the data a hue unlike the basemap, label every bin, say what white means. ' +
        'CASE C: a sequential scale for the age bins, or abandon colour and sort the countries as a bar chart. Sorting is the strongest fix.' },
    { type: 'image', title: 'Colour checklist',
      image: asset('checklist.svg'), imageFit: 'contain', design: { capStyle: 'none' },
      notes: '1.5 min. The take-away: eight questions, each tied to the part of today that taught it. It is also the Lab 4 rubric.' },
    /* (opt) the video, or set it as homework */
    { type: 'video', title: 'The power of colour', subtitle: 'Unlocking the Secrets of Color in Data Visualization · YouTube',
      video: 'https://www.youtube.com/watch?v=GwzGsaVWJEE', design: { capStyle: 'none' },
      notes: 'Plays in the show (youtube-nocookie, no related videos at the end). Check the length before class and set a start or end if you only want a clip.\n' +
        'OPTIONAL, or set as homework: a practitioner’s recap of the whole lecture.\n' +
        'ASK afterwards: "Which of the four jobs does the video use colour for most?"\n' +
        'Video: "Unlocking the Secrets of Color in Data Visualization: Make Your Visuals Stand Out" (thumbnail: "Pro Tips for Color in Data Visualization!"). ' +
        'Source: 2025 Week 4 deck p14, https://www.youtube.com/watch?v=GwzGsaVWJEE' },

    { type: 'quote', body: 'Colour is the place where our brain and the universe meet.',
      subtitle: 'Paul Klee',
      notes: '20 s. SAY: "Your job is to make sure your reader’s brain meets your data, not your palette."' },

    { type: 'statement', title: 'Questions?',
      notes: 'Q&A.' },

    { type: 'content', title: 'Next: Lab 4 · Colour in Altair',
      bullets: [
        'Recolour\tthe three cases from today, in Altair',
        'Test\teach one in greyscale and a colour-blindness simulator, and screenshot it',
        'House palette\tone accent, one neutral, one sequential, one diverging, up to six categorical colours',
        'Rubric\tthe colour checklist'
      ],
      notes: 'Fix carried over: the 2025 deck said "Next Lesson: Lab 1"; this is Lab 4. Worksheets on Canvas by midday on the Friday after the lab.' },
  ]
};

/* ------------------------------------------------------------ build */

function buildGames(spec, deck) {
  const byRef = {};
  for (const g of spec.games) {
    const game = SF.makeGame(g.title, g.style);
    game.id = `ipdv-col-${g.ref}`;
    game.theme = deck.theme;
    game.libraryGroup = 'nul';
    game.sourceDeckId = deck.id;
    Object.assign(game.settings, g.settings || {});
    game.questions = g.questions.map(q => SF.normalizeQuestion(Object.assign(SF.makeQuestion(g.style), q), g.style));
    byRef[g.ref] = SF.normalizeGame(game);
  }
  return byRef;
}

function buildDeck(spec) {
  const deck = SF.makeDeck(spec.title);
  Object.assign(deck, {
    id: 'ipdv-col-2026', theme: spec.theme, libraryGroup: 'nul', sourceKey: spec.key,
    org: spec.org, logo: spec.logo, logoOn: spec.logoOn, logoSize: spec.logoSize, aspect: '16:9'
  });
  const games = INTERACTIVE ? buildGames(spec, deck) : {};
  const authored = INTERACTIVE ? spec.slides
    : spec.slides.filter(s => s.type !== 'game').map(s => { const { feedback, ...rest } = s; return rest; });
  deck.slides = authored.map((s, i) => {
    const slide = Object.assign(SF.makeSlide(s.type), { id: `ipdv-col-${String(i + 1).padStart(2, '0')}` }, s);
    if (s.gameRef) {
      const game = games[s.gameRef];
      if (!game) throw new Error(`slide ${i + 1}: no game "${s.gameRef}"`);
      Object.assign(slide, { gameId: game.id, gameTitle: game.title, title: game.title });
      delete slide.gameRef;
    }
    return slide;
  });
  return { deck: SF.normalizeDeck(deck), games: Object.values(games), authored };
}

function embed(value) {
  if (Array.isArray(value)) return value.map(embed);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, embed(v)]));
  if (typeof value === 'string' && /^assets\/.*\.(png|jpe?g|gif|svg|webp)$/i.test(value)) return dataUri(value);
  return value;
}

function check(spec, deck) {
  if (deck.theme !== spec.theme) throw new Error(`theme became ${deck.theme}`);
  if (deck.slides.length !== spec.slides.length) throw new Error('SlideForge did not keep every slide');
  spec.slides.forEach((source, i) => {
    const out = deck.slides[i];
    const where = `slide ${i + 1} (${source.type})`;
    if (out.type !== source.type) throw new Error(`${where} became ${out.type}`);
    if ((source.bullets || []).length !== (out.bullets || []).length) throw new Error(`${where} lost bullets`);
    if ((source.layers || []).length !== (out.layers || []).length) throw new Error(`${where} lost pictures`);
    if (!!source.feedback !== !!out.feedback) throw new Error(`${where} lost its feedback`);
    if (source.body && out.body !== source.body) throw new Error(`${where} changed its body`);
    if (source.gameRef && !out.gameId) throw new Error(`${where} lost its game`);
    if (source.transition && out.transition !== source.transition) throw new Error(`${where} lost its transition`);
    const pictures = [source.image, ...(source.layers || []).map(l => l.image)].filter(Boolean);
    for (const p of pictures) if (!fs.existsSync(path.join(root, p))) throw new Error(`${where}: missing ${p}`);
  });
}

drawPictures();
const { deck, games, authored } = buildDeck(LESSON);
check({ ...LESSON, slides: authored }, deck);
for (const g of games) for (const q of g.questions) if (q.image && !fs.existsSync(path.join(root, q.image))) throw new Error(`${g.title}: missing ${q.image}`);
const bundle = { kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(deck)], games: games.map(embed) };
const file = path.join(root, 'lessons/04_Lecture_IPDV_Colour.sfbundle.json');
fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + '\n');
/* The student copy: the same deck with the room-only and in-between slides
   hidden, so a handout or export has one slide per idea. A build keeps only
   its final state, a question keeps only its reveal, and repeats, briefings
   and optional slides drop out. Hidden rather than removed, so any of them
   can be shown again in SlideForge. The lecture bundle is untouched. */
const STUDENT_RULES = [
  // builds: keep only the last state
  ['From raw data to insight', 'last'], ['Four jobs colour does in a chart', 'last'], ['From light to colour', 'last'],
  ['Three dimensions of colour', 'last'], ['Why HSL lies', 'last'], ['Two respected rules. Which is right?', 'last'],
  ['Start with grey', 'last'], ['Don’t rely on colour alone', 'last'],
  // the families: keep the first (overview); openers and summary repeat it
  ['Three families of colour map', 'first'], ['Three families of colour map · summary', 'none'],
  // questions whose reveal follows
  ['Classify these: sequential, diverging or categorical?', 'none'], ['Which inner square is lighter?', 'none'],
  ['Which cell holds the higher value: P or Q?', 'none'], ['Colour constancy', 'none'], ['Predict: which one will be hardest to read?', 'none'],
  ['Name the danger', 'none'], ['Fix the opening maps', 'none'],
  // run in the room
  ['Can you find it in two seconds?', 'none'], ['Find the red dot', 'none'], ['Again. One thing changes', 'none'],
  ['Put these in order, least to most', 'none'], ['Now these, least to most', 'none'],
  ['Palette lab: your dataset', 'none'], ['Palette lab: share', 'none'], ['Questions?', 'none'],
  // repeats and optional extras
  ['Six palette types, six data jobs · summary', 'none'], ['Treemaps: is colour even needed?', 'none'],
  ['Park them. We fix all three at the end.', 'none'], ['Common mistakes: the rainbow', 'none']
];
function studentCopy(deck) {
  const copy = JSON.parse(JSON.stringify(deck));
  copy.id = 'ipdv-col-2026-student';
  copy.title = deck.title + ' (student copy)';
  const seen = {}, total = {};
  copy.slides.forEach(sl => { total[sl.title] = (total[sl.title] || 0) + 1; });
  copy.slides.forEach(sl => {
    const n = (seen[sl.title] = (seen[sl.title] || 0) + 1);
    const rule = (STUDENT_RULES.find(([t]) => t === sl.title) || [])[1];
    let hide = rule === 'none' || (rule === 'last' && n < total[sl.title]) || (rule === 'first' && n > 1);
    if (/^Six palette types · /.test(sl.title || '')) hide = true;            // the six zooms
    if (sl.type === 'image' && sl.title === 'Who can’t read your chart?') hide = true; // the chart, shown again
    if (hide) sl.hidden = true;
  });
  return copy;
}
const student = studentCopy(deck);
const studentFile = path.join(root, 'lessons/04_Lecture_IPDV_Colour_STUDENT.sfbundle.json');
fs.writeFileSync(studentFile, JSON.stringify({ kind: 'slideforge-bundle', version: 1, exported: new Date().toISOString(), decks: [embed(student)], games: [] }, null, 2) + '\n');
const shown = student.slides.filter(sl => !sl.hidden).length;
console.log(`student copy: ${shown} of ${student.slides.length} slides shown (${Math.round(100 * (1 - shown / student.slides.length))}% fewer) · ${path.relative(root, studentFile)}`);

/* Built in: js/lessons-ipdv-week4.js puts both lessons in SlideForge's own
   lesson list and library seeds, so every browser on the deployed site has
   them in the Northeastern folder with nothing to import. Slides point at
   the served pictures (assets/lesson/ipdv/week4/), not data URIs. The keys
   differ from the bundles' sourceKey, so a browser holding an imported copy
   still gets the built-in ones. */
function builtInLessons() {
  const hidden = new Set(student.slides.map((sl, i) => (sl.hidden ? i : -1)).filter(i => i >= 0));
  const base = {
    theme: LESSON.theme, org: LESSON.org, logo: LESSON.logo, logoOn: LESSON.logoOn, logoSize: LESSON.logoSize,
    libraryGroup: 'nul', kind: 'lecture', minutes: 90, icon: '◐', games: []
  };
  const lecture = { ...base, key: 'ipdv-col-w4', title: LESSON.title,
    blurb: 'A journey from noticing colour to choosing it: perception, deception, the vocabulary of hue and lightness, the jobs colour does, colour maps, meaning, accessibility and tools, ending by fixing three broken charts. Real TfL and Eurostat data throughout.',
    slides: authored };
  const studentLesson = { ...base, key: 'ipdv-col-w4-student', title: LESSON.title + ' (student copy)',
    blurb: 'The Week 4 lecture with the in-room steps hidden: one slide per idea, about 40% fewer, for handouts and revision.',
    slides: authored.map((sl, i) => (hidden.has(i) ? { ...sl, hidden: true } : sl)) };
  return [lecture, studentLesson];
}
const builtInFile = path.join(root, 'js/lessons-ipdv-week4.js');
fs.writeFileSync(builtInFile, `/* Generated by tools/build-ipdv-week4.js: do not edit by hand, rebuild instead.
   LDSCI6253 Week 4 · The Power of Colour, built into SlideForge's lesson list and
   seeded into the Northeastern folder of every browser's Library. Loaded after
   js/lessons.js, whose LESSONS and LIBRARY_SEED_KEYS it extends. */
(function (root) {
  'use strict';
  var SF = root.SF;
  if (!SF || !SF.LESSONS || !SF.LIBRARY_SEED_KEYS) return;
  var lessons = ${JSON.stringify(builtInLessons())};
  lessons.forEach(function (lesson) {
    if (!SF.LESSONS.some(function (l) { return l.key === lesson.key; })) SF.LESSONS.push(lesson);
    SF.LIBRARY_SEED_KEYS[lesson.key] = 'nul';
  });
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log(`built in: ${path.relative(root, builtInFile)} (${Math.round(fs.statSync(builtInFile).size / 1024)} KB)`);

const kb = Math.round(fs.statSync(file).size / 1024);
console.log(`${deck.slides.length} slides · ${games.length} games · ${kb} KB · ${path.relative(root, file)}`);
