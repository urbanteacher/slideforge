import type { Box, Deck, Layer, Slide } from './types';

// Connectors (BACKLOG CS-17, from Claude Slides' connector element): a line that joins two layers on a slide and
// follows them. Drawing a layer sees only that layer, so the store keeps each connector up to date instead
// (store.ts mutate → syncConnectors): after every change it works out where the two joined layers are and writes
// the connector's box and its two ends into the connector itself. The editor, the show, the exports and a share
// then all draw the same line, and undo takes the line back with the move that changed it.

/** Where a connector starts and ends, in its own box (0 at its top left): what its drawing reads. */
export interface ConnectorEnds { x1: number; y1: number; x2: number; y2: number; side: 'h' | 'v' }

const PAD = 24;

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
  const { p1, p2, side } = edges(a, b);
  const x = Math.min(p1[0], p2[0]) - PAD, y = Math.min(p1[1], p2[1]) - PAD;
  const w = Math.abs(p2[0] - p1[0]) + 2 * PAD, h = Math.abs(p2[1] - p1[1]) + 2 * PAD;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    box: { x: r(x), y: r(y), w: r(w), h: r(h), rot: 0 },
    ends: { x1: r(p1[0] - x), y1: r(p1[1] - y), x2: r(p2[0] - x), y2: r(p2[1] - y), side },
  };
}

const isConnector = (l: Layer) => l.kind === 'connector';

/** One slide's connectors brought up to date with the layers they join. A connector whose layer has gone, or that
 *  joins a layer to itself, is left where it last was and marked `_lost`, so its drawing can say so. */
export function syncSlideConnectors(s: Slide): void {
  if (!s.layers.some(isConnector)) return;
  const byId = new Map(s.layers.map((l) => [l.id, l]));
  for (const c of s.layers.filter(isConnector)) {
    const p = c.params as Record<string, unknown>;
    const a = byId.get(String(p.from ?? '')), b = byId.get(String(p.to ?? ''));
    const lost = !a?.box || !b?.box || a === b || a.kind === 'connector' || b.kind === 'connector';
    if (lost) { if (p._lost !== true) p._lost = true; continue; }
    const { box, ends } = connectorGeometry(a.box!, b.box!);
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
