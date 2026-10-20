// Drawing a laid-out diagram on a canvas, in diagram-design's order (MIT, cathrynlavery/diagram-design):
// connectors, then label masks and labels, then boxes, then their words, so a box covers any hairline
// of overshoot while every intended end still lands on an edge.
//
// `progress(beat)` is how far each beat of the draw entrance has come, 0–1 (1 when settled). Within a
// beat, the arrows into its box draw first, the box fades in, and the arrows out of it draw last.
import { along, segLength } from './path';
import { LINE, SUB_LINE, textHeight, type Conn, type DNode, type Diagram, type Seg } from './types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** diagram-design's colour roles, already measured against the ground they sit on (kinds/diagram/skin.ts). */
export interface Skin {
  paper: string; ink: string; muted: string; soft: string; accent: string; accentTint: string;
  /** The focal box's name and sublabel, on the accent tint. */
  focalInk: string; focalSub: string;
  /** The hub: ink filled, its words in paper. */
  hubFill: string; hubInk: string;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);

/** Draw a path up to `upto` of its length. */
function stroke(ctx: Ctx, segs: Seg[], upto: number) {
  ctx.beginPath();
  let left = upto, at: { x: number; y: number } | null = null;
  for (const s of segs) {
    if (left <= 0) break;
    const l = segLength(s), t = Math.min(l, left);
    const a = along(s, 0);
    // A piece that does not start where the last ended (a baseline's ticks) starts afresh.
    if (!at || Math.hypot(a.x - at.x, a.y - at.y) > 0.5) ctx.moveTo(a.x, a.y);
    at = along(s, t);
    if (s.k === 'line') { const b = along(s, t); ctx.lineTo(b.x, b.y); }
    else ctx.arc(s.c.x, s.c.y, s.r, s.a0, s.a0 + (s.ccw ? -1 : 1) * (t / s.r), s.ccw);
    left -= l;
  }
  ctx.stroke();
}

function arrowhead(ctx: Ctx, tip: { x: number; y: number }, dir: number, len: number, half: number) {
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - Math.cos(dir) * len - Math.sin(dir) * half, tip.y - Math.sin(dir) * len + Math.cos(dir) * half);
  ctx.lineTo(tip.x - Math.cos(dir) * len + Math.sin(dir) * half, tip.y - Math.sin(dir) * len - Math.cos(dir) * half);
  ctx.closePath();
  ctx.fill();
}

/** When, within its beat, a connector draws and a box fades in. */
function phases(d: Diagram) {
  const lead = new Set(d.conns.filter((c) => c.phase === 'lead').map((c) => c.beat));
  return {
    node: (b: number, p: number) => ease(lead.has(b) ? (p - 0.4) / 0.3 : p / 0.4),
    conn: (c: Conn, p: number) => (c.role === 'axis' ? ease(p) : c.phase === 'lead' ? ease(p / 0.45) : ease((p - 0.55) / 0.45)),
  };
}

/** `face(px, weight)` is the CSS font the diagram's words are set in: the same one they were measured in. */
export function drawDiagram(ctx: Ctx, d: Diagram, skin: Skin, face: (px: number, weight: number) => string, progress: (beat: number) => number) {
  const u = d.u, ph = phases(d);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Connectors: the ring and flow in muted, spokes dashed in soft, drops and the baseline as hairlines.
  for (const c of d.conns) {
    const f = ph.conn(c, progress(c.beat));
    if (f <= 0) continue;
    const colour = c.role === 'spoke' || c.role === 'drop' ? skin.soft : c.role === 'axis' ? skin.ink : skin.muted;
    ctx.strokeStyle = colour; ctx.fillStyle = colour;
    ctx.lineWidth = c.role === 'drop' || c.role === 'axis' ? Math.max(2, u * 0.8) : Math.max(2, u * 1.2);
    ctx.setLineDash(c.dashed ? [5 * u, 4 * u] : []);
    const total = c.segs.reduce((a, s) => a + segLength(s), 0);
    stroke(ctx, c.segs, total * f);
    ctx.setLineDash([]);
    if (c.head && f >= 0.999) arrowhead(ctx, c.head.tip, c.head.dir, 7 * u, 3 * u);
  }
  // Labels on their masks.
  for (const c of d.conns) {
    if (!c.label) continue;
    const a = ph.conn(c, progress(c.beat));
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const r = c.label.rect;
    ctx.fillStyle = skin.paper;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = skin.soft;
    ctx.font = face(d.label, 600);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.label.text, r.x + r.w / 2, r.y + r.h / 2 + d.label * 0.04);
    ctx.globalAlpha = 1;
  }
  for (const n of d.nodes) {
    const a = ph.node(n.beat, progress(n.beat));
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    drawNode(ctx, n, d, skin, face);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawNode(ctx: Ctx, n: DNode, d: Diagram, skin: Skin, face: (px: number, w: number) => string) {
  const u = d.u, b = n.rect, cx = b.x + b.w / 2;
  const hub = n.shape === 'hub';
  let nameInk = hub ? skin.hubInk : n.focal ? skin.focalInk : skin.ink;
  let subInk = hub ? skin.hubInk : n.focal ? skin.focalSub : skin.soft;
  if (n.shape === 'dot') {
    ctx.fillStyle = n.focal ? skin.accent : skin.ink;
    ctx.beginPath(); ctx.arc(cx, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (n.shape !== 'label') {
    ctx.beginPath();
    if (n.shape === 'diamond') {
      ctx.moveTo(cx, b.y); ctx.lineTo(b.x + b.w, b.y + b.h / 2); ctx.lineTo(cx, b.y + b.h); ctx.lineTo(b.x, b.y + b.h / 2); ctx.closePath();
    } else ctx.roundRect(b.x, b.y, b.w, b.h, n.shape === 'oval' ? b.h / 2 : 6 * u);
    ctx.fillStyle = hub ? skin.hubFill : n.focal ? skin.accentTint : skin.paper;
    ctx.fill();
    ctx.strokeStyle = hub ? skin.hubFill : n.focal ? skin.accent : skin.ink;
    ctx.lineWidth = Math.max(2, u * (n.focal ? 1.6 : 1));
    ctx.stroke();
  } else if (n.focal) { nameInk = skin.focalInk; subInk = skin.soft; }
  // Words, centred in the box; a timeline label's date above its name.
  const top = n.eyebrow ? d.sub * SUB_LINE : 0;
  const th = top + textHeight(n.name.length, n.sub.length, d.size, d.sub);
  let y = b.y + (b.h - th) / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (n.eyebrow) {
    ctx.font = face(d.sub, 600); ctx.fillStyle = n.focal ? skin.focalInk : skin.soft;
    ctx.fillText(n.eyebrow, cx, y + (d.sub * SUB_LINE) / 2);
    y += d.sub * SUB_LINE;
  }
  ctx.font = face(d.size, 600); ctx.fillStyle = nameInk;
  for (const l of n.name) { ctx.fillText(l, cx, y + (d.size * LINE) / 2); y += d.size * LINE; }
  if (n.sub.length) {
    y += d.sub * 0.3;
    ctx.font = face(d.sub, 400); ctx.fillStyle = subInk;
    for (const l of n.sub) { ctx.fillText(l, cx, y + (d.sub * SUB_LINE) / 2); y += d.sub * SUB_LINE; }
  }
}
