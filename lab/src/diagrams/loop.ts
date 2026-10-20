// Loop: stations round a ring, each pass writing back to one hub. diagram-design's type-loop.md §2
// (MIT, cathrynlavery/diagram-design), ported: station k at -90° + k·360°/N, clockwise; ring arrows as
// arcs of the one station circle from each box's clockwise exit to the next box's entry, the head
// landing on its edge; dashed spokes along the radius from a station's inner edge to just short of
// the hub. What differs is the scale: the type is the slide's, and R is the largest the box allows.
import { parseLoop } from './parse';
import { elbow } from './path';
import { LOOP_MAX, ceil4, snap4, textHeight, typeSizes, wrap, type Conn, type DNode, type Diagram, type Measure, type Pt, type Rect } from './types';

const norm = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

/** Where the circle (C, R) crosses a box's edges (type-loop §2.2). */
function circleHits(b: Rect, c: Pt, R: number): Pt[] {
  const out: Pt[] = [];
  for (const xe of [b.x, b.x + b.w]) {
    const d = R * R - (xe - c.x) ** 2;
    if (d >= 0) for (const s of [-1, 1]) { const y = c.y + s * Math.sqrt(d); if (y >= b.y && y <= b.y + b.h) out.push({ x: xe, y }); }
  }
  for (const ye of [b.y, b.y + b.h]) {
    const d = R * R - (ye - c.y) ** 2;
    if (d >= 0) for (const s of [-1, 1]) { const x = c.x + s * Math.sqrt(d); if (x >= b.x && x <= b.x + b.w) out.push({ x, y: ye }); }
  }
  return out;
}

/** How far along u from a box's centre its edge is (type-loop §2.3 box_distance). */
export function boxDistance(u: Pt, a: number, b: number) {
  return Math.min(Math.abs(u.x) > 1e-9 ? a / Math.abs(u.x) : Infinity, Math.abs(u.y) > 1e-9 ? b / Math.abs(u.y) : Infinity);
}

