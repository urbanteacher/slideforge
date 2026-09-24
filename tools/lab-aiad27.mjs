#!/usr/bin/env node
/* AI Awareness Day 2027, Safe, rebuilt in the lab (SlideForge Studio) by hand.
 *
 * tools/lab-import.mjs answers "what would a SlideForge deck be in the lab?" by
 * reading the rendered page, and flattens whatever it has no layer for. This
 * goes the other way: the seven student slides are authored as native lab
 * layers from the geometry of the live campaign render (1280 × 720, scaled to
 * the lab's 1920 × 1080), so every word, rule, tile and poster is a box you can
 * select, move and animate. The copy and notes come from AiAd27/starters27.js,
 * so a copy edit there is one re-run away.
 *
 * What changes on the way in:
 *   - The live poll rail has no lab equivalent. The A–D cards stay, so a room
 *     still votes by hand, which is what the starter notes ask for anyway.
 *   - The hidden teacher page and vocabulary are not slides here; the lab has
 *     no hidden slides. Their text goes into slide 1's notes.
 *   - Progressive reveals become click builds: one click per risk and per rule.
 *   - SlideForge balances its line breaks and the lab wraps greedily, so the
 *     scenario, the pairs question and the first rule use narrower boxes that
 *     reproduce the campaign's breaks.
 *   - The ballot's prompt line sits above the footer. In SlideForge it lands
 *     on "Keep humans in the loop" (3 / 7).
 *
 *   node tools/lab-aiad27.mjs     → lab/exports/aiad27-safe.sfstudio.json
 *
 * Open it in the lab from the logo menu (Open .json). The type is Uncut Sans,
 * served from lab/public/fonts/uncut-sans.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const { STARTERS_27 } = require(root + 'AiAd27/starters27.js');

const STRAND = 'safe';
const starter = STARTERS_27.find((s) => s.key === STRAND);
const K = 1.5; // campaign geometry is 1280 × 720; the lab is 1920 × 1080
const FONT = 'Uncut Sans';

const C = {
  accent: '#00BEDD', deep: '#006A7D', ink: '#231F20', paper: '#F6F4ED', white: '#FFFFFF',
  ruleLight: '#C9C6BE', ruleDark: '#686366', numLight: '#54504E', numDark: '#D5D0CC',
};
const GROUND = {
  bright: { bg: C.accent, text: C.ink, rule: C.ink, num: C.numLight, track: C.ruleLight, fill: C.deep },
  dark: { bg: C.ink, text: C.paper, rule: C.ruleDark, num: C.numDark, track: C.ruleDark, fill: C.accent },
  paper: { bg: C.paper, text: C.ink, rule: C.ruleLight, num: C.numLight, track: C.ruleLight, fill: C.deep },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const svg = (file, swap = {}) => {
  let s = readFileSync(root + 'assets/brand/aiad27/' + file, 'utf8');
  for (const [from, to] of Object.entries(swap)) s = s.split(from).join(to);
  return 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
};
const notes = (s = '') => s.replace(/\\n/g, '\n');

const ANIM = { type: 'none', duration: 0.9, delay: 0, easing: 'expoOut', trigger: 'withSlide', stagger: 0.03, loop: 'none', loopSpeed: 1, loopAmount: 1 };
const INTERACT = { followMouse: false, parallax: 0, hover: 'none', click: 'none', gotoSlide: 1, url: '' };
const box = (x, y, w, h) => ({ x: Math.round(x * K), y: Math.round(y * K), w: Math.round(w * K), h: Math.round(h * K), rot: 0 });
const layer = (kind, name, params, b, anim = {}) => ({
  id: uid(), kind, name, visible: true, locked: false, opacity: 1, blend: 'normal',
  params, box: b, anim: { ...ANIM, ...anim }, interact: { ...INTERACT },
});

/** Text at campaign px. `ls` is the CSS letter-spacing in px; the lab wants em. */
function text(name, str, x, y, w, size, weight, color, o = {}) {
  const lh = o.lh ?? 1.2;
  const lines = o.lines ?? 1;
  return layer('text', name, {
    text: str, font: FONT, size: Math.round(size * K), weight: String(weight), italic: false, color,
    underline: false, align: o.align ?? 'left', list: 'none', lineHeight: lh,
    tracking: +((o.ls ?? 0) / size).toFixed(3), uppercase: !!o.upper, fit: 'grow',
  }, box(x, y, w + 2, size * lh * lines), o.anim);
}
const rect = (name, x, y, w, h, fill, o = {}) => layer('shape', name, {
  shape: 'rect', radius: 0, points: 5, fill, gradient: !!o.fill2, fill2: o.fill2 ?? fill, angle: 0,
  stroke: C.ink, strokeWidth: 0,
}, box(x, y, w, h), o.anim);
const image = (name, src, x, y, w, h, anim) => layer('image', name, { src, fit: 'contain', radius: 0 }, box(x, y, w, h), anim);

