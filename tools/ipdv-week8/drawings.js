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
 *   jobsSvg() … disguiseTreeSvg()   a row of panels, one idea per small picture, where cards had words only
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


/* ------------------------------------------------------------ panels: one idea per picture */
/* A row of panels, each a small drawing with a title and a line or two under it, all flush left.
   `arrows` puts a red arrow in each gap, for a row that is done in order. */
const DATA = ['#4c78a8', '#f58518', '#54a24b'];
const EDGE = '#9aa3ad';
function panelsSvg(eyebrow, title, items, o = {}) {
  const out = [open(), heading(eyebrow, title)];
  if (o.sub) out.push(`<text x="64" y="134" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${esc(o.sub)}</text>`);
  const n = items.length, gap = o.arrows ? 44 : 20, w = (1152 - gap * (n - 1)) / n, top = o.sub ? 160 : 140;
  /* The words take what they need; the drawing gets the rest of the card. */
  const lines = Math.max(...items.map(it => wrap(it.text, 18, w - 40).length));
  const dh = 660 - top - 18 - 64 - 34 - lines * 25 - 4;
  items.forEach((it, i) => {
    const x = 64 + i * (w + gap), dy = it.h ? Math.max(0, (dh - it.h) / 2) : 0;
    out.push(`<rect x="${x}" y="${top}" width="${w}" height="${660 - top}" rx="10" fill="#fff" stroke="${NU.rule}"/>`);
    out.push(`<g transform="translate(${x + 20} ${(top + 18 + dy).toFixed(1)})">${it.draw(w - 40, it.h ? Math.min(it.h, dh) : dh)}</g>`);
    out.push(`<text x="${x + 20}" y="${top + dh + 64}" font-family="${NU.serif}" font-size="28" fill="${NU.navy}">${esc(it.title)}</text>`);
    wrap(it.text, 18, w - 40).forEach((l, k) => out.push(`<text x="${x + 20}" y="${top + dh + 98 + k * 25}" font-family="${NU.sans}" font-size="18" fill="${NU.ink}">${esc(l)}</text>`));
    if (o.arrows && i < n - 1) {
      const ax = x + w + gap / 2, ay = top + 18 + dh / 2;
      out.push(`<path d="M${ax - 12} ${ay} L${ax + 8} ${ay} M${ax + 1} ${ay - 8} L${ax + 9} ${ay} L${ax + 1} ${ay + 8}" stroke="${NU.red}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  });
  out.push('</svg>');
  return out.join('\n');
}

/* One small network used across the panels: three groups, each a hub and a ring, a few links between groups.
   Laid out in a 240 x 240 box, scaled to each panel. */
const NET = (() => {
  const nodes = [], edges = [], centres = [[62, 64], [180, 62], [122, 182]];
  centres.forEach(([cx, cy], g) => {
    const hub = nodes.length;
    nodes.push({ x: cx, y: cy, g, hub: true });
    for (let k = 0; k < 6; k++) {
      const a = (k * 60 + 30 * g) * Math.PI / 180;
      nodes.push({ x: cx + Math.cos(a) * 44, y: cy + Math.sin(a) * 44, g });
      edges.push([hub, hub + 1 + k]);
      if (k % 2 === 0) edges.push([hub + 1 + k, hub + 1 + ((k + 1) % 6)]);
    }
  });
  /* between groups: ring node k of group g is index g * 7 + 1 + k */
  const r = (g, k) => g * 7 + 1 + k;
  edges.push([r(0, 0), r(1, 3)], [r(1, 2), r(2, 5)], [r(0, 1), r(2, 4)], [r(1, 1), r(2, 0)]);
  const deg = nodes.map((_, i) => edges.filter(e => e.includes(i)).length);
  return { nodes, edges, deg, between: edges.filter(([a, b]) => nodes[a].g !== nodes[b].g) };
})();

/* Draw nodes and edges in a w x h box. Positions come in NET's 240-box unless `pos` is given. */
function net(w, h, o = {}) {
  const N = o.nodes || NET.nodes, E = o.edges || NET.edges, k = Math.min(w, h) / 240, dx = (w - 240 * k) / 2, dy = (h - 240 * k) / 2;
  const at = i => { const p = o.pos ? o.pos[i] : N[i]; return [dx + p.x * k, dy + p.y * k]; };
  const show = o.show || (() => true), s = [];
  E.forEach(([a, b], j) => {
    if (!show(a) || !show(b)) return;
    const st = (o.edge && o.edge([a, b], j)) || {};
    const p = at(a), q = at(b);
    s.push(`<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" stroke="${st.colour || EDGE}" stroke-width="${st.width || 2.5}" opacity="${st.opacity ?? 1}" stroke-linecap="round"/>`);
  });
  N.forEach((n, i) => {
    if (!show(i)) return;
    const st = (o.node && o.node(n, i)) || {}, p = at(i);
    s.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(st.r || (n.hub ? 9 : 7)).toFixed(1)}" fill="${st.colour || NU.navy}" opacity="${st.opacity ?? 1}" stroke="#fff" stroke-width="2"/>`);
  });
  return s.join('');
}
const label = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-family="${NU.sans}" font-size="${o.size || 15}" font-weight="${o.weight || 600}" text-anchor="${o.anchor || 'start'}" fill="${o.colour || NU.dim}">${esc(t)}</text>`;
const ring = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${NU.red}" stroke-width="3"/>`;

/* A tangle: many nodes, many crossing edges, seeded so it is the same every build. */
function tangle(w, h) {
  let t = 7;
  const rnd = () => { t = (t + 0x6D2B79F5) | 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const R = Math.min(w, h) / 2 - 10, P = Array.from({ length: 34 }, () => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R; return [w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d]; }), s = [];
  for (let i = 0; i < 90; i++) { const a = P[Math.floor(rnd() * 34)], b = P[Math.floor(rnd() * 34)]; s.push(`<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${EDGE}" stroke-width="1.6"/>`); }
  P.forEach(p => s.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5" fill="${NU.navy}" stroke="#fff" stroke-width="1.5"/>`));
  return s.join('');
}

/* Why look at a network: four jobs, on one network. */
function jobsSvg() {
  /* A route: a ring node in group 0, its hub, the link out to group 2, and that group's hub. */
  const route = (() => {
    const [a, b] = NET.between.find(([x, y]) => NET.nodes[x].g === 0 && NET.nodes[y].g === 2);
    return [4, 0, a, b, 14];
  })();
  const onRoute = new Set(route.slice(1).map((v, i) => [route[i], v].sort().join('-')));
  const icon = (x, y, kind) => {
    const s = [], dot = (a, b, r = 5) => s.push(`<circle cx="${x + a}" cy="${y + b}" r="${r}" fill="${NU.navy}"/>`), ln = (a, b, c, d) => s.push(`<line x1="${x + a}" y1="${y + b}" x2="${x + c}" y2="${y + d}" stroke="${EDGE}" stroke-width="2"/>`);
    if (kind === 'web') { const P = [[10, 10], [50, 6], [30, 30], [8, 52], [52, 50]]; [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [1, 4]].forEach(([a, b]) => ln(...P[a], ...P[b])); P.forEach(p => dot(...p)); }
    if (kind === 'islands') { const P = [[6, 12], [26, 6], [16, 30], [40, 40], [60, 34], [52, 58]]; [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5]].forEach(([a, b]) => ln(...P[a], ...P[b])); P.forEach(p => dot(...p)); }
    if (kind === 'star') { for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ln(30, 30, 30 + Math.cos(a) * 28, 30 + Math.sin(a) * 28); dot(30 + Math.cos(a) * 28, 30 + Math.sin(a) * 28, 4.5); } dot(30, 30, 7); }
    return s.join('');
  };
  return panelsSvg('Why', 'Why look at a network? Four jobs', [
    { title: 'Follow a path', text: 'How do I get from here to there? Brixton to Bank.', draw: (w, h) => net(w, h, {
      edge: ([a, b]) => onRoute.has([a, b].sort().join('-')) ? { colour: NU.red, width: 5 } : { opacity: 0.5 },
      node: (n, i) => route.includes(i) ? { colour: NU.red } : { opacity: 0.5 } }) },
    { title: 'Find the busiest', text: 'Who has the most links? Draw them bigger.', draw: (w, h) => net(w, h, {
      node: (n, i) => ({ r: 3 + NET.deg[i] * 1.6, colour: n.hub ? NU.red : NU.navy }) }) },
    { title: 'Find the groups', text: 'Which things clump together? Colour each group.', draw: (w, h) => net(w, h, {
      node: n => ({ colour: DATA[n.g] }) }) },
    { title: 'See the shape', text: 'One web, separate islands, or a hub with spokes?', h: 252, draw: () =>
      [['web', 'One web'], ['islands', 'Islands'], ['star', 'Hub and spokes']].map(([k, t], i) =>
        `<g transform="translate(6 ${i * 86}) scale(1.15)">${icon(0, 0, k)}</g>` + label(96, i * 86 + 42, t, { colour: NU.ink, size: 17 })).join('') }
  ]);
}

