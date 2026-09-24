import { isBackdrop } from './backdrop';
import { chartCalloutSlide, exploreSlide, framedPictureSlide, gallerySlide, slideStyle, themeOf, LAYOUT_STYLES } from './layouts';
import type { Deck, Slide } from './types';

/*
 * Slide designs made of several layers (Explore, Flip to facts, the gallery pile, chart callouts)
 * remember what they were built from. Editing that and building again keeps the slide where it is —
 * its id, notes, name, ground and transition — and its header, footer and backdrop; the design's own
 * layers are made afresh in the deck's style.
 */
type Args = Record<string, unknown>;
const BUILD: Record<string, (st: ReturnType<typeof slideStyle>, a: Args) => Slide> = {
  explore: (st, a) => exploreSlide(st, String(a.title ?? ''), String(a.src ?? ''), (a.spots as never) ?? [], Number(a.aspect) || 16 / 9),
  flip: (st, a) => framedPictureSlide(st, String(a.caption ?? ''), String(a.credit ?? ''), String(a.src ?? ''), String(a.frame ?? '4:3'), a.cap === 'plain' ? 'plain' : 'bar', String(a.facts ?? '')),
  gallery: (st, a) => gallerySlide(st, String(a.title ?? ''), (a.figs as never) ?? [], String(a.frame ?? '4:3'), a.cap === 'plain' ? 'plain' : 'bar', a.fit === 'cover' ? 'cover' : 'contain'),
  callouts: (st, a) => chartCalloutSlide(st, String(a.title ?? ''), String(a.data ?? ''), String(a.source ?? ''), (a.callouts as never) ?? []),
};
export const RECIPE_NAMES: Record<string, string> = { explore: 'Explore', flip: 'Flip to facts', gallery: 'Gallery', callouts: 'Chart callouts' };

/** Build a slide's design again from new arguments, in place. */
export function rebuildSlide(d: Deck, slideId: string, args: Args) {
  const s = d.slides.find((x) => x.id === slideId);
  if (!s?.recipe || !BUILD[s.recipe.kind]) return;
  const st = slideStyle(themeOf(d) ?? LAYOUT_STYLES[0], s);
  const made = BUILD[s.recipe.kind](st, args);
  // The ground first, the backdrop just above it, the design, then the header and footer on top.
  const own = made.layers.filter((l) => !isBackdrop(l)), back = s.layers.filter(isBackdrop), chrome = s.layers.filter((l) => l.params.hfSlot);
  s.layers = [own[0], ...back, ...own.slice(1), ...chrome];
  s.recipe = { kind: s.recipe.kind, args };
}
