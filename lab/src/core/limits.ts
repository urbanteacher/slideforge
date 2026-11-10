import type { Slide } from './types';

// How heavy a slide may get before the editor or a share suffers (BACKLOG CS-11, from Claude Slides' per-slide
// caps). Nothing is refused: the filmstrip marks the slide and the Slide panel says what to do. The numbers are
// where the studio is measured to slow, or where a share's 7.5 MB runs out, with room to spare.

export const SLIDE_LIMITS = {
  /** Layers on one slide: past this the canvas, the timeline and the layer list slow down. */
  layers: 200,
  /** One SVG drawing's source, in characters: a drawing is re-read on every frame it changes. */
  svg: 150 * 1024,
  /** One picture, video or sound held in the slide, in characters of its data address. */
  media: 2 * 1024 * 1024,
  /** Everything held in the slide, in characters: a share carries 7.5 MB for the whole lesson. */
  slide: 5 * 1024 * 1024,
};

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
const kb = (n: number) => `${Math.round(n / 1024)} KB`;

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
  let total = 0;
  const seen = new Set<string>();
  for (const l of slide.layers) {
    const found: string[] = [];
    embedded(l.params, found);
    for (const d of found) {
      if (seen.has(d)) continue;
      seen.add(d);
      total += d.length;
      const svg = d.startsWith('data:image/svg');
      if (svg && d.length > limits.svg) out.push(`“${l.name}” is a drawing of ${kb(d.length)}, over ${kb(limits.svg)}, so it is slow to draw. Simplify it, or replace it with a picture.`);
      else if (!svg && d.length > limits.media) out.push(`“${l.name}” holds ${mb(d.length)}, over ${mb(limits.media)}. A shared lesson carries 7.5 MB in all: make it smaller, or link a video instead.`);
    }
  }
  if (total > limits.slide) out.push(`The slide holds ${mb(total)} of pictures and media, over ${mb(limits.slide)}. Make them smaller, or the lesson may be too large to share.`);
  return out;
}
