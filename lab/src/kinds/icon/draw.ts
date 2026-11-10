// An icon's drawing (assets/icons.json, from Lucide): its elements on a 24-unit grid, stroked on a canvas.
import icons from '../../assets/icons.json';
import type { Ctx } from '../../engine';

type El = [string, Record<string, string | number>];
const SET = icons as unknown as { size: number; groups: Record<string, string[]>; icons: Record<string, El[]> };

/** The icon names, in their groups, for the picker. */
export const ICON_GROUPS: Record<string, string[]> = SET.groups;
/** Whether a name is one of the icons the studio has. */
export const hasIcon = (name: unknown): boolean => typeof name === 'string' && !!SET.icons[name];
export const ICON_NAMES = Object.keys(SET.icons);

const n = (v: unknown, d = 0) => (v === undefined ? d : Number(v));

/** Stroke the named icon into `ctx`, filling a `size`-pixel square at (x, y). False when there is no such icon. */
export function drawIcon(ctx: Ctx, name: string, x: number, y: number, size: number, colour: string, stroke = 2): boolean {
  const els = SET.icons[name];
  if (!els) return false;
  const k = size / SET.size;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = colour;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [tag, a] of els) {
    ctx.beginPath();
    if (tag === 'path') { ctx.stroke(new Path2D(String(a.d))); continue; }
    if (tag === 'circle') ctx.arc(n(a.cx), n(a.cy), n(a.r), 0, Math.PI * 2);
    else if (tag === 'ellipse') ctx.ellipse(n(a.cx), n(a.cy), n(a.rx), n(a.ry), 0, 0, Math.PI * 2);
    else if (tag === 'rect') ctx.roundRect(n(a.x), n(a.y), n(a.width), n(a.height), n(a.rx, n(a.ry)));
    else if (tag === 'line') { ctx.moveTo(n(a.x1), n(a.y1)); ctx.lineTo(n(a.x2), n(a.y2)); }
    ctx.stroke();
  }
  ctx.restore();
  return true;
}
