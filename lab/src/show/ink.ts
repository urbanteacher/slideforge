// Draw: the ink over the show (lab-engine-plan M11b). The stroke model, pure and without a canvas, so it is tested without a
// browser. Points are fractions of the stage (0 to 1 across and down), so a mark stays where it was drawn when the window is
// resized. Strokes belong to the slide they were drawn on. As in classic (js/teaching.js), marks are cleared when the show leaves
// the slide; `keep` keeps them for the length of the show instead. Undo takes back the last mark, or the last erasing.

/** `spot`: the spotlight, a dragged ellipse that stays lit while the rest of the slide is darkened (classic's spot mode). */
export type InkTool = 'pen' | 'highlighter' | 'eraser' | 'spot';
/** The spotlight's box, in fractions of the stage. */
export interface Spot { x: number; y: number; w: number; h: number }
/** How dark the spotlight makes the rest of the slide. */
export const SPOT_DIM = 0.72;
export type Pt = [number, number];
export interface Stroke { tool: 'pen' | 'highlighter'; color: string; /** The line's width as a fraction of the stage's width. */ width: number; points: Pt[] }

/** Classic's pink pen first, then the colours a teacher reaches for on light and dark slides. */
export const INK_COLORS = ['#ec346d', '#ffe477', '#4fd18b', '#3b9cff', '#ffffff', '#111111'] as const;
export const PEN_WIDTH = 0.005;
export const HIGHLIGHTER_WIDTH = 0.026;
export const HIGHLIGHTER_ALPHA = 0.38;
/** How near (a fraction of the stage's width) the eraser must pass to take a mark. */
export const ERASER_RADIUS = 0.018;

/** What undo reverses: a stroke added, or strokes taken out (with where they were). */
type Op = { add: Stroke } | { removed: { at: number; stroke: Stroke }[] };

/** The distance from a point to a segment, in the stage's units (x counted in widths: the aspect makes y a little shorter, so `aspect` scales it). */
function segDist(p: Pt, a: Pt, b: Pt, aspect: number): number {
  const px = p[0], py = p[1] * aspect, ax = a[0], ay = a[1] * aspect, bx = b[0], by = b[1] * aspect;
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Whether a stroke passes within `r` of a point. `aspect` is the stage's height over its width. */
export function strokeHit(s: Stroke, p: Pt, r = ERASER_RADIUS, aspect = 9 / 16): boolean {
  const reach = r + s.width / 2;
  if (s.points.length === 1) return Math.hypot(p[0] - s.points[0][0], (p[1] - s.points[0][1]) * aspect) <= reach;
  for (let i = 1; i < s.points.length; i++) if (segDist(p, s.points[i - 1], s.points[i], aspect) <= reach) return true;
  return false;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export class Ink {
  tool: InkTool = 'pen';
  color: string = INK_COLORS[0];
  /** Keep each slide's marks while the show goes on, instead of clearing them on leaving the slide. */
  keep = false;
  private marks = new Map<string, Stroke[]>();
  private ops = new Map<string, Op[]>();
  private key = '';
  private active: Stroke | null = null;
  private erasing: { at: number; stroke: Stroke }[] | null = null;
  private aspect = 9 / 16;
  private spotFrom: Pt | null = null;
  /** The spotlight on the slide on the wall, or null. It goes with the slide, and Clear takes it away. */
  spot: Spot | null = null;

  /** The marks on the slide on the wall. */
  get strokes(): readonly Stroke[] { return this.marks.get(this.key) ?? []; }
  get count(): number { return this.strokes.length; }
  get canUndo(): boolean { return (this.ops.get(this.key) ?? []).length > 0; }

  /** The stage's shape (height over width), for the eraser's reach. */
  setAspect(a: number): void { if (a > 0) this.aspect = a; }

  /** The show moved to another slide: its marks come up, and the last slide's are cleared (unless `keep`). */
  setSlide(key: string): void {
    this.end();
    if (key === this.key) return;
    if (!this.keep) { this.marks.delete(this.key); this.ops.delete(this.key); }
    this.key = key;
    this.spot = null;
  }

  /** Start a mark (pen, highlighter) or an erasing at a point. */
  begin(p: Pt): void {
    this.end();
    const pt: Pt = [clamp01(p[0]), clamp01(p[1])];
    if (this.tool === 'eraser') { this.erasing = []; this.erase(pt); return; }
    if (this.tool === 'spot') { this.spotFrom = pt; this.spot = null; return; }
    const width = this.tool === 'highlighter' ? HIGHLIGHTER_WIDTH : PEN_WIDTH;
    this.active = { tool: this.tool, color: this.color, width, points: [pt] };
    const list = this.marks.get(this.key) ?? [];
    list.push(this.active);
    this.marks.set(this.key, list);
  }

  extend(p: Pt): void {
    const pt: Pt = [clamp01(p[0]), clamp01(p[1])];
    if (this.spotFrom) {
      const [a, b] = this.spotFrom;
      this.spot = { x: Math.min(a, pt[0]), y: Math.min(b, pt[1]), w: Math.abs(pt[0] - a), h: Math.abs(pt[1] - b) };
      return;
    }
    if (this.active) {
      const last = this.active.points[this.active.points.length - 1];
      if (Math.hypot(pt[0] - last[0], (pt[1] - last[1]) * this.aspect) >= 0.0008) this.active.points.push(pt);
    } else if (this.erasing) this.erase(pt);
  }

  /** The pointer is up: the mark (or the erasing) is one step to undo. */
  end(): void {
    // A click without a drag puts the spotlight out.
    if (this.spotFrom && this.spot && (this.spot.w < 0.01 || this.spot.h < 0.01)) this.spot = null;
    this.spotFrom = null;
    if (this.active) this.push({ add: this.active });
    else if (this.erasing && this.erasing.length) this.push({ removed: this.erasing });
    this.active = null;
    this.erasing = null;
  }

  private erase(p: Pt): void {
    const list = this.marks.get(this.key);
    if (!list || !this.erasing) return;
    for (let i = list.length - 1; i >= 0; i--) {
      if (strokeHit(list[i], p, ERASER_RADIUS, this.aspect)) this.erasing.push({ at: i, stroke: list.splice(i, 1)[0] });
    }
  }

  private push(op: Op): void {
    const ops = this.ops.get(this.key) ?? [];
    ops.push(op);
    this.ops.set(this.key, ops);
  }

  /** Take back the last mark, or put back what the last erasing took. */
  undo(): boolean {
    this.end();
    const op = this.ops.get(this.key)?.pop();
    if (!op) return false;
    const list = this.marks.get(this.key) ?? [];
    if ('add' in op) { const i = list.lastIndexOf(op.add); if (i >= 0) list.splice(i, 1); }
    else for (const r of [...op.removed].sort((a, b) => a.at - b.at)) list.splice(Math.min(r.at, list.length), 0, r.stroke);
    this.marks.set(this.key, list);
    return true;
  }

  /** Wipe the slide's marks (one step: undo brings them all back). */
  clear(): void {
    this.end();
    this.spot = null;
    const list = this.marks.get(this.key) ?? [];
    if (list.length === 0) return;
    this.push({ removed: list.map((stroke, at) => ({ at, stroke })) });
    this.marks.set(this.key, []);
  }
}