/* When dots and lines stop working. */
function breaksSvg() {
  return panelsSvg('Name it', 'When dots and lines stop working', [
    { title: 'Too many lines', text: 'Past a few hundred, the middle is a tangle: a hairball.', draw: (w, h) => tangle(w, h) },
    { title: 'Crossings', text: 'At every crossing the eye can follow the wrong line.', h: 240, draw: (w) => {
      const P = [[30, 60], [w - 30, 70], [30, 190], [w - 30, 180], [w / 2 - 10, 20], [w / 2 + 10, 230]];
      const L = [[0, 3], [1, 2], [4, 5]].map(([a, b]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${EDGE}" stroke-width="3"/>`).join('');
      return L + P.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${NU.navy}" stroke="#fff" stroke-width="2"/>`).join('') + ring(w / 2, 125, 22);
    } },
    { title: 'Names pile up', text: 'Most charts can only name the busiest dots.', h: 220, draw: (w) => {
      const names = ['Valjean', 'Javert', 'Fantine', 'Marius', 'Cosette', 'Thénardier'], s = [], x0 = w / 2 - 50;
      names.forEach((t, i) => { const x = x0 + (i % 3) * 18, y = 76 + i * 13; s.push(`<circle cx="${x - 8}" cy="${y - 6}" r="6" fill="${NU.navy}"/>`, label(x, y, t, { colour: NU.ink, size: 19, weight: 500 })); });
      return s.join('') + ring(w / 2 + 4, 104, 76);
    } },
    { title: 'Near is not proof', text: 'Close dots are usually joined, but not always.', h: 230, draw: (w) => {
      /* Two groups; the left group's right dot sits next to the right group's left dot, with no line between them. */
      const A = [[20, 60], [70, 20], [80, 110], [30, 160]], B = [[w - 20, 50], [w - 80, 30], [w - 70, 120], [w - 30, 170]];
      A[2] = [w / 2 - 18, 110]; B[2] = [w / 2 + 18, 120];
      const E = [[0, 1], [1, 2], [0, 2], [0, 3], [2, 3]], s = [];
      [A, B].forEach(P => E.forEach(([a, b]) => s.push(`<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${EDGE}" stroke-width="2.5"/>`)));
      s.push(`<line x1="${A[3][0]}" y1="${A[3][1]}" x2="${B[3][0]}" y2="${B[3][1]}" stroke="${EDGE}" stroke-width="2.5"/>`);
      [...A, ...B].forEach(p => s.push(`<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${NU.navy}" stroke="#fff" stroke-width="2"/>`));
      s.push(`<ellipse cx="${w / 2}" cy="115" rx="44" ry="28" fill="none" stroke="${NU.red}" stroke-width="3" stroke-dasharray="6 5"/>`, label(w / 2, 210, 'close, but not joined', { anchor: 'middle', colour: NU.red, weight: 700 }));
      return s.join('');
    } }
  ]);
}

/* Let the reader move: zoom, filter, select, in that order. */
function moveSvg() {
  const g1 = i => NET.nodes[i].g === 1;
  return panelsSvg('Interaction', 'Too big to see at once? Let the reader move', [
    { title: 'Whole picture', text: 'Start with everything, to see the shape.', draw: (w, h) => {
      const k = Math.min(w, h) / 240, dx = (w - 240 * k) / 2, dy = (h - 240 * k) / 2;
      return net(w, h) + `<rect x="${(dx + 124 * k).toFixed(1)}" y="${(dy + 6 * k).toFixed(1)}" width="${(112 * k).toFixed(1)}" height="${(112 * k).toFixed(1)}" fill="none" stroke="${NU.red}" stroke-width="3" stroke-dasharray="6 5" rx="6"/>`;
    } },
    { title: 'Zoom', text: 'Look closer at one part, as on Google Maps.', draw: (w, h) => {
      const pos = NET.nodes.map(n => ({ x: (n.x - 180) * 2 + 120, y: (n.y - 62) * 2 + 120 }));
      return net(w, h, { pos, show: g1, node: n => ({ r: n.hub ? 14 : 11 }), edge: () => ({ width: 4 }) });
    } },
    { title: 'Filter', text: 'Hide what you don’t need: here, all but the links between groups.', draw: (w, h) => net(w, h, {
      edge: ([a, b]) => NET.nodes[a].g !== NET.nodes[b].g ? { colour: NU.navy, width: 4 } : { opacity: 0 },
      node: (n, i) => NET.between.some(e => e.includes(i)) ? {} : { opacity: 0.2 } }) },
    { title: 'Select', text: 'Point at one dot: its links light up.', draw: (w, h) => net(w, h, {
      edge: ([a, b]) => a === 7 || b === 7 ? { colour: NU.red, width: 4 } : { opacity: 0.25 },
      node: (n, i) => i === 7 ? { colour: NU.red, r: 11 } : NET.edges.some(e => e.includes(7) && e.includes(i)) ? {} : { opacity: 0.25 } }) }
  ], { arrows: true, sub: 'In that order: the whole picture first, then zoom and filter, then the detail of one thing.' });
}

/* Make the picture simpler. */
function simplerSvg() {
  /* The ego: a dot with a link out of its group. Its neighbourhood is drawn large, filling the panel. */
  const ego = 2, near = new Set([ego]);
  NET.edges.forEach(([a, b]) => { if (a === ego) near.add(b); if (b === ego) near.add(a); });
  const fit = list => {
    const xs = list.map(i => NET.nodes[i].x), ys = list.map(i => NET.nodes[i].y), x0 = Math.min(...xs), y0 = Math.min(...ys);
    const k = 200 / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1), ox = (240 - (Math.max(...xs) - x0) * k) / 2, oy = (240 - (Math.max(...ys) - y0) * k) / 2;
    return NET.nodes.map(n => ({ x: ox + (n.x - x0) * k, y: oy + (n.y - y0) * k }));
  };
  const egoPos = fit([...near]);
  /* a fisheye on group 0's hub: near things grow, far things squeeze toward the edge */
  const f = NET.nodes[0], R = 230;
  const fish = NET.nodes.map(n => {
    const dx = n.x - f.x, dy = n.y - f.y, d = Math.hypot(dx, dy) || 1, g = (2.2 * d / R) / (1.2 * d / R + 1) * R / d;
    return { x: f.x + dx * g * 0.95, y: f.y + dy * g * 0.95 };
  });
  const lo = fish.reduce((m, p) => [Math.min(m[0], p.x), Math.min(m[1], p.y)], [1e9, 1e9]);
  const hi = fish.reduce((m, p) => [Math.max(m[0], p.x), Math.max(m[1], p.y)], [-1e9, -1e9]);
  const sc = 220 / Math.max(hi[0] - lo[0], hi[1] - lo[1]);
  const fishPos = fish.map(p => ({ x: 10 + (p.x - lo[0]) * sc, y: 10 + (p.y - lo[1]) * sc }));
  const merged = { nodes: [0, 1, 2].map(g => ({ x: [62, 180, 122][g], y: [64, 62, 182][g], g })), edges: [[0, 1], [1, 2], [0, 2]] };
  const between = (a, b) => NET.between.filter(([x, y]) => [NET.nodes[x].g, NET.nodes[y].g].sort().join() === [a, b].sort().join()).length;
  return panelsSvg('Handle scale', 'Or make the picture simpler', [
    { title: 'The busiest', text: 'Keep only dots with many links; fade the rest.', draw: (w, h) => net(w, h, { node: (n, i) => NET.deg[i] >= 4 ? { r: 11 } : { opacity: 0.15 }, edge: ([a, b]) => NET.deg[a] >= 4 && NET.deg[b] >= 4 ? { width: 3.5 } : { opacity: 0.15 } }) },
    { title: 'One person', text: 'One dot and its neighbours: an ego network.', draw: (w, h) => net(w, h, { pos: egoPos, show: i => near.has(i), node: (n, i) => i === ego ? { colour: NU.red, r: 13 } : { r: 10 }, edge: () => ({ width: 3.5 }) }) },
    { title: 'Merge a group', text: 'Each group as one big dot; thicker line, more links.', draw: (w, h) => net(w, h, { nodes: merged.nodes, edges: merged.edges,
      node: n => ({ colour: DATA[n.g], r: 26 }), edge: ([a, b]) => ({ width: 4 + between(a, b) * 4 }) }) },
    { title: 'Magnify', text: 'Enlarge one part and squeeze the rest, as on the Tube map.', draw: (w, h) => net(w, h, { pos: fishPos,
      node: (n, i) => { const d = Math.hypot(fishPos[i].x - fishPos[0].x, fishPos[i].y - fishPos[0].y); return { r: Math.max(4, 13 - d / 18) }; } }) }
  ]);
}

/* When a tree gets too big. */
function bigTreeSvg() {
  const dot = (x, y, r = 7, c = NU.navy) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#fff" stroke-width="2"/>`;
  const ln = (a, b, c, d, o = 1) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${EDGE}" stroke-width="2.5" opacity="${o}"/>`;
  const South = [['Croydon', 410085], ['Bromley', 336048], ['Merton', 218891], ['Sutton', 213972], ['Kingston upon Thames', 172761]];
  return panelsSvg('Trees', 'When a tree gets too big', [
    { title: 'Too deep', text: 'Many levels: the drawing runs off the page.', h: 290, draw: (w, h) => {
      const s = [];
      for (let lv = 0; lv < 9; lv++) {
        const y = 14 + lv * 32, x = 30 + lv * 20, o = lv < 6 ? 1 : 1 - (lv - 5) * 0.3;
        if (lv) s.push(ln(x - 20, y - 32, x, y, o), ln(x - 20, y - 32, x - 36, y, o));
        if (lv) s.push(dot(x - 36, y, 5, NU.navy).replace('<circle', `<circle opacity="${o}"`));
        s.push(dot(x, y, 7).replace('<circle', `<circle opacity="${o}"`));
      }
      return s.join('') + `<path d="M${w - 30} ${h - 60} L${w - 30} ${h - 8} M${w - 40} ${h - 20} L${w - 30} ${h - 8} L${w - 20} ${h - 20}" stroke="${NU.red}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    } },
    { title: 'Too wide', text: 'One parent, hundreds of children: no room for names.', h: 220, draw: (w) => {
      const s = [dot(w / 2, 30, 9)], n = 32;
      for (let i = 0; i < n; i++) { const x = 6 + i * (w - 12) / (n - 1); s.push(ln(w / 2, 30, x, 150)); }
      for (let i = 0; i < n; i++) { const x = 6 + i * (w - 12) / (n - 1); s.push(dot(x, 150, 4)); }
      ['Barking', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden'].forEach((t, i) => s.push(label(6 + i * 30, 182 + (i % 2) * 6, t, { colour: NU.ink, size: 15, weight: 500 })));
      return s.join('') + ring(w / 2, 186, 48).replace('<circle', '<ellipse').replace(/ r="48"/, ` rx="${w / 2}" ry="26"`);
    } },
    { title: 'Fold it', text: 'Show the top levels; open a branch when you need it.', h: 230, draw: (w) => {
      const root = [w / 2, 24], kids = [[w * 0.18, 110], [w / 2, 110], [w * 0.82, 110]], s = [];
      kids.forEach(k => s.push(ln(...root, ...k)));
      const leaves = [[w * 0.36, 200], [w / 2, 200], [w * 0.64, 200]];
      leaves.forEach(l => s.push(ln(...kids[1], ...l)));
      s.push(dot(...root, 9)); kids.forEach(k => s.push(dot(...k, 9))); leaves.forEach(l => s.push(dot(...l, 7)));
      [[0, '+ 11'], [2, '+ 19']].forEach(([i, t]) => s.push(`<rect x="${kids[i][0] - 26}" y="${kids[i][1] + 20}" width="52" height="28" rx="14" fill="${NU.paper}" stroke="${NU.red}" stroke-width="2"/>`, label(kids[i][0], kids[i][1] + 40, t, { anchor: 'middle', colour: NU.red, weight: 700 })));
      return s.join('');
    } },
    { title: 'Zoom in', text: 'Show one branch on its own, then step back out.', draw: (w, h) => {
      const s = [label(0, 16, 'London › Outer › South', { colour: NU.red, size: 14, weight: 700 })], total = South.reduce((a, b) => a + b[1], 0);
      let y = 32;
      South.forEach(([t, v]) => { const hh = (h - 36) * v / total; s.push(`<rect x="0" y="${y.toFixed(1)}" width="${w}" height="${(hh - 3).toFixed(1)}" rx="3" fill="#f58518" fill-opacity="${0.45 + 0.55 * v / 410085}"/>`); if (hh > 22) s.push(label(8, y + hh / 2 + 5, t.replace(' upon Thames', ''), { colour: NU.ink, size: 14, weight: 600 })); y += hh; });
      return s.join('');
    } }
  ]);
}

/* Networks and trees in disguise. */
function disguiseNetSvg() {
  return panelsSvg('Related charts', 'Networks in disguise', [
    { title: 'Sankey', text: 'Flows from left to right: the wider the band, the more moves. Energy, money, voters.', draw: (w, h) => {
      const L = [['Gas', 90, DATA[0]], ['Wind', 60, DATA[2]], ['Coal', 30, '#7f7f7f']], R = [['Homes', 100], ['Industry', 80]], flows = [[0, 0, 55], [0, 1, 35], [1, 0, 35], [1, 1, 25], [2, 1, 20], [2, 0, 10]];
      const k = (h - 50) / 180, s = [], lx = 56, rx = w - 86;
      let y = 10; const ly = L.map(([, v]) => { const a = y; y += v * k + 12; return a; });
      y = 10; const ry = R.map(([, v]) => { const a = y; y += v * k + 24; return a; });
      const lo = L.map(() => 0), ro = R.map(() => 0);
      flows.forEach(([a, b, v]) => {
        const y0 = ly[a] + lo[a] * k, y1 = ry[b] + ro[b] * k, t = v * k; lo[a] += v; ro[b] += v;
        s.push(`<path d="M${lx} ${y0.toFixed(1)} C${(lx + rx) / 2} ${y0.toFixed(1)}, ${(lx + rx) / 2} ${y1.toFixed(1)}, ${rx} ${y1.toFixed(1)} L${rx} ${(y1 + t).toFixed(1)} C${(lx + rx) / 2} ${(y1 + t).toFixed(1)}, ${(lx + rx) / 2} ${(y0 + t).toFixed(1)}, ${lx} ${(y0 + t).toFixed(1)} Z" fill="${L[a][2]}" opacity=".45"/>`);
      });
      L.forEach(([t, v, c], i) => s.push(`<rect x="${lx - 10}" y="${ly[i]}" width="10" height="${(v * k).toFixed(1)}" fill="${c}"/>`, label(lx - 16, ly[i] + v * k / 2 + 5, t, { anchor: 'end', colour: NU.ink })));
      R.forEach(([t, v], i) => s.push(`<rect x="${rx}" y="${ry[i]}" width="10" height="${(v * k).toFixed(1)}" fill="${NU.navy}"/>`, label(rx + 16, ry[i] + v * k / 2 + 5, t, { colour: NU.ink })));
      return s.join('');
    } },
    { title: 'Chord', text: 'Groups around a circle, with bands between them for what flows.', draw: (w, h) => {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 12, s = [], seg = [[0, 80], [95, 175], [190, 265], [280, 350]];
      const pt = (deg, rr = r) => [cx + Math.cos((deg - 90) * Math.PI / 180) * rr, cy + Math.sin((deg - 90) * Math.PI / 180) * rr].map(v => v.toFixed(1)).join(' ');
      [[0, 1, DATA[0]], [0, 2, DATA[0]], [1, 3, DATA[1]], [2, 3, DATA[2]]].forEach(([a, b, c], i) => {
        const a0 = seg[a][0] + 6 + i * 4, a1 = a0 + 26, b0 = seg[b][0] + 8 + i * 3, b1 = b0 + 26;
        s.push(`<path d="M${pt(a0)} Q${cx} ${cy} ${pt(b1)} A${r} ${r} 0 0 0 ${pt(b0)} Q${cx} ${cy} ${pt(a1)} A${r} ${r} 0 0 0 ${pt(a0)} Z" fill="${c}" opacity=".45"/>`);
      });
      seg.forEach(([a, b], i) => s.push(`<path d="M${pt(a, r + 2)} A${r + 2} ${r + 2} 0 0 1 ${pt(b, r + 2)}" stroke="${[DATA[0], DATA[1], DATA[2], '#7f7f7f'][i]}" stroke-width="10" fill="none"/>`));
      return s.join('');
    } },
    { title: 'Arc diagram', text: 'Dots in a row; each line becomes an arch above them.', draw: (w, h) => {
      const n = 8, y = h - 40, x = i => 14 + i * (w - 28) / (n - 1), s = [];
      [[0, 1], [0, 3], [1, 2], [2, 5], [3, 4], [4, 7], [5, 6], [1, 6], [6, 7]].forEach(([a, b]) => { const r = (x(b) - x(a)) / 2; s.push(`<path d="M${x(a).toFixed(1)} ${y} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x(b).toFixed(1)} ${y}" stroke="${EDGE}" stroke-width="2.5" fill="none"/>`); });
      for (let i = 0; i < n; i++) s.push(`<circle cx="${x(i).toFixed(1)}" cy="${y}" r="8" fill="${NU.navy}" stroke="#fff" stroke-width="2"/>`);
      return s.join('');
    } }
  ]);
}

function disguiseTreeSvg() {
  const areas = [['Inner', [1120465, 2395493]], ['Outer', [2012352, 1351757, 2242842]]], total = 9122909;
  return panelsSvg('Related charts', 'Trees in disguise', [
    { title: 'Sunburst', text: 'An icicle bent into rings, with the root in the middle. London again.', draw: (w, h) => {
      const cx = w / 2, cy = h / 2, s = [];
      const arc = (a0, a1, r0, r1, c, o) => {
        const p = (a, r) => `${(cx + Math.sin(a) * r).toFixed(1)} ${(cy - Math.cos(a) * r).toFixed(1)}`, big = a1 - a0 > Math.PI ? 1 : 0;
        return `<path d="M${p(a0, r1)} A${r1} ${r1} 0 ${big} 1 ${p(a1, r1)} L${p(a1, r0)} A${r0} ${r0} 0 ${big} 0 ${p(a0, r0)} Z" fill="${c}" fill-opacity="${o}" stroke="#fff" stroke-width="2"/>`;
      };
      s.push(`<circle cx="${cx}" cy="${cy}" r="34" fill="${NU.navy}"/>`, label(cx, cy + 5, 'London', { anchor: 'middle', colour: '#fff', size: 13, weight: 700 }));
      let a = 0;
      areas.forEach(([, vs], i) => {
        const sum = vs.reduce((x, y) => x + y, 0), a1 = a + sum / total * Math.PI * 2;
        s.push(arc(a, a1, 36, 70, DATA[i], 0.9));
        let b = a; vs.forEach((v, j) => { const b1 = b + v / total * Math.PI * 2; s.push(arc(b, b1, 72, 106, DATA[i], 0.45 + 0.15 * j)); b = b1; });
        a = a1;
      });
      return s.join('');
    } },
    { title: 'Circle packing', text: 'A treemap made of circles inside circles.', draw: (w, h) => {
      const cx = w / 2, cy = h / 2, s = [`<circle cx="${cx}" cy="${cy}" r="108" fill="${NU.navy}" fill-opacity=".08" stroke="${NU.navy}" stroke-width="2"/>`];
      const groups = [[cx - 50, cy, 50, DATA[0], [[-18, -16, 20], [20, -10, 17], [0, 24, 19]]], [cx + 54, cy, 52, DATA[1], [[-20, -18, 18], [18, -20, 17], [-16, 22, 17], [22, 18, 16]]]];
      groups.forEach(([x, y, r, c, kids]) => {
        s.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="2"/>`);
        kids.forEach(([dx, dy, rr]) => s.push(`<circle cx="${x + dx}" cy="${y + dy}" r="${rr}" fill="${c}" fill-opacity=".8"/>`));
      });
      return s.join('');
    } },
    { title: 'Dendrogram', text: 'A tree of how things were grouped: alike things join low down.', draw: (w, h) => {
      const n = 6, x = i => 18 + i * (w - 36) / (n - 1), base = h - 30, s = [];
      const join = (x0, x1, y0a, y0b, y) => s.push(`<path d="M${x0} ${y0a} V${y} H${x1} V${y0b}" stroke="${NU.navy}" stroke-width="3" fill="none"/>`);
      join(x(0), x(1), base, base, base - 40); join(x(2), x(3), base, base, base - 60); join(x(4), x(5), base, base, base - 30);
      const m01 = (x(0) + x(1)) / 2, m23 = (x(2) + x(3)) / 2, m45 = (x(4) + x(5)) / 2;
      join(m01, m23, base - 40, base - 60, base - 120); const m03 = (m01 + m23) / 2;
      join(m03, m45, base - 120, base - 30, base - 190);
      for (let i = 0; i < n; i++) s.push(`<circle cx="${x(i)}" cy="${base}" r="7" fill="${NU.navy}"/>`, label(x(i), base + 26, String.fromCharCode(65 + i), { anchor: 'middle', colour: NU.ink }));
      return s.join('');
    } }
  ]);
}

