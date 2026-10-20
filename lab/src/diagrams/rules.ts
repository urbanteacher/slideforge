// diagram-design's mandatory connector rules (SKILL.md §6, MIT, cathrynlavery/diagram-design) as checks
// a laid-out diagram can be put through: by the tests, and by the inspector, which says what is wrong.
//   1 orthogonal only: straight pieces are level or upright, corners r=8 elbows (6 at the least);
//     the loop's ring arcs (one circle, clockwise) and its radial spokes are the only exceptions
//   2 every label on a mask 6–10px clear of its own stroke, and clear of the others
//   3 no overlapping connectors
//   4 attach points on a shared edge 12px apart or more
//   5 no connector passes behind a box that is not one of its ends
//   6 a label's mask lies over no box
// and three of the type references' own: arrowheads land on a box's edge (a spoke stops just short of
// the hub), nothing leaves the frame, and no text is under SlideForge's floor.
import { inflate, inside, overlaps, pathLength, samples, toRect } from './path';
import { FLOOR, type Conn, type DNode, type Diagram, type Pt, type Rect } from './types';

/** Distance from a point to a node's outline: its box, an oval's stadium, a diamond's sides. */
export function toOutline(p: Pt, n: DNode): number {
  const b = n.rect, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  if (n.shape === 'diamond') {
    const a = b.w / 2, c = b.h / 2;
    return (Math.abs(Math.abs(p.x - cx) / a + Math.abs(p.y - cy) / c - 1) * a * c) / Math.hypot(a, c);
  }
  if (n.shape === 'oval' && b.w > b.h) {
    const r = b.h / 2, x = Math.max(b.x + r, Math.min(b.x + b.w - r, p.x));
    return Math.abs(Math.hypot(p.x - x, p.y - cy) - r);
  }
  if (n.shape === 'dot') return Math.abs(Math.hypot(p.x - cx, p.y - cy) - b.w / 2);
  if (inside(p, b)) return Math.min(p.x - b.x, b.x + b.w - p.x, p.y - b.y, b.y + b.h - p.y);
  return toRect(p, b);
}

const ends = (c: Conn): Pt[] => {
  const pts = samples(c.segs, 1e9);
  return [pts[0], c.head?.tip ?? pts[pts.length - 1]];
};