/** Header, lockup, footer and progress: the same frame on every slide, and still, so it holds through a transition. */
function chrome(ground, n, total) {
  const g = GROUND[ground];
  const icon = svg('icon-safe.svg', { '#00BEDD': ground === 'bright' ? C.ink : C.accent });
  const out = [
    image('Strand icon', icon, 52, 49, 22, 22),
    text('Strand', starter.principle[0] + starter.principle.slice(1).toLowerCase(), 84, 48, 60, 20, 700, g.text),
    text('Lockup', 'AI Awareness Day 2027', 928, 41, 300, 20, 700, g.text, { align: 'right', ls: -0.4 }),
    rect('Lockup rule', 1188, 66, 40, 2.5, g.text),
    text('Lockup line', 'Keep Humans in the Loop', 928, 70, 300, 13, 500, g.text, { align: 'right', ls: 0.1 }),
    rect('Footer rule', 52, 664, 1176, 1, g.rule),
    text('Footer', 'Keep humans in the loop', 52, 669, 300, 20, 700, g.text),
    rect('Progress track', 0, 715, 1280, 5, g.track),
    rect('Progress', 0, 715, 1280 * n / total, 5, g.fill, { fill2: C.ink }),
  ];
  if (n > 1) out.push(text('Page', '{page} / {pages}', 1128, 670, 100, 18, 400, g.num, { align: 'right' }));
  out[4].opacity = 0.75;
  // The strand, lockup, footer line and page number are the deck's header and footer slots, so the
  // lab's Header & footer panel owns them: type in one and every slide follows. The icon and the
  // lockup's rule and second line are drawing, and stay ordinary layers.
  const slot = (name, hfSlot, hfKind) => Object.assign(out.find((l) => l.name === name).params, { hfSlot, hfKind, hfScope: n === 1 ? 'slide' : 'deck' });
  slot('Strand', 'header-left', 'text');
  slot('Lockup', 'header-right', 'text');
  slot('Footer', 'footer-left', 'tagline');
  if (n > 1) slot('Page', 'footer-right', 'pages');
  return out;
}

const STRAND_NAME = starter.principle[0] + starter.principle.slice(1).toLowerCase();
const HEADER_FOOTER = {
  enabled: true, hideOnCover: false,
  slots: {
    'header-left': { kind: 'text', text: STRAND_NAME },
    'header-right': { kind: 'text', text: 'AI Awareness Day 2027' },
    'footer-left': { kind: 'tagline', text: 'Keep humans in the loop' },
    'footer-right': { kind: 'pages' },
  },
};

/** Parts that read as one thing — a ballot card, a risk, a rule — move as one in the lab. */
const grouped = (layers, group) => layers.forEach((l) => { l.params.group = group; });

const slide = (name, ground, layers, note) => ({
  id: uid(), name, background: GROUND[ground].bg, layers, notes: notes(note),
  transition: { type: 'fade', duration: 0.7 },
});

const S = starter.slides;
const teacher = S.find((s) => s.title === 'Teacher preparation');
const vocab = S.find((s) => s.type === 'keywords');
const student = S.filter((s) => !s.hidden);
const byType = (t) => student.find((s) => s.type === t);
const split = (row) => row.split('\t');
const TOTAL = student.length;

const rise = (delay, o = {}) => ({ type: 'rise', duration: 0.8, delay, easing: 'expoOut', ...o });
const fade = (delay, o = {}) => ({ type: 'fade', duration: 0.7, delay, easing: 'cubicOut', ...o });

const slides = [];

/* 1 · Title — the question, and the strand's poster. */
{
  const s = byType('title');
  slides.push(slide('Title', 'bright', [
    ...chrome('bright', 1, TOTAL),
    text('Eyebrow', s.subtitle, 52, 232, 669, 18, 700, C.white, { ls: 2.52, upper: true, anim: fade(0.1) }),
    text('Question', s.title, 52, 268, 669, 88, 700, C.ink, { lh: 1.04, ls: -3.08, lines: 2, anim: { type: 'words', duration: 0.9, delay: 0.2, stagger: 0.06, easing: 'expoOut' } }),
    text('Tagline', s.body, 52, 484, 669, 28, 400, C.ink, { anim: fade(0.9) }),
    image('Poster', svg('poster-safe.svg'), 733, 124, 495, 504, { type: 'zoomIn', duration: 1.1, delay: 0.25, easing: 'expoOut', loop: 'float', loopSpeed: 0.5, loopAmount: 0.35 }),
  ], [
    s.notes,
    '— TEACHER PREPARATION (a hidden slide in SlideForge) —',
    teacher.subtitle, teacher.bullets.join('\n'), teacher.notes,
    '— TWO WORDS WORTH KNOWING (a hidden slide in SlideForge) —',
    vocab.bullets.map((b) => split(b).join(': ')).join('\n'),
  ].join('\n\n')));
}

