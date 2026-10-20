// The diagram layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer } from '../../core';
import { MAX_TEX, fontString, makeCanvas, mctx, useFont, type Ctx, type Raster } from '../../engine';
import { drawDiagram, layoutDiagram, type Diagram } from '../../diagrams';
import { diagramSkin } from './skin';

/** The layer's diagram, laid out in its box with the canvas's own measure. */
const faceOf = (font: string) => (px: number, weight: number) => fontString({ font, weight }, px);
export function layerDiagram(layer: Layer): Diagram {
  const p = layer.params, { w, h } = layer.box!;
  const face = faceOf(String(p.font ?? 'Inter')), ctx = mctx();
  const measure = (t: string, px: number, weight: number) => { ctx.font = face(px, weight); return ctx.measureText(t).width; };
  return layoutDiagram(String(p.diagram ?? 'loop'), String(p.data ?? ''), w, h, Number(p.size ?? 40), measure, Number(p.columns ?? 0));
}

export function rasterDiagram(layer: Layer, textT = Infinity): Raster {
  const p = layer.params, a = layer.anim;
  const { w, h } = layer.box!;
  // Builds step by step: each beat its own window of the clock, one after another. Settled is 1, so a
  // still slide, a handout and reduced motion (which never sets textT) show the finished diagram.
  const drawing = a.type === 'draw' && Number.isFinite(textT);
  const progress = (i: number) => (drawing ? Math.max(0, Math.min(1, (textT - i * a.stagger) / Math.max(0.01, a.duration))) : 1);
  const pad = 16;
  const rw = w + pad * 2, rh = h + pad * 2;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(pad, pad);
  const font = String(p.font ?? 'Inter');
  // Ask for both weights, so the drawing comes again once they have loaded.
  useFont(ctx, font, Number(p.size ?? 40), 400);
  useFont(ctx, font, Number(p.size ?? 40), 600);
  drawDiagram(ctx, layerDiagram(layer), diagramSkin(p), faceOf(font), progress);
  return { canvas, rect: [-pad, -pad, rw, rh] };
}