export function checkDiagram(d: Diagram): string[] {
  const out: string[] = [];
  const u = d.u, gap = 6 * u, eps = 0.5;
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const step = 2 * u;
  const pts = d.conns.map((c) => samples(c.segs, step));

  // No text under the floor.
  if (Math.min(d.size, d.sub, d.label) < FLOOR) out.push(`text under the ${FLOOR}px floor`);

  // 1 — orthogonal only, with the loop's two exceptions.
  const rings = d.conns.filter((c) => c.role === 'ring');
  d.conns.forEach((c, i) => {
    for (const s of c.segs) {
      if (s.k === 'line') {
        const level = Math.abs(s.a.y - s.b.y) < 0.01, upright = Math.abs(s.a.x - s.b.x) < 0.01;
        if (!level && !upright && c.role !== 'spoke') out.push(`connector ${i} (${c.role}) has a diagonal`);
      } else if (c.role === 'ring') {
        const r0 = rings[0].segs[0] as typeof s;
        if (Math.abs(s.r - r0.r) > 0.01 || Math.hypot(s.c.x - r0.c.x, s.c.y - r0.c.y) > 0.01 || s.ccw) out.push(`ring arc ${i} is off the one clockwise circle`);
      } else if (c.role === 'flow') {
        if (s.r > 8 * u + 0.01 || s.r < 6 * u - 0.01) out.push(`connector ${i} has a corner of r=${(s.r / u).toFixed(1)}, not 6–8`);
      } else out.push(`connector ${i} (${c.role}) curves`);
    }
    if (c.role === 'spoke' && c.segs.length !== 1) out.push(`spoke ${i} is not one straight radius`);
  });

  // Arrowheads land on the edge of the box they point at; a spoke's stops 4–8px short of the hub.
  d.conns.forEach((c, i) => {
    if (!c.head) return;
    const to = byId.get(c.to);
    if (!to) return;
    const dist = toOutline(c.head.tip, to);
    if (c.role === 'spoke') {
      // Measured back along the spoke, as type-loop §2.3 sets it: d_hub + marker_gap from the centre.
      const b = to.rect, cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.hypot(c.head.tip.x - cx, c.head.tip.y - cy);
      const v = { x: (c.head.tip.x - cx) / r, y: (c.head.tip.y - cy) / r };
      const along = r - Math.min(Math.abs(v.x) > 1e-9 ? b.w / 2 / Math.abs(v.x) : Infinity, Math.abs(v.y) > 1e-9 ? b.h / 2 / Math.abs(v.y) : Infinity);
      if (inside(c.head.tip, to.rect) || along < 4 * u - eps || along > 8 * u + eps) out.push(`spoke ${i}'s head is ${(along / u).toFixed(1)}u from the hub, not 4–8`);
    } else if (dist > 1) out.push(`connector ${i}'s head misses the edge of ${c.to} by ${dist.toFixed(1)}px`);
    const p = pts[i][pts[i].length - 1];
    if (pathLength(c.segs) > 0 && Math.hypot(p.x - c.head.tip.x, p.y - c.head.tip.y) > 9 * u) out.push(`connector ${i}'s stroke stops short of its head`);
  });

  // 2, 6 — labels: a mask 6–10px from its own stroke, clear of every other stroke, box and label.
  d.conns.forEach((c, i) => {
    if (!c.label) return;
    const r = c.label.rect;
    const own = Math.min(...pts[i].map((p) => toRect(p, r)));
    if (own < gap - eps || own > 10 * u + eps) out.push(`label “${c.label.text}” is ${(own / u).toFixed(1)}u from its stroke, not 6–10`);
    d.conns.forEach((o, j) => { if (j !== i && Math.min(...pts[j].map((p) => toRect(p, r))) < gap - eps) out.push(`label “${c.label!.text}” touches connector ${j}`); });
    for (const n of d.nodes) if (overlaps(r, n.rect)) out.push(`label “${c.label.text}” lies over ${n.id}`);
    d.conns.forEach((o, j) => { if (j > i && o.label && overlaps(r, o.label.rect)) out.push(`labels “${c.label!.text}” and “${o.label.text}” overlap`); });
  });

  // 3 — no two connectors run together. Points at their own ends (within a gap of an end's box) are
  // where connectors meet a box, and rule 4 checks those.
  const near = (c: Conn, p: Pt) => [c.from, c.to].some((id) => { const n = byId.get(id); return !!n && toRect(p, n.rect) <= gap + 1; });
  for (let i = 0; i < d.conns.length; i++) for (let j = i + 1; j < d.conns.length; j++) {
    const A = pts[i].filter((p) => !near(d.conns[i], p)), B = pts[j].filter((p) => !near(d.conns[j], p));
    let min = Infinity;
    for (const p of A) for (const q of B) min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
    if (min < gap - eps) out.push(`connectors ${i} and ${j} overlap or cross`);
  }

  // 4 — attach points on one box at least 12px apart.
  const at = new Map<string, { p: Pt; c: number }[]>();
  d.conns.forEach((c, i) => {
    const [s, e] = ends(c);
    for (const [id, p] of [[c.from, s], [c.to, e]] as const) if (byId.has(id)) at.set(id, [...(at.get(id) ?? []), { p, c: i }]);
  });
  for (const [id, list] of at) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
    if (list[a].c === list[b].c) continue;
    const dd = Math.hypot(list[a].p.x - list[b].p.x, list[a].p.y - list[b].p.y);
    if (dd < 12 * u - eps) out.push(`connectors ${list[a].c} and ${list[b].c} share an attach point on ${id}`);
  }

  // 5 — no connector passes behind a box, and none behind its own ends either.
  d.conns.forEach((c, i) => {
    for (const n of d.nodes) {
      if (c.role === 'axis' && n.shape === 'dot') continue;
      if (pts[i].some((p) => inside(p, n.rect, 1))) { out.push(`connector ${i} (${c.role}) passes behind ${n.id}`); }
    }
  });

  // Boxes clear of each other and inside the frame.
  const frame: Rect = { x: -1, y: -1, w: d.w + 2, h: d.h + 2 };
  for (let i = 0; i < d.nodes.length; i++) {
    const n = d.nodes[i];
    if (!(n.rect.x >= frame.x && n.rect.y >= frame.y && n.rect.x + n.rect.w <= frame.x + frame.w && n.rect.y + n.rect.h <= frame.y + frame.h)) out.push(`${n.id} leaves the frame`);
    for (let j = i + 1; j < d.nodes.length; j++) if (overlaps(inflate(n.rect, gap / 2 - eps), inflate(d.nodes[j].rect, gap / 2 - eps))) out.push(`${n.id} and ${d.nodes[j].id} overlap`);
  }
  d.conns.forEach((c, i) => { if (pts[i].some((p) => p.x < -1 || p.y < -1 || p.x > d.w + 1 || p.y > d.h + 1)) out.push(`connector ${i} leaves the frame`); });
  return [...new Set(out)];
}