/* 2 · The scenario — one human voice, on the dark ground. */
{
  const s = byType('quote');
  slides.push(slide('The scenario', 'dark', [
    ...chrome('dark', 2, TOTAL),
    text('Quote mark', '“', 52, 112, 90, 230, 400, C.accent, { lh: 1, anim: { type: 'pop', duration: 0.7, delay: 0.1, easing: 'backOut' } }),
    text('Beat', s.subtitle, 202, 160, 966, 20, 600, C.accent, { ls: 2.8, upper: true, anim: fade(0.3) }),
    text('Scenario', s.body, 202, 196, 900, 62, 600, C.paper, { lh: 1.04, ls: -2.17, lines: 2, anim: { type: 'lines', duration: 1, delay: 0.45, stagger: 0.14, easing: 'expoOut' } }),
  ], s.notes));
}

/* 3 · Make your choice — four ballot cards, voted on before anything is explained. */
{
  const s = byType('cards');
  // Where each card's heading and body sit, measured from the live render: a
  // two-line body lifts its heading so the pair stays centred on the tile.
  const cards = [
    { x: 52, y: 232, w: 471, h3: 289, p: 329 },
    { x: 659, y: 232, w: 448, h3: 289, p: 329 },
    { x: 52, y: 448, w: 471, h3: 492, p: 531, lines: 2 },
    { x: 659, y: 448, w: 448, h3: 505, p: 545 },
  ];
  const tile = svg('shape-chamfer-tile.svg', { currentColor: C.accent });
  const layers = [...chrome('paper', 3, TOTAL),
    text('Question', s.title, 52, 124, 1070, 48, 700, C.ink, { lh: 1.03, ls: -1.68, anim: rise(0.05) })];
  s.bullets.forEach((row, i) => {
    const [head, body] = split(row), c = cards[i], L = 'ABCD'[i], d = 0.35 + i * 0.12;
    layers.push(
      rect(`${L} · rule`, c.x, c.y, 569, 2, C.ink, { anim: { type: 'wipeRight', duration: 0.7, delay: d, easing: 'expoOut' } }),
      image(`${L} · tile`, tile, c.x, c.y + 53, 76, 76, { type: 'pop', duration: 0.6, delay: d + 0.08, easing: 'backOut' }),
      text(`${L} · letter`, L, c.x, c.y + 64, 76, 50, 700, C.ink, { align: 'center', anim: { type: 'pop', duration: 0.6, delay: d + 0.08, easing: 'backOut' } }),
      text(`${L} · choice`, head, c.x + 98, c.h3, c.w, 29, 700, C.ink, { lh: 1.06, ls: -0.58, anim: rise(d + 0.12) }),
      text(`${L} · detail`, body, c.x + 98, c.p, c.w, 24, 400, C.ink, { lh: 1.15, lines: c.lines, anim: rise(d + 0.18) }),
    );
    grouped(layers.slice(-5), `choice-${L}`);
  });
  layers.push(text('Prompt', s.body, 52, 612, 1176, 24, 500, C.ink, { anim: fade(1.1) }));
  slides.push(slide('Make your choice', 'paper', layers, s.notes));
}

/* 4 · Talk to someone — one question and nothing else. */
{
  const s = byType('statement');
  slides.push(slide('Talk to someone', 'bright', [
    ...chrome('bright', 4, TOTAL),
    text('Beat', s.subtitle, 52, 124, 1176, 24, 700, C.white, { ls: 3.36, upper: true, anim: fade(0.1) }),
    text('Pair mark', '↔', 52, 196, 140, 130, 700, C.ink, { lh: 0.85, anim: { type: 'slideRight', duration: 0.9, delay: 0.2, easing: 'expoOut' } }),
    text('Question', s.body, 216, 196, 860, 68, 700, C.ink, { lh: 1.04, ls: -2.38, lines: 3, anim: { type: 'words', duration: 0.8, delay: 0.3, stagger: 0.05, easing: 'expoOut' } }),
  ], s.notes));
}

