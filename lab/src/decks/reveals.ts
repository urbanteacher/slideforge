// Revealed lists built from the lab's own layers (docs/editable-figures-plan.md, part 2): SlideForge's `reveal`
// figure, a list a row per click, comes in as text and pictures a teacher can edit (layouts/reveal.ts), not as a
// picture of the figure. A new copy is built that way (fromSlideForge.ts convert); an older copy is mended as it opens.
import type { Deck, LiveFigure, Slide } from '../core';
import { revealSlide, syncHeaderFooter, type LayoutStyle } from '../layouts';
import { finishSlide, kit } from './ukbtDeck';
import { buildSlide, type ArtSource, type SFSlide } from './fromSlideForge';

/** A figure the lab builds from its own layers rather than standing in for it: a revealed list. */
export function isNativeFigure(s: { type?: string; figure?: unknown; figureData?: unknown }): boolean {
  return s.type === 'figure' && s.figure === 'reveal' && Array.isArray((s.figureData as { rows?: unknown } | undefined)?.rows);
}

/** A revealed list's figure as the lab's layers (layouts/reveal.ts), and what its steps' captions said, for the notes. */
export function revealOf(st: LayoutStyle, s: SFSlide): { slide: Slide; note?: string } {
  const f = s as SFSlide & Partial<LiveFigure>, d = (f.figureData ?? {}) as Record<string, unknown>;
  const steps = (Array.isArray(f.figureSteps) ? f.figureSteps : []) as { caption?: string; upto?: number }[];
  const slide = revealSlide(st, { ...(d as object), title: s.title ?? '', eyebrow: f.figureEyebrow, sub: typeof d.sub === 'string' ? d.sub : undefined, rows: (d.rows as never[]) ?? [], steps });
  const said = steps.map((x, i) => (x.caption ? `${i ? `Click ${i}` : 'Opening'}: ${x.caption}` : '')).filter(Boolean);
  return { slide, note: said.length ? `What the slide said at each click, to say aloud:\n${said.join('\n')}` : undefined };
}

/** A copy whose revealed lists came in as pictures of a live figure (before they were built from layers): each
 *  rebuilt from its figure, in place, keeping the slide's id, notes and hidden flag. Their words could not be
 *  edited, so nothing a teacher wrote is lost. Run each time a copy opens; a copy with none is left alone. */
export function carryDeckReveals(deck: Deck, paletteId = 'nul', set?: string, art?: ArtSource, source: SFSlide[] = []): number {
  const want = deck.slides.map((sl, i) => [sl, i] as const).filter(([sl]) => sl.liveFigure && sl.figure && isNativeFigure({ type: 'figure', ...sl.figure }));
  if (!want.length) return 0;
  const k = kit(paletteId, set);
  const img = (p?: string) => p ?? '';
  for (const [old, at] of want) {
    const fig = old.figure!;
    const from = source.find((x) => x.id && x.id === old.sourceSlideId);
    const s = { ...(from ?? {}), ...fig, type: 'figure', id: old.sourceSlideId, notes: old.notes, hidden: old.hidden } as SFSlide;
    const made = buildSlide(s, k, img, art && { theme: art.theme, index: from ? source.indexOf(from) : at, deckTitle: art.title, total: source.length || deck.slides.length, slides: source });
    if (!made) continue;
    const said = /LAB — What the slide said[\s\S]*$/.exec(made.notes ?? '')?.[0];
    made.notes = [(old.notes ?? '').replace(/\n*LAB — A live figure, drawn here as its last step\.[^\n]*/, '').trim(), said].filter(Boolean).join('\n\n');
    const next = finishSlide(made, at);
    next.id = old.id;
    if (old.hidden) next.hidden = true;
    deck.slides[at] = next;
  }
  if (deck.headerFooter?.enabled) syncHeaderFooter(deck);
  return want.length;
}