export function loopLayout(text: string, w: number, h: number, size0: number, measure: Measure): Diagram {
  const { size, sub, label, u } = typeSizes(size0);
  const problems: string[] = [];
  const parsed = parseLoop(text);
  let stations = parsed.stations;
  if (stations.length > LOOP_MAX) {
    problems.push(`A loop holds ${LOOP_MAX} stations at this type size; ${stations.length - LOOP_MAX} more were left off. Split it: an overview loop, and the detail on the next slide.`);
    stations = stations.slice(0, LOOP_MAX);
  }
  if (stations.length < 3) problems.push('A loop needs at least three stations.');
  const N = stations.length;
  const padX = 12 * u, padY = 8 * u, head = 7 * u, gap = 6 * u;
  // Every station the same size: the widest name, wrapped to two lines at most.
  const maxW = size * 7.5;
  const words = stations.map((s) => {
    const n = wrap(s.name, size, 600, maxW, measure), b = s.sub ? wrap(s.sub, sub, 400, maxW, measure) : { lines: [], over: false };
    if (n.over || b.over) problems.push(`“${s.name}” is too long for a station: shorten it rather than shrink the type.`);
    return { name: n.lines, sub: b.lines };
  });
  const tw = Math.max(0, ...words.flatMap((x) => [...x.name.map((l) => measure(l, size, 600)), ...x.sub.map((l) => measure(l, sub, 400))]));
  const sw = ceil4(tw + padX * 2), sh = ceil4(Math.max(...words.map((x) => textHeight(x.name.length, x.sub.length, size, sub)), size * 1.2) + padY * 2);
  const hub = parsed.hub;
  // The hub's words wrap to a station's width or a little over: on a slide the ring's radius is held by
  // the height, and a wide hub meets the stations either side of it.
  const hubW = Math.max(sw - padX * 2, size * 5);
  const hubWords = hub ? { name: wrap(hub.name, size, 600, hubW, measure, 3).lines, sub: hub.sub ? wrap(hub.sub, sub, 400, hubW, measure, 3).lines : [] } : null;
  const hw = hubWords ? ceil4(Math.max(...hubWords.name.map((l) => measure(l, size, 600)), ...hubWords.sub.map((l) => measure(l, sub, 400))) + padX * 2) : 0;
  const hh = hubWords ? ceil4(textHeight(hubWords.name.length, hubWords.sub.length, size, sub) + padY * 2) : 0;
  const A = hw / 2, B = hh / 2, a = sw / 2, b = sh / 2;
  const C = { x: w / 2, y: h / 2 };
  // Station k at -90° + k·360°/N, clockwise (type-loop §2.1). A 16:9 box is wider than it is tall, so
  // the ring's radius is held by the height, and an even loop started at the top sets two stations level
  // with the hub, where it is widest. When that does not fit, the ring turns half a step, so those two
  // sit in the corners: still N equal steps clockwise on one circle, the first now just past the top.
  const angles = (turn: number) => stations.map((_, k) => -Math.PI / 2 + turn + (k * Math.PI * 2) / Math.max(1, N));
  const at = (theta: number[]) => theta.map((t) => ({ x: Math.cos(t), y: Math.sin(t) }));
  // Station boxes on the 4px grid, offsets rounded from the centre so mirrored stations stay mirrored.
  const boxesAt = (unit: Pt[], R: number) => unit.map((v) => ({ x: C.x + snap4(R * v.x) - a, y: C.y + snap4(R * v.y) - b, w: sw, h: sh }));

  // The ring's radius: as large as the box allows, provided the geometry holds at it.
  const maxR = Math.max(0, Math.min(h / 2 - b - 2 * u, w / 2 - a - 2 * u));
  const holds = (theta: number[], R: number) => {
    const unit = at(theta), bx = boxesAt(unit, R);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const p = bx[i], q = bx[j];
      if (p.x < q.x + q.w + gap && q.x < p.x + p.w + gap && p.y < q.y + q.h + gap && q.y < p.y + p.h + gap) return false;
    }
    // The ring stays clear of the hub, and each spoke is long enough to read as an arrow.
    if (hub && R < Math.hypot(A, B) + gap) return false;
    for (let k = 0; k < N; k++) {
      if (R - boxDistance(unit[k], a, b) - (hub ? boxDistance(unit[k], A, B) + gap : 0) < head + gap) return false;
      if (hub && overlapsHub(bx[k])) return false;
    }
    // Each ring arrow is a visible run of circle between two boxes.
    for (let k = 0; k < N; k++) {
      const arcs = ringArc(bx[k], bx[(k + 1) % N], theta[k], theta[(k + 1) % N], C, R);
      if (!arcs || (arcs.a1 - arcs.a0) * R < head + 3 * gap) return false;
    }
    return true;
  };
  const overlapsHub = (r: Rect) => r.x < C.x + A + gap && C.x - A - gap < r.x + r.w && r.y < C.y + B + gap && C.y - B - gap < r.y + r.h;
  const R = maxR;
  let theta = angles(0);
  if (N >= 3 && !holds(theta, R)) {
    const turned = angles(Math.PI / N);
    if (N % 2 === 0 && holds(turned, R)) theta = turned;
    else problems.push('The loop does not fit this box at this type size: make the box bigger, or the names shorter.');
  }
  const unit = at(theta);
  const boxes = boxesAt(unit, R);

  const nodes: DNode[] = [];
  const conns: Conn[] = [];
  const first = hub ? 1 : 0;
  if (hub && hubWords) nodes.push({ id: 'hub', shape: 'hub', rect: { x: C.x - A, y: C.y - B, w: hw, h: hh }, name: hubWords.name, sub: hubWords.sub, focal: false, beat: 0 });
  stations.forEach((s, k) => nodes.push({ id: `s${k}`, shape: 'box', rect: boxes[k], name: words[k].name, sub: words[k].sub, focal: s.focal, beat: first + k }));
  if (N >= 2) for (let k = 0; k < N; k++) {
    const j = (k + 1) % N;
    const arc = ringArc(boxes[k], boxes[j], theta[k], theta[j], C, R);
    if (!arc) continue;
    const end = arc.a1 - head / R;
    // The arrow into a station draws as it arrives; the one closing the ring, after the last.
    const closing = j === 0;
    conns.push({
      from: `s${k}`, to: `s${j}`, role: 'ring', dashed: false,
      segs: [{ k: 'arc', c: C, r: R, a0: arc.a0, a1: end, ccw: false }],
      head: { tip: arc.entry, dir: arc.a1 + Math.PI / 2 },
      beat: first + (closing ? k : j), phase: closing ? 'trail' : 'lead',
    });
  }
  if (hub) stations.forEach((_, k) => {
    const v = unit[k], P = { x: boxes[k].x + a, y: boxes[k].y + b };
    const start = { x: P.x - boxDistance(v, a, b) * v.x, y: P.y - boxDistance(v, a, b) * v.y };
    const tipD = boxDistance(v, A, B) + gap;
    const tip = { x: C.x + tipD * v.x, y: C.y + tipD * v.y };
    const e = elbow([start, tip], 0, head);
    conns.push({ from: `s${k}`, to: 'hub', role: 'spoke', dashed: true, segs: e.segs, head: { tip, dir: e.dir }, beat: first + k, phase: 'trail' });
  });
  return { type: 'loop', w, h, u, size, sub, label, nodes, conns, beats: Math.max(1, first + N), problems, notes: [] };
}

/** The ring arrow from one station to the next: the circle's clockwise exit from the first box, and its
 *  entry into the second, as angles about C (a1 > a0). */
function ringArc(from: Rect, to: Rect, tFrom: number, tTo: number, C: Pt, R: number) {
  const hk = circleHits(from, C, R), hj = circleHits(to, C, R);
  if (!hk.length || !hj.length) return null;
  const ang = (p: Pt) => Math.atan2(p.y - C.y, p.x - C.x);
  const exit = hk.reduce((best, p) => (norm(ang(p) - tFrom) < norm(ang(best) - tFrom) ? p : best));
  const entry = hj.reduce((best, p) => (norm(ang(p) - tTo) > norm(ang(best) - tTo) ? p : best));
  const a0 = ang(exit);
  let a1 = ang(entry);
  while (a1 < a0) a1 += Math.PI * 2;
  return { a0, a1, exit, entry };
}
