'use strict';
/* Week 9's drawn pictures, as plain SVG at 1280x720 (no foreignObject: the
 * Lesson studio cannot draw one). Northeastern navy, red and warm white; any
 * other colour is data. The small charts are drawn from the real London data
 * (data/no2.json), so every picture tells the same story as the live ones.
 *
 *   routeSvg()        the course so far, Week 9 marked
 *   codeSvg(id, o)    a Build-it slide: the Altair (left), the picture it made (right), what each part does
 *   spectrumSvg()     Segel and Heer's line, author-driven to reader-driven, five structures on it
 *   martiniSvg()      the martini glass: the stem the author leads, the bowl the reader explores
 *   authorSvg() … famousSvg()   rows of panels, one idea per small picture
 *   REVEAL            the lists revealed one row at a time (src/figures/reveal.js)
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const DIR = 'assets/lesson/ipdv/week9';
const NU = {
  red: '#c8102e', navy: '#0c3354', deep: '#0a2a45', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
/* GREY: context lines, over 2:1 on the paper so they still read */
const GREY = '#aab4bf', EDGE = '#9aa3ad';
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

/* ------------------------------------------------------------ the data, for the small charts */
const AIR = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/no2.json'), 'utf8'));
const YEARS = AIR.years;
const MY1 = AIR.sites.find(s => s.code === 'MY1');
const ROAD = AIR.sites.filter(s => s !== MY1 && /Roadside|Kerbside/.test(s.type));
/* A small line chart in a w x h box: the hero (Marylebone Road) and, if asked, the other roads. */
function mini(w, h, o = {}) {
  const ymax = o.ymax || 100, x0 = o.pad == null ? 6 : o.pad, years = o.years || YEARS;
  const x = yr => x0 + (yr - years[0]) / (years[years.length - 1] - years[0]) * (w - x0 - 6), y = v => h - 6 - Math.min(v, ymax) / ymax * (h - 12);
  const line = (site, upto) => years.filter(yr => site.no2[yr] != null && yr <= (upto || 9999)).map((yr, i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)} ${y(site.no2[yr]).toFixed(1)}`).join(' ');
  const s = [`<line x1="${x0}" y1="${h - 6}" x2="${w - 6}" y2="${h - 6}" stroke="${EDGE}" stroke-width="1.5"/>`];
  if (o.others) ROAD.forEach(r => s.push(`<path d="${line(r)}" fill="none" stroke="${o.othersColour || GREY}" stroke-width="1.3" opacity="${o.othersOpacity || 1}"/>`));
  if (o.limit) s.push(`<line x1="${x0}" y1="${y(40)}" x2="${w - 6}" y2="${y(40)}" stroke="${NU.navy}" stroke-width="2" stroke-dasharray="6 5"/>`);
  if (o.notes) o.notes.forEach(([yr, t]) => { s.push(`<line x1="${x(yr)}" y1="6" x2="${x(yr)}" y2="${h - 6}" stroke="#8a96a3" stroke-width="1.5"/>`); s.push(text(x(yr) - 5, h - 14, t, { size: 15, weight: 700, anchor: 'end' })); });
  if (o.hero !== false) s.push(`<path d="${line(MY1, o.upto)}" fill="none" stroke="${o.heroColour || NU.red}" stroke-width="${o.heroWidth || 3.5}" stroke-linejoin="round" stroke-linecap="round"/>`);
  if (o.guess != null) s.push(`<line x1="${x(2016)}" y1="${y(o.guess)}" x2="${w - 6}" y2="${y(o.guess)}" stroke="${NU.navy}" stroke-width="3" stroke-dasharray="7 5"/>`);
  return { svg: s.join(''), x, y };
}

/* ------------------------------------------------------------ the route */
const WEEKS = [
  ['1', 'Why visualise?'], ['2', 'Building charts'], ['3', 'Encoding'], ['4', 'Colour'], ['5', 'Interaction'],
  ['6', 'Reading week'], ['7', 'Maps'], ['8', 'Networks and trees'], ['9', 'Telling the story'], ['★', 'Final piece: the infographic']
];
function routeSvg() {
  const out = [open(), heading('The route', 'Nine weeks in: from making a chart to telling with it')];
  const x = i => 100 + i * 120, y = 340, HERE = 8;
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(9)}" y2="${y}" stroke="${NU.rule}" stroke-width="6"/>`);
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(HERE)}" y2="${y}" stroke="${NU.navy}" stroke-width="6"/>`);
  WEEKS.forEach(([n, t], i) => {
    const here = i === HERE, done = i < HERE, gap = n === '6';
    out.push(`<circle cx="${x(i)}" cy="${y}" r="${here ? 30 : 22}" fill="${here ? NU.red : done ? NU.navy : NU.paper}" stroke="${here ? NU.red : NU.navy}" stroke-width="4" ${gap ? 'stroke-dasharray="5 5"' : ''}/>`);
    out.push(`<text x="${x(i)}" y="${y + 8}" text-anchor="middle" font-family="${NU.sans}" font-size="${here ? 24 : 20}" font-weight="700" fill="${here || done ? '#fff' : NU.navy}">${n}</text>`);
    wrap(t, 16, 108).forEach((l, k) => out.push(text(x(i), y + 64 + k * 21, l, { size: 16, anchor: 'middle', weight: here ? 700 : 500, colour: here ? NU.red : NU.ink })));
  });
  out.push(text(x(HERE), y - 52, 'YOU ARE HERE', { size: 16, weight: 700, anchor: 'middle', colour: NU.red, spacing: 1.5 }));
  out.push(text(64, 560, 'Weeks 1–8 taught you to make a chart right. Today: who reads it, in what order, and who is in control.', { size: 22, colour: NU.dim }));
  out.push(text(64, 594, 'Your final infographic is a story. Every panel needs a headline, a note and a highlight.', { size: 22, colour: NU.dim }));
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ Build it: code beside its picture */
function png(file) {
  const b = fs.readFileSync(path.join(root, DIR, file));
  return { uri: `data:image/png;base64,${b.toString('base64')}`, w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const STEPS = JSON.parse(fs.readFileSync(path.join(__dirname, 'code/steps.json'), 'utf8')).steps;
/**
 * @param {string} id   a step of code/steps.json
 * @param {{title: string, words: string[], from?: number, eyebrow?: string}} o
 *   words: what the parts do, in plain English, one per line; from: the first code line shown (skips the shared setup)
 */
function codeSvg(id, o) {
  const step = STEPS.find(s => s.id === id);
  if (!step) throw new Error('no code step ' + id);
  const lines = step.code.replace(/\s+$/, '').split('\n').slice(o.from || 0);
  const out = [open(), heading(o.eyebrow || 'Build it', o.title)];
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
  const cap = wrap(o.caption || 'The picture this code drew, after the setup on the first Build-it', 15, bw);
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
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ panels: one idea per picture */
function panelsSvg(eyebrow, title, items, o = {}) {
  const out = [open(), heading(eyebrow, title)];
  if (o.sub) out.push(text(64, 134, o.sub, { size: 20, colour: NU.dim }));
  const n = items.length, gap = o.arrows ? 44 : 20, w = (1152 - gap * (n - 1)) / n, top = o.sub ? 160 : 140;
  const lines = Math.max(...items.map(it => wrap(it.text, 18, w - 40).length));
  const dh = 660 - top - 18 - 64 - 34 - lines * 25 - 4 - (items.some(it => it.by) ? 22 : 0);
  items.forEach((it, i) => {
    const x = 64 + i * (w + gap);
    out.push(`<rect x="${x}" y="${top}" width="${w}" height="${660 - top}" rx="10" fill="#fff" stroke="${NU.rule}"/>`);
    out.push(`<g transform="translate(${x + 20} ${top + 18})">${it.draw(w - 40, dh)}</g>`);
    let ty = top + dh + 64;
    out.push(text(x + 20, ty, it.title, { font: NU.serif, size: Math.min(26, (w - 40) / (it.title.length * 0.47)), colour: NU.navy }));
    if (it.by) { ty += 24; out.push(text(x + 20, ty, it.by, { size: 15, weight: 700, colour: NU.red, spacing: 1 })); }
    wrap(it.text, 18, w - 40).forEach((l, k) => out.push(text(x + 20, ty + 34 + k * 25, l, { size: 18 })));
    if (o.arrows && i < n - 1) {
      const ax = x + w + gap / 2, ay = top + 18 + dh / 2;
      out.push(`<path d="M${ax - 12} ${ay} L${ax + 8} ${ay} M${ax + 1} ${ay - 8} L${ax + 9} ${ay} L${ax + 1} ${ay + 8}" stroke="${NU.red}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  });
  out.push('</svg>');
  return out.join('\n');
}
/* The boxes the panels figure needs, matching panelsSvg's layout. */
function panelBoxes(n, o = {}) {
  const gap = o.arrows ? 44 : 20, w = (1152 - gap * (n - 1)) / n, top = o.sub ? 160 : 140;
  return Array.from({ length: n }, (_, i) => { const x = 64 + i * (w + gap), lead = i ? gap - 2 : 6; return [x - lead, top - 6, w + lead + 4, 660 - top + 12]; });
}

const card = (x, y, rows, size = 13) => {
  const w = 16 + Math.max(...rows.map(([k, v]) => (k.length + v.length) * size * 0.56)) + 10, h = 12 + rows.length * size * 1.45;
  return `<rect x="${x + 2}" y="${y + 2}" width="${w}" height="${h}" rx="3" fill="rgba(0,0,0,.2)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fff" stroke="#d9d9d9"/>` +
    rows.map(([k, v], i) => `<text x="${x + 8}" y="${y + 6 + (i + 1) * size * 1.4}" font-family="${NU.sans}" font-size="${size}" fill="#808080">${esc(k)} <tspan font-weight="700" fill="${NU.ink}">${esc(v)}</tspan></text>`).join('');
};

/* The author's four tools, on Marylebone Road. */
function authorSvg() {
  return panelsSvg('Name it', 'The author’s four tools', [
    { title: 'Headline', text: 'Say the finding in the title, as a sentence. Not “NO₂, 2010–2025”.', draw: (w, h) => {
      const m = mini(w, h - 54);
      return text(0, 18, 'A third of the NO₂', { size: 19, weight: 700 }) + text(0, 40, 'it had in 2010', { size: 19, weight: 700 }) + `<g transform="translate(0 54)">${m.svg}</g>`;
    } },
    { title: 'Annotate', text: 'Write on the chart, at the place it happened. Words beat a legend.', draw: (w, h) => mini(w, h, { notes: [[2019, 'ULEZ']], limit: true }).svg },
    { title: 'Highlight', text: 'One thing in colour, everything else grey. The eye goes to the colour.', draw: (w, h) => mini(w, h, { others: true, ymax: 180 }).svg },
    { title: 'Order', text: 'Choose what comes first, second, third. A story has a sequence.', draw: (w, h) => {
      const fw = (w - 24) / 3, s = [];
      [2013, 2019, 2025].forEach((upto, i) => {
        const m = mini(fw, h * 0.5, { upto });
        s.push(`<g transform="translate(${i * (fw + 12)} ${h * 0.25})"><rect width="${fw}" height="${h * 0.5}" fill="#f4f2ee"/>${m.svg}</g>`);
        s.push(`<circle cx="${i * (fw + 12) + fw / 2}" cy="${h * 0.25 - 22}" r="14" fill="${NU.navy}"/>` + text(i * (fw + 12) + fw / 2, h * 0.25 - 16, String(i + 1), { size: 16, weight: 700, anchor: 'middle', colour: '#fff' }));
      });
      return s.join('');
    } }
  ]);
}

/* Shneiderman's mantra, on the same data: overview, zoom and filter, details on demand. */
function mantraSvg() {
  return panelsSvg('Let go', 'What a reader needs to drive', [
    { title: 'Overview first', text: 'Every monitor at once: the whole shape before any detail.', draw: (w, h) => mini(w, h, { others: true, ymax: 180, othersColour: '#8fa3b8', heroColour: '#8fa3b8', heroWidth: 1.3 }).svg },
    { title: 'Zoom and filter', text: 'Only what you ask for: roads, since 2019.', draw: (w, h) => mini(w, h, { others: true, ymax: 80, years: YEARS.filter(y => y >= 2019), othersColour: '#8fa3b8', heroColour: '#8fa3b8', heroWidth: 1.3 }).svg },
    { title: 'Details on demand', text: 'Point at one line and it tells you its numbers.', draw: (w, h) => {
      const m = mini(w, h, { others: true, ymax: 80, years: YEARS.filter(y => y >= 2019), othersOpacity: 0.6, heroColour: NU.navy, heroWidth: 4 });
      return m.svg + `<circle cx="${m.x(2023)}" cy="${m.y(42)}" r="6" fill="${NU.navy}" stroke="#fff" stroke-width="2"/>` + card(Math.min(m.x(2023) - 150, w - 190), m.y(42) - 108, [['site', 'Marylebone Road'], ['year', '2023'], ['no2', '42']]);
    } }
  ], { arrows: true, sub: 'Ben Shneiderman’s rule (1996): overview first, zoom and filter, then details on demand.' });
}

/* Three structures in between. Drawn as shapes, so the shape is the idea. */
const dot = (x, y, r = 9, c = NU.navy) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const arrow = (x1, y1, x2, y2, c = NU.navy) => {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 10, hy = y2 - Math.sin(a) * 10;
  return `<path d="M${x1} ${y1} L${hx} ${hy}" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M${hx - Math.sin(a) * 6} ${hy + Math.cos(a) * 6} L${x2} ${y2} L${hx + Math.sin(a) * 6} ${hy - Math.cos(a) * 6} z" fill="${c}"/>`;
};
const scatterIn = (cx, cy, rx, ry, n, seed, c = '#8fa3b8') => {
  let t = seed;
  const rnd = () => { t = (t * 9301 + 49297) % 233280; return t / 233280; };
  return Array.from({ length: n }, () => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()); return dot(cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, 4, c); }).join('');
};
function structuresSvg() {
  return panelsSvg('Both', 'Three ways to lead, then let go', [
    { title: 'Martini glass', text: 'A short story in order (the stem), then the reader explores (the bowl).', draw: (w, h) => {
      const cx = w / 2, s = [`<path d="M${cx - w * 0.42} 20 L${cx + w * 0.42} 20 L${cx} ${h * 0.52} Z" fill="#eef1f5" stroke="${NU.navy}" stroke-width="2.5"/>`];
      s.push(scatterIn(cx, h * 0.2, w * 0.24, h * 0.12, 22, 3));
      s.push(`<line x1="${cx}" y1="${h * 0.52}" x2="${cx}" y2="${h - 18}" stroke="${NU.navy}" stroke-width="2.5"/><line x1="${cx - 50}" y1="${h - 16}" x2="${cx + 50}" y2="${h - 16}" stroke="${NU.navy}" stroke-width="4" stroke-linecap="round"/>`);
      [0.88, 0.75, 0.62].forEach((k, i) => s.push(dot(cx, h * k, 11, NU.red) + text(cx, h * k + 5, String(i + 1), { size: 15, weight: 700, anchor: 'middle', colour: '#fff' })));
      return s.join('');
    } },
    { title: 'Interactive slideshow', text: 'Chapters in order, and inside each one the reader may explore.', draw: (w, h) => {
      const bw = (w - 30) / 3, s = [];
      [0, 1, 2].forEach(i => {
        const x = i * (bw + 15);
        s.push(`<rect x="${x}" y="${h * 0.22}" width="${bw}" height="${h * 0.56}" rx="6" fill="#eef1f5" stroke="${NU.navy}" stroke-width="2"/>`);
        s.push(dot(x + 16, h * 0.22 + 16, 11, NU.red) + text(x + 16, h * 0.22 + 21, String(i + 1), { size: 15, weight: 700, anchor: 'middle', colour: '#fff' }));
        s.push(scatterIn(x + bw / 2, h * 0.55, bw * 0.32, h * 0.14, 7, 11 + i));
        if (i < 2) s.push(arrow(x + bw + 1, h * 0.5, x + bw + 14, h * 0.5, NU.red));
      });
      return s.join('');
    } },
    { title: 'Drill-down story', text: 'One overview; the reader picks which story to open, and the author tells it.', draw: (w, h) => {
      const s = [`<rect x="${w * 0.2}" y="10" width="${w * 0.6}" height="${h * 0.3}" rx="6" fill="#eef1f5" stroke="${NU.navy}" stroke-width="2"/>`, scatterIn(w / 2, 10 + h * 0.15, w * 0.22, h * 0.1, 14, 5)];
      [0.15, 0.5, 0.85].forEach((k, i) => {
        s.push(arrow(w / 2, 14 + h * 0.3, w * k, h * 0.58, i === 1 ? NU.red : NU.navy));
        s.push(`<rect x="${w * k - 34}" y="${h * 0.6}" width="68" height="${h * 0.32}" rx="6" fill="${i === 1 ? '#fbe5e8' : '#fff'}" stroke="${i === 1 ? NU.red : NU.navy}" stroke-width="2"/>`);
        [0, 1, 2].forEach(r => s.push(`<line x1="${w * k - 22}" x2="${w * k + 22 - r * 8}" y1="${h * 0.6 + 18 + r * 14}" y2="${h * 0.6 + 18 + r * 14}" stroke="${i === 1 ? NU.red : NU.navy}" stroke-width="3" stroke-linecap="round"/>`));
      });
      return s.join('');
    } }
  ]);
}

/* Four ways to make a number felt, all on Marylebone Road. */
function feltSvg() {
  const v10 = MY1.no2[2010], v25 = MY1.no2[2025];
  /* monitors that reported in a year, and how many were over the legal limit, 40 */
  const ran = yr => AIR.sites.filter(x => x.no2[yr] != null).length, over = yr => AIR.sites.filter(x => x.no2[yr] > 40).length;
  return panelsSvg('Make it felt', 'Four ways to make a number land', [
    { title: 'Guess first', text: 'Ask the reader to guess, then show the truth beside their guess.', draw: (w, h) => {
      const m = mini(w, h - 30, { guess: 60, upto: 2025 });
      return `<g transform="translate(0 20)">${m.svg}</g>` + text(w - 8, m.y(60) + 12, 'your guess', { size: 15, weight: 700, anchor: 'end', colour: NU.navy });
    } },
    { title: 'Count it out', text: `One square per monitor; red if over the legal limit. 2010: ${over(2010)} of ${ran(2010)}. 2025: ${over(2025)} of ${ran(2025)}.`, draw: (w, h) => {
      const s = [], cols = 10, sz = Math.min((w / 2 - 20) / cols, (h - 50) / 10) - 2;
      [[2010, 0], [2025, w / 2 + 6]].forEach(([yr, x0]) => {
        const n = ran(yr), red = over(yr);
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = Math.floor(i / cols);
          s.push(`<rect x="${(x0 + c * (sz + 2)).toFixed(1)}" y="${(r * (sz + 2)).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="${i < red ? NU.red : '#c9d1da'}"/>`);
        }
        s.push(text(x0, 10 * (sz + 2) + 20, String(yr), { size: 15, weight: 700 }) + text(x0, 10 * (sz + 2) + 40, `${red} of ${n}`, { size: 15 }));
      });
      return s.join('');
    } },
    { title: 'Human scale', text: `WHO’s guideline is 10. Marylebone Road’s air held ${(v10 / 10).toFixed(0)} times it in 2010; ${(v25 / 10).toFixed(0)} times now.`, draw: (w, h) => {
      const s = [], bw = 22, row = (n, y, label) => {
        s.push(text(0, y - 10, label, { size: 15, weight: 700 }));
        for (let i = 0; i < Math.ceil(n / 10); i++) {
          const part = Math.min(1, (n - i * 10) / 10);
          s.push(`<rect x="${i * (bw + 4)}" y="${y}" width="${(bw * part).toFixed(1)}" height="40" fill="${NU.navy}"/>`);
          if (part < 1) s.push(`<rect x="${i * (bw + 4)}" y="${y}" width="${bw}" height="40" fill="none" stroke="${NU.navy}" stroke-dasharray="3 3"/>`);
        }
      };
      row(v10, h * 0.2, `2010: ${v10}`); row(v25, h * 0.6, `2025: ${v25}`);
      s.push(text(0, h - 4, 'one block = the WHO guideline, 10', { size: 15, colour: NU.dim }));
      return s.join('');
    } },
    { title: 'Make it physical', text: 'Stack it, print it, build it: a thing you can hold or walk around.', draw: (w, h) => {
      const s = [], cube = 15, iso = (cx, cy, c) => `<path d="M${cx} ${cy} l${cube} ${-cube / 2} l${cube} ${cube / 2} l${-cube} ${cube / 2} z" fill="${c}"/><path d="M${cx} ${cy} v${cube} l${cube} ${cube / 2} v${-cube}z" fill="${c}" opacity=".8"/><path d="M${cx + 2 * cube} ${cy} v${cube} l${-cube} ${cube / 2} v${-cube}z" fill="${c}" opacity=".6"/>`;
      [[v10, w * 0.12, '2010'], [v25, w * 0.55, '2025']].forEach(([n, x, label]) => {
        const k = Math.round(n / 10);
        for (let i = 0; i < k; i++) s.push(iso(x, h - 50 - i * cube, NU.red));
        s.push(text(x + cube, h - 4, label, { size: 15, weight: 700, anchor: 'middle' }));
      });
      return s.join('');
    } }
  ], { sub: 'Marylebone Road’s NO₂, and London’s monitors, made felt four ways.' });
}

/* Four published stories, drawn as schematics (not copies): the move each one makes. Links in the notes. */
function famousSvg() {
  return panelsSvg('See it', 'Four stories that made data felt', [
    { title: 'Snow Fall', by: 'NEW YORK TIMES · 2012', text: 'An avalanche told by scrolling: words, maps and video arrive as you read.', draw: (w, h) => {
      const s = [`<rect x="${w * 0.18}" y="0" width="${w * 0.64}" height="${h}" rx="8" fill="#eef1f5" stroke="${NU.navy}" stroke-width="2"/>`];
      [0.08, 0.16, 0.24].forEach(k => s.push(`<line x1="${w * 0.26}" x2="${w * 0.74}" y1="${h * k}" y2="${h * k}" stroke="${NU.navy}" stroke-width="3" stroke-linecap="round"/>`));
      s.push(`<path d="M${w * 0.24} ${h * 0.62} L${w * 0.42} ${h * 0.36} L${w * 0.52} ${h * 0.48} L${w * 0.64} ${h * 0.32} L${w * 0.76} ${h * 0.62} Z" fill="#fff" stroke="${NU.navy}" stroke-width="2"/>`);
      [0.72, 0.8, 0.88].forEach(k => s.push(`<line x1="${w * 0.26}" x2="${w * 0.7}" y1="${h * k}" y2="${h * k}" stroke="${NU.navy}" stroke-width="3" stroke-linecap="round"/>`));
      s.push(arrow(w * 0.92, h * 0.3, w * 0.92, h * 0.7, NU.red));
      return s.join('');
    } },
    { title: 'You Draw It', by: 'NYT THE UPSHOT · 2015', text: 'You draw the line you expect; then the real one appears beside yours.', draw: (w, h) => {
      const s = [`<line x1="6" y1="${h - 10}" x2="${w - 6}" y2="${h - 10}" stroke="${EDGE}" stroke-width="1.5"/>`];
      s.push(`<path d="M10 ${h * 0.75} C ${w * 0.3} ${h * 0.6}, ${w * 0.5} ${h * 0.55}, ${w - 10} ${h * 0.45}" fill="none" stroke="${NU.navy}" stroke-width="3" stroke-dasharray="7 5"/>`);
      s.push(`<path d="M10 ${h * 0.82} C ${w * 0.35} ${h * 0.78}, ${w * 0.6} ${h * 0.4}, ${w - 10} ${h * 0.12}" fill="none" stroke="${NU.red}" stroke-width="4"/>`);
      s.push(text(w - 10, h * 0.55, 'yours', { size: 15, weight: 700, anchor: 'end', colour: NU.navy }) + text(w - 14, h * 0.1, 'the data', { size: 15, weight: 700, anchor: 'end', colour: NU.red }));
      return s.join('');
    } },
    { title: 'Out of Sight, Out of Mind', by: 'PITCH INTERACTIVE · 2013', text: 'Every US drone strike in Pakistan, one mark each, falling in time.', draw: (w, h) => {
      const s = [];
      let t = 17;
      const rnd = () => { t = (t * 9301 + 49297) % 233280; return t / 233280; };
      for (let i = 0; i < 60; i++) { const x = 8 + (i / 60) * (w - 16), len = 18 + rnd() * (h - 60); s.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${(len * 0.35).toFixed(1)}" stroke="#8a96a3" stroke-width="1.6"/>`); if (rnd() < 0.5) s.push(`<rect x="${(x - 2).toFixed(1)}" y="${(h - 10 - rnd() * 40).toFixed(1)}" width="4" height="${(4 + rnd() * 10).toFixed(1)}" fill="${NU.red}"/>`); }
      s.push(`<line x1="6" y1="${h - 6}" x2="${w - 6}" y2="${h - 6}" stroke="${EDGE}" stroke-width="1.5"/>`);
      return s.join('');
    } },
    { title: 'Dear Data', by: 'LUPI AND POSAVEC · 2016', text: 'A year of weekly postcards, each a hand-drawn chart of one small habit.', draw: (w, h) => {
      const s = [`<rect x="10" y="${h * 0.12}" width="${w - 20}" height="${h * 0.7}" rx="4" fill="#fff" stroke="${NU.navy}" stroke-width="2" transform="rotate(-4 ${w / 2} ${h / 2})"/>`];
      let t = 5;
      const rnd = () => { t = (t * 9301 + 49297) % 233280; return t / 233280; };
      for (let i = 0; i < 28; i++) { const x = 30 + rnd() * (w - 60), y = h * 0.2 + rnd() * h * 0.5, c = [NU.red, NU.navy, '#f58518', '#54a24b'][i % 4]; s.push(i % 3 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + rnd() * 5).toFixed(1)}" fill="none" stroke="${c}" stroke-width="2"/>` : `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l8 -10" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`); }
      return s.join('');
    } }
  ]);
}

/* One road, three rhythms: Marylebone Road's NO2 in 2025 by hour, by day of the week and by month
   (data/my1-patterns.json, from fetch-hourly.mjs). Kamara and Harrison (2021) found the same rhythms in 2009–2018. */
const PAT = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/my1-patterns.json'), 'utf8'));
function rhythmSvg() {
  const axis = (w, h, top, labels) => {
    const s = [`<line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="${EDGE}" stroke-width="1.5"/>`];
    [0, 20, 40].forEach(v => { const y = h - v / top * h; s.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#ece8e1"/>` + text(-6, y + 5, String(v), { size: 15, anchor: 'end', colour: NU.dim })); });
    labels.forEach(([x, t]) => s.push(text(x, h + 20, t, { size: 15, anchor: 'middle', colour: NU.dim })));
    return s.join('');
  };
  const TOP = 45;
  return panelsSvg('Discover', 'One road, three rhythms', [
    { title: 'By hour', text: `Weekdays climb from ${Math.min(...PAT.hour.weekday)} at 3 am to a daytime high, worst at 5 pm (${Math.max(...PAT.hour.weekday)}). Weekends stay lower.`, draw: (w, h) => {
      const H = h - 40, x = i => 26 + i / 23 * (w - 34), y = v => H - v / TOP * H;
      const line = (vals, c, sw) => `<path d="${vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      return `<g transform="translate(0 6)">` + `<g transform="translate(26 0)">${axis(w - 34, H, TOP, [])}</g>` +
        [[0, 'midnight'], [8, '8 am'], [17, '5 pm']].map(([i, t]) => text(x(i), H + 20, t, { size: 15, anchor: 'middle', colour: NU.dim })).join('') +
        line(PAT.hour.weekend, '#9aa3ad', 3) + line(PAT.hour.weekday, NU.red, 4) +
        text(x(17), y(Math.max(...PAT.hour.weekday)) - 10, 'weekdays', { size: 15, weight: 700, anchor: 'middle', colour: NU.red }) +
        text(x(11), y(PAT.hour.weekend[11]) + 22, 'weekends', { size: 15, weight: 700, anchor: 'middle', colour: '#6b7480' }) + '</g>';
    } },
    { title: 'By day', text: `Weekdays sit near ${Math.round(PAT.day[0].no2)}–${Math.round(PAT.day[4].no2)}; Sunday is cleanest (${Math.round(PAT.day[6].no2)}). One year can’t rank the weekdays.`, draw: (w, h) => {
      const H = h - 40, n = 7, bw = (w - 40) / n;
      return `<g transform="translate(0 6)"><g transform="translate(26 0)">${axis(w - 34, H, TOP, [])}</g>` + PAT.day.map((d, i) => {
        const bh = d.no2 / TOP * H, x = 30 + i * bw, c = i >= 5 ? '#9aa3ad' : NU.navy;
        return `<rect x="${x.toFixed(1)}" y="${(H - bh).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${bh.toFixed(1)}" fill="${c}"/>` + text(x + (bw - 6) / 2, H + 20, d.day.charAt(0), { size: 15, anchor: 'middle', colour: NU.dim });
      }).join('') + '</g>';
    } },
    { title: 'By month', text: 'One year can’t show the seasons: pale months are missing over a quarter of their hours.', draw: (w, h) => {
      const H = h - 40, n = 12, bw = (w - 40) / n;
      return `<g transform="translate(0 6)"><g transform="translate(26 0)">${axis(w - 34, H, TOP, [])}</g>` + PAT.month.map((m, i) => {
        const bh = m.no2 / TOP * H, x = 30 + i * bw, thin = m.capture < 75;
        return `<rect x="${x.toFixed(1)}" y="${(H - bh).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" fill="${thin ? '#d6dce3' : NU.navy}"${thin ? ` stroke="${NU.navy}" stroke-dasharray="3 3"` : ''}/>` + text(x + (bw - 4) / 2, H + 20, 'JFMAMJJASOND'.charAt(i), { size: 15, anchor: 'middle', colour: NU.dim });
      }).join('') + '</g>';
    } }
  ], { sub: 'Marylebone Road, 2025, NO₂ in µg/m³. Drill into one line and it has its own story.' });
}

/* Segel and Heer's line: author-driven at one end, reader-driven at the other. */
function spectrumSvg() {
  const out = [open(), heading('Who drives?', 'Every data story sits somewhere on one line')];
  const x0 = 120, x1 = 1160, y = 330;
  out.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${NU.navy}" stroke-width="6" stroke-linecap="round"/>`);
  out.push(`<path d="M${x0 - 8} ${y} l22 -14 v28 z" fill="${NU.navy}"/><path d="M${x1 + 8} ${y} l-22 -14 v28 z" fill="${NU.navy}"/>`);
  out.push(text(x0 - 20, y - 70, 'THE AUTHOR DRIVES', { size: 16, weight: 700, colour: NU.red, spacing: 2 }));
  out.push(text(x0 - 20, y - 42, 'One message, a fixed order', { size: 20, colour: NU.dim }));
  out.push(text(x1 + 20, y - 70, 'THE READER DRIVES', { size: 16, weight: 700, colour: NU.red, spacing: 2, anchor: 'end' }));
  out.push(text(x1 + 20, y - 42, 'No set path, their own questions', { size: 20, colour: NU.dim, anchor: 'end' }));
  const stops = [
    ['Linear story', 'slideshow, annotated chart, scrollytelling', 'a talk, a poster, Snow Fall'],
    ['Interactive slideshow', 'chapters in order, explore inside each', 'an explainer in parts'],
    ['Martini glass', 'a short story, then it opens up', 'a news chart you can then explore'],
    ['Drill-down story', 'pick a story from an overview', 'one story per borough'],
    ['Dashboard', 'filters and views, no story', 'London Air’s live map']
  ];
  stops.forEach(([name, how, eg], i) => {
    const x = x0 + 60 + i * ((x1 - x0 - 120) / 4), mart = i === 2;
    out.push(`<circle cx="${x}" cy="${y}" r="${mart ? 18 : 13}" fill="${mart ? NU.red : '#fff'}" stroke="${mart ? NU.red : NU.navy}" stroke-width="4"/>`);
    let ty = y + 56;
    wrap(name, 26, 210).forEach(l => { out.push(text(x, ty, l, { font: NU.serif, size: 27, anchor: 'middle', colour: mart ? NU.red : NU.navy })); ty += 32; });
    wrap(how, 19, 200).forEach(l => { out.push(text(x, ty + 6, l, { size: 19, anchor: 'middle' })); ty += 25; });
    wrap('e.g. ' + eg, 18, 200).forEach(l => { out.push(text(x, ty + 18, l, { size: 18, anchor: 'middle', colour: NU.dim })); ty += 23; });
  });
  out.push(text(64, 650, 'After Segel and Heer (2010): they name the three in the middle; the two end labels are ours. Most good charts blend both ends.', { size: 18, colour: NU.dim }));
  out.push('</svg>');
  return out.join('\n');
}

/* The martini glass, drawn as one: three steps up the stem, then the bowl full of lines to explore. */
function martiniSvg() {
  const out = [open(), heading('Both', 'The martini glass: lead first, then let go')];
  const cx = 360, top = 150, bowlB = 420, foot = 650;
  out.push(`<path d="M${cx - 270} ${top} L${cx + 270} ${top} L${cx} ${bowlB} Z" fill="#eef1f5" stroke="${NU.navy}" stroke-width="4" stroke-linejoin="round"/>`);
  /* the bowl: every road, to explore */
  const m = mini(440, 150, { others: true, ymax: 180, heroColour: NU.red, heroWidth: 3 });
  out.push(`<defs><clipPath id="bowl"><path d="M${cx - 266} ${top + 3} L${cx + 266} ${top + 3} L${cx} ${bowlB - 4} Z"/></clipPath></defs>`);
  out.push(`<g clip-path="url(#bowl)"><g transform="translate(${cx - 220} ${top + 12})">${m.svg}</g></g>`);
  out.push(`<line x1="${cx}" y1="${bowlB}" x2="${cx}" y2="${foot - 8}" stroke="${NU.navy}" stroke-width="4"/><line x1="${cx - 110}" y1="${foot}" x2="${cx + 110}" y2="${foot}" stroke="${NU.navy}" stroke-width="8" stroke-linecap="round"/>`);
  const steps = [['Headline', 'a third of 2010’s NO₂'], ['Note', 'ULEZ, lockdown'], ['Highlight', 'Marylebone Road in red']];
  steps.forEach(([t, s], i) => {
    const y = foot - 50 - i * 66;
    out.push(`<circle cx="${cx}" cy="${y}" r="20" fill="${NU.red}"/>` + text(cx, y + 7, String(i + 1), { size: 19, weight: 700, anchor: 'middle', colour: '#fff' }));
    out.push(text(cx + 36, y - 2, t, { size: 19, weight: 700 }) + text(cx + 36, y + 22, s, { size: 18, colour: NU.dim }));
  });
  const tx = 760;
  out.push(text(tx, 200, 'THE BOWL · THE READER DRIVES', { size: 15, weight: 700, colour: NU.red, spacing: 2 }));
  ['Every monitor appears.', 'Point at any line for its numbers.', 'Find your own road or borough.'].forEach((l, i) => out.push(text(tx, 236 + i * 32, l, { size: 22 })));
  out.push(text(tx, 420, 'THE STEM · THE AUTHOR DRIVES', { size: 15, weight: 700, colour: NU.red, spacing: 2 }));
  ['Few steps, in order, read upwards.', 'One message the reader cannot miss.', 'Short: or nobody reaches the bowl.'].forEach((l, i) => out.push(text(tx, 456 + i * 32, l, { size: 22 })));
  out.push(text(tx, 620, 'Named by Segel and Heer (2010).', { size: 18, colour: NU.dim }));
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ icons for the reveal lists */
const st = (w = 3.2) => `fill="none" stroke="${NU.navy}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const ICON = {
  network: `<path d="M-14 -10 L10 -14 L14 10 L-12 12 Z M-14 -10 L14 10" ${st(2.4)}/><circle cx="-14" cy="-10" r="4" fill="${NU.navy}"/><circle cx="10" cy="-14" r="4" fill="${NU.navy}"/><circle cx="14" cy="10" r="4" fill="${NU.navy}"/><circle cx="-12" cy="12" r="4" fill="${NU.navy}"/>`,
  grid: [0, 1, 2].map(i => [0, 1, 2].map(j => `<rect x="${-17 + j * 12}" y="${-17 + i * 12}" width="10" height="10" fill="${i === 1 && j === 2 ? NU.red : '#c9d3dd'}"/>`).join('')).join(''),
  tube: `<circle r="15" fill="none" stroke="${NU.red}" stroke-width="6"/><rect x="-21" y="-4.5" width="42" height="9" fill="${NU.navy}"/>`,
  eye: `<path d="M-20 0 C -10 -14, 10 -14, 20 0 C 10 14, -10 14, -20 0 Z" ${st(2.8)}/><circle r="6" fill="${NU.navy}"/>`,
  question: `<circle r="17" ${st()}/><path d="M-5 -6 a6 6 0 1 1 7 6 v4" ${st(3)}/><circle cy="10" r="2.4" fill="${NU.navy}"/>`,
  clock: `<circle r="17" ${st()}/><path d="M0 -9 v9 l7 5" ${st(3)}/>`,
  mirror: `<circle cx="-4" cy="-6" r="7" ${st(2.8)}/><path d="M-16 16 a12 11 0 0 1 24 0" ${st(2.8)}/><path d="M12 -12 l6 6 M12 -4 l6 -6" stroke="${NU.red}" stroke-width="2.6" stroke-linecap="round"/>`,
  truth: `<path d="M-16 10 L-4 -2 L4 4 L16 -12" fill="none" stroke="${NU.red}" stroke-width="3.4" stroke-linecap="round"/><path d="M-16 -4 h32" stroke="${NU.navy}" stroke-width="2.4" stroke-dasharray="4 4"/>`,
  heart: `<path d="M0 14 C -18 2, -16 -14, -6 -14 C -2 -14, 0 -10, 0 -8 C 0 -10, 2 -14, 6 -14 C 16 -14, 18 2, 0 14 Z" ${st(2.8)}/>`,
  axis: `<path d="M-16 -16 v32 h32" ${st(2.8)}/><rect x="-10" y="-2" width="7" height="14" fill="${NU.red}"/><rect x="2" y="-12" width="7" height="24" fill="${NU.navy}"/>`,
  hidden: `<circle cx="-6" cy="-6" r="7" ${st(2.8)}/><path d="M-18 16 a12 11 0 0 1 24 0" ${st(2.8)}/><path d="M-20 -20 L18 18" stroke="${NU.red}" stroke-width="3" stroke-linecap="round"/>`,
  letter: t => `<text y="10" text-anchor="middle" font-family="${NU.serif}" font-size="30" fill="${NU.navy}">${t}</text>`,
  number: t => `<text y="9" text-anchor="middle" font-family="${NU.sans}" font-size="26" font-weight="700" fill="#fff">${t}</text>`
};
const num = t => ({ icon: ICON.number(t), ring: NU.navy });
const LEAD = { text: 'LEAD', fill: NU.red }, LETGO = { text: 'LET GO', fill: NU.navy }, BOTH = { text: 'BOTH', fill: '#5a6572' };
const REVEAL = {
  recall: { mode: 'answers', sub: 'No notes. Answer from memory, then we check.', textX: 640, size: 22, max: 150,
    rows: [
      { icon: ICON.network, name: 'What makes a network a tree?', text: 'One root and no loops: you can’t go round in a circle and come back.' },
      { icon: ICON.grid, name: 'When do you swap dots and lines for a grid?', text: 'When the lines tangle. A grid gives each pair one square, so nothing crosses.' },
      { icon: ICON.tube, name: 'What did Harry Beck’s Tube map give up?', text: 'True distances. He kept what connects to what, the thing a passenger needs.' }] },
  titles: { mode: 'answers', sub: 'Three titles for the same chart of Marylebone Road. Hands up: which one tells?', sayX: 160, tagX: 790, textX: 950, size: 18, saySize: 20, max: 140,
    rows: [
      { icon: ICON.letter('A'), say: '“NO₂ at Marylebone Road, 2010–2025”', tag: { text: 'A LABEL', fill: '#8a96a3' }, text: 'Says what the chart is, not what it shows.' },
      { icon: ICON.letter('B'), say: '“Air pollution is changing”', tag: { text: 'VAGUE', fill: '#4c78a8' }, text: 'A claim, but which way, how much, where?' },
      { icon: ICON.letter('C'), say: '“Marylebone Road’s air has a third of the NO₂ it had in 2010”', tag: { text: 'A FINDING', fill: NU.navy }, text: 'Where, what, how much, since when: the point in one sentence.' }] },
  cost: { mode: 'build', max: 118, rows: [
    { icon: ICON.eye, name: 'They may miss your point', text: 'Nothing tells them where to look. Many readers glance, then leave.' },
    { icon: ICON.question, name: 'They must know what to ask', text: 'Filters help experts. A newcomer doesn’t know which button matters.' },
    { icon: ICON.clock, name: 'It takes time', text: 'Exploring is slow. A busy reader wants the answer.' },
    { icon: ICON.mirror, name: 'But they find themselves', text: '“Where’s my road?” is the reason people stay. Give them that, and they care.' }] },
  martini: { mode: 'answers', sub: 'Why use a martini glass for a chart the public will read? Hands up: A, B or C.', sayX: 160, tagX: 790, textX: 950, size: 18, saySize: 19, max: 150,
    rows: [
      { icon: ICON.letter('A'), say: '“Because interactive charts look more modern.”', tag: { text: 'WEAK', fill: '#8a96a3' }, text: 'About looks, not about the reader.' },
      { icon: ICON.letter('B'), say: '“Because the public need to be told the main point before they explore.”', tag: { text: 'STABLE', fill: '#4c78a8' }, text: 'A point and a reason. Missing: what the bowl adds, and a case.' },
      { icon: ICON.letter('C'), say: '“Most of the public won’t explore, so the stem gives everyone the finding: NO₂ fell by two-thirds. Then the bowl lets the curious find their own road, which makes it personal.”', tag: { text: 'EXCELLENT', fill: NU.navy }, text: 'Point, reason, what follows, and the case: every link.' }] },
  care: { mode: 'build', max: 118, rows: [
    { icon: ICON.truth, name: 'Show the truth, clearly', text: 'After a guess, the real data must be bigger and bolder than the guess.' },
    { icon: ICON.heart, name: 'Feeling is not evidence', text: 'An image that moves people still needs a source, and a number on it.' },
    { icon: ICON.axis, name: 'Keep the scale honest', text: 'Count from zero; compare like with like. A kerbside monitor reads about twice a background one.' },
    { icon: ICON.hidden, name: 'Never shame a guess', text: 'Keep guesses private. Being wrong is the point: it is how you remember.' }] },
  quiz: { mode: 'answers', sub: 'Hands up for each: Lead, Let go, or Both?', size: 19, max: 92, tagX: 640, textX: 800,
    rows: [
      { ...num(1), name: 'A bus-stop poster about clean air', tag: LEAD, text: 'Seconds to read: one headline, one chart.' },
      { ...num(2), name: 'A researcher comparing every monitor', tag: LETGO, text: 'An expert with their own questions.' },
      { ...num(3), name: 'A news story the public can then explore', tag: BOTH, text: 'The point first, then “find your road”.' },
      { ...num(4), name: 'A council meeting deciding on a new zone', tag: LEAD, text: 'Ten minutes, one decision: tell them.' },
      { ...num(5), name: 'Your five-chart final infographic', tag: LEAD, text: 'A page has no buttons: every panel must tell.' }] },
  ladder: { mode: 'build', rail: true, max: 118, rows: [
    { ...num(1), name: 'Ask yourself', text: 'Who reads it, and how long do they have?' },
    { ...num(2), name: 'Hint', text: 'Little time or one message: lead. Experts with questions: let go. A public who might stay: both.' },
    { ...num(3), name: 'Example', text: 'A bus-stop poster: seconds, the public, one message. Lead.' },
    { ...num(4), name: 'Try a new one', text: 'A school’s website page about its own street’s air, for parents.' }] }
};

module.exports = { rhythmSvg, PAT, routeSvg, codeSvg, spectrumSvg, martiniSvg, authorSvg, mantraSvg, structuresSvg, feltSvg, famousSvg, panelBoxes, REVEAL, STEPS, AIR, MY1 };
