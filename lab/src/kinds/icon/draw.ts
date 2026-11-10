// An icon's drawing (assets/icons.json, from Lucide): its elements on a 24-unit grid, stroked on a canvas.
import icons from '../../assets/icons.json';
import type { Ctx } from '../../engine';

type El = [string, Record<string, string | number>];
const SET = icons as unknown as { size: number; groups: Record<string, string[]>; icons: Record<string, El[]>; aliases?: Record<string, string> };

/** The icon names, in their groups, for the picker. */
export const ICON_GROUPS: Record<string, string[]> = SET.groups;
export const ICON_NAMES = Object.keys(SET.icons);

/** The icon a name means: its own, or the one an older Lucide name now goes by (home → house); null for none.
 *  Own keys only, so a name such as "constructor" or "__proto__" is not mistaken for an icon. */
export function iconName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  if (Object.hasOwn(SET.icons, name)) return name;
  const to = SET.aliases && Object.hasOwn(SET.aliases, name) ? SET.aliases[name] : null;
  return to && Object.hasOwn(SET.icons, to) ? to : null;
}
/** Whether a name is one of the icons the studio has, or an older name for one. */
export const hasIcon = (name: unknown): boolean => iconName(name) !== null;

const n = (v: unknown, d = 0) => (v === undefined ? d : Number(v));
/** A polyline's or polygon's points, "x1 y1 x2 y2 …" (commas or spaces), as pairs. */
const pointsOf = (v: unknown): [number, number][] => {
  const ns = String(v ?? '').trim().split(/[\s,]+/).map(Number).filter((x) => Number.isFinite(x));
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ns.length; i += 2) out.push([ns[i], ns[i + 1]]);
  return out;
};

/** Stroke the named icon into `ctx`, filling a `size`-pixel square at (x, y). False when there is no such icon. */
export function drawIcon(ctx: Ctx, name: string, x: number, y: number, size: number, colour: string, stroke = 2): boolean {
  const id = iconName(name);
  if (!id) return false;
  drawElements(ctx, SET.icons[id], x, y, size, colour, stroke);
  return true;
}

/** An icon's elements (Lucide's, on its 24-unit grid) drawn at (x, y), `size` pixels square. */
export function drawElements(ctx: Ctx, els: El[], x: number, y: number, size: number, colour: string, stroke = 2): void {
  const k = size / SET.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [tag, a] of els) {
    // An element Lucide fills (fill="currentColor", as chart-scatter's dots) is filled as well as stroked, so it
    // stays a dot at any weight.
    const filled = a.fill !== undefined && a.fill !== 'none';
    if (tag === 'path') { const p = new Path2D(String(a.d)); if (filled) ctx.fill(p); ctx.stroke(p); continue; }
    ctx.beginPath();
    if (tag === 'circle') ctx.arc(n(a.cx), n(a.cy), n(a.r), 0, Math.PI * 2);
    else if (tag === 'ellipse') ctx.ellipse(n(a.cx), n(a.cy), n(a.rx), n(a.ry), 0, 0, Math.PI * 2);
    else if (tag === 'rect') ctx.roundRect(n(a.x), n(a.y), n(a.width), n(a.height), n(a.rx, n(a.ry)));
    else if (tag === 'line') { ctx.moveTo(n(a.x1), n(a.y1)); ctx.lineTo(n(a.x2), n(a.y2)); }
    else if (tag === 'polyline' || tag === 'polygon') {
      pointsOf(a.points).forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      if (tag === 'polygon') ctx.closePath();
    }
    if (filled) ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
