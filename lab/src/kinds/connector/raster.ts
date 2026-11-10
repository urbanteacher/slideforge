// The connector drawn into a canvas, straight, with an elbow at the middle, or as a curve that leaves each layer square
// on, with an arrowhead at the end or both. It reads its slide (readsSlide), so its ends are worked out from where the
// two layers are now (core/connectors.ts), whatever its own box says; the store's sync keeps that box close for
// selecting it. Without the slide it draws its stored ends. A connector whose layer has gone is drawn dashed in orange
// where it last was, so it can be joined again or deleted.
import { connectorGeometry, joinedPair, type Layer, type Slide } from '../../core';
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

/** Where the line runs: live from the slide when it is handed one, else as the store last wrote it. */
function endsOf(layer: Layer, slide?: Slide) {
  const p = layer.params as Record<string, unknown>;
  if (slide && layer.box) {
    const pair = joinedPair(slide, layer);
    if (pair) {
      const g = connectorGeometry(pair[0].box!, pair[1].box!);
      // Its own canvas is the box the geometry wants, placed against the layer's box (which the rect is measured from).
      return { box: g.box, dx: g.box.x - layer.box.x, dy: g.box.y - layer.box.y, ...g.ends, lost: false };
    }
    if (p._x1 === undefined) return null;
    return { box: layer.box, dx: 0, dy: 0, x1: Number(p._x1), y1: Number(p._y1), x2: Number(p._x2), y2: Number(p._y2), side: p._side as 'h' | 'v', lost: true };
  }
  if (p._x1 === undefined || !layer.box) return null;
  return { box: layer.box, dx: 0, dy: 0, x1: Number(p._x1), y1: Number(p._y1), x2: Number(p._x2), y2: Number(p._y2), side: p._side as 'h' | 'v', lost: p._lost === true };
}

export function rasterConnector(layer: Layer, _textT: number, slide?: Slide): Raster | null {
  const p = layer.params as Record<string, unknown>;
  const e = endsOf(layer, slide);
  if (!e) return null;
  const { canvas, ctx, rect } = boxCanvas({ ...layer, box: e.box }, 12);
  rect[0] += e.dx; rect[1] += e.dy;
  const { x1, y1, x2, y2 } = e;
  const lost = e.lost, side = e.side === 'v' ? 'v' : 'h';
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