/* ------------------------------------------------------------ rows: an icon, a name, a line of words */
/* A list, not cards: each row has a small drawn icon in a ring, its name, an optional tag, and a line or two,
   with thin rules between rows. A row's `tag` is { text, fill } (a pill), or '?' for a question still open. */
function rowsSvg(eyebrow, title, rows, o = {}) {
  const out = [open(), heading(eyebrow, title)];
  if (o.sub) out.push(`<text x="64" y="134" font-family="${NU.sans}" font-size="20" fill="${NU.dim}">${esc(o.sub)}</text>`);
  const top = o.sub ? 160 : 140, bottom = 668, rh = Math.min(o.max || 120, (bottom - top) / rows.length);
  const iconX = 104, nameX = 160, tagX = o.tagX || 470, textX = o.textX || (rows.some(r => r.tag) ? 712 : 470), size = o.size || 21;
  /* Every tag one width, so the column lines up. */
  const tagW = Math.max(60, ...rows.filter(r => r.tag && r.tag !== '?').map(r => r.tag.text.length * 10.5 + 34));
  if (o.rail) out.push(`<line x1="${iconX}" y1="${top + rh / 2}" x2="${iconX}" y2="${top + rh * (rows.length - 0.5)}" stroke="${NU.rule}" stroke-width="6"/>`);
  rows.forEach((r, i) => {
    const y0 = top + i * rh, cy = y0 + rh / 2, rr = Math.min(32, rh * 0.36);
    if (i) out.push(`<line x1="64" y1="${y0}" x2="1216" y2="${y0}" stroke="${NU.rule}" stroke-width="1.5"/>`);
    out.push(`<circle cx="${iconX}" cy="${cy}" r="${rr}" fill="${r.ring || '#eef1f5'}"/>`);
    out.push(`<g transform="translate(${iconX} ${cy}) scale(${(rr / 32).toFixed(3)})">${r.icon || ''}</g>`);
    const nameLines = wrap(r.name, 26, (r.tag ? tagX : textX) - nameX - 24);
    nameLines.forEach((l, k) => out.push(`<text x="${nameX}" y="${(cy + 9 - (nameLines.length - 1) * 15 + k * 30).toFixed(1)}" font-family="${NU.serif}" font-size="26" fill="${NU.ink}">${esc(l)}</text>`));
    if (r.tag) {
      const open = r.tag === '?', t = open ? '?' : r.tag.text, w = open ? 60 : tagW;
      out.push(`<rect x="${tagX}" y="${cy - 19}" width="${w}" height="38" rx="19" fill="${open ? '#fff' : r.tag.fill}" stroke="${open ? NU.rule : r.tag.fill}" stroke-width="2" ${open ? 'stroke-dasharray="5 4"' : ''}/>`);
      out.push(`<text x="${tagX + w / 2}" y="${cy + 6}" text-anchor="middle" font-family="${NU.sans}" font-size="${open ? 20 : 15}" font-weight="700" letter-spacing="${open ? 0 : 1.2}" fill="${open ? NU.dim : '#fff'}">${esc(t)}</text>`);
    }
    if (r.text) {
      const lines = wrap(r.text, size, 1216 - textX);
      lines.forEach((l, k) => out.push(`<text x="${textX}" y="${(cy + size * 0.35 - (lines.length - 1) * size * 0.65 + k * size * 1.3).toFixed(1)}" font-family="${NU.sans}" font-size="${size}" fill="${r.dim ? NU.dim : NU.ink}"${r.italic ? ' font-style="italic"' : ''}>${esc(l)}</text>`));
    }
  });
  out.push('</svg>');
  return out.join('\n');
}

