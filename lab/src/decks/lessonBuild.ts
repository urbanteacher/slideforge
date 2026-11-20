// A lesson slide's `build` (docs/lesson-format.md): its items revealed a click at a time. The layouts lay items out in
// a row of columns (cards, stats, a journey) or a column of rows (keywords, a rail, a timeline's events); an item is
// the layers that share one column or one row below the title. Each item becomes a step of one set, the first of its
// layers taking the click and the rest arriving with it, as the studio's own Build control does (anim.step).
import type { Layer, Slide } from '../core';
import { CONTENT_TOP } from '../layouts';
import type { LessonBuild } from './lessonFormat';

const MODE = { click: 'on', dim: 'dim', spot: 'spot' } as const;

/** Layers that belong to no one item: the ground, the title and its bar, and anything across the whole slide. */
function isItem(l: Layer): boolean {
  if (!l.box || l.kind === 'solid' || l.kind === 'radial' || l.kind === 'linear') return false;
  if (l.params.fitGroup === 'title' || l.name === 'Accent bar') return false;
  if (l.box.y + l.box.h <= CONTENT_TOP - 4) return false;
  return l.box.w < 1500;
}

/** Group by one axis: layers whose spans along it overlap are one item (a card's panel holds its heading and words;
 *  a row's term and meaning share its height). */
function groups(items: Layer[], axis: 'x' | 'y'): Layer[][] {
  const span = (l: Layer): [number, number] => (axis === 'x' ? [l.box!.x, l.box!.x + l.box!.w] : [l.box!.y, l.box!.y + l.box!.h]);
  const sorted = [...items].sort((a, b) => span(a)[0] - span(b)[0]);
  const out: { end: number; layers: Layer[] }[] = [];
  for (const l of sorted) {
    const [a, b] = span(l), last = out[out.length - 1];
    if (last && a < last.end - 8) { last.layers.push(l); last.end = Math.max(last.end, b); } else out.push({ end: b, layers: [l] });
  }
  return out.map((g) => g.layers);
}

/** `slide` with its items built a click at a time. Bullets build a line at a time through their own list. */
export function applyBuild(slide: Slide, build: LessonBuild): Slide {
  const list = slide.layers.find((l) => l.kind === 'text' && l.params.list && l.params.list !== 'none');
  if (list) {
    list.anim = { ...list.anim, build: build === 'click' ? 'lines' : build, trigger: 'onClick' } as Layer['anim'];
    return slide;
  }
  // A layout that already builds its items (the mind map, a branch a click) keeps its steps and takes the mode.
  if (slide.layers.some((l) => l.anim.step)) {
    for (const l of slide.layers) if (l.anim.step) l.anim = { ...l.anim, step: { ...l.anim.step, mode: MODE[build] } };
    return slide;
  }
  const items = slide.layers.filter(isItem);
  if (items.length < 2) return slide;
  const byX = groups(items, 'x'), byY = groups(items, 'y');
  // Items are alike: each holds the same kinds of layer (a rule, a number, its words). The axis whose groups are alike
  // is the one the items run along; split the other way, each group is one kind (every number, every rule).
  const sig = (ls: Layer[]) => ls.map((l) => l.name).sort().join('|');
  const alike = (gs: Layer[][]) => gs.length > 1 && gs.every((x) => sig(x) === sig(gs[0]));
  const steps = alike(byX) && !alike(byY) ? byX : alike(byY) && !alike(byX) ? byY : byX.length >= byY.length ? byX : byY;
  if (steps.length < 2) return slide;
  const set = 'build-' + Math.random().toString(36).slice(2, 9);
  steps.forEach((layers, i) => {
    // In slide order, so the first drawn takes the click.
    const ordered = slide.layers.filter((l) => layers.includes(l));
    ordered.forEach((l, j) => {
      l.anim = { ...l.anim, type: 'fade', duration: 0.5, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: MODE[build] } } as Layer['anim'];
    });
  });
  return slide;
}
