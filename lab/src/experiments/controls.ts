/*
 * On-slide controls: a row of buttons drawn into a layer, and the same geometry for the player to
 * hit-test, so what is drawn and what is pressed can never disagree. SlideForge's experiment and
 * motion slides carry these (Predict first, a button per state, Replay; Previous, Next, Reset,
 * Overview, a slider); in the lab they are part of the illustration, and pressing one never moves
 * the show on.
 */
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let measurer: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string) {
  if (!measurer && typeof document !== 'undefined') measurer = document.createElement('canvas').getContext('2d');
  if (!measurer) return text.length * 0.55 * parseFloat(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '20');
  measurer.font = font;
  return measurer.measureText(text).width;
}

export interface Button { x: number; y: number; w: number; h: number; label: string; action: string; on?: boolean; off?: boolean }

/** Lay buttons out left to right from (x, y). The type shrinks a little to keep one row; past that
 *  the row wraps rather than letting the words get too small to read. `height` is what it took. */
export function row(labels: { label: string; action: string; on?: boolean; off?: boolean }[], x: number, y: number, width: number, px: number, family: string): { buttons: Button[]; px: number; height: number } {
  const floor = Math.max(24, px * 0.82);
  let size = px;
  const measureAt = (s: number) => {
    const font = `600 ${s}px ${family}`, padX = s * 0.75;
    return labels.map((l) => measure(l.label, font) + padX * 2);
  };
  let widths = measureAt(size);
  while (size > floor && widths.reduce((a, b) => a + b, 0) + size * 0.45 * (labels.length - 1) > width) { size -= 1; widths = measureAt(size); }
  const gap = size * 0.45, h = size * 1.75, lineGap = size * 0.5;
  let cx = x, cy = y;
  const buttons = labels.map((l, i) => {
    if (cx > x && cx + widths[i] > x + width) { cx = x; cy += h + lineGap; }
    const b = { ...l, x: cx, y: cy, w: widths[i], h };
    cx += widths[i] + gap;
    return b;
  });
  return { px: size, buttons, height: cy - y + h };
}

/** Draw a row: outlined pills in the ink; the lit one filled with the accent; an unavailable one faint. */
export function drawRow(ctx: Ctx, buttons: Button[], px: number, family: string, ink: string, accent: string, onAccent = '#ffffff') {
  ctx.save();
  for (const b of buttons) {
    ctx.globalAlpha = b.off ? 0.35 : 1;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
    if (b.on) { ctx.fillStyle = accent; ctx.fill(); }
    ctx.strokeStyle = b.on ? accent : ink; ctx.lineWidth = Math.max(1.5, px * 0.07); ctx.stroke();
    ctx.fillStyle = b.on ? onAccent : ink;
    ctx.font = `600 ${px}px ${family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + px * 0.04);
  }
  ctx.restore();
}

/** The button under a point in the layer's own pixels, if any. */
export const hitButton = (buttons: Button[], x: number, y: number) => buttons.find((b) => !b.off && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) ?? null;
