import playerSrc from '../generated/player.iife.js?raw';
import { BLURRED, EASE, MOTION, Renderer, transitionEdge, transitionSpread } from '../engine';
import type { Deck, Slide } from '../core';
import { guideFontCss } from '../theme';

export function download(name: string, data: Blob | string, type = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck';

export function exportJson(deck: Deck) {
  download(`${slug(deck.title)}.sfstudio.json`, JSON.stringify(deck), 'application/json');
}

/** A single self-contained .html file: player bundle + deck JSON. Fonts load from Google Fonts. */
export function buildHtml(full: Deck): string {
  // The audience's copy: hidden slides stay in the editable .json, not in the show.
  const deck = { ...full, slides: full.slides.filter((s) => !s.hidden) };
  const fonts = (document.getElementById('sf-fonts') as HTMLLinkElement | null)?.href ?? '';
  const json = JSON.stringify(deck).replace(/</g, '\\u003c');
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(deck.title)}</title>
<meta name="generator" content="SlideForge Studio" />
${fonts ? `<link rel="stylesheet" href="${esc(fonts)}" />` : ''}
<style>
${guideFontCss(full.styleGuide)}
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
  #sf-stage { position: fixed; inset: 0; display: grid; place-items: center; background: #000; }
  #sf-canvas { display: block; touch-action: pan-y; }
  #sf-progress { position: fixed; left: 0; bottom: 0; height: 3px; background: #ff5a36; transition: width .5s cubic-bezier(.2,.8,.2,1); z-index: 2; }
  #sf-count { position: fixed; right: 16px; bottom: 12px; font: 500 12px/1 Inter, system-ui, sans-serif; color: rgba(255,255,255,.55); letter-spacing: .06em; z-index: 2; opacity: 0; transition: opacity .3s; }
  body:hover #sf-count { opacity: 1; }
  #sf-hint { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); font: 500 12px Inter, system-ui, sans-serif; color: rgba(255,255,255,.6); background: rgba(0,0,0,.45); padding: 8px 14px; border-radius: 999px; animation: sfhint 4s forwards; pointer-events: none; }
  @keyframes sfhint { 0%, 70% { opacity: 1 } 100% { opacity: 0 } }
</style>
</head>
<body>
<div id="sf-stage"><canvas id="sf-canvas"></canvas></div>
<div id="sf-progress"></div>
<div id="sf-count"></div>
<div id="sf-hint">Click or → to advance · ← back · F fullscreen</div>
<script id="sf-deck" type="application/json">${json}</script>
<script>${playerSrc.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
}

export function exportHtml(deck: Deck) {
  download(`${slug(deck.title)}.html`, buildHtml(deck), 'text/html');
}

let offscreen: { canvas: HTMLCanvasElement; r: Renderer } | null = null;
function still(): { canvas: HTMLCanvasElement; r: Renderer } {
  if (!offscreen || offscreen.r.gl.isContextLost()) {
    const canvas = document.createElement('canvas');
    offscreen = { canvas, r: new Renderer(canvas) };
  }
  return offscreen;
}

/** One moment of a slide: its own clock `t` (Infinity, fully built) with its builds clicked at
 *  `clicks`, and `time` for what moves on its own. `from` and `p` draw its transition in from the
 *  slide before, p of the way (0–1). The video export's frames. */
export interface Moment { t: number; clicks: number[]; time: number; from?: Slide | null; p?: number; hidden?: Set<string>; flip?: number; reduce?: boolean }

/** Draw a moment of a slide on the shared offscreen canvas, `width` pixels wide, and hand back the canvas. */
export function drawMoment(slide: Slide, deck: Deck, width: number, m: Moment): HTMLCanvasElement {
  const { canvas, r } = still();
  r.deckW = deck.width;
  // A thumbnail can be drawn against a bare size with no slides; it simply has no page number.
  r.order = (deck.slides ?? []).filter((s) => !s.hidden).map((s) => s.id);
  r.deckH = deck.height;
  r.setSize(width, Math.round((width * deck.height) / deck.width));
  const opts = { time: m.time, mouse: [0.5, 0.5] as [number, number], t: m.t, clicks: m.clicks, hidden: m.hidden, flip: m.flip ?? 0, reduce: m.reduce };
  if (m.from && m.p !== undefined && slide.transition.type !== 'none') {
    const tr = slide.transition, raw = Math.max(0, Math.min(1, m.p));
    r.drawTransition(m.from, { ...opts, t: Infinity, clicks: [] }, slide, opts, tr.type, EASE[MOTION.move](raw), 1, {
      edge: transitionEdge(deck, slide),
      spread: BLURRED.includes(tr.type) ? transitionSpread(EASE[MOTION.move], raw, tr.duration) : 0,
    });
  } else r.drawSlide(slide, opts, null);
  return canvas;
}

/** Keep only these slides' textures on the offscreen renderer. */
export function pruneMoments(slides: Slide[]) {
  still().r.prune(new Set(slides.flatMap((s) => s.layers.map((l) => l.id))));
}

/** Render a fully built slide to an image data URL. */
/** `flip` 1 draws the slide turned over to its back face (Flip to facts), as the handout prints it. */
export function renderStill(slide: Slide, deck: Deck, width: number, type = 'image/png', time = 2, quality = 0.9, hidden?: Set<string>, flip = 0): string {
  // `hidden`: layers left out of the picture, as the editable PowerPoint does with the words it sets as text.
  const canvas = drawMoment(slide, deck, width, { t: Infinity, clicks: [], time, hidden, flip });
  const url = canvas.toDataURL(type, quality);
  // Thumbnails are drawn for every slide in turn; keeping each one's textures would hold the whole
  // deck on the GPU (93 slides of pictures and type was enough to crash it), so only this slide's stay.
  pruneMoments([slide]);
  return url;
}

export async function exportPng(slide: Slide, deck: Deck, index: number) {
  const url = renderStill(slide, deck, deck.width);
  const blob = await (await fetch(url)).blob();
  download(`${slug(deck.title)}-slide-${index + 1}.png`, blob);
}
