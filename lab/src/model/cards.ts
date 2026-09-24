import { contentHeight } from '../engine/raster';
import type { Slide } from './types';

// Cards that fit their words, live. A set of cards (made by the Cards layout) shares one height: the
// one the fullest card needs, plus its padding, so the cards always end on the same line and none
// has a well of empty panel under short copy. Run after every edit, so typing into a card grows or
// shrinks the whole set as you go.

/** Where a card's words start below its top edge, and the padding under the last line. */
export const CARD_TOP = 150;
export const CARD_PAD = 48;

/** Resize every card set on the slide to its fullest card. Returns whether anything moved. */
export function reflowCards(s: Slide, slideHeight = 1080): boolean {
  const sets = new Map<string, Slide['layers']>();
  for (const l of s.layers) {
    const id = l.params.cardSet;
    if (typeof id === 'string' && l.box) (sets.get(id) ?? sets.set(id, []).get(id)!).push(l);
  }
  let moved = false;
  for (const members of sets.values()) {
    const words = members.filter((l) => l.params.cardPart === 'words' && l.visible);
    const panels = members.filter((l) => l.params.cardPart === 'panel');
    if (!words.length || !panels.length) continue;
    // Cards made with an area keep centred in it (between the title and the footer); others keep their top.
    const area = Array.isArray(panels[0].params.cardArea) ? (panels[0].params.cardArea as unknown as [number, number]) : null;
    const tallest = Math.max(...words.map((w) => contentHeight({ kind: 'text', params: { ...w.params, fit: 'grow' } }, w.box!.w) ?? 0));
    const first = Math.min(...panels.map((p) => p.box!.y));
    const limit = area ? area[1] - area[0] : slideHeight - 84 - first;
    const h = Math.round(Math.min(limit, CARD_TOP + tallest + CARD_PAD));
    const top = area ? Math.round(area[0] + (area[1] - area[0] - h) / 2) : first;
    const dy = top - first;
    for (const l of members) if (l.params.cardPart !== 'panel' && l.params.cardPart !== 'words' && dy) { l.box!.y += dy; moved = true; }
    for (const p of panels) if (Math.abs(p.box!.h - h) > 0.5 || p.box!.y !== top) { p.box!.h = h; p.box!.y = top; moved = true; }
    for (const w of words) {
      const wh = h - CARD_TOP - CARD_PAD;
      if (Math.abs(w.box!.h - wh) > 0.5 || w.box!.y !== top + CARD_TOP) { w.box!.h = wh; w.box!.y = top + CARD_TOP; moved = true; }
    }
  }
  return moved;
}
