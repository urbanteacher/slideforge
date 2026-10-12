// The chart layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { EASE, MAX_TEX, fit, fmtNum, makeCanvas, mctx, mix, rgba, useFont, type Ctx, type Raster } from '../../engine';
import { drawTableChart, isTableKind } from '../../charts';

// ─── Chart editing on the canvas ────────────────────────────────────────────
/** Where each point's label and value are drawn, in box coordinates, so the editor can put a field
 *  exactly on top of what it edits. Mirrors the layout in rasterChart. */
export interface ChartSpot { i: number; label: string; value: number; lx: number; ly: number; lw: number; la: 'left' | 'center' | 'right'; vx: number; vy: number; va: 'left' | 'center' }
export function chartSpots(layer: Layer): { spots: ChartSpot[]; add: [number, number]; size: number } {
  const p = layer.params;
  const { w, h } = layer.box!;
  const data = parseChartData(String(p.data ?? ''));
  const size = Number(p.size ?? 28);
  const type = String(p.chart ?? 'column');
  const n = Math.max(1, data.length);
  const ctx = mctx();
  useFont(ctx, String(p.font ?? 'Inter'), size, 500);
  if (type === 'pie' || type === 'donut') {
    const legendPx = Math.min(size, (h / n) * 0.6);
    const legendW = legendPx * 1.3 + Math.max(0, ...data.map((d) => ctx.measureText(`${d.label}  100%`).width));
    const R = Math.max(Math.min(h, w * 0.3) / 2, Math.min(h / 2, (w - legendW - size * 1.4) / 2)) - 2;
    const lx = R + 2 + R + size * 1.4;
    const rowH = Math.min(size * 1.8, h / n), ls = Math.min(size, rowH * 0.6);
    const ly0 = h / 2 - (rowH * n) / 2;
    const lw = Math.max(80, (w - lx) * 0.55);
    return {
      size: ls,
      spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: lx + ls * 1.3, ly: ly0 + rowH * (i + 0.5), lw, la: 'left', vx: lx + ls * 1.3 + lw + ls * 0.6, vy: ly0 + rowH * (i + 0.5), va: 'left' })),
      add: [lx + ls * 1.3, ly0 + rowH * (n + 0.5)],
    };
  }
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const showValues = !!p.values;
  if (type === 'bar') {
    const labelW = Math.min(w * 0.35, Math.max(0, ...data.map((d) => ctx.measureText(d.label).width)) + size * 0.6);
    const valW = showValues ? Math.max(0, ...data.map((d) => ctx.measureText(fmtNum(d.value)).width)) + size * 0.6 : 0;
    const x0 = labelW, plotW = w - labelW - valW, slot = h / n;
    return {
      size,
      spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: x0 - size * 0.5, ly: slot * (i + 0.5), lw: labelW - size * 0.6, la: 'right', vx: x0 + Math.max(0, (d.value / max) * plotW) + size * 0.4, vy: slot * (i + 0.5), va: 'left' })),
      add: [x0 - size * 0.5, h + size * 0.9],
    };
  }
  const labelH = size * 1.8, top = showValues ? size * 1.5 : size * 0.5;
  const plotH = h - labelH - top, slot = w / n;
  const yOf = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  return {
    size,
    spots: data.map((d, i) => ({ i, label: d.label, value: d.value, lx: slot * (i + 0.5), ly: top + plotH + labelH / 2, lw: slot * 0.9, la: 'center', vx: slot * (i + 0.5), vy: yOf(d.value) - size * (type === 'line' ? 1.05 : 0.7), va: 'center' })),
    add: [w + size * 0.9, top + plotH + labelH / 2],
  };
}

// ─── Chart ──────────────────────────────────────────────────────────────────
export function parseChartData(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(.*?)[,:\t]\s*(-?[\d.,]+)\s*%?\s*$/);
    if (!m) return { label: l, value: 0 };
    return { label: m[1].trim(), value: Number(m[2].replace(/,/g, '')) || 0 };
  });
}


