'use strict';
/* Week 10's drawn pictures, as plain SVG at 1280x720 (no foreignObject: the Lesson studio cannot draw one).
 * Northeastern navy, red and warm white; any other colour is data. Every number comes from
 * data/facts.json, which code/steps.py computes from songs.csv: none is typed here.
 *
 *   routeSvg()        the course so far, Week 10 marked
 *   pipelineSvg()     the five stops, along a model's life: data, columns, features, errors, the public
 *   anscombeSvg()     Anscombe's quartet: four pictures, one set of statistics (a panels figure)
 *   boundarySvg()     one tree grown deeper: too simple, about right, too wiggly (a panels figure)
 *   codeSvg(id, o)    a Build-it slide: the code (left), the picture it made (right), what each part does
 *   REVEAL            the lists revealed one row at a time (src/figures/reveal.js, built as studio layers)
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const DIR = 'assets/lesson/ipdv/week10';
const NU = {
  red: '#c8102e', navy: '#0c3354', deep: '#0a2a45', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
const EDGE = '#9aa3ad';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pre = s => esc(s).replace(/ /g, '&#160;');
const open = (bg = NU.paper) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">\n<rect width="1280" height="720" fill="${bg}"/>`;
const heading = (eyebrow, title) => `<text x="64" y="58" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="2.6" fill="${NU.red}">${esc(eyebrow.toUpperCase())}</text>
<text x="64" y="100" font-family="${NU.serif}" font-size="36" fill="${NU.ink}">${esc(title)}</text>`;
const text = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-family="${o.font || NU.sans}" font-size="${o.size || 16}" font-weight="${o.weight || 400}" text-anchor="${o.anchor || 'start'}" fill="${o.colour || NU.ink}"${o.spacing ? ` letter-spacing="${o.spacing}"` : ''}>${esc(t)}</text>`;
function wrap(t, size, width) {
  const words = String(t).split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (line && next.length * size * 0.52 > width) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
const FACTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/facts.json'), 'utf8'));
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;
const n = v => Number(v).toLocaleString('en-GB');

/* ------------------------------------------------------------ the route */
const WEEKS = [
  ['1', 'Why visualise?'], ['2', 'Building charts'], ['3', 'Encoding'], ['4', 'Colour'], ['5', 'Interaction'],
  ['6', 'Reading week'], ['7', 'Maps'], ['8', 'Networks and trees'], ['9', 'Telling the story'], ['10', 'Machine learning'],
  ['11', 'Evaluation and story'], ['★', 'AE2 and the infographic']
];
function routeSvg() {
  const out = [open(), heading('The route', 'Ten weeks in: from telling a story to checking a model')];
  const x = i => 92 + i * 100, y = 330, HERE = 9;
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(WEEKS.length - 1)}" y2="${y}" stroke="${NU.rule}" stroke-width="6"/>`);
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(HERE)}" y2="${y}" stroke="${NU.navy}" stroke-width="6"/>`);
  WEEKS.forEach(([k, t], i) => {
    const here = i === HERE, done = i < HERE, gap = k === '6';
    out.push(`<circle cx="${x(i)}" cy="${y}" r="${here ? 30 : 22}" fill="${here ? NU.red : done ? NU.navy : NU.paper}" stroke="${here ? NU.red : NU.navy}" stroke-width="4" ${gap ? 'stroke-dasharray="5 5"' : ''}/>`);
    out.push(`<text x="${x(i)}" y="${y + 8}" text-anchor="middle" font-family="${NU.sans}" font-size="${here ? 22 : k.length > 1 ? 17 : 20}" font-weight="700" fill="${here || done ? '#fff' : NU.navy}">${k}</text>`);
    wrap(t, 15, 92).forEach((l, j) => out.push(text(x(i), y + 62 + j * 20, l, { size: 15, anchor: 'middle', weight: here ? 700 : 500, colour: here ? NU.red : NU.ink })));
  });
  out.push(text(x(HERE), y - 52, 'YOU ARE HERE', { size: 16, weight: 700, anchor: 'middle', colour: NU.red, spacing: 1.5 }));
  out.push(text(64, 556, 'Weeks 1–9: make a chart right, then tell a story with it. Today: the charts that check a machine-learning model.', { size: 21, colour: NU.dim }));
  out.push(text(64, 590, 'AE2 asks for Weeks 8–11, and for one AE1 visual reworked. A model-check chart is one way to show today’s week.', { size: 21, colour: NU.dim }));
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ the five stops along a model's life */
const STOPS = [
  ['1', 'Look first', 'Is the data fit to learn from?', 'histogram · box plot · missing values'],
  ['2', 'Too many columns', 'How do you see ten at once?', 'scatter-plot matrix · PCA map'],
  ['3', 'What it listens to', 'Which features matter?', 'heatmap · importance bars'],
  ['4', 'Where it’s wrong', 'Is the model any good?', 'confusion matrix · depth curve · boundary'],
  ['5', 'Tell the public', 'What does “98%” hide?', 'the honest comparison']
];
function pipelineSvg() {
  const out = [open(), heading('Today', 'A chart at every stage of a model’s life')];
  const w = 212, gap = 23, top = 170;
  out.push(text(64, 140, 'data  →  columns  →  model  →  its errors  →  the public', { size: 20, colour: NU.dim, font: NU.mono }));
  STOPS.forEach(([k, name, q, charts], i) => {
    const x = 64 + i * (w + gap);
    out.push(`<rect x="${x}" y="${top}" width="${w}" height="420" rx="10" fill="#fff" stroke="${NU.rule}"/>`);
    out.push(`<circle cx="${x + 44}" cy="${top + 52}" r="26" fill="${i === 4 ? NU.red : NU.navy}"/>`);
    out.push(text(x + 44, top + 61, k, { size: 24, weight: 700, anchor: 'middle', colour: '#fff' }));
    wrap(name, 25, w - 36).forEach((l, j) => out.push(text(x + 20, top + 122 + j * 30, l, { font: NU.serif, size: 25, colour: NU.navy })));
    wrap(q, 18, w - 36).forEach((l, j) => out.push(text(x + 20, top + 200 + j * 24, l, { size: 18 })));
    out.push(`<line x1="${x + 20}" y1="${top + 290}" x2="${x + w - 20}" y2="${top + 290}" stroke="${NU.rule}"/>`);
    wrap(charts, 15, w - 36).forEach((l, j) => out.push(text(x + 20, top + 320 + j * 21, l, { size: 15, weight: 600, colour: NU.red })));
    if (i < STOPS.length - 1) out.push(`<path d="M${x + w + 4} ${top + 52} l13 0 m-6 -7 l7 7 l-7 7" stroke="${NU.red}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  });
  out.push(text(64, 650, 'Each stop: see it, name it, the library’s one line, then build it in Altair. All on one dataset: about 30,000 songs.', { size: 19, colour: NU.dim }));
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ panels: one idea per picture */
function panelsSvg(eyebrow, title, items, o = {}) {
  const out = [open(), heading(eyebrow, title)];
  if (o.sub) out.push(text(64, 134, o.sub, { size: 20, colour: NU.dim }));
  const k = items.length, gap = 20, w = (1152 - gap * (k - 1)) / k, top = o.sub ? 160 : 140;
  const lines = Math.max(...items.map(it => wrap(it.text, 18, w - 40).length));
  const dh = 660 - top - 18 - 64 - 34 - lines * 25 - 4;
  items.forEach((it, i) => {
    const x = 64 + i * (w + gap);
    out.push(`<rect x="${x}" y="${top}" width="${w}" height="${660 - top}" rx="10" fill="#fff" stroke="${NU.rule}"/>`);
    out.push(`<g transform="translate(${x + 20} ${top + 18})">${it.draw(w - 40, dh)}</g>`);
    const ty = top + dh + 64;
    out.push(text(x + 20, ty, it.title, { font: NU.serif, size: Math.min(26, (w - 40) / (it.title.length * 0.47)), colour: NU.navy }));
    wrap(it.text, 18, w - 40).forEach((l, j) => out.push(text(x + 20, ty + 34 + j * 25, l, { size: 18 })));
  });
  out.push('</svg>');
  return out.join('\n');
}
function panelBoxes(k, o = {}) {
  const gap = 20, w = (1152 - gap * (k - 1)) / k, top = o.sub ? 160 : 140;
  return Array.from({ length: k }, (_, i) => { const x = 64 + i * (w + gap), lead = i ? gap - 2 : 6; return [x - lead, top - 6, w + lead + 4, 660 - top + 12]; });
}

/* Anscombe (1973), The American Statistician 27(1): four sets of eleven points, the same summary statistics.
   steps.py checks the statistics; the values are the published ones. */
const ANS_X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const ANSCOMBE = [
  { x: ANS_X, y: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68] },
  { x: ANS_X, y: [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74] },
  { x: ANS_X, y: [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73] },
  { x: [8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], y: [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89] }
];
function scatter(set, w, h) {
  const X = v => 8 + (v - 2) / 18 * (w - 16), Y = v => h - 8 - (v - 2) / 12 * (h - 16);
  const s = [`<line x1="8" y1="${h - 8}" x2="${w - 8}" y2="${h - 8}" stroke="${EDGE}" stroke-width="1.5"/>`, `<line x1="8" y1="8" x2="8" y2="${h - 8}" stroke="${EDGE}" stroke-width="1.5"/>`];
  s.push(`<line x1="${X(3)}" y1="${Y(4.5)}" x2="${X(19)}" y2="${Y(12.5)}" stroke="${NU.red}" stroke-width="2" stroke-dasharray="6 4"/>`);
  set.x.forEach((v, i) => s.push(`<circle cx="${X(v).toFixed(1)}" cy="${Y(set.y[i]).toFixed(1)}" r="6" fill="${NU.navy}"/>`));
  return s.join('');
}
function anscombeSvg() {
  const words = ['A cloud around a line', 'A smooth curve', 'A line, and one point off it', 'One point does all the work'];
  return panelsSvg('Look before you model', 'Which of these has the strongest relationship?',
    ANSCOMBE.map((set, i) => ({ title: ['I', 'II', 'III', 'IV'][i], text: words[i], draw: (w, h) => scatter(set, w, h) })),
    { sub: 'Four sets of eleven points. The dashed red line is the best straight line through each.' });
}

/* One tree, three depths, from steps.py's pictures. */
function png(file) {
  const b = fs.readFileSync(path.join(root, DIR, file));
  return { uri: `data:image/png;base64,${b.toString('base64')}`, w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function picture(file, w, h) {
  const p = png(file), k = Math.min(w / p.w, h / p.h);
  return `<image href="${p.uri}" x="${((w - p.w * k) / 2).toFixed(1)}" y="${((h - p.h * k) / 2).toFixed(1)}" width="${(p.w * k).toFixed(1)}" height="${(p.h * k).toFixed(1)}"/>`;
}
function boundarySvg() {
  const at = FACTS.depth.at, say = d => `Training songs: ${pct(at[d][0])} right. New songs: ${pct(at[d][1])} (ten features, six genres).`;
  return panelsSvg('Where is it wrong?', 'One tree, grown deeper: where it draws the line',
    [[2, 'Too simple'], [6, 'About right'], [20, 'Too complex']].map(([d, t]) => ({ title: `${t}: depth ${d}`, text: say(d), draw: (w, h) => picture(`boundary-${d}.png`, w, h) })),
    { sub: `Pink: pop. Orange: rap. Light blue: rock. Two features; guessing the commonest of the three scores ${pct(FACTS.threeBaseline)}.` });
}

/* ------------------------------------------------------------ Build it: code beside its picture */
const STEPS = JSON.parse(fs.readFileSync(path.join(__dirname, 'code/steps.json'), 'utf8')).steps;
/**
 * @param {string} id   a step of code/steps.json
 * @param {{title: string, words: string[], eyebrow?: string, caption?: string}} o
 */
function codeSvg(id, o) {
  const step = STEPS.find(s => s.id === id);
  if (!step) throw new Error('no code step ' + id);
  const lines = step.code.replace(/\s+$/, '').split('\n');
  const lib = step.kind === 'lib';
  const out = [open(), heading(o.eyebrow || (lib ? 'The library way' : 'Build it'), o.title)];
  const X = 40, Y = 128, Wd = 640, Ht = 560;
  const longest = Math.max(...lines.map(l => l.length));
  const lh = Math.min(26, (Ht - 40) / lines.length), size = Math.min(16.5, lh * 0.7, (Wd - 50) / (longest * 0.6));
  const isNew = l => step.new.some(t => l.includes(t));
  out.push(`<rect x="${X}" y="${Y}" width="${Wd}" height="${Ht}" rx="6" fill="${NU.deep}"/>`);
  lines.forEach((l, k) => {
    const ty = Y + 30 + k * lh, comment = l.trim().startsWith('#');
    if (!comment && l.trim() && isNew(l)) out.push(`<rect x="${X}" y="${(ty - lh * 0.7).toFixed(1)}" width="6" height="${(lh * 0.92).toFixed(1)}" fill="${NU.red}"/>`);
    out.push(`<text x="${X + 24}" y="${ty.toFixed(1)}" font-family="${NU.mono}" font-size="${size.toFixed(1)}" fill="${comment ? '#9fb7cf' : '#ffffff'}">${pre(l)}</text>`);
  });
  const p = png(`code-${id}.png`), bx = 710, by = 128, bw = 530, bh = o.words.length > 3 ? 290 : 330;
  const k = Math.min(bw / p.w, bh / p.h), w = p.w * k, h = p.h * k;
  out.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fff" stroke="${NU.rule}"/>`);
  out.push(`<image href="${p.uri}" x="${(bx + (bw - w) / 2).toFixed(1)}" y="${(by + (bh - h) / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`);
  const cap = wrap(o.caption || (lib ? 'What the library draws, with its own defaults' : 'The picture this code drew, after the setup at the top of week10_build_its.py'), 15, bw);
  cap.forEach((l, i) => out.push(text(bx, by + bh + 24 + i * 19, l, { size: 15, colour: NU.dim })));
  let wy = by + bh + 56 + (cap.length - 1) * 19;
  o.words.forEach(line => {
    const [lead, rest] = line.split('\t');
    out.push(`<rect x="${bx}" y="${wy - 15}" width="5" height="18" fill="${NU.red}"/>`);
    const body = wrap(rest || '', 16, bw - 30);
    out.push(`<text x="${bx + 16}" y="${wy}" font-family="${NU.mono}" font-size="15" font-weight="700" fill="${NU.navy}">${pre(lead)}</text>`);
    body.forEach((b, i) => out.push(text(bx + 16, wy + 22 + i * 21, b, { size: 16 })));
    wy += 30 + body.length * 21;
  });
  if (wy - 29 > 706) throw new Error(`${id}: its words run off the slide (${Math.round(wy - 29)})`);
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ the revealed lists */
const st = (w = 3.2) => `fill="none" stroke="${NU.navy}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const ICON = {
  note: `<path d="M-4 10 V-14 L14 -18 V6" ${st(3)}/><circle cx="-10" cy="10" r="6" fill="${NU.navy}"/><circle cx="8" cy="6" r="6" fill="${NU.navy}"/>`,
  map: `<circle cx="-8" cy="-6" r="4" fill="${NU.navy}"/><circle cx="6" cy="-10" r="4" fill="${NU.red}"/><circle cx="10" cy="6" r="4" fill="${NU.navy}"/><circle cx="-6" cy="10" r="4" fill="${NU.red}"/><path d="M-18 -18 v36 h36" ${st(2.4)}/>`,
  ruler: `<rect x="-18" y="-7" width="36" height="14" ${st(2.6)}/><path d="M-10 -7 v6 M-2 -7 v8 M6 -7 v6 M14 -7 v4" ${st(2)}/>`,
  check: `<circle r="17" ${st()}/><path d="M-8 0 l6 6 l10 -12" ${st(3.4)}/>`,
  shuffle: `<path d="M-17 -8 h8 l16 16 h10 M-17 8 h8 l16 -16 h10" ${st(2.8)}/><path d="M12 -12 l5 4 l-5 4 M12 4 l5 4 l-5 4" ${st(2.6)}/>`,
  cause: `<circle cx="-10" cy="0" r="7" ${st(2.6)}/><circle cx="12" cy="0" r="7" ${st(2.6)}/><path d="M-2 -4 l6 8 M4 -4 l-6 8" stroke="${NU.red}" stroke-width="3" stroke-linecap="round"/>`,
  question: `<circle r="17" ${st()}/><path d="M-5 -6 a6 6 0 1 1 7 6 v4" ${st(3)}/><circle cy="10" r="2.4" fill="${NU.navy}"/>`,
  people: `<circle cx="-7" cy="-7" r="6" ${st(2.6)}/><path d="M-18 14 a11 10 0 0 1 22 0" ${st(2.6)}/><circle cx="10" cy="-4" r="5" ${st(2.4)}/><path d="M4 14 a8 8 0 0 1 14 0" ${st(2.4)}/>`,
  range: `<path d="M-16 0 h32" ${st(2.8)}/><path d="M-16 -8 v16 M16 -8 v16" ${st(2.8)}/><circle r="4.5" fill="${NU.red}"/>`,
  data: `<ellipse cx="0" cy="-10" rx="15" ry="6" ${st(2.6)}/><path d="M-15 -10 v20 a15 6 0 0 0 30 0 v-20" ${st(2.6)}/>`,
  base: `<path d="M-16 14 h32" ${st(2.8)}/><rect x="-12" y="-4" width="8" height="18" fill="${NU.navy}"/><rect x="4" y="-14" width="8" height="28" fill="${NU.red}"/>`,
  mail: `<rect x="-19" y="-13" width="38" height="26" rx="3" ${st(2.8)}/><path d="M-19 -11 L0 3 L19 -11" ${st(2.6)}/>`,
  bus: `<rect x="-16" y="-18" width="32" height="30" rx="5" ${st(2.8)}/><path d="M-16 0 H16" ${st(2.4)}/><circle cx="-9" cy="16" r="3.5" fill="${NU.navy}"/><circle cx="9" cy="16" r="3.5" fill="${NU.navy}"/>`,
  bag: `<path d="M-16 -6 H16 L13 18 H-13 Z" ${st(2.8)}/><path d="M-7 -6 V-12 a7 7 0 0 1 14 0 V-6" ${st(2.6)}/>`,
  music: `<path d="M-4 12 V-14 L14 -18 V8" ${st(3)}/><circle cx="-10" cy="12" r="6" fill="${NU.navy}"/><circle cx="8" cy="8" r="6" fill="${NU.navy}"/>`,
  card: `<rect x="-20" y="-13" width="40" height="26" rx="4" ${st(2.8)}/><path d="M-20 -5 H20" stroke="${NU.navy}" stroke-width="5"/><circle cx="12" cy="6" r="3" fill="${NU.red}"/>`,
  phone: `<rect x="-11" y="-19" width="22" height="38" rx="4" ${st(2.8)}/><path d="M-6 6 h12 M-6 11 h8" ${st(2)}/>`,
  letter: t => `<text y="10" text-anchor="middle" font-family="${NU.serif}" font-size="30" fill="${NU.navy}">${t}</text>`,
  number: t => `<text y="9" text-anchor="middle" font-family="${NU.sans}" font-size="26" font-weight="700" fill="#fff">${t}</text>`
};
const num = t => ({ icon: ICON.number(t), ring: NU.navy });
const tag = (t, fill = NU.navy) => ({ text: t, fill });
const [SUGE, HIGHWAY, PERFECT] = FACTS.songs;
const feat = s => `danceability ${s.danceability} · energy ${s.energy} · speechiness ${s.speechiness} · tempo ${Math.round(s.tempo)}`;
const filed = s => tag(s.genres.join(' / ').toUpperCase(), NU.red);
const rec = g => pct(FACTS.recall[g]);
const top3 = Object.keys(FACTS.permutation).slice(0, 3);
const L = FACTS.ladder, C = FACTS.clusters, LIKE = FACTS.likeBlindingLights;
const wordy = C.find(c => c.topGenre === 'rap'), calm = C.find(c => c.traits.includes('acoustic') || c.traits.includes('calm'));
const AN = FACTS.anomalies, CR = FACTS.chartRecall, SG = FACTS.sameGenre;
const REVEAL = {
  achieved: { mode: 'build', rail: true, max: 92, size: 18, textX: 560, sub: 'Every result from today, computed on the same songs.',
    rows: [
      { ...num(1), name: 'Guessed genre from sound alone', text: `${pct(FACTS.accuracy)} right on songs it had never seen: ${Math.round(FACTS.accuracy / FACTS.baseline)} times the ${pct(FACTS.baseline)} of guessing.` },
      { ...num(2), name: 'Recognised what one chart can’t', text: `Rock: ${pct(CR.rock)} with the best single chart, ${pct(FACTS.recall.rock)} with the model. R&B: ${pct(CR['r&b'])} and ${pct(FACTS.recall['r&b'])}.` },
      { ...num(3), name: 'Found groups nobody labelled', text: 'Five groups of songs, from the sound alone, that cut across genres like moods.' },
      { ...num(4), name: 'Picked songs like this one', text: `The three songs nearest to Blinding Lights, out of ${n(SG.songs)} ${SG.genre} songs.` },
      { ...num(5), name: 'Flagged odd rows at once', text: `${n(AN.flagged)} songs (1%), including the tempo-0 song and the ${AN.shortTracks} very short tracks found by eye.` },
      { ...num(6), name: 'Shortlisted likely hits', text: `${pct(FACTS.hitPrecision)} of its picks are hits, against ${pct(FACTS.hitShare, 1)} at random: about ${FACTS.hitLift} times better.` }] },
  ladder: { mode: 'build', rail: true, max: 112, size: 19, textX: 640, sub: 'Guessing each song’s genre. What a chart can do, and what a model adds.',
    rows: [
      { ...num(1), name: `No chart, no model: ${pct(FACTS.baseline)}`, text: 'Always guess the commonest genre.' },
      { ...num(2), name: `One chart: ${pct(L.oneChart)}`, text: `The best rule a person could read off one chart: ${L.oneFeature}.` },
      { ...num(3), name: `One scatter plot: ${pct(L.scatter)}`, text: `The best rule from two columns at once: ${L.scatterFeatures.join(' and ')}.` },
      { ...num(4), name: `A model of all ten: ${pct(FACTS.accuracy)}`, text: 'A random forest weighs all ten numbers at once. No chart can show ten columns.' }] },
  kinds: { mode: 'build', max: 100, size: 18, textX: 640, sub: 'The first two learn from examples with the answer given (supervised). The other three find patterns with no answers (unsupervised).',
    rows: [
      { icon: ICON.letter('1'), name: 'Classification: which label?', text: 'The genre of a song; spam or not spam.' },
      { icon: ICON.letter('2'), name: 'Regression: how much?', text: 'A song’s popularity score; minutes until a bus.' },
      { icon: ICON.letter('3'), name: 'Clustering: what groups?', text: 'Songs sorted into moods, with no labels given.' },
      { icon: ICON.letter('4'), name: 'Similarity: what is like this?', text: 'More songs like the one that is playing.' },
      { icon: ICON.letter('5'), name: 'Anomaly detection: what is odd?', text: 'A card payment unlike all your others.' }] },
  scenarios: { mode: 'answers', sub: 'Everyday questions. Which kind of model would you use? Hands up, then we check.', size: 17, max: 84, nameX: 150, tagX: 660, textX: 860,
    rows: [
      { icon: ICON.mail, name: 'Your email app moves a message to spam', tag: tag('CLASSIFICATION'), text: 'Two labels, learnt from emails people marked.' },
      { icon: ICON.bus, name: 'A map app says your bus arrives in 7 minutes', tag: tag('REGRESSION'), text: 'The answer is a number, not a label.' },
      { icon: ICON.bag, name: 'A shop groups customers by what they buy, with no groups set', tag: tag('CLUSTERING'), text: 'Nobody gave the groups: the model finds them.' },
      { icon: ICON.music, name: 'After your song ends, the app plays one like it', tag: tag('SIMILARITY'), text: 'The nearest songs on the same numbers.' },
      { icon: ICON.card, name: 'Your bank texts about a payment you didn’t make', tag: tag('ANOMALY', NU.red), text: 'Rare and unlike the rest: recall matters most.' },
      { icon: ICON.phone, name: 'Your phone suggests the next word as you type', tag: tag('CLASSIFICATION'), text: 'One label out of thousands: the next word.' }] },
  songkinds: { mode: 'build', max: 104, size: 18, sub: 'The same songs, five questions. Each result was computed on the file you have.',
    rows: [
      { icon: ICON.letter('1'), name: 'Classification', text: `Genre from the ten numbers: ${pct(FACTS.accuracy)} right, against ${pct(FACTS.baseline)} for guessing.` },
      { icon: ICON.letter('2'), name: 'Regression', text: `Popularity from the ten numbers: barely better than guessing the average (R² ${FACTS.popularityR2}). A model can fail, and that is worth knowing.` },
      { icon: ICON.letter('3'), name: 'Clustering', text: `Five groups, found with no genres given: a wordy group (${pct(wordy.topShare)} rap), an ${calm.traits.join(', ')} one (${calm.songs[0].split(',')[0]}, ${calm.songs[1].split(',')[0]}).` },
      { icon: ICON.letter('4'), name: 'Similarity', text: `Nearest to Blinding Lights on all ten numbers: ${LIKE.map(x => `${x.name} (${x.artist})`).join(', ')}.` },
      { icon: ICON.letter('5'), name: 'Anomaly detection', text: `Stop 1 finds odd rows by eye: a ${FACTS.shortestSeconds}-second track, a tempo of 0. A detector does it for millions of rows.` }] },
  recall: { mode: 'answers', sub: 'No notes. Answer from memory, then we check.', textX: 640, size: 22, max: 170,
    rows: [{ icon: ICON.question, name: 'What does a martini glass do?', text: 'Week 9’s story shape: the author leads first (the stem), then lets the reader explore (the bowl).' }] },
  guess: { mode: 'answers', sub: 'A model never hears the song. It sees only these numbers, from Spotify. Which genre?', sayX: 160, tagX: 820, textX: 960, size: 17, saySize: 18, max: 150,
    rows: [
      { icon: ICON.letter('A'), say: feat(SUGE), tag: filed(SUGE), text: `${SUGE.name}, ${SUGE.artist}. Lots of words: speechiness is high.` },
      { icon: ICON.letter('B'), say: feat(HIGHWAY), tag: filed(HIGHWAY), text: `${HIGHWAY.name}, ${HIGHWAY.artist}. Energy near the top of the scale.` },
      { icon: ICON.letter('C'), say: feat(PERFECT), tag: filed(PERFECT), text: `${PERFECT.name}, ${PERFECT.artist}: a pop ballad, filed as Latin. No one could guess it: the label is the playlist’s.` }] },
  projection: { mode: 'build', max: 112, size: 19,
    rows: [
      { icon: ICON.map, name: 'It keeps only part', text: `The two axes keep ${pct(FACTS.pca[0] + FACTS.pca[1])} of the spread between songs. The rest is flattened away.` },
      { icon: ICON.ruler, name: 'Its axes have no units', text: 'A “direction” mixes every column. You cannot read a song’s energy off it.' },
      { icon: ICON.question, name: 'Near isn’t always near', text: 'Two songs close on the map may be far apart in the data. Check a group in the real columns.' },
      { icon: ICON.check, name: 'Use it to find, not to prove', text: 'Look for groups and odd songs on the map; then test them on the scatter-plot matrix.' }] },
  importance: { mode: 'build', max: 100, size: 18, sub: 'The same model, asked two ways which features matter (the last slide).',
    rows: [
      { icon: ICON.base, name: 'The forest’s own count', text: `Ranks ${Object.keys(FACTS.builtIn)[0]} first. Measured while training; it favours columns with many different values.` },
      { icon: ICON.shuffle, name: 'Shuffle and see', text: `Ranks ${top3.join(', ')}. Measured on test songs the model never saw.` },
      { icon: ICON.check, name: 'Which to trust', text: 'The shuffle, and only for this model: another model may rely on other columns.' },
      { icon: ICON.cause, name: 'Important is not cause', text: 'Speechiness helps the model spot rap. It doesn’t make a song rap.' }] },
  accuracy: { mode: 'answers', sub: `A forest guesses the genre of ${n(FACTS.testSongs)} test songs it has never seen, from the ten numbers alone.`, textX: 640, size: 20, max: 118,
    rows: [
      { icon: ICON.question, name: `It gets ${pct(FACTS.accuracy)} right. Good or bad?`, text: 'Hands up: good, bad, or it depends?' },
      { icon: ICON.base, name: 'Compared with what?', text: `The baseline, always guessing the commonest genre, gets ${pct(FACTS.baseline)}.` },
      { icon: ICON.people, name: 'Right for whom?', text: `Recall: rock ${rec('rock')}, EDM ${rec('edm')}, rap ${rec('rap')}; pop ${rec('pop')}, Latin only ${rec('latin')}.` },
      { icon: ICON.check, name: 'The verdict', text: 'Good: three times the baseline. Weak for pop and Latin, whose playlist labels overlap.' }] },
  hit: { mode: 'answers', sub: '“AI predicts hit songs with 98% accuracy.” A hit here: popularity 80 or more.', textX: 640, size: 19, max: 100,
    rows: [
      { icon: ICON.question, name: 'Would you trust it?', text: 'Hands up: yes, no, or I need to know more?' },
      { icon: ICON.data, name: 'How many songs are hits?', text: `${pct(FACTS.hitShare, 1)}. So “not a hit” is almost always right.` },
      { icon: ICON.base, name: 'The baseline', text: `Always saying “not a hit” is right ${pct(FACTS.alwaysNo, 1)} of the time. The AI: ${pct(FACTS.hitAccuracy, 1)}, a little lower.` },
      { icon: ICON.people, name: 'What it was for', text: `Of ${FACTS.hitsInTest} real hits it had never seen, it found ${FACTS.hitsFoundCount}: a recall of ${pct(FACTS.hitsFound, 1)}.` },
      { icon: ICON.check, name: 'So: no', text: 'Accuracy rewards saying no. Ask how many hits it finds.' }] },
  public: { mode: 'build', rail: true, max: 100, size: 19,
    rows: [
      { ...num(1), name: 'Compared with what?', text: 'Put the baseline beside the model’s score.' },
      { ...num(2), name: 'Who does it fail?', text: 'Show recall per group, not one score for everyone.' },
      { ...num(3), name: 'How sure?', text: `A range, not a point. Five different splits give ${pct(FACTS.accuracyRange[0])} to ${pct(FACTS.accuracyRange[1])}.` },
      { ...num(4), name: 'Learnt from what?', text: `2020 playlists (music from ${FACTS.years[0]} to ${FACTS.years[2]}), labelled by playlist makers, not listeners.` },
      { ...num(5), name: 'What it can’t say', text: 'Why a song is popular. A model finds patterns, not causes.' }] },
  quiz: { mode: 'answers', sub: 'Which chart answers the question? Hands up, then we check.', size: 18, max: 84, tagX: 700, textX: 870,
    rows: [
      { icon: ICON.letter('1'), name: 'Is the data fit to learn from?', tag: tag('HISTOGRAM'), text: 'and a count of missing and repeated rows' },
      { icon: ICON.letter('2'), name: 'Are there groups in ten columns?', tag: tag('MATRIX · MAP'), text: 'a brushed scatter-plot matrix, then PCA' },
      { icon: ICON.letter('3'), name: 'Which features matter?', tag: tag('IMPORTANCE'), text: 'shuffle each one and see the drop' },
      { icon: ICON.letter('4'), name: 'Is it overfitting?', tag: tag('DEPTH CURVE', NU.red), text: 'new songs against learnt songs' },
      { icon: ICON.letter('5'), name: 'Who does it fail?', tag: tag('CONFUSION', NU.red), text: 'the errors, genre by genre' },
      { icon: ICON.letter('6'), name: 'Is the headline honest?', tag: tag('BASELINE', NU.red), text: 'the model, the baseline and recall on one axis' }] }
};

module.exports = { routeSvg, pipelineSvg, anscombeSvg, boundarySvg, codeSvg, panelBoxes, REVEAL, STEPS, FACTS, pct, n, NU, open, heading, text, wrap };
