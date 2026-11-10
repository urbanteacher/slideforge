import type { Box, Deck, Layer, Slide } from './types';

// Connectors (BACKLOG CS-17, from Claude Slides' connector element): a line that joins two layers on a slide and
// follows them. Its drawing reads the slide (readsSlide, kinds/connector/raster.ts), so it is drawn from where the
// two layers are now. The store also keeps the connector's own box and ends current (store.ts mutate and loadDeck →
// syncConnectors), so it is selected and hit where it is drawn, and a drawing handed no slide (or a connector whose
// layer has gone) still has its last ends. Undo takes the line back with the move that changed it.
// Which layers it joins, and when it has lost one, is said once here (`joinable`, `joinedPair`) for all of them.

/** Where a connector starts and ends, in its own box (0 at its top left): what its drawing reads. */
export interface ConnectorEnds { x1: number; y1: number; x2: number; y2: number; side: 'h' | 'v' }

const PAD = 24;

/** The box a layer covers on screen: a rotated one's bounding box, since its edges are where it is drawn. */
export function shownBox(b: Box): Box {
  if (!b.rot) return b;
  const r = (b.rot * Math.PI) / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  const w = b.w * c + b.h * s, h = b.w * s + b.h * c;
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h, rot: 0 };
}

/** A layer the teacher may join a connector to: one with a box, not a connector, not the slide's ground. */
export const joinable = (l: Pick<Layer, 'box' | 'kind' | 'name'>): boolean => !!l.box && l.kind !== 'connector' && !/^(ground|backdrop)$/i.test(l.name ?? '');

/** The two layers a connector joins on this slide, or null when it has lost one: gone, hidden, boxless, the same
 *  layer twice, or another connector. */
export function joinedPair(slide: Pick<Slide, 'layers'>, c: Layer): [Layer, Layer] | null {
  const p = c.params as Record<string, unknown>;
  const a = slide.layers.find((l) => l.id === p.from), b = slide.layers.find((l) => l.id === p.to);
  const ok = (l: Layer | undefined): l is Layer => !!l?.box && l.kind !== 'connector' && l.visible !== false;
  return ok(a) && ok(b) && a !== b ? [a, b] : null;
}

/** A set of layers copied together (a duplicated slide, a block from the gallery) with each connector among them
 *  joined to the copies of its layers, not to the originals it was copied from. `ids` maps old ids to new. */
export function relinkConnectors(layers: Layer[], ids: Map<string, string>): void {
  for (const l of layers) {
    if (l.kind !== 'connector') continue;
    const p = l.params as Record<string, unknown>;
    for (const k of ['from', 'to'] as const) { const to = ids.get(String(p[k] ?? '')); if (to) p[k] = to; }
  }
}

/** The point on a box's edge facing the other box, and which way the line leaves it. */
function edges(a: Box, b: Box): { p1: [number, number]; p2: [number, number]; side: 'h' | 'v' } {
  const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
  const dx = cb[0] - ca[0], dy = cb[1] - ca[1];
  // Side by side (more apart across than down, allowing for their shapes): leave from the facing sides.
  const across = Math.abs(dx) - (a.w + b.w) / 2, down = Math.abs(dy) - (a.h + b.h) / 2;
  if (across >= down) {
    const s = Math.sign(dx) || 1;
    return { p1: [ca[0] + (s * a.w) / 2, ca[1]], p2: [cb[0] - (s * b.w) / 2, cb[1]], side: 'h' };
  }
  const s = Math.sign(dy) || 1;
  return { p1: [ca[0], ca[1] + (s * a.h) / 2], p2: [cb[0], cb[1] - (s * b.h) / 2], side: 'v' };
}

/** A connector's box and ends for two boxes it joins. */
export function connectorGeometry(a: Box, b: Box): { box: Box; ends: ConnectorEnds } {
  const { p1, p2, side } = edges(shownBox(a), shownBox(b));
  const x = Math.min(p1[0], p2[0]) - PAD, y = Math.min(p1[1], p2[1]) - PAD;
  const w = Math.abs(p2[0] - p1[0]) + 2 * PAD, h = Math.abs(p2[1] - p1[1]) + 2 * PAD;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    box: { x: r(x), y: r(y), w: r(w), h: r(h), rot: 0 },
    ends: { x1: r(p1[0] - x), y1: r(p1[1] - y), x2: r(p2[0] - x), y2: r(p2[1] - y), side },
  };
}

const isConnector = (l: Layer) => l.kind === 'connector';

/** One slide's connectors brought up to date with the layers they join. A connector that has lost a layer
 *  (joinedPair) is left where it last was and marked `_lost`, so its drawing can say so. */
export function syncSlideConnectors(s: Slide): void {
  if (!s.layers.some(isConnector)) return;
  for (const c of s.layers.filter(isConnector)) {
    const p = c.params as Record<string, unknown>;
    const pair = joinedPair(s, c);
    if (!pair) { if (p._lost !== true) p._lost = true; continue; }
    const { box, ends } = connectorGeometry(pair[0].box!, pair[1].box!);
    if (p._lost) delete p._lost;
    const old = c.box;
    if (!old || old.x !== box.x || old.y !== box.y || old.w !== box.w || old.h !== box.h || old.rot !== 0) c.box = box;
    for (const k of ['x1', 'y1', 'x2', 'y2', 'side'] as const) if (p[`_${k}`] !== ends[k]) p[`_${k}`] = ends[k];
  }
}

/** Every slide's connectors brought up to date (the store calls this inside each change). */
export function syncConnectors(d: Deck): void {
  for (const s of d.slides) syncSlideConnectors(s);
}
