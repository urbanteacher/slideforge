import type { Slide } from './types';
import { WIDGET_MAX } from '../engine';

// How heavy a slide may get before the editor or a share suffers (BACKLOG CS-11, from Claude Slides' per-slide
// caps). Nothing is refused: the filmstrip marks the slide and the Slide panel says what to do. The numbers are
// where the studio is measured to slow, and well inside what a share may carry (SHARE_LIMITS).

/** What a share may carry (CS-14 step 2): the lesson's words, each picture, and all its pictures. The relay
 *  (server/server.js MAX_DOC, SHARE_PICS, SHARE_PICS_BYTES) and the account (0003, 0004) hold to the same, with
 *  room for the request around it. */
export const SHARE_LIMITS = { words: 7.5 * 1024 * 1024, each: 7.5 * 1024 * 1024, all: 100 * 1024 * 1024, pictures: 600 };

/** The largest video file Add and the Video tab take into a slide; past it, a link is the way. */
export const VIDEO_UPLOAD_MAX = 60e6;

export const SLIDE_LIMITS = {
  /** Layers on one slide: past this the canvas, the timeline and the layer list slow down. */
  layers: 200,
  /** One SVG drawing, in bytes of its source: a drawing is re-read on every frame it changes. */
  svg: 150 * 1024,
  /** One picture, video or sound held in the slide, in bytes: past this it slows the editor and the show. */
  media: 2 * 1024 * 1024,
  /** Everything held in the slide, in bytes. */
  slide: 5 * 1024 * 1024,
};

/** A size as a person says it: KB under a megabyte, MB from there. */
const size = (n: number) => (n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** How many bytes a data address holds, as a file would: a base64 one is a third larger than its bytes, and a
 *  %-escaped one (an SVG written with encodeURIComponent) counts each %xx as one. */
export function dataBytes(d: string): number {
  const comma = d.indexOf(',');
  if (comma < 0) return d.length;
  const body = d.length - comma - 1;
  if (/;base64$/i.test(d.slice(0, comma))) {
    const pad = d.endsWith('==') ? 2 : d.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((body * 3) / 4) - pad);
  }
  let escapes = 0;
  for (let i = comma + 1; i < d.length; i++) if (d.charCodeAt(i) === 37) escapes++; // %
  return body - 2 * escapes;
}

/** Every embedded data address in a layer's settings, however deep. */
function embedded(v: unknown, out: string[], depth = 0): void {
  if (depth > 6 || v == null) return;
  if (typeof v === 'string') { if (v.startsWith('data:')) out.push(v); return; }
  if (Array.isArray(v)) { for (const x of v) embedded(x, out, depth + 1); return; }
  if (typeof v === 'object') for (const x of Object.values(v as Record<string, unknown>)) embedded(x, out, depth + 1);
}

/** What makes this slide too heavy, as sentences that say what to do; empty when nothing does. */
export function limitsOf(slide: Slide, limits = SLIDE_LIMITS): string[] {
  const out: string[] = [];
  if (slide.layers.length > limits.layers) {
    out.push(`${slide.layers.length} layers, over the ${limits.layers} the editor handles smoothly. Split the slide, or merge layers that never move.`);
  }
  for (const l of slide.layers) {
    const html = l.kind === 'widget' ? String((l.params as Record<string, unknown>).html ?? '') : '';
    if (html.length > WIDGET_MAX) out.push(`“${l.name}” is a widget of ${(html.length / 1024).toFixed(1)} KB, over ${WIDGET_MAX / 1024} KB, so the show will not run it. Make its page smaller.`);
  }
  let total = 0;
  const seen = new Set<string>();
  for (const l of slide.layers) {
    const found: string[] = [];
    embedded(l.params, found);
    for (const d of found) {
      if (seen.has(d)) continue;
      seen.add(d);
      const bytes = dataBytes(d);
      total += bytes;
      const svg = d.startsWith('data:image/svg');
      if (svg && bytes > limits.svg) out.push(`“${l.name}” is a drawing of ${size(bytes)}, over ${size(limits.svg)}, so it is slow to draw. Simplify it, or replace it with a picture.`);
      else if (!svg && bytes > limits.media) out.push(`“${l.name}” is ${size(bytes)}, over ${size(limits.media)}, so it slows the editor and the show. Make it smaller, or link a video instead.`);
    }
  }
  if (total > limits.slide) out.push(`The slide holds ${size(total)} of pictures and media, over ${size(limits.slide)}. Make them smaller: the slide is slow to edit and to show.`);
  return out;
}

/** Why a lesson to share is over what a share may carry (SHARE_LIMITS), or '' when it is within it. `doc` is the
 *  packed copy (core/pictures.ts): its words, and its pictures kept once in `pictures`. Sizes are as sent (a
 *  picture's data address, not the file it holds), since that is what each request carries. */
export function shareTooLarge(doc: { pictures?: string[] }, limits = SHARE_LIMITS): string {
  const pics = Array.isArray(doc.pictures) ? doc.pictures : [];
  const words = JSON.stringify({ ...doc, pictures: undefined }).length;
  const sizes = pics.map((p) => p.length);
  const biggest = Math.max(0, ...sizes), all = sizes.reduce((t, n) => t + n, 0);
  if (words > limits.words) return `the lesson’s slides come to ${size(words)} without their pictures, over ${size(limits.words)}. Split the lesson`;
  if (biggest > limits.each) return `one picture or video is ${size(biggest)}, over the ${size(limits.each)} each may be. Make it smaller, or link the video instead`;
  if (all > limits.all) return `its pictures and videos come to ${size(all)}, over the ${size(limits.all)} a share may carry. Make them smaller, or split the lesson`;
  if (pics.length > limits.pictures) return `it has ${pics.length} different pictures and videos, over the ${limits.pictures} a share may carry. Split the lesson`;
  return '';
}
