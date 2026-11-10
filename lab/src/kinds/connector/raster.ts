// The connector drawn into a canvas: from its stored ends (core/connectors.ts), straight, with an elbow at the
// middle, or as a curve that leaves each layer square on, with an arrowhead at the end or both. A connector whose
// layer has gone is drawn dashed in orange where it last was, so it can be joined again or deleted.
import type { Layer } from '../../core';
import { boxCanvas, type Ctx, type Raster } from '../../engine';

function head(ctx: Ctx, x: number, y: number, fromX: number, fromY: number, size: number) {
  const a = Math.atan2(y - fromY, x - fromX);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(a - 0.45), y - size * Math.sin(a - 0.45));
  ctx.lineTo(x - size * Math.cos(a + 0.45), y - size * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

export function rasterConnector(layer: Layer): Raster | null {
  const p = layer.params as Record<string, unknown>;
  if (p._x1 === undefined) return null;
  const { canvas, ctx, rect } = boxCanvas(layer, 12);
  const x1 = Number(p._x1), y1 = Number(p._y1), x2 = Number(p._x2), y2 = Number(p._y2);
  const lost = p._lost === true, side = p._side === 'v' ? 'v' : 'h';
  const width = Number(p.width ?? 5), colour = lost ? '#c2410c' : String(p.color ?? '#5f5a52');
  const size = Math.max(14, width * 4);
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.dash || lost) ctx.setLineDash([width * 3, width * 2.5]);
  // The arrowheads sit on the ends, so the line stops short of them.
  const arrow = String(p.arrow ?? 'end'), atEnd = arrow !== 'none', atStart = arrow === 'both';
  const route = String(p.route ?? 'elbow');
  let into: [number, number] = [x1, y1], outOf: [number, number] = [x2, y2];
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  if (route === 'straight' || (side === 'h' ? y1 === y2 : x1 === x2)) {
    ctx.lineTo(x2, y2);
  } else if (route === 'elbow') {
    const m = side === 'h' ? (x1 + x2) / 2 : (y1 + y2) / 2;
    if (side === 'h') { ctx.lineTo(m, y1); ctx.lineTo(m, y2); into = [m, y2]; outOf = [m, y1]; }
    else { ctx.lineTo(x1, m); ctx.lineTo(x2, m); into = [x2, m]; outOf = [x1, m]; }
    ctx.lineTo(x2, y2);
  } else {
    const m = side === 'h' ? (x1 + x2) / 2 : (y1 + y2) / 2;
    const c1: [number, number] = side === 'h' ? [m, y1] : [x1, m], c2: [number, number] = side === 'h' ? [m, y2] : [x2, m];
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], x2, y2);
    into = c2; outOf = c1;
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (atEnd) head(ctx, x2, y2, into[0], into[1], size);
  if (atStart) head(ctx, x1, y1, outOf[0], outOf[1], size);
  return { canvas, rect };
}
