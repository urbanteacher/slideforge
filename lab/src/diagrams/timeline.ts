// Timeline: events on one baseline. diagram-design's type-timeline.md (MIT, cathrynlavery/diagram-design):
// a hairline baseline, small dots for events and a larger accent dot for the milestone, labels
// alternating above and below on a hairline drop, and an honest scale — events that are not evenly
// spaced in time are not evenly spaced on the line. When the times are not numbers ("Term 2",
// "Later") the events are a sequence, set at equal steps, and nothing pretends to be a scale.
import { parseTimeline, timesOf } from './parse';
import { TIMELINE_MAX, ceil4, textHeight, typeSizes, wrap, type Conn, type DNode, type Diagram, type Measure, type Seg } from './types';

function niceStep(span: number, most: number) {
  const raw = span / Math.max(1, most), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
}

export function timelineLayout(text: string, w: number, h: number, size0: number, measure: Measure): Diagram {
  const { size, sub, label, u } = typeSizes(size0);
  const problems: string[] = [];
  let items = parseTimeline(text);
  if (items.length > TIMELINE_MAX) {
    problems.push(`A timeline holds ${TIMELINE_MAX} events at this type size; ${items.length - TIMELINE_MAX} more were left off. Split it, or keep the milestones.`);
    items = items.slice(0, TIMELINE_MAX);
  }
  const n = items.length;
  let times = timesOf(items.map((it) => it.when));
  if (times) {
    const order = times.map((t, i) => [t, i] as const).sort((a, b) => a[0] - b[0]);
    items = order.map(([, i]) => items[i]);
    times = order.map(([t]) => t);
  }
  const gap = 6 * u, drop = 14 * u;
  const perSide = Math.max(1, Math.ceil(n / 2));
  const maxW = Math.min(size * 7.5, w / perSide - gap * 2);
  const blocks = items.map((it) => {
    const nm = wrap(it.name, size, 600, maxW, measure), sb = it.sub ? wrap(it.sub, sub, 400, maxW, measure) : { lines: [], over: false };
    if (nm.over || sb.over) problems.push(`“${it.name}” is too long for this timeline: shorten it rather than shrink the type.`);
    const bw = ceil4(Math.max(measure(it.when, sub, 600), ...nm.lines.map((l) => measure(l, size, 600)), ...sb.lines.map((l) => measure(l, sub, 400))));
    return { name: nm.lines, sub: sb.lines, bw, bh: ceil4(sub * 1.25 + textHeight(nm.lines.length, sb.lines.length, size, sub)) };
  });
  // The line runs between the first and last events, inset so their labels can centre on them.
  const L = Math.min(w / 2, Math.max(12 * u, (blocks[0]?.bw ?? 0) / 2)), Rr = Math.max(w / 2, w - Math.max(12 * u, (blocks[n - 1]?.bw ?? 0) / 2));
  const t0 = times?.[0] ?? 0, t1 = times?.[n - 1] ?? 0;
  const xs = items.map((_, i) => (n < 2 ? w / 2 : times ? (t1 > t0 ? L + ((times[i] - t0) / (t1 - t0)) * (Rr - L) : w / 2) : L + (i / (n - 1)) * (Rr - L)));
  // Labels alternate sides. On each side, a label slides along to clear the one before it, as long as
  // its drop still meets it; when it cannot, the events are too close to label at this size.
  const bx: number[] = [];
  for (const side of [0, 1]) {
    let right = -Infinity;
    for (let i = side; i < n; i += 2) {
      const b = blocks[i], inset = Math.min(b.bw / 2, 4 * u);
      let x = Math.max(0, Math.min(w - b.bw, xs[i] - b.bw / 2));
      x = Math.max(x, right + gap * 2);
      if (x > xs[i] - inset || x + b.bw > w) problems.push(`“${items[i].name}” is too close to “${items[i - 2]?.name ?? ''}” to label at this type size: widen the box, shorten the names, or split the timeline.`);
      bx[i] = x;
      right = x + b.bw;
    }
  }
  const above = Math.max(0, ...blocks.filter((_, i) => i % 2 === 0).map((b) => b.bh)), below = Math.max(0, ...blocks.filter((_, i) => i % 2 === 1).map((b) => b.bh));
  const total = above + below + drop * 2;
  if (total > h) problems.push('The timeline does not fit this box at this type size: make the box taller, or the labels shorter.');
  const y0 = (h - total) / 2 + above + drop;
  const nodes: DNode[] = [];
  const conns: Conn[] = [];
  items.forEach((it, i) => {
    const r = (it.focal ? 6 : 4) * u, b = blocks[i], up = i % 2 === 0;
    const rect = { x: bx[i], y: up ? y0 - drop - b.bh : y0 + drop, w: b.bw, h: b.bh };
    nodes.push({ id: `e${i}`, shape: 'dot', rect: { x: xs[i] - r, y: y0 - r, w: r * 2, h: r * 2 }, name: [], sub: [], focal: it.focal, beat: i + 1 });
    nodes.push({ id: `l${i}`, shape: 'label', rect, name: b.name, sub: b.sub, eyebrow: it.when, focal: it.focal, beat: i + 1 });
    const from = { x: xs[i], y: up ? y0 - r - u : y0 + r + u }, to = { x: xs[i], y: up ? rect.y + rect.h + 2 * u : rect.y - 2 * u };
    conns.push({ from: `e${i}`, to: `l${i}`, role: 'drop', dashed: false, segs: [{ k: 'line', a: from, b: to }], beat: i + 1, phase: 'trail' });
  });
  // The baseline, and ticks at even steps when the times are a scale.
  const xa = Math.max(0, (xs[0] ?? w / 2) - 12 * u), xb = Math.min(w, (xs[n - 1] ?? w / 2) + 12 * u);
  const segs: Seg[] = [{ k: 'line', a: { x: xa, y: y0 }, b: { x: xb, y: y0 } }];
  if (times && t1 > t0) {
    const step = niceStep(t1 - t0, 8);
    for (let t = Math.ceil(t0 / step) * step; t <= t1 + 1e-9; t += step) {
      const x = L + ((t - t0) / (t1 - t0)) * (Rr - L);
      if (xs.some((d) => Math.abs(d - x) < 8 * u)) continue;
      segs.push({ k: 'line', a: { x, y: y0 - 3 * u }, b: { x, y: y0 + 3 * u } });
    }
  }
  conns.unshift({ from: '', to: '', role: 'axis', dashed: false, segs, beat: 0, phase: 'lead' });
  const notes: string[] = [];
  if (!times && n > 1) notes.push('The times are not all numbers or dates, so the events are evenly spaced: read it as an order, not a scale.');
  return { type: 'timeline', w, h, u, size, sub, label, nodes, conns, beats: 1 + n, problems, notes };
}
