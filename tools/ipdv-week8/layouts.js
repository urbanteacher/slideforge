'use strict';
/* Week 8's figure data: every network and tree the live figures draw, with
 * its positions worked out here, at build time, in slide pixels (the figure
 * stage is 1280x720). The browser gets numbers, never a layout library.
 *
 *   abc()       Dimitris's eight-node graph (A–H): the Altair positions, and the "store" picture
 *   tube()      the Tube's Zone 1: where each station really is, evenly spaced (Beck's move), and a force layout
 *   miserables() Les Misérables co-occurrence: a force layout (the hairball) and the groups
 *   london()    London → Inner/Outer → ITL2 area → borough, sized by population
 */
const fs = require('node:fs');
const path = require('node:path');

const DATA = path.join(__dirname, 'data');
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const PLOT = { x0: 90, y0: 150, x1: 1190, y1: 640 };

/* A seeded stream (mulberry32), so every build lays out the same picture. */
function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const round = p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

/* Points into a box, keeping their shape (one scale for x and y), centred. */
function fit(points, box, flipY) {
  const ids = Object.keys(points), xs = ids.map(i => points[i][0]), ys = ids.map(i => points[i][1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((box.x1 - box.x0) / ((x1 - x0) || 1), (box.y1 - box.y0) / ((y1 - y0) || 1));
  const ox = box.x0 + ((box.x1 - box.x0) - (x1 - x0) * k) / 2, oy = box.y0 + ((box.y1 - box.y0) - (y1 - y0) * k) / 2;
  const out = {};
  for (const i of ids) out[i] = round([ox + (points[i][0] - x0) * k, flipY ? oy + (y1 - points[i][1]) * k : oy + (points[i][1] - y0) * k]);
  return out;
}

/* Fruchterman–Reingold (1991): linked nodes pull together, every pair pushes
   apart, and the moves shrink as it cools. Positions mean nothing but the
   links, which is the point the lecture makes with it. */
function force(ids, links, seed, iterations = 600) {
  const r = rng(seed), n = ids.length, k = Math.sqrt(1 / n), at = {};
  ids.forEach(id => { at[id] = [r(), r()]; });
  let temp = 0.1;
  for (let it = 0; it < iterations; it++) {
    const move = {};
    ids.forEach(id => { move[id] = [0, 0]; });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = ids[i], b = ids[j], dx = at[a][0] - at[b][0], dy = at[a][1] - at[b][1], d = Math.max(1e-4, Math.hypot(dx, dy)), f = k * k / d;
      move[a][0] += dx / d * f; move[a][1] += dy / d * f; move[b][0] -= dx / d * f; move[b][1] -= dy / d * f;
    }
    for (const l of links) {
      const a = l.source, b = l.target, dx = at[a][0] - at[b][0], dy = at[a][1] - at[b][1], d = Math.max(1e-4, Math.hypot(dx, dy)), f = d * d / k;
      move[a][0] -= dx / d * f; move[a][1] -= dy / d * f; move[b][0] += dx / d * f; move[b][1] += dy / d * f;
    }
    /* A gentle pull to the middle keeps loose groups on the stage. */
    ids.forEach(id => {
      move[id][0] -= (at[id][0] - 0.5) * 0.6; move[id][1] -= (at[id][1] - 0.5) * 0.6;
      const m = move[id], d = Math.max(1e-6, Math.hypot(m[0], m[1])), s = Math.min(d, temp);
      at[id][0] += m[0] / d * s; at[id][1] += m[1] / d * s;
    });
    temp = Math.max(0.002, temp * 0.992);
  }
  return at;
}

function abc() {
  const nodes = 'ABCDEFGH'.split('').map(id => ({ id }));
  const pairs = ['AB', 'AC', 'AG', 'AH', 'BC', 'BF', 'CD', 'DE', 'EF'];
  const links = pairs.map(p => ({ source: p[0], target: p[1] }));
  /* The same x and y as the Altair on the Build-it slides. */
  const xy = { A: [2, 3], B: [4, 3], C: [3, 2], D: [3, 0], E: [5, 0], F: [5, 2], G: [0, 4], H: [1, 1] };
  const shuffled = { A: [5, 1], B: [0, 1], C: [4, 4], D: [1, 4], E: [3, 2], F: [2, 0], G: [0, 3], H: [5, 3] };
  return {
    nodes, links,
    layouts: {
      chosen: fit(xy, { x0: 300, y0: 180, x1: 980, y1: 590 }, true),
      shuffled: fit(shuffled, { x0: 300, y0: 180, x1: 980, y1: 590 }, true),
      store: fit(xy, { x0: 90, y0: 230, x1: 470, y1: 600 }, true)
    }
  };
}

const TFL = {
  bakerloo: '#B36305', central: '#E32017', circle: '#FFD300', district: '#00782A', 'hammersmith-city': '#F3A9BB', jubilee: '#A0A5A9',
  metropolitan: '#9B0056', northern: '#000000', piccadilly: '#003688', victoria: '#0098D4', 'waterloo-city': '#95CDBA'
};
function tube(box = { x0: 80, y0: 158, x1: 1200, y1: 640 }) {
  const t = read('tube.json');
  const inZone = s => s.zone === '1' || s.zone === '1+2';
  const stations = t.stations.filter(inZone);
  const ids = new Set(stations.map(s => s.name));
  const links = t.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  /* Geography: longitude shrunk by cos(latitude), so London is not stretched sideways. */
  const geo = {};
  for (const s of stations) geo[s.name] = [s.lon * Math.cos(51.51 * Math.PI / 180), s.lat];
  /* Beck's move, done by a computer: the crowded middle drawn bigger and the outskirts smaller.
     Each station keeps its direction from the centre, and its distance is shrunk by a power under 1,
     so near stations spread apart and far ones draw in. */
  const names = stations.map(s => s.name);
  const cx = names.reduce((a, i) => a + geo[i][0], 0) / names.length, cy = names.reduce((a, i) => a + geo[i][1], 0) / names.length;
  const far = Math.max(...names.map(i => Math.hypot(geo[i][0] - cx, geo[i][1] - cy)));
  const even = {};
  for (const i of names) {
    const dx = geo[i][0] - cx, dy = geo[i][1] - cy, d = Math.hypot(dx, dy) || 1e-9, k = far * Math.pow(d / far, 0.6) / d;
    even[i] = [cx + dx * k, cy + dy * k];
  }
  const forced = force(stations.map(s => s.name), links, 8);
  return {
    source: t.source,
    nodes: stations.map(s => ({ id: s.name })),
    links: links.map(e => ({ source: e.source, target: e.target, line: e.line })),
    colours: TFL, lines: t.lines,
    layouts: { geo: fit(geo, box, true), even: fit(even, box, true), force: fit(Object.fromEntries(Object.entries(forced)), box, false) },
    degree: Object.fromEntries(stations.map(s => [s.name, s.lines.length]))
  };
}

/* Tableau 10, as Altair's default categories: the groups are data. */
const GROUPS = ['#4c78a8', '#f58518', '#e45756', '#72b7b2', '#54a24b', '#eeca3b', '#b279a2', '#ff9da6', '#9d755d', '#bab0ac', '#79706e'];
function miserables() {
  const m = read('miserables.json');
  const nodes = m.nodes.map(n => ({ id: n.name, group: n.group }));
  const links = m.links.map(l => ({ source: m.nodes[l.source].name, target: m.nodes[l.target].name, value: l.value }));
  const at = force(nodes.map(n => n.id), links, 3, 700);
  const colours = {};
  GROUPS.forEach((c, i) => { colours[i] = c; });
  return { nodes, links, colours, valueTitle: 'Scenes together', layouts: { force: fit(at, { x0: 120, y0: 158, x1: 1160, y1: 640 }, false) } };
}

function london() {
  const b = read('boroughs.json');
  const halves = ['Inner London', 'Outer London'];
  const root = {
    name: 'London',
    children: halves.map(h => ({
      name: h,
      children: [...new Set(b.boroughs.filter(x => x.half === h).map(x => x.area))].map(a => ({
        name: a,
        children: b.boroughs.filter(x => x.area === a).map(x => ({ name: x.borough, value: x.population }))
      }))
    }))
  };
  return { root, colours: { 'Inner London': '#4c78a8', 'Outer London': '#f58518' }, valueTitle: 'People', format: ',d', source: b.source, year: b.year };
}

module.exports = { abc, tube, miserables, london, TFL, PLOT };
