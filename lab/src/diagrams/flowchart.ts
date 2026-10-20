// Flowchart: steps on a grid, joined by right-angle connectors. diagram-design's type-flowchart.md and
// its connector rules (MIT, cathrynlavery/diagram-design): shape carries the type — an oval starts or
// ends, a rectangle is a step, a diamond a decision with every exit labelled — connectors are straight
// when both ends share a line and r=8 elbows when they do not, a connector's attach points on a shared
// edge fan out at L·k/(N+1), and a label sits on a mask a clear gap beside its stroke.
//
// A slide is wide, so the flow reads like text: left to right, then the next row right to left
// (boustrophedon), so every step to the next is a straight arrow to a neighbour.
import { parseFlow, type FlowItem } from './parse';
import { elbow, overlaps, samples, toRect } from './path';
import { FLOW_MAX, ceil4, textHeight, typeSizes, wrap, type Conn, type DNode, type Diagram, type Measure, type Pt, type Rect, type Seg } from './types';

type Side = 't' | 'b' | 'l' | 'r';
interface End { conn: number; node: number; side: Side; other: Pt }

export function flowLayout(text: string, w: number, h: number, size0: number, measure: Measure, columns = 0): Diagram {
  const { size, sub, label, u } = typeSizes(size0);
  const problems: string[] = [];
  let items = parseFlow(text);
  if (items.length > FLOW_MAX) {
    problems.push(`A flowchart holds ${FLOW_MAX} steps; ${items.length - FLOW_MAX} more were left off. Split it into two.`);
    items = items.slice(0, FLOW_MAX);
  }
  const n = items.length;
  const padX = 12 * u, padY = 8 * u, head = 7 * u, gap = 6 * u, r = 8 * u, lane = 12 * u;
  const maxW = size * 7.5;
  const words = items.map((it) => {
    const nm = wrap(it.name, size, 600, maxW, measure), sb = it.sub ? wrap(it.sub, sub, 400, maxW, measure) : { lines: [], over: false };
    if (nm.over || sb.over) problems.push(`“${it.name}” is too long for a step: shorten it rather than shrink the type.`);
    return { name: nm.lines, sub: sb.lines };
  });
  const tw = (i: number) => Math.max(0, ...words[i].name.map((l) => measure(l, size, 600)), ...words[i].sub.map((l) => measure(l, sub, 400)));
  const th = (i: number) => textHeight(words[i].name.length, words[i].sub.length, size, sub);
  // One cell size for every step. A diamond's words fit inside it when, as fractions of its width and
  // height, they add to under 0.85: so a diamond takes the steps' width and grows taller for its words.
  let nw = 0, nh = 0;
  items.forEach((it, i) => {
    if (it.shape === 'diamond') nw = Math.max(nw, tw(i) / 0.6);
    else { nw = Math.max(nw, tw(i) + padX * 2); nh = Math.max(nh, th(i) + padY * 2); }
  });
  nw = ceil4(nw);
  items.forEach((it, i) => { if (it.shape === 'diamond') nh = Math.max(nh, th(i) / (0.85 - tw(i) / nw)); });
  nh = ceil4(nh);
  const cols = Math.max(1, Math.min(n, columns > 0 ? Math.round(columns) : n <= 4 ? n : Math.ceil(n / (n <= 8 ? 2 : 3))));
  const rows = Math.max(1, Math.ceil(n / cols));
  // Gaps share out the box, held between room for an arrow (and its label) and twice a cell.
  const gx = cols > 1 ? Math.min(nw, (w - cols * nw) / (cols - 1)) : 0;
  const gy = rows > 1 ? Math.min(nh * 1.5, (h - rows * nh) / (rows - 1)) : 0;
  const ox = (w - (cols * nw + (cols - 1) * gx)) / 2, oy = (h - (rows * nh + (rows - 1) * gy)) / 2;
  if ((cols > 1 && gx < head + 3 * gap) || (rows > 1 && gy < head + 3 * gap) || ox < 0 || oy < 0) problems.push('The flowchart does not fit this box at this type size: make the box bigger, set fewer columns, or shorten the names.');
  const cellOf = (i: number) => { const row = Math.floor(i / cols), c = i % cols; return { row, col: row % 2 ? cols - 1 - c : c }; };
  const rectOf = (i: number): Rect => { const { row, col } = cellOf(i); return { x: ox + col * (nw + gx), y: oy + row * (nh + gy), w: nw, h: nh }; };
  const nodes: DNode[] = items.map((it, i) => ({ id: `n${i}`, shape: it.shape, rect: rectOf(i), name: words[i].name, sub: words[i].sub, focal: it.focal, beat: i }));

  // The links: written ones, or on to the next line. An oval past the first is an end.
  const find = (name: string) => items.findIndex((it) => it.name.toLowerCase() === name.toLowerCase().replace(/^\((.*)\)$/, '$1'));
  const links: { a: number; b: number; label: string }[] = [];
  items.forEach((it: FlowItem, i) => {
    if (it.links) for (const l of it.links) {
      const b = find(l.to);
      if (b < 0) { if (!/^(none|end|stop)$/i.test(l.to)) problems.push(`“${it.name}” goes to “${l.to}”, which is not a step.`); continue; }
      links.push({ a: i, b, label: l.label });
    }
    else if (i < n - 1 && !(it.shape === 'oval' && i > 0)) links.push({ a: i, b: i + 1, label: '' });
  });
  for (const [i, it] of items.entries()) if (it.shape === 'diamond') {
    const out = links.filter((l) => l.a === i);
    if (out.length > 3) problems.push(`“${it.name}” has ${out.length} ways out; a decision takes three at most.`);
    if (out.some((l) => !l.label)) problems.push(`Label every way out of “${it.name}”, as in “-> Next [yes], Back [no]”.`);
  }

  // Route each link: a straight arrow to a neighbour; over the top of the row to a step further along
  // it; through the gap between two rows to a step in the next row. Each gets its own lane.
  const centre = (i: number) => { const b = nodes[i].rect; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
  type Plan = { a: number; b: number; label: string; sa: Side; sb: Side; laneY?: number };
  const plans: Plan[] = [];
  const laneCount = new Map<string, number>();
  const nextLane = (key: string) => { const k = laneCount.get(key) ?? 0; laneCount.set(key, k + 1); return k; };
  for (const l of links) {
    const A = cellOf(l.a), B = cellOf(l.b);
    if (l.a === l.b) continue;
    if (A.row === B.row && Math.abs(A.col - B.col) === 1) plans.push({ ...l, sa: B.col > A.col ? 'r' : 'l', sb: B.col > A.col ? 'l' : 'r' });
    else if (A.col === B.col && Math.abs(A.row - B.row) === 1) plans.push({ ...l, sa: B.row > A.row ? 'b' : 't', sb: B.row > A.row ? 't' : 'b' });
    else if (A.row === B.row) {
      // Over the top when there is room above the row, else under it.
      const top = rectOf(l.a).y, room = A.row === 0 ? oy : gy / 2;
      const k = nextLane(`row${A.row}`);
      const up = room >= lane * (k + 2);
      const y = up ? top - lane * (k + 2) : top + nh + lane * (k + 2);
      plans.push({ ...l, sa: up ? 't' : 'b', sb: up ? 't' : 'b', laneY: y });
    } else if (Math.abs(A.row - B.row) === 1) {
      const down = B.row > A.row, k = nextLane(`gap${Math.min(A.row, B.row)}`);
      const mid = oy + (Math.min(A.row, B.row) + 1) * nh + Math.min(A.row, B.row) * gy + gy / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * lane;
      plans.push({ ...l, sa: down ? 'b' : 't', sb: down ? 't' : 'b', laneY: mid });
    } else problems.push(`The way from “${items[l.a].name}” to “${items[l.b].name}” would cross a row: put them on neighbouring rows, or change the columns.`);
  }
  // Fan attach points on a shared edge at L·k/(N+1), ordered by where the other end lies.
  const ends: End[] = [];
  plans.forEach((p, c) => { ends.push({ conn: c, node: p.a, side: p.sa, other: centre(p.b) }, { conn: c, node: p.b, side: p.sb, other: centre(p.a) }); });
  const at = new Map<string, Pt>();
  const groups = new Map<string, End[]>();
  for (const e of ends) { const key = `${e.node}${e.side}`; groups.set(key, [...(groups.get(key) ?? []), e]); }
  for (const [, g] of groups) {
    const b = nodes[g[0].node].rect, side = g[0].side, horiz = side === 't' || side === 'b';
    g.sort((p, q) => (horiz ? p.other.x - q.other.x : p.other.y - q.other.y));
    if (g.length > 1 && nodes[g[0].node].shape === 'diamond') problems.push(`Two arrows meet one corner of “${items[g[0].node].name}”: send one out of another side.`);
    g.forEach((e, k) => {
      const f = nodes[e.node].shape === 'diamond' ? 0.5 : (k + 1) / (g.length + 1);
      at.set(`${e.conn}${e.node === plans[e.conn].a ? 'a' : 'b'}`, horiz ? { x: b.x + b.w * f, y: side === 't' ? b.y : b.y + b.h } : { x: side === 'l' ? b.x : b.x + b.w, y: b.y + b.h * f });
    });
  }
  const conns: Conn[] = plans.map((p, ci) => {
    const s = at.get(`${ci}a`)!, t = at.get(`${ci}b`)!;
    // A straight arrow between neighbours ends level with its start, so it never slants.
    const pts: Pt[] = p.laneY === undefined
      ? (p.sa === 'r' || p.sa === 'l' ? [s, { x: t.x, y: s.y }] : [s, { x: s.x, y: t.y }])
      : [s, { x: s.x, y: p.laneY }, { x: t.x, y: p.laneY }, t];
    const e = elbow(pts, r, head);
    const forward = p.b > p.a;
    const c: Conn = { from: `n${p.a}`, to: `n${p.b}`, role: 'flow', dashed: false, segs: e.segs, head: { tip: e.tip, dir: e.dir }, beat: Math.max(p.a, p.b), phase: forward ? 'lead' : 'trail' };
    if (p.label) c.label = { text: p.label.toUpperCase().slice(0, 14), rect: { x: 0, y: 0, w: 0, h: 0 } };
    return c;
  });
  // Labels go where they are clear of every box, every other stroke and every other label.
  const placed: Rect[] = [];
  for (const c of conns) if (c.label) {
    c.label.rect = placeLabel(c, c.label.text, conns, nodes.map((x) => x.rect), placed, label, measure, u);
    placed.push(c.label.rect);
  }
  return { type: 'flowchart', w, h, u, size, sub, label, nodes, conns, beats: Math.max(1, n), problems, notes: [] };
}

/**
 * Where a connector's label goes: beside one of its straight pieces, longest first — above or below a
 * level one, either side of an upright one — at its middle, or a third of the way either end. Its mask
 * sits 8u clear of the stroke (diagram-design: 6–10px). The first place clear of every box, every other
 * connector and every label already placed wins; failing that, the first place, and the rules say so.
 */
function placeLabel(c: Conn, text: string, conns: Conn[], boxes: Rect[], placed: Rect[], px: number, measure: Measure, u: number): Rect {
  const w = measure(text, px, 600) + 8 * u, h = px * 1.3, off = 8 * u;
  const lines = c.segs.filter((s): s is Extract<Seg, { k: 'line' }> => s.k === 'line')
    .sort((p, q) => Math.hypot(q.b.x - q.a.x, q.b.y - q.a.y) - Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y));
  const others = conns.filter((o) => o !== c).map((o) => samples(o.segs, 2 * u));
  const clear = (r: Rect) => !boxes.some((b) => overlaps(r, b)) && !placed.some((b) => overlaps(r, b))
    && others.every((pts) => pts.every((p) => toRect(p, r) >= 6 * u + 0.5));
  const spots: Rect[] = [];
  for (const s of lines) for (const t of [0.5, 0.3, 0.7]) {
    const mx = s.a.x + (s.b.x - s.a.x) * t, my = s.a.y + (s.b.y - s.a.y) * t;
    if (Math.abs(s.a.x - s.b.x) < 0.01) spots.push({ x: mx + off, y: my - h / 2, w, h }, { x: mx - off - w, y: my - h / 2, w, h });
    else spots.push({ x: mx - w / 2, y: my - off - h, w, h }, { x: mx - w / 2, y: my + off, w, h });
  }
  return spots.find(clear) ?? spots[0] ?? { x: 0, y: 0, w, h };
}