/* Icons, drawn round (0, 0) in a 64-wide ring. Navy line work; colour only where it is the point. */
const st = (w = 3.2) => `fill="none" stroke="${NU.navy}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const ICON = {
  tube: `<circle r="15" fill="none" stroke="${NU.red}" stroke-width="6"/><rect x="-21" y="-4.5" width="42" height="9" fill="${NU.navy}"/>`,
  folder: `<path d="M-18 -10 h12 l4 5 h20 v20 h-36 z" ${st()}/>`,
  follow: `<circle cx="-12" cy="-6" r="5" ${st()}/><path d="M-20 10 a8 8 0 0 1 16 0" ${st()}/><circle cx="13" cy="-6" r="5" ${st()}/><path d="M5 10 a8 8 0 0 1 16 0" ${st()}/><path d="M-4 -12 h10 m-4 -4 l4 4 l-4 4" ${st(2.6)}/>`,
  org: `<rect x="-7" y="-19" width="14" height="10" ${st(2.6)}/><rect x="-21" y="9" width="14" height="10" ${st(2.6)}/><rect x="7" y="9" width="14" height="10" ${st(2.6)}/><path d="M0 -9 v8 M-14 9 v-6 h28 v6" ${st(2.6)}/>`,
  ball: `<circle r="17" ${st()}/><path d="M0 -7 l7 5 l-3 8 h-8 l-3 -8 z" fill="${NU.navy}"/><path d="M0 -7 v-10 M7 -2 l9 -3 M4 6 l5 8 M-4 6 l-5 8 M-7 -2 l-9 -3" ${st(2)}/>`,
  family: `<circle cx="-11" cy="-13" r="4.5" ${st(2.6)}/><circle cx="11" cy="-13" r="4.5" ${st(2.6)}/><circle cx="0" cy="11" r="4.5" ${st(2.6)}/><path d="M-11 -8 v6 h22 v-6 M0 -2 v8" ${st(2.6)}/>`,
  page: `<path d="M-14 -18 h18 l8 8 v28 h-26 z" ${st(2.8)}/><path d="M-8 -4 h14 M-8 3 h14 M-8 10 h9" ${st(2.4)}/>`,
  pin: `<path d="M0 18 C-10 4 -14 -2 -14 -6 a14 14 0 0 1 28 0 c0 4 -4 10 -14 24 z" ${st()}/><circle cy="-6" r="5" fill="${NU.red}"/>`,
  globe: `<circle r="17" ${st()}/><ellipse rx="7" ry="17" ${st(2.4)}/><path d="M-17 0 h34" ${st(2.4)}/>`,
  rate: `<rect x="-18" y="-16" width="10" height="10" fill="#c6dbef"/><rect x="-5" y="-16" width="10" height="10" fill="#6baed6"/><rect x="8" y="-16" width="10" height="10" fill="#2171b5"/><path d="M-16 8 h32 M-16 15 h22" ${st(2.6)}/>`,
  near: `<circle cx="-6" r="6" fill="${NU.navy}"/><circle cx="7" r="6" fill="${NU.navy}"/><path d="M-16 14 L16 -14" stroke="${NU.red}" stroke-width="3" stroke-linecap="round"/>`,
  accuse: `<circle cx="-15" cy="6" r="6" fill="${NU.navy}"/><circle cx="15" cy="6" r="6" fill="${NU.navy}"/><path d="M-9 6 h18" ${st(3)}/><path d="M0 -20 v10" stroke="${NU.red}" stroke-width="4" stroke-linecap="round"/><circle cy="-5" r="2.2" fill="${NU.red}"/>`,
  leak: `<circle cy="-8" r="7" fill="none" stroke="${NU.navy}" stroke-width="3" stroke-dasharray="3 3"/><path d="M-13 14 a13 11 0 0 1 26 0" fill="none" stroke="${NU.navy}" stroke-width="3" stroke-dasharray="3 3"/><circle cx="-20" cy="-14" r="3.5" fill="${NU.navy}"/><circle cx="20" cy="-12" r="3.5" fill="${NU.navy}"/><path d="M-17 -12 l10 3 M17 -11 l-10 2" ${st(2)}/>`,
  shape: `<circle cx="-12" cy="-6" r="7" fill="#4c78a8"/><rect x="5" y="-13" width="14" height="14" fill="#f58518"/><path d="M-4 18 l8 -14 l8 14 z" fill="#54a24b"/>`,
  nodelink: `<path d="M0 -14 L-12 4 M0 -14 L12 4 M-12 4 L-18 16 M-12 4 L-6 16" ${st(2.4)}/><circle cy="-14" r="4" fill="${NU.navy}"/><circle cx="-12" cy="4" r="4" fill="${NU.navy}"/><circle cx="12" cy="4" r="4" fill="${NU.navy}"/><circle cx="-18" cy="16" r="3.5" fill="${NU.navy}"/><circle cx="-6" cy="16" r="3.5" fill="${NU.navy}"/>`,
  indent: `<path d="M-18 -14 h22 M-10 -5 h22 M-10 4 h18 M-2 13 h18" ${st(3.2)}/>`,
  icicle: `<rect x="-20" y="-18" width="40" height="10" fill="${NU.navy}"/><rect x="-20" y="-6" width="24" height="10" fill="#4c78a8"/><rect x="6" y="-6" width="14" height="10" fill="#f58518"/><rect x="-20" y="6" width="10" height="10" fill="#4c78a8" opacity=".6"/><rect x="-8" y="6" width="12" height="10" fill="#4c78a8" opacity=".8"/><rect x="6" y="6" width="14" height="10" fill="#f58518" opacity=".7"/>`,
  treemap: `<rect x="-20" y="-18" width="22" height="36" fill="#4c78a8"/><rect x="4" y="-18" width="16" height="20" fill="#f58518"/><rect x="4" y="4" width="16" height="14" fill="#f58518" opacity=".6"/>`,
  letter: t => `<text y="10" text-anchor="middle" font-family="${NU.serif}" font-size="30" fill="${NU.navy}">${t}</text>`,
  number: t => `<text y="9" text-anchor="middle" font-family="${NU.sans}" font-size="26" font-weight="700" fill="#fff">${t}</text>`
};
const NETWORK = { text: 'NETWORK', fill: NU.navy }, TREE = { text: 'TREE', fill: NU.red }, DIRECTED = { text: 'DIRECTED NETWORK', fill: NU.navy };

const RECALL = [
  { icon: ICON.pin, name: 'When is a map the right picture?', answer: 'When where a thing is helps the reader. Where a dot sits is the strongest clue we have, so a map spends it on place.' },
  { icon: ICON.globe, name: 'Why does every flat map lie a little?', answer: 'The Earth is round. Flattening it stretches sizes, shapes or distances: you choose what to keep true.' },
  { icon: ICON.rate, name: 'Why colour a map by rate, not by count?', answer: 'Big places have more of everything. A rate (per 1,000 people) makes places fair to compare.' }
];
function recallSvg(answers) {
  return rowsSvg('Recall first', answers ? 'Last week, the answers' : 'Three questions on last week', RECALL.map(r => ({ icon: r.icon, name: r.name, text: answers ? r.answer : 'Talk to the person next to you: 20 seconds.', dim: !answers })),
    { textX: 640, max: 150, size: 23, sub: answers ? null : 'No notes. Answer from memory, then we check.' });
}

const SORT = [
  { icon: ICON.tube, name: 'The Tube', tag: NETWORK, text: 'You can go round the Circle line and come back: a loop.' },
  { icon: ICON.folder, name: 'Your folders', tag: TREE, text: 'Each folder sits in exactly one parent folder.' },
  { icon: ICON.follow, name: 'Instagram', tag: DIRECTED, text: 'You can follow someone who does not follow you.' },
  { icon: ICON.org, name: 'An org chart', tag: TREE, text: 'Everyone has one manager, up to one CEO.' },
  { icon: ICON.ball, name: 'Premier League', tag: NETWORK, text: 'Every club plays every other club, twice.' },
  { icon: ICON.family, name: 'Your family tree', tag: TREE, text: 'Down one line, yes. But cousins who marry make a loop.' },
  { icon: ICON.page, name: 'Wikipedia links', tag: DIRECTED, text: 'Page A can link to page B without B linking back.' }
];
function sortSvg(answers) {
  return rowsSvg('Name it', answers ? 'Network or tree? The answers' : 'Network or tree? Hands up', SORT.map(r => ({ icon: r.icon, name: r.name, tag: answers ? r.tag : '?', text: answers ? r.text : '' })), { size: 19 });
}

function claimSvg() {
  return rowsSvg('Care', 'A line is a claim: draw it with care', [
    { icon: ICON.near, name: 'Near is not proof', text: 'Readers think dots near the middle, or near each other, matter more. The layout may not mean that.' },
    { icon: ICON.accuse, name: 'A line accuses', text: 'Joining two people suggests they are linked. Say what each line means and where the data came from.' },
    { icon: ICON.leak, name: 'Names leak', text: 'Remove a name and a person can still be found from who they are joined to.' },
    { icon: ICON.shape, name: 'Colour alone fails', text: 'Some readers cannot tell the colours apart. Add a label or a shape as well.' }
  ], { max: 120 });
}

function answersSvg() {
  return rowsSvg('Three answers', 'Why a grid? Which answer is strongest?', [
    { icon: ICON.letter('A'), name: 'Answer A', text: '“The grid is better because it looks neater and more organised.”', italic: true },
    { icon: ICON.letter('B'), name: 'Answer B', text: '“The grid is better because the lines in the tangle cross too much, so you can’t read it.”', italic: true },
    { icon: ICON.letter('C'), name: 'Answer C', text: '“With 254 lines, the dots-and-lines picture is a tangle you cannot follow. A grid gives each pair one square, so no lines cross: whether Javert and Fantine share a scene is one square to check.”', italic: true }
  ], { max: 160, textX: 380, size: 24, sub: 'Why is a grid better than dots and lines for the Les Misérables network? Hands up: A, B or C.' });
}

function fourTreesSvg() {
  return rowsSvg('Name it', 'Four ways to draw a tree', [
    { icon: ICON.nodelink, name: 'Dots and lines', text: 'Who is under whom, very clearly. Size is invisible.' },
    { icon: ICON.indent, name: 'Indented list', text: 'Reads like folders on a laptop; easy to label; long.' },
    { icon: ICON.icicle, name: 'Icicle', text: 'Each level a band; each piece as wide as its size.' },
    { icon: ICON.treemap, name: 'Treemap', text: 'Boxes inside boxes: size as area. How deep it goes is harder to see.' }
  ], { max: 120 });
}

function ladderSvg() {
  const n = t => ({ icon: ICON.number(t), ring: NU.navy });
  return rowsSvg('Got one wrong?', 'Take the next step, only as far as you need', [
    { ...n(1), name: 'Ask yourself', text: 'What does the question want: a route, a pair, or a size?' },
    { ...n(2), name: 'Hint', text: 'A route: follow the lines. A pair: one square in a grid. A size inside groups: boxes inside boxes.' },
    { ...n(3), name: 'Example', text: '“Most people in Outer London” asks for a size, inside a group. Size inside groups is boxes inside boxes: Nest.' },
    { ...n(4), name: 'Try a new one', text: 'Which Premier League clubs have played each other so far this season?' }
  ], { rail: true, max: 120 });
}

module.exports = { routeSvg, codeSvg, termsSvg, edgeTypesSvg, cardsSvg, jobsSvg, breaksSvg, moveSvg, simplerSvg, bigTreeSvg, disguiseNetSvg, disguiseTreeSvg, recallSvg, sortSvg, claimSvg, answersSvg, fourTreesSvg, ladderSvg, STEPS };