/* 5 · The reveal — four risks, one click each. */
{
  const s = byType('iceberg');
  const at = [[52, 196], [655, 196], [52, 351], [655, 351]];
  const layers = [...chrome('paper', 5, TOTAL),
    text('Beat', s.subtitle, 441, 47, 399, 22, 400, C.ink, { lh: 1.2, align: 'center' }),
    text('Heading', s.title, 52, 124, 1120, 40, 700, C.ink, { lh: 1.03, ls: -1.4, anim: rise(0.05) })];
  s.bullets.forEach((row, i) => {
    const [head, label, note] = split(row), [x, y] = at[i];
    layers.push(
      rect(`${label} · rule`, x, y, 573, 2, C.ink, { anim: { type: 'wipeRight', duration: 0.6, delay: 0, easing: 'expoOut', trigger: 'onClick' } }),
      text(`${label} · number`, label, x, y + 14, 573, 24, 700, C.deep, { anim: rise(0.05) }),
      text(`${label} · risk`, head, x, y + 52, 573, 29, 700, C.ink, { lh: 1.08, anim: rise(0.1) }),
      text(`${label} · note`, note, x, y + 92, 573, 24, 400, C.ink, { lh: 1.17, anim: rise(0.16) }),
    );
    grouped(layers.slice(-4), `risk-${i + 1}`);
  });
  layers.push(text('Source', s.body, 52, 498, 1130, 18, 400, C.ink, { lh: 1.25, anim: fade(0.3, { trigger: 'afterPrev' }) }));
  slides.push(slide('The reveal', 'paper', layers, s.notes));
}

/* 6 · What to remember — three numbered rules, one click each. */
{
  const s = byType('journey');
  const rows = [{ y: 196, h3: 218, p: 261, lines: 2 }, { y: 340, h3: 376, p: 420 }, { y: 484, h3: 520, p: 564 }];
  const layers = [...chrome('dark', 6, TOTAL),
    text('Heading', s.title, 52, 124, 1120, 40, 700, C.paper, { lh: 1.03, ls: -1.4, anim: rise(0.05) })];
  s.bullets.forEach((row, i) => {
    const [head, body] = split(row), r = rows[i], n = String(i + 1).padStart(2, '0');
    layers.push(
      rect(`${n} · rule`, 52, r.y, 1176, 1, C.ruleDark, { anim: { type: 'wipeRight', duration: 0.6, delay: 0, easing: 'expoOut', trigger: 'onClick' } }),
      text(`${n} · number`, n, 52, r.y + 40, 120, 66, 700, C.accent, { lh: 1, ls: -3.3, anim: { type: 'pop', duration: 0.6, delay: 0.05, easing: 'backOut' } }),
      text(`${n} · heading`, head, 182, r.h3, 1046, 33, 700, C.paper, { lh: 1.07, anim: rise(0.1) }),
      text(`${n} · detail`, body, 182, r.p, 972, 25, 400, C.paper, { lh: 1.17, lines: r.lines, anim: rise(0.16) }),
    );
    grouped(layers.slice(-4), `rule-${n}`);
  });
  layers.push(text('Closing line', s.subtitle, 52, 628, 1176, 22, 600, C.accent, { anim: fade(0.3, { trigger: 'afterPrev' }) }));
  slides.push(slide('What to remember', 'dark', layers, s.notes));
}

/* 7 · Your choice — one personal action, and a line to write it on. */
{
  const s = byType('keyfact');
  slides.push(slide('Your choice', 'bright', [
    ...chrome('bright', 7, TOTAL),
    text('Action mark', '↗', 52, 124, 270, 230, 700, C.ink, { lh: 1, ls: -19.55, anim: { type: 'zoomIn', duration: 1, delay: 0.1, easing: 'expoOut' } }),
    text('Beat', s.subtitle, 358, 124, 870, 24, 700, C.white, { ls: 3.36, upper: true, anim: fade(0.2) }),
    text('Action', s.title, 358, 196, 870, 60, 700, C.ink, { lh: 1.03, ls: -2.4, lines: 2, anim: { type: 'words', duration: 0.8, delay: 0.3, stagger: 0.05, easing: 'expoOut' } }),
    text('Detail', s.body, 358, 340, 870, 28, 400, C.ink, { lines: 2, anim: fade(0.9) }),
    text('Write-in', s.bullets[0], 358, 412, 870, 28, 400, C.ink, { anim: fade(1.1) }),
    rect('Write-in line', 358, 481, 870, 3, C.ink, { anim: { type: 'wipeRight', duration: 0.9, delay: 1.2, easing: 'expoOut' } }),
  ], s.notes));
}

// The cover carries no page number, which is a setting of its own for that one slide.
slides[0].headerFooter = { ...HEADER_FOOTER, slots: { ...HEADER_FOOTER.slots, 'footer-right': { kind: 'empty' } } };
const deck = {
  id: uid(), title: `AI Awareness Day 2027 · ${STRAND_NAME} · ${starter.title}`,
  width: 1920, height: 1080, version: 1, slides, headerFooter: HEADER_FOOTER,
};
mkdirSync(root + 'lab/exports', { recursive: true });
const out = root + `lab/exports/aiad27-${STRAND}.sfstudio.json`;
writeFileSync(out, JSON.stringify(deck));
console.log(`Wrote ${out.slice(root.length)}: ${slides.length} slides, ${slides.reduce((a, s) => a + s.layers.length, 0)} layers.`);
