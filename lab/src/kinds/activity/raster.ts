// The activity layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { card, fit, mix, onColour, pill, rgba, useFont, wrap, type Ctx, type Raster } from '../../engine';

// ─── Activity ───────────────────────────────────────────────────────────────
const STEP_TIME = /\s*[·•\-–—|,]\s*(\d+(?:\.\d+)?)\s*(min|mins|minutes|m|s|sec|secs|seconds)\s*$/i;

export function parseSteps(text: string) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(STEP_TIME);
    if (!m) return { text: s, minutes: 0, time: '' };
    const n = Number(m[1]);
    const secs = /^s/i.test(m[2]);
    return { text: s.slice(0, m.index).trim(), minutes: secs ? n / 60 : n, time: `${m[1]} ${secs ? 'sec' : 'min'}` };
  });
}

export function activityLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 44);
  const fam = String(p.font ?? 'Inter');
  const P = Math.max(24, size * 0.9);
  const labelPx = size * 0.4;
  const steps = parseSteps(String(p.steps ?? ''));
  let y = P + labelPx * 2 + size * 0.6;
  useFont(ctx, fam, size * 1.2, 700);
  const tTop = y;
  const tLines = wrap(ctx, String(p.title ?? ''), w - P * 2, 2);
  y += tLines.length * size * 1.35 + size * 0.4;
  const gap = size * 0.25;
  const rowH = size * 1.55;
  const stepTop = y;
  if (steps.length) y += steps.length * rowH + (steps.length - 1) * gap; else y -= size * 0.4;
  return { size, fam, P, labelPx, steps, tTop, tLines, gap, rowH, stepTop, height: Math.ceil(y + P) };
}

export function rasterActivity(layer: Layer): Raster {
  const p = layer.params;
  const { canvas, ctx, w, rect } = card(layer);
  const ink = String(p.textColor ?? '#141414');
  const accent = String(p.accent ?? '#2f6bff');
  const L = activityLayout(ctx, p, w);
  const { size, fam, P, steps, rowH, gap } = L;
  const total = steps.reduce((a, s) => a + s.minutes, 0);
  const lab = pill(ctx, String(p.label || 'Activity'), P, P, L.labelPx, accent, fam);
  if (total > 0) {
    const t = `${Math.round(total * 10) / 10} min`;
    useFont(ctx, fam, size * 0.55, 600);
    const tw = ctx.measureText(t).width;
    const r = size * 0.27, x = w - P - tw;
    ctx.fillStyle = rgba(ink, 0.7);
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, P + lab.h / 2);
    // a small clock
    const cx = x - r * 1.9, cy = P + lab.h / 2;
    ctx.strokeStyle = rgba(ink, 0.7);
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.45, cy + r * 0.2); ctx.stroke();
  }
  useFont(ctx, fam, size * 1.2, 700);
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  L.tLines.forEach((l, i) => ctx.fillText(l, P, L.tTop + i * size * 1.35));
  const ssize = size * 0.72;
  steps.forEach((s, i) => {
    const cy = L.stepTop + i * (rowH + gap);
    if (i) { ctx.fillStyle = rgba(ink, 0.1); ctx.fillRect(P, cy - gap / 2 - 1, w - P * 2, 2); }
    const d = Math.min(rowH * 0.7, size * 1.1);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(P + d / 2, cy + rowH / 2, d / 2, 0, Math.PI * 2); ctx.fill();
    useFont(ctx, fam, d * 0.48, 700);
    ctx.fillStyle = onColour(accent);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), P + d / 2, cy + rowH / 2 + d * 0.02);
    ctx.textAlign = 'left';
    let right = w - P;
    if (s.time) {
      useFont(ctx, fam, ssize * 0.8, 600);
      const tw = ctx.measureText(s.time).width;
      const ch = ssize * 1.6, cw = tw + ssize * 1.1;
      right -= cw;
      ctx.fillStyle = rgba(accent, 0.12);
      ctx.beginPath(); ctx.roundRect(right, cy + (rowH - ch) / 2, cw, ch, ch / 2); ctx.fill();
      ctx.fillStyle = mix(accent, ink, 0.25);
      ctx.fillText(s.time, right + ssize * 0.55, cy + rowH / 2 + ssize * 0.03);
      right -= ssize * 0.6;
    }
    useFont(ctx, fam, ssize, 500);
    ctx.fillStyle = ink;
    const tx = P + d + ssize * 0.7;
    ctx.fillText(fit(ctx, s.text, right - tx), tx, cy + rowH / 2 + ssize * 0.04);
  });
  return { canvas, rect };
}
