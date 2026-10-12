// The simulation layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { MODEL_PLOT, boxCanvas, fmtNum, rgba, useFont, type Raster } from '../../engine';

// ─── Simulation ─────────────────────────────────────────────────────────────
// SlideForge's explore graph: axes, the model's curve, a marker at the input, then the reading
// ("input: x → output: y"), the formula, and a slider whose knob sits under the marker. `_input` is
// the live input from the player; the plot's left and right edges are MODEL_PLOT of the box.
export function modelValue(p: Params, x: number) {
  const a = Number(p.a ?? 2), b = Number(p.b ?? 0);
  return a * (p.model === 'quadratic' ? x * x : x) + b;
}
export function rasterModel(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, h, rect } = boxCanvas(layer);
  const lo = Number(p.min ?? 0), hi = Math.max(lo + 1, Number(p.max ?? 10));
  const input = Math.max(lo, Math.min(hi, Number(p._input ?? p.initial ?? lo)));
  const size = Number(p.size ?? 36), fam = String(p.font ?? 'Inter'), ink = String(p.textColor ?? '#1a1a1a'), accent = String(p.accent ?? '#ff5a36');
  const pts = Array.from({ length: 101 }, (_, i) => { const x = lo + ((hi - lo) * i) / 100; return [x, modelValue(p, x)] as const; });
  const low = Math.min(0, ...pts.map((q) => q[1])), high = Math.max(1, ...pts.map((q) => q[1]));
  const x0 = w * MODEL_PLOT[0], x1 = w * MODEL_PLOT[1], top = size * 0.6, bottom = h - size * 5.4;
  const X = (x: number) => x0 + ((x - lo) / (hi - lo)) * (x1 - x0), Y = (y: number) => bottom - ((y - low) / (high - low || 1)) * (bottom - top);
  ctx.textBaseline = 'middle';
  // Axes, and the four numbers that give them a scale.
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0, bottom); ctx.lineTo(x1, bottom); ctx.stroke();
  useFont(ctx, fam, size * 0.8, 500); ctx.fillStyle = rgba(ink, 0.72);
  ctx.textAlign = 'right'; ctx.fillText(fmtNum(Math.round(high)), x0 - size * 0.4, top); ctx.fillText(fmtNum(Math.round(low)), x0 - size * 0.4, bottom);
  ctx.textAlign = 'left'; ctx.fillText(fmtNum(lo), x0, bottom + size * 0.8); ctx.textAlign = 'right'; ctx.fillText(fmtNum(hi), x1, bottom + size * 0.8);
  ctx.strokeStyle = accent; ctx.lineWidth = Math.max(4, size * 0.14); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke();
  const out = modelValue(p, input), mx = X(input), my = Y(out);
  ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(ink, 0.35); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, bottom); ctx.lineTo(mx, my); ctx.lineTo(x0, my); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = accent; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, Math.max(10, size * 0.32), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // The reading, the formula, and the slider it is driven by.
  const r2 = (v: number) => fmtNum(Math.round(v * 100) / 100);
  const inL = String(p.inputLabel ?? 'Input'), outL = String(p.outputLabel ?? 'Output');
  ctx.textAlign = 'left'; ctx.fillStyle = ink; useFont(ctx, fam, size, 650);
  ctx.fillText(`${inL}: ${r2(input)}  \u2192  ${outL}: ${r2(out)}`, x0, bottom + size * 2.1);
  useFont(ctx, fam, size * 0.8, 400); ctx.fillStyle = rgba(ink, 0.72);
  ctx.fillText(`${outL} = ${fmtNum(Number(p.a ?? 2))} \u00d7 ${inL}${p.model === 'quadratic' ? '\u00b2' : ''} + ${fmtNum(Number(p.b ?? 0))}`, x0, bottom + size * 3.2);
  const sy = h - size * 0.9;
  ctx.fillStyle = rgba(ink, 0.16); ctx.beginPath(); ctx.roundRect(x0, sy - 5, x1 - x0, 10, 5); ctx.fill();
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(x0, sy - 5, mx - x0, 10, 5); ctx.fill();
  ctx.fillStyle = accent; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, sy, size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return { canvas, rect };
}
