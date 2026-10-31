'use strict';
/* Week 8's drawn pictures, as plain SVG at 1280x720 (no foreignObject: the
 * Lesson studio cannot draw one). Northeastern navy, red and warm white; any
 * other colour is data.
 *
 *   routeSvg()          the course so far, Week 8 marked
 *   codeSvg(id, o)      a Build-it slide: the Altair (left), the picture it made (right), and what each part does
 *   termsSvg()          the words for a tree, on one small tree
 *   edgeTypesSvg()      undirected, directed and weighted edges
 *   cardsSvg()          the three ways to draw, side by side
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const DIR = 'assets/lesson/ipdv/week8';
const NU = {
  red: '#c8102e', navy: '#0c3354', deep: '#0a2a45', paper: '#fbfaf8', ink: '#14181f', dim: '#5a6572', rule: '#d9d4ca',
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  sans: "'Avenir Next', Avenir, 'Segoe UI', Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace"
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pre = s => esc(s).replace(/ /g, '&#160;');
const open = (bg = NU.paper) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">\n<rect width="1280" height="720" fill="${bg}"/>`;
const heading = (eyebrow, title) => `<text x="64" y="58" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="2.6" fill="${NU.red}">${esc(eyebrow.toUpperCase())}</text>
<text x="64" y="100" font-family="${NU.serif}" font-size="36" fill="${NU.ink}">${esc(title)}</text>`;

/* Text wrapped to a width, by an average character advance. */
function wrap(text, size, width) {
  const words = String(text).split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (line && next.length * size * 0.52 > width) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------ the route */
const WEEKS = [
  ['1', 'Why visualise?'], ['2', 'Building charts'], ['3', 'Encoding'], ['4', 'Colour'], ['5', 'Interaction'],
  ['6', 'Reading week'], ['7', 'Maps'], ['8', 'Networks and trees'], ['★', 'Final piece: the infographic']
];
function routeSvg() {
  const out = [open(), heading('The route', 'Eight weeks in, one more kind of data')];
  const x = i => 110 + i * 132, y = 360;
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(8)}" y2="${y}" stroke="${NU.rule}" stroke-width="6"/>`);
  out.push(`<line x1="${x(0)}" y1="${y}" x2="${x(7)}" y2="${y}" stroke="${NU.navy}" stroke-width="6"/>`);
  WEEKS.forEach(([n, t], i) => {
    const here = n === '8', done = i < 7, gap = n === '6';
    out.push(`<circle cx="${x(i)}" cy="${y}" r="${here ? 30 : 22}" fill="${here ? NU.red : done ? NU.navy : NU.paper}" stroke="${here ? NU.red : NU.navy}" stroke-width="4" ${gap ? 'stroke-dasharray="5 5"' : ''}/>`);
    out.push(`<text x="${x(i)}" y="${y + 8}" text-anchor="middle" font-family="${NU.sans}" font-size="${here ? 24 : 20}" font-weight="700" fill="${here || done ? '#fff' : NU.navy}">${n}</text>`);
    wrap(t, 17, 118).forEach((l, k) => out.push(`<text x="${x(i)}" y="${y + 66 + k * 22}" text-anchor="middle" font-family="${NU.sans}" font-size="17" font-weight="${here ? 700 : 500}" fill="${here ? NU.red : NU.ink}">${esc(l)}</text>`));
  });
  out.push(`<text x="${x(7)}" y="${y - 52}" text-anchor="middle" font-family="${NU.sans}" font-size="16" font-weight="700" letter-spacing="1.5" fill="${NU.red}">YOU ARE HERE</text>`);
  out.push(`<text x="64" y="580" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">Weeks 1–7 drew tables: one row per thing. Today the data is the connections between things.</text>`);
  out.push(`<text x="64" y="614" font-family="${NU.sans}" font-size="22" fill="${NU.dim}">The final page can carry a network or a tree as one of its panels.</text>`);
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
  /* The picture, fitted into the right-hand box. */
  const p = png(`code-${id}.png`), bx = 710, by = 128, bw = 530, bh = o.words.length ? 330 : 560;
  const k = Math.min(bw / p.w, bh / p.h), w = p.w * k, h = p.h * k;
  out.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fff" stroke="${NU.rule}"/>`);
  out.push(`<image href="${p.uri}" x="${(bx + (bw - w) / 2).toFixed(1)}" y="${(by + (bh - h) / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`);
  out.push(`<text x="${bx}" y="${by + bh + 26}" font-family="${NU.sans}" font-size="14" fill="${NU.dim}">The picture this code drew, run as it is printed</text>`);
  let wy = by + bh + 60;
  o.words.forEach(line => {
    const [lead, rest] = line.split('\t');
    out.push(`<rect x="${bx}" y="${wy - 15}" width="5" height="18" fill="${NU.red}"/>`);
    const body = wrap(rest || '', 16, bw - 30);
    out.push(`<text x="${bx + 16}" y="${wy}" font-family="${NU.mono}" font-size="15" font-weight="700" fill="${NU.navy}">${pre(lead)}</text>`);
    body.forEach((b, i) => out.push(`<text x="${bx + 16}" y="${wy + 22 + i * 21}" font-family="${NU.sans}" font-size="16" fill="${NU.ink}">${esc(b)}</text>`));
    wy += 30 + body.length * 21;
  });
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ the words for a tree
   The tree on the right; the words in one column on the left, each level with the row it names,
   so no label sits on a line, a node or another label. */
function termsSvg() {
  const out = [open(), heading('Name it', 'The words for a tree, on one tree')];
  const P = { L: [890, 176], I: [720, 306], O: [1060, 306], W: [620, 436], E: [850, 436], S: [1000, 436], N: [1130, 436],
    c: [540, 566], k: [620, 566], h: [700, 566], t: [810, 566], i: [890, 566] };
  const kids = { L: ['I', 'O'], I: ['W', 'E'], O: ['S', 'N'], W: ['c', 'k', 'h'], E: ['t', 'i'] };
  const label = { L: 'London', I: 'Inner', O: 'Outer', W: 'West', E: 'East', S: 'South', N: 'NE', c: 'Camden', k: 'K&C', h: 'H&F', t: 'Tower H.', i: 'Islington' };
  /* The subtree under West, drawn first so the lines and nodes sit on top of it. */
  out.push(`<rect x="496" y="402" width="248" height="232" rx="14" fill="#f3e3e6" stroke="${NU.red}" stroke-width="2" stroke-dasharray="8 6"/>`);
  for (const [p, cs] of Object.entries(kids)) for (const c of cs) out.push(`<line x1="${P[p][0]}" y1="${P[p][1]}" x2="${P[c][0]}" y2="${P[c][1]}" stroke="${NU.dim}" stroke-width="3"/>`);
  for (const [k, [x, y]] of Object.entries(P)) {
    const leaf = !kids[k], r = k === 'L' ? 40 : leaf ? 16 : 30;
    out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${k === 'L' ? NU.red : leaf ? '#fff' : NU.navy}" stroke="${k === 'L' ? NU.red : NU.navy}" stroke-width="3"/>`);
    out.push(leaf
      ? `<text x="${x}" y="${y + 38}" text-anchor="middle" font-family="${NU.sans}" font-size="15" font-weight="700" fill="${NU.ink}">${esc(label[k])}</text>`
      : `<text x="${x}" y="${y + 5}" text-anchor="middle" font-family="${NU.sans}" font-size="${k === 'L' ? 15 : 14}" font-weight="700" fill="#fff">${esc(label[k])}</text>`);
  }
  ['Level 0', 'Level 1', 'Level 2', 'Level 3'].forEach((t, i) => out.push(`<text x="1240" y="${[182, 312, 442, 572][i]}" text-anchor="end" font-family="${NU.sans}" font-size="15" fill="${NU.dim}">${t}</text>`));
  /* The words: one column, flush left, each beside its own level. */
  const NOTES = [
    [168, 'Root', 'The one node with no parent: London.'],
    [294, 'Parent and children', 'Inner and Outer are London’s children; London is their parent.'],
    [412, 'Siblings', 'Nodes with the same parent, like West and East.'],
    [520, 'Subtree (the pink box)', 'A node and everything below it.'],
    [616, 'Leaves', 'Nodes with no children: the boroughs, South and NE.']
  ];
  for (const [y, term, text] of NOTES) {
    out.push(`<text x="64" y="${y}" font-family="${NU.sans}" font-size="21" font-weight="700" fill="${NU.red}">${esc(term)}</text>`);
    wrap(text, 17, 380).forEach((l, i) => out.push(`<text x="64" y="${y + 26 + i * 22}" font-family="${NU.sans}" font-size="17" fill="${NU.ink}">${esc(l)}</text>`));
  }
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ three kinds of edge */
function edgeTypesSvg() {
  const out = [open(), heading('Name it', 'Three kinds of edge')];
  out.push(`<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${NU.navy}"/></marker></defs>`);
  const panel = (x0, title, sub, kind) => {
    const A = [x0 + 60, 240], B = [x0 + 300, 240], C = [x0 + 180, 440];
    const edge = (p, q, w) => {
      /* Lines stop short of each node; an arrow stops short enough for its head to touch the circle, not cross it. */
      const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, end = kind === 'directed' ? 64 : 38;
      const a = [p[0] + ux * 38, p[1] + uy * 38], b = [q[0] - ux * end, q[1] - uy * end];
      out.push(`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${NU.navy}" stroke-width="${kind === 'weighted' ? 2 + w * 1.6 : 4}" ${kind === 'directed' ? 'marker-end="url(#arr)"' : ''}/>`);
      /* A weight sits off its line, on the outside of the triangle. */
      if (kind === 'weighted') {
        const cx = x0 + 180, cy = 307, mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        let nx = -uy, ny = ux;
        if ((mx + nx - cx) * nx + (my + ny - cy) * ny < 0) { nx = -nx; ny = -ny; }
        out.push(`<text x="${(mx + nx * 30).toFixed(1)}" y="${(my + ny * 30 + 9).toFixed(1)}" text-anchor="middle" font-family="${NU.sans}" font-size="26" font-weight="700" fill="${NU.red}">${w}</text>`);
      }
    };
    edge(A, B, 5); edge(B, C, 1); edge(C, A, 3);
    [[A, 'A'], [B, 'B'], [C, 'C']].forEach(([p, t]) => out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="30" fill="${NU.navy}"/><text x="${p[0]}" y="${p[1] + 8}" text-anchor="middle" font-family="${NU.sans}" font-size="22" font-weight="700" fill="#fff">${t}</text>`));
    out.push(`<text x="${x0 + 180}" y="540" text-anchor="middle" font-family="${NU.serif}" font-size="30" fill="${NU.ink}">${esc(title)}</text>`);
    wrap(sub, 18, 330).forEach((l, i) => out.push(`<text x="${x0 + 180}" y="${576 + i * 24}" text-anchor="middle" font-family="${NU.sans}" font-size="18" fill="${NU.dim}">${esc(l)}</text>`));
  };
  panel(60, 'Undirected', 'Both ways at once: two stations joined by track, two friends on Facebook.', 'undirected');
  panel(460, 'Directed', 'One way: you follow someone on Instagram; they may not follow you back.', 'directed');
  panel(860, 'Weighted', 'A number on each edge: minutes between stations, scenes two characters share.', 'weighted');
  out.push('</svg>');
  return out.join('\n');
}

/* ------------------------------------------------------------ the three ways to draw */
function cardsSvg() {
  const out = [open(), heading('Three ways to draw connections', 'Connect, matrix, nest')];
  const card = (x, title, line, good, bad, draw) => {
    out.push(`<rect x="${x}" y="130" width="368" height="540" rx="10" fill="#fff" stroke="${NU.rule}"/>`);
    out.push(`<text x="${x + 24}" y="178" font-family="${NU.serif}" font-size="32" fill="${NU.navy}">${esc(title)}</text>`);
    out.push(`<text x="${x + 24}" y="208" font-family="${NU.sans}" font-size="17" fill="${NU.dim}">${esc(line)}</text>`);
    out.push(draw(x + 24, 230));
    out.push(`<text x="${x + 24}" y="512" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="1.5" fill="${NU.navy}">GOOD FOR</text>`);
    wrap(good, 17, 320).forEach((l, i) => out.push(`<text x="${x + 24}" y="${536 + i * 22}" font-family="${NU.sans}" font-size="17" fill="${NU.ink}">${esc(l)}</text>`));
    out.push(`<text x="${x + 24}" y="602" font-family="${NU.sans}" font-size="15" font-weight="700" letter-spacing="1.5" fill="${NU.red}">BREAKS WHEN</text>`);
    wrap(bad, 17, 320).forEach((l, i) => out.push(`<text x="${x + 24}" y="${626 + i * 22}" font-family="${NU.sans}" font-size="17" fill="${NU.ink}">${esc(l)}</text>`));
  };
  const link = (x, y) => {
    const P = [[60, 40], [200, 20], [140, 120], [280, 110], [60, 220], [220, 230], [300, 200]], E = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 6], [4, 5], [5, 6], [3, 5]];
    return E.map(([a, b]) => `<line x1="${x + P[a][0]}" y1="${y + P[a][1]}" x2="${x + P[b][0]}" y2="${y + P[b][1]}" stroke="${NU.dim}" stroke-width="3"/>`).join('') +
      P.map(p => `<circle cx="${x + p[0]}" cy="${y + p[1]}" r="13" fill="${NU.navy}"/>`).join('');
  };
  const matrix = (x, y) => {
    const on = ['0,1', '0,2', '1,2', '2,3', '2,4', '3,6', '4,5', '5,6', '3,5'], c = 34, s = [];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const hit = on.includes(`${i},${j}`) || on.includes(`${j},${i}`);
      s.push(`<rect x="${x + 40 + j * c}" y="${y + i * c}" width="${c - 3}" height="${c - 3}" rx="3" fill="${hit ? NU.navy : '#eef1f4'}"/>`);
    }
    return s.join('');
  };
  const nest = (x, y) => [
    `<rect x="${x}" y="${y}" width="320" height="240" fill="#4c78a8" fill-opacity=".25"/>`,
    `<rect x="${x + 6}" y="${y + 6}" width="120" height="228" fill="#4c78a8"/>`,
    `<rect x="${x + 132}" y="${y + 6}" width="182" height="120" fill="#f58518"/>`,
    `<rect x="${x + 132}" y="${y + 132}" width="100" height="102" fill="#f58518" fill-opacity=".8"/>`,
    `<rect x="${x + 238}" y="${y + 132}" width="76" height="102" fill="#f58518" fill-opacity=".6"/>`].join('');
  card(40, 'Connect', 'Dots, and lines between them', 'Following a route: how do I get from A to B?', 'There are too many lines: the hairball.', link);
  card(456, 'Matrix', 'A grid: a row and a column per node', 'Dense networks; who links to whom; spotting groups.', 'You need to follow a path across it.', matrix);
  card(872, 'Nest', 'Boxes inside boxes (trees only)', 'Sizes inside a hierarchy: what takes up the space?', 'You need to see how deep the tree goes.', nest);
  out.push('</svg>');
  return out.join('\n');
}

module.exports = { routeSvg, codeSvg, termsSvg, edgeTypesSvg, cardsSvg, STEPS };
