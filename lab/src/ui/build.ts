import { slideOf, useStore } from '../model/store';
import type { Layer, Slide } from '../model/types';
import { siblingsOf } from './order';

// Build on Next for a set: SlideForge reveals a slide's cards, rows or choices one per press. Here
// the set is read off the canvas the way reordering reads it (the like items, each with its whole
// group, in reading order), and each item becomes one click: its first layer waits for the press
// and the rest of it arrives with that one.

export type SetBuild = 'off' | 'on' | 'dim' | 'spot' | 'swap' | 'pile';

/** What one item of the set is called in the panel. */
export function itemNoun(slide: Slide, l: Layer): string {
  const role = l.params.blockRole;
  if (role === 'cards' || /^card\b/i.test(l.name)) return 'card';
  if (role === 'numbered') return 'point';
  if (role === 'choices') return 'choice';
  return siblingsOf(slide, l)?.dir === 'column' ? 'row' : 'item';
}

export function setBuildOf(l: Layer): SetBuild {
  return l.anim.step?.mode ?? 'off';
}

export function buildSet(layerId: string, mode: SetBuild) {
  const st = useStore.getState();
  const slide = slideOf(st);
  const l = slide.layers.find((x) => x.id === layerId);
  const sib = l && siblingsOf(slide, l);
  if (!sib) return;
  const ids = new Set(sib.units.flatMap((u) => u.ids));
  const set = slide.layers.find((x) => ids.has(x.id) && x.anim.step)?.anim.step?.set ?? `s${Math.random().toString(36).slice(2, 9)}`;
  st.updateSlide((s) => {
    if (mode === 'off') {
      for (const x of s.layers) {
        if (!ids.has(x.id) || !x.anim.step) continue;
        delete x.anim.step;
        x.anim.trigger = 'withSlide';
      }
      return;
    }
    // The stack is the build order, so the set's layers go into it in reading order, each item kept
    // whole and in its own stacking, where the set began. Like items do not overlap, so nothing on
    // the slide changes how it looks.
    const at = Math.min(...[...ids].map((id) => s.layers.findIndex((x) => x.id === id)).filter((i) => i >= 0));
    const seen = new Set<string>();
    const units = sib.units.map((u) => s.layers.filter((x) => u.ids.includes(x.id) && !seen.has(x.id) && seen.add(x.id)));
    s.layers = s.layers.filter((x) => !ids.has(x.id));
    s.layers.splice(at, 0, ...units.flat());
    units.forEach((members, i) => members.forEach((x, j) => {
      if (x.anim.type === 'none') { x.anim.type = 'fade'; x.anim.duration = 0.6; }
      x.anim.trigger = j === 0 ? 'onClick' : 'withSlide';
      if (j === 0) x.anim.delay = 0;
      x.anim.step = { set, i, mode };
    }));
  });
}