function niceMax(v: number) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / e;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
}

export function rasterChart(layer: Layer, textT = Infinity): Raster {
  const p = layer.params;
  // "Draws itself": each bar, point or wedge at its own progress, one after another. Settled is 1.
  const a = layer.anim;
  const drawing = a.type === 'draw' && Number.isFinite(textT);
  const grow = (i: number) => (drawing ? EASE[a.easing](Math.max(0, Math.min(1, (textT - i * a.stagger) / Math.max(0.01, a.duration)))) : 1);
  const { w, h } = layer.box!;
  const pad = 8;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const rect: Raster['rect'] = [-pad, -pad, rw, rh];
  const type0 = String(p.chart ?? 'column');
  // SlideForge's other idioms read a table and are drawn by chartKinds; each beat arrives in turn.
  if (isTableKind(type0)) {
    drawTableChart(ctx, w, h, p, (i) => grow(i));
    return { canvas, rect };
  }
  const data = parseChartData(String(p.data ?? ''));
  if (!data.length) return { canvas, rect };
  const fam = String(p.font ?? 'Inter');
  const size = Number(p.size ?? 28);
  const ink = String(p.textColor ?? '#1a1a1a');
  const c1 = String(p.color ?? '#ff5a36'), c2 = String(p.color2 ?? c1);
  const colour = (i: number) => (data.length < 2 ? c1 : mix(c1, c2, i / (data.length - 1)));
  const type = String(p.chart ?? 'column');
  const showValues = !!p.values;
  const n = data.length;

  if (type === 'pie' || type === 'donut') {
    const total = data.reduce((a, d) => a + Math.max(0, d.value), 0) || 1;
    const legendPx = Math.min(size, (h / n) * 0.6);
    useFont(ctx, fam, legendPx, 500);
    const legendW = legendPx * 1.3 + Math.max(...data.map((d) => ctx.measureText(`${d.label}  100%`).width));
    const R = Math.max(Math.min(h, w * 0.3) / 2, Math.min(h / 2, (w - legendW - size * 1.4) / 2)) - 2;
    const cx = R + 2, cy = h / 2;
    let ang = -Math.PI / 2;
    const gapA = n > 1 ? 0.012 : 0;
    // A pie sweeps round as one: wedge i is drawn once the sweep has passed its start.
    const sweep = drawing ? EASE[a.easing](Math.max(0, Math.min(1, textT / Math.max(0.01, a.duration + (n - 1) * a.stagger)))) * Math.PI * 2 : Infinity;
    data.forEach((d, i) => {
      const full = (Math.max(0, d.value) / total) * Math.PI * 2;
      const done = ang + Math.PI / 2;
      const da = Math.min(full, Math.max(0, sweep - done));
      if (da <= 0) { ang += full; return; }
      ctx.fillStyle = colour(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, ang + gapA, ang + Math.max(gapA, da - gapA));
      ctx.closePath();
      ctx.fill();
      ang += full;
    });
    if (type === 'donut') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.58, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // legend
    const lx = cx + R + size * 1.4;
    const rowH = Math.min(size * 1.8, h / n);
    const ls = Math.min(size, rowH * 0.6);
    let ly = cy - (rowH * n) / 2;
    data.forEach((d, i) => {
      ctx.globalAlpha = grow(i);
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.roundRect(lx, ly + rowH / 2 - ls * 0.4, ls * 0.8, ls * 0.8, ls * 0.2); ctx.fill();
      useFont(ctx, fam, ls, 500);
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';
      const pct = showValues ? `  ${Math.round((Math.max(0, d.value) / total) * 100)}%` : '';
      ctx.fillText(fit(ctx, d.label + pct, w - lx - ls * 1.3), lx + ls * 1.3, ly + rowH / 2);
      ly += rowH;
    });
    ctx.globalAlpha = 1;
    return { canvas, rect };
  }

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  useFont(ctx, fam, size, 500);
  ctx.textBaseline = 'middle';

  if (type === 'bar') {
    const labelW = Math.min(w * 0.35, Math.max(...data.map((d) => ctx.measureText(d.label).width)) + size * 0.6);
    const valW = showValues ? Math.max(...data.map((d) => ctx.measureText(fmtNum(d.value)).width)) + size * 0.6 : 0;
    const x0 = labelW, plotW = w - labelW - valW;
    const slot = h / n, bh = slot * 0.64;
    if (p.grid) {
      ctx.fillStyle = rgba(ink, 0.12);
      for (let g = 0; g <= 4; g++) ctx.fillRect(x0 + (plotW * g) / 4, 0, 2, h);
    }
    data.forEach((d, i) => {
      const y = i * slot + (slot - bh) / 2;
      const g = grow(i);
      const bw = Math.max(0, (d.value / max) * plotW) * g;
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.roundRect(x0, y, bw, bh, [0, Math.min(bh * 0.2, 14), Math.min(bh * 0.2, 14), 0]); ctx.fill();
      ctx.fillStyle = ink;
      ctx.textAlign = 'right';
      ctx.fillText(fit(ctx, d.label, labelW - size * 0.6), x0 - size * 0.5, y + bh / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = g;
      if (showValues) ctx.fillText(fmtNum(d.value), x0 + bw + size * 0.4, y + bh / 2);
      ctx.globalAlpha = 1;
    });
    return { canvas, rect };
  }

  // column and line share a vertical value axis
  const labelH = size * 1.8, top = showValues ? size * 1.5 : size * 0.5;
  const plotH = h - labelH - top;
  const slot = w / n;
  const yOf = (v: number) => top + plotH - (Math.max(0, v) / max) * plotH;
  if (p.grid) {
    ctx.fillStyle = rgba(ink, 0.12);
    for (let g = 0; g <= 4; g++) ctx.fillRect(0, top + (plotH * g) / 4, w, 2);
  }
  ctx.textAlign = 'center';
  if (type === 'line') {
    const pts = data.map((d, i) => [slot * (i + 0.5), yOf(d.value)] as const);
    // A line draws along: everything left of the pen, the pen moving point to point.
    ctx.save();
    if (drawing) {
      const k = EASE[a.easing](Math.max(0, Math.min(1, textT / Math.max(0.01, a.duration + (n - 1) * a.stagger))));
      ctx.beginPath(); ctx.rect(-pad, -pad, pts[0][0] + (pts[pts.length - 1][0] - pts[0][0]) * k + pad + Math.max(5, size * 0.3), h + pad * 2); ctx.clip();
    }
    const g = ctx.createLinearGradient(0, top, 0, top + plotH);
    g.addColorStop(0, rgba(c1, 0.28));
    g.addColorStop(1, rgba(c1, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], top + plotH);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1][0], top + plotH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c1;
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = colour(i);
      ctx.beginPath(); ctx.arc(x, y, Math.max(5, size * 0.3), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  data.forEach((d, i) => {
    const x = slot * (i + 0.5);
    const g = type === 'column' ? grow(i) : 1;
    const y = top + plotH - (top + plotH - yOf(d.value)) * g;
    if (type === 'column') {
      const bw = slot * 0.62;
      ctx.fillStyle = colour(i);
      const r = Math.min(bw * 0.18, 14);
      ctx.beginPath(); ctx.roundRect(x - bw / 2, y, bw, top + plotH - y, [r, r, 0, 0]); ctx.fill();
    }
    ctx.fillStyle = ink;
    ctx.fillText(fit(ctx, d.label, slot * 0.95), x, top + plotH + labelH / 2);
    ctx.globalAlpha = type === 'column' ? g : drawing ? grow(i) : 1;
    if (showValues) ctx.fillText(fmtNum(d.value), x, y - size * (type === 'line' ? 1.05 : 0.7));
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left';
  return { canvas, rect };
}
