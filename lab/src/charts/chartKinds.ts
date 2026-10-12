/*
 * SlideForge's chart idioms, drawn by the lab (src/render/charts.js and the data readers in
 * src/deck/content.js, ported). Each reads the table a SlideForge chart slide holds — first row names
 * the series, first column the categories, tab or | between cells — and draws on SlideForge's
 * 1180-wide plan, its height taken from the layer's box, so the rules behind it (a Sankey's
 * longest-path layers, Tukey's fences, a pictogram's clipped remainder, one scale across small
 * multiples) are SlideForge's. The type is the lab's: `size` is the label size on the slide.
 *
 * Colours come from a six-step categorical palette in fixed order (SlideForge's --chart-1..6, light
 * and dark steps), never cycled past six. A beat is what one click of a build lays down; when the
 * chart draws itself, beats arrive one after another.
 *
 * Each chart type is drawn in its own file (grouped.ts, lines.ts, …); data.ts reads the table and pen.ts
 * holds the plan and the strokes they share. Adding one is a file and a line in the switch below.
 */
import type { Params } from '../core';
import { box } from './box';
import { bullet } from './bullet';
import { combo } from './combo';
import { chartData, chartFlows, chartGroups, chartPoints, chartValues, histogramBins, rowsOf } from './data';
import { dumbbell } from './dumbbell';
import { grouped } from './grouped';
import { histogram } from './histogram';
import { lines } from './lines';
import { matrix } from './matrix';
import { multiples } from './multiples';
import { P, W, rgba, setPlanHeight, type Ctx, type Pen } from './pen';
import { pictogram } from './pictogram';
import { radar } from './radar';
import { sankey } from './sankey';
import { scatter } from './scatter';
import { stacked } from './stacked';
import { treemap } from './treemap';
import { waffle } from './waffle';

/** SlideForge's categorical steps, validated for colour-vision deficiency on each ground. */
export const CHART_LIGHT = ['#BA0428', '#049F6C', '#DF5904', '#0C97B6', '#8B6404', '#006EB8'];
export const CHART_DARK = ['#CA042C', '#049F6C', '#B84701', '#1198B8', '#A77804', '#008DEB'];

/** The kinds drawn here, in the order the chart picker lists them. */
export const TABLE_KINDS = ['grouped', 'lines', 'stack', 'area', 'scatter', 'histogram', 'box', 'pictogram', 'radar', 'sankey', 'dumbbell', 'multiples', 'bullet', 'combo', 'treemap', 'waffle', 'matrix'] as const;
export const isTableKind = (k: string) => (TABLE_KINDS as readonly string[]).includes(k);
/** Kinds whose series are peers on the drawing, so a key names them (SlideForge's allowlist). */
const LEGEND = new Set(['grouped', 'lines', 'stack', 'area', 'combo', 'radar', 'bullet', 'scatter', 'dumbbell']);

/** How many beats a chart has: what one click of a build, or one step of "draws itself", lays down. */
export function beatsOf(kind: string, text: string): number {
  const d = chartData(text);
  switch (kind) {
    case 'grouped': return d.series.length > 1 ? d.series.length : d.categories.length;
    case 'lines': case 'stack': case 'area': case 'radar': case 'combo': return Math.max(1, d.series.length);
    case 'scatter': return Math.max(1, chartPoints(text).series.length);
    case 'histogram': return Math.max(1, histogramBins(chartValues(text)).length);
    case 'box': return Math.max(1, chartGroups(text).length);
    case 'sankey': return Math.max(1, chartFlows(text).layers - 1);
    case 'waffle': return Math.max(1, d.categories.length);
    case 'matrix': return Math.max(1, rowsOf(text).length - 1);
    default: return Math.max(1, d.categories.length);
  }
}

/**
 * Draw one of SlideForge's chart kinds into a box of w × h on the context (already translated to the
 * box's corner). `progress(i, of)` is each beat's arrival, 0–1: 1 when the chart is settled.
 */
export function drawTableChart(ctx: Ctx, w: number, h: number, params: Params, progress: (i: number, of: number) => number) {
  const kind = String(params.chart ?? 'grouped'), text = String(params.data ?? '');
  const ink = String(params.textColor ?? '#1a1a1a');
  const palette = String(params.palette ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const steps = palette.length ? palette : CHART_LIGHT;
  const font = String(params.font ?? 'Inter'), size = Number(params.size ?? 36);
  const d = chartData(text);
  const keyed = LEGEND.has(kind) && (kind === 'scatter' ? chartPoints(text).series.length : d.series.length) > 1;
  const names = kind === 'scatter' ? chartPoints(text).series.map((s) => s.name) : d.series.map((s) => s.name);
  const keyH = keyed ? size * 1.9 : 0;
  // The plan fits the box, centred; the key sits above it, as SlideForge's chart-key does.
  const k = w / W;
  setPlanHeight(Math.max(300, Math.max(1, h - keyH) / k));
  const ox = 0, oy = keyH;
  P.padB = 42 + (size / k) * 1.05;
  P.padL = 40 + (size / k) * 2.8;
  const of = beatsOf(kind, text);
  let saved = 1;
  const pen: Pen = {
    ctx, ink, font, dim: rgba(ink, 0.72), rule: rgba(ink, 0.18), surface: String(params.surface ?? '#ffffff'),
    col: (i) => steps[i % steps.length], px: size / k,
    grow: (i) => Math.max(0, Math.min(1, progress(i, of))),
    // A beat is seen at once and then grows: its marks fade in over the first third of its arrival.
    beat: (i) => { saved = ctx.globalAlpha; ctx.globalAlpha = saved * Math.min(1, Math.max(0, progress(i, of)) * 3); },
    settle: () => { ctx.globalAlpha = saved; },
  };
  if (keyed) {
    ctx.save();
    ctx.font = `600 ${size}px "${font}", system-ui, sans-serif`;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const gapX = size * 1.2, dot = size * 0.62;
    const widths = names.map((n) => dot + size * 0.4 + ctx.measureText(n).width);
    let x = Math.max(0, (w - (widths.reduce((a, b) => a + b, 0) + gapX * (names.length - 1))) / 2);
    names.forEach((n, i) => {
      ctx.fillStyle = pen.col(i); ctx.beginPath(); ctx.arc(x + dot / 2, keyH / 2 - size * 0.2, dot / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink; ctx.fillText(n, x + dot + size * 0.4, keyH / 2 - size * 0.2);
      x += widths[i] + gapX;
    });
    ctx.restore();
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(k, k);
  switch (kind) {
    case 'grouped': grouped(pen, d); break;
    case 'lines': lines(pen, d, false); break;
    case 'area': lines(pen, d, true); break;
    case 'stack': stacked(pen, d); break;
    case 'scatter': scatter(pen, text); break;
    case 'histogram': histogram(pen, text); break;
    case 'box': box(pen, text); break;
    case 'pictogram': pictogram(pen, d, params); break;
    case 'radar': radar(pen, d); break;
    case 'sankey': sankey(pen, text); break;
    case 'dumbbell': dumbbell(pen, d); break;
    case 'multiples': multiples(pen, d); break;
    case 'bullet': bullet(pen, d); break;
    case 'combo': combo(pen, d); break;
    case 'treemap': treemap(pen, d); break;
    case 'waffle': waffle(pen, d); break;
    case 'matrix': matrix(pen, text); break;
  }
  ctx.restore();
}
