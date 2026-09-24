import { contentHeight } from '../engine/raster';
import { kind } from '../engine/registry';
import type { Deck } from './types';

// Slide shape, as SlideForge's Settings offers it: 16:9 for most projectors, 16:10 for laptops,
// 4:3 for older lecture theatres (1920×1080, 1920×1200, 1440×1080). Every box keeps its relative
// place in the new frame. Text keeps its line breaks — its size follows the narrower side, so 4:3
// sets it at three quarters and 16:10 not at all — because a line set for one frame and rewrapped
// in another runs into whatever sits under it. Pictures keep their proportions; a box that filled
// the old slide fills the new one.

export const ASPECTS = [
  { value: '16:9', label: '16:9 widescreen', hint: 'Widescreen, most projectors', w: 1920, h: 1080 },
  { value: '16:10', label: '16:10 laptop', hint: 'A little taller, common on laptops', w: 1920, h: 1200 },
  { value: '4:3', label: '4:3 older projector', hint: 'Older lecture-theatre projectors', w: 1440, h: 1080 },
] as const;
export type Aspect = (typeof ASPECTS)[number]['value'];

export function aspectOf(d: Pick<Deck, 'width' | 'height'>): Aspect {
  const r = d.width / d.height;
  return (ASPECTS.reduce((best, a) => (Math.abs(a.w / a.h - r) < Math.abs(best.w / best.h - r) ? a : best), ASPECTS[0] as (typeof ASPECTS)[number])).value;
}

export function setAspect(d: Deck, to: Aspect) {
  const a = ASPECTS.find((x) => x.value === to)!;
  const W0 = d.width, H0 = d.height, kx = a.w / W0, ky = a.h / H0;
  if (kx === 1 && ky === 1) return;
  for (const s of d.slides) for (const l of s.layers) {
    const b = l.box;
    if (!b || !kind(l.kind).content) continue;
    const full = b.x <= 2 && b.y <= 2 && b.x + b.w >= W0 - 2 && b.y + b.h >= H0 - 2;
    if (full) { b.x = 0; b.y = 0; b.w = a.w; b.h = a.h; continue; }
    // A box that bleeds off two opposite edges — the picture half of an image + text slide, a band
    // across the foot — keeps bleeding: it spans the new frame on that axis and scales on the other.
    const bleedsV = b.y <= 2 && b.y + b.h >= H0 - 2, bleedsH = b.x <= 2 && b.x + b.w >= W0 - 2;
    if ((bleedsV || bleedsH) && l.kind !== 'text') {
      if (bleedsV) { b.y = 0; b.h = a.h; b.x *= kx; b.w *= kx; }
      else { b.x = 0; b.w = a.w; b.y *= ky; b.h *= ky; }
      continue;
    }
    const cx = (b.x + b.w / 2) * kx, cy = (b.y + b.h / 2) * ky;
    if (l.kind === 'text') {
      // The same line breaks: type and box scale together with the narrower side, so a headline set
      // for the old frame cannot rewrap into its neighbours. 16:10 keeps the width, so its type is
      // unchanged and only the spacing opens up.
      const k = Math.min(kx, ky);
      b.w *= k;
      l.params.size = Math.round(Number(l.params.size ?? 40) * k * 10) / 10;
      b.h = contentHeight(l, b.w) ?? b.h * k;
    } else if (l.kind === 'image' || l.kind === 'video' || l.params.shape === 'ellipse' || l.params.shape === 'ring' || l.params.shape === 'star') {
      // Pictures and round shapes keep their proportions.
      const k = Math.min(kx, ky);
      b.w *= k; b.h *= k;
    } else {
      // Panels, rules and composed items stretch with the frame; a rule stays a hairline.
      b.w *= kx;
      if (b.h > 16) b.h *= ky;
    }
    b.x = cx - b.w / 2;
    b.y = cy - b.h / 2;
  }
  d.width = a.w;
  d.height = a.h;
}
