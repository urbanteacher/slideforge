import { current, isDraft } from 'immer';
import { kind } from '../engine/registry';
import { createLayer } from './defaults';
import { gridFor } from './layouts';
import type { Deck, HFItem, HFKind, HFSlot, HeaderFooter, Layer, Slide } from './types';

// Header and footer, the way SlideForge's Header & footer pane has them: six slots, a deck-wide
// default, and an override for one slide. The difference is where the words live. Every filled slot
// is an ordinary box on the slide, so its text is typed on the canvas; the side panel only says
// which slot holds what. A word typed into one slide's footer is written back to the setting it came
// from and every other slide follows.

export const HF_SLOTS: HFSlot[] = ['header-left', 'header-center', 'header-right', 'footer-left', 'footer-center', 'footer-right'];

export const HF_KINDS: { value: HFKind; label: string }[] = [
  { value: 'empty', label: 'Empty' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'logo', label: 'Presentation logo' },
  { value: 'number', label: 'Page number' },
  { value: 'pages', label: 'Page / total' },
  { value: 'date', label: 'Slide date' },
  { value: 'tagline', label: 'Theme tagline' },
  { value: 'title', label: 'Presentation title' },
  { value: 'section', label: 'Section title' },
];

export const hfDefaults = (): HeaderFooter => ({
  enabled: false, hideOnCover: true,
  slots: { 'header-left': { kind: 'title' }, 'header-right': { kind: 'logo' }, 'footer-left': { kind: 'tagline' }, 'footer-right': { kind: 'pages' } },
});

/** Kinds whose words the author types on the slide. The rest are worked out and kept in step. */
const TYPED = new Set<HFKind>(['text', 'tagline', 'date', 'title']);
const PICTURE = new Set<HFKind>(['image', 'logo']);

const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** The setting that applies to a slide: its own, or the deck's. */
export function hfConfig(deck: Deck, slide: Slide): { cfg: HeaderFooter; scope: 'deck' | 'slide' } {
  if (slide.headerFooter) return { cfg: slide.headerFooter, scope: 'slide' };
  return { cfg: deck.headerFooter ?? hfDefaults(), scope: 'deck' };
}

/** Covers are title and section slides: they carry their own identity, so the frame stays off them. */
export function isCover(slide: Slide, index: number): boolean {
  return index === 0 || /(^|·\s*)(title|section|cover)\b/i.test(slide.name);
}

function coverHeading(deck: Deck, index: number): string {
  for (let i = index; i >= 0; i--) {
    const s = deck.slides[i];
    if (i > 0 && !isCover(s, i)) continue;
    const big = s.layers.filter((l) => l.kind === 'text' && l.visible).sort((a, b) => Number(b.params.size) - Number(a.params.size))[0];
    // The whole heading on one line: a title set over two lines ("Ask a better / question.") is one title.
    if (big) return String(big.params.text).replace(/\s*\n\s*/g, ' ');
  }
  return deck.title;
}

/** What a slot shows. Typed kinds keep what was typed; worked-out kinds are recomputed. */
function value(deck: Deck, index: number, item: HFItem): string {
  switch (item.kind) {
    case 'number': return '{page}';
    case 'pages': return '{page} / {pages}';
    case 'title': return deck.title || 'Presentation title';
    case 'section': return coverHeading(deck, index);
    case 'date': return item.text ?? today();
    case 'tagline': return item.text ?? 'Your tagline';
    case 'text': return item.text ?? 'Type here';
    default: return '';
  }
}

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return 1;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** The deck's own type, so a footer on a campaign deck is not set in a stranger's font. */
function deckFont(deck: Deck): string {
  const count = new Map<string, number>();
  for (const s of deck.slides) for (const l of s.layers) if (l.kind === 'text') {
    const f = String(l.params.font ?? 'Inter');
    count.set(f, (count.get(f) ?? 0) + String(l.params.text ?? '').length);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Inter';
}

// The header sits high enough that the gap from it down to a slide's title matches the gap from the
// content up to the footer, so the slide reads as balanced between the two.
const BAND = { top: 34, foot: 1014, h: 30, w: 560 };
/** A slot's box: the header and footer bands sit above and below the deck's own grid, and the three
 *  columns run between its margins, so a 4:3 deck gets 4:3 margins. */
function slotBox(deck: Deck, slot: HFSlot, picture: boolean) {
  const g = gridFor(deck), ky = deck.height / 1080, kx = deck.width / 1920;
  const col = slot.endsWith('left') ? 0 : slot.endsWith('center') ? 1 : 2;
  const w = (picture ? 240 : BAND.w) * kx;
  const x = col === 0 ? g.left : col === 1 ? (deck.width - w) / 2 : g.right - w;
  const h = (picture ? 48 : BAND.h) * ky;
  const y = (slot.startsWith('header') ? BAND.top : BAND.foot) * ky - (picture ? 9 * ky : 0);
  return { x, y, w, h, rot: 0 };
}

function makeLayer(deck: Deck, slide: Slide, slot: HFSlot, item: HFItem, text: string, scope: 'deck' | 'slide', font: string): Layer {
  const tag = { hfSlot: slot, hfKind: item.kind, hfScope: scope };
  if (PICTURE.has(item.kind)) {
    return createLayer('image', { name: `${slot} · ${item.kind}`, params: { ...tag, src: item.src ?? '', fit: 'contain' } as never, box: slotBox(deck, slot, true) });
  }
  const dark = luminance(slide.background || '#ffffff') < 0.45;
  const align = slot.endsWith('left') ? 'left' : slot.endsWith('center') ? 'center' : 'right';
  return createLayer('text', {
    name: `${slot} · ${item.kind}`, opacity: 0.72,
    params: { ...tag, text, font, size: 22 * deck.width / 1920, weight: '600', color: dark ? '#f5f4f2' : '#161616', align, tracking: 0.02, lineHeight: 1.2, fit: 'shrink' } as never,
    box: slotBox(deck, slot, false),
  });
}

const isHF = (l: Layer) => typeof l.params.hfSlot === 'string';

/**
 * Bring every slide's header and footer boxes in line with its setting. Boxes that already exist
 * keep their place, size and styling (the author may have moved or restyled them); only what they
 * say is brought up to date. Runs inside a mutate.
 */
export function syncHeaderFooter(d: Deck) {
  let font: string | null = null;
  d.slides.forEach((slide, index) => {
    const { cfg, scope } = hfConfig(d, slide);
    const want = cfg.enabled && !(cfg.hideOnCover && isCover(slide, index))
      ? HF_SLOTS.map((slot) => [slot, cfg.slots[slot]] as const).filter(([, it]) => it && it.kind !== 'empty') as [HFSlot, HFItem][]
      : [];
    const keep = new Set<string>();
    for (const [slot, item] of want) {
      const text = value(d, index, item);
      const have = slide.layers.find((l) => l.params.hfSlot === slot && l.params.hfKind === item.kind);
      if (have) {
        keep.add(have.id);
        have.params.hfScope = scope;
        if (PICTURE.has(item.kind)) { if ((item.src ?? '') !== have.params.src) have.params.src = item.src ?? ''; }
        else if (have.params.text !== text) have.params.text = text;
        continue;
      }
      font ??= deckFont(d);
      const l = makeLayer(d, slide, slot, item, text, scope, font);
      keep.add(l.id);
      // Above the content, beneath any finishing effects (grain, vignette) stacked on top.
      let at = slide.layers.length;
      while (at > 0 && !kind(slide.layers[at - 1].kind).content && kind(slide.layers[at - 1].kind).category !== 'generate') at--;
      slide.layers.splice(at, 0, l);
    }
    if (slide.layers.some((l) => isHF(l) && !keep.has(l.id))) slide.layers = slide.layers.filter((l) => !isHF(l) || keep.has(l.id));
  });
}

/** Change a setting — the deck's or one slide's — and bring every slide in line. */
export function editHeaderFooter(d: Deck, slideId: string, scope: 'deck' | 'slide', change: (c: HeaderFooter) => void) {
  const slide = d.slides.find((s) => s.id === slideId);
  if (scope === 'slide' && slide) {
    const base = d.headerFooter ?? hfDefaults();
    slide.headerFooter ??= structuredClone(isDraft(base) ? current(base) : base);
    change(slide.headerFooter);
  } else {
    d.headerFooter ??= hfDefaults();
    change(d.headerFooter);
  }
  syncHeaderFooter(d);
}

/**
 * A header or footer box that was edited on the canvas says something its setting does not. Write
 * the new words (or picture) back to the setting it belongs to, so every slide that shares it
 * follows. Returns false when there is nothing to carry back.
 */
export function carryCanvasEdits(d: Deck): boolean {
  for (const slide of d.slides) {
    for (const l of slide.layers) {
      if (!isHF(l)) continue;
      const k = l.params.hfKind as HFKind;
      const cfg = l.params.hfScope === 'slide' ? slide.headerFooter : d.headerFooter;
      const item = cfg?.slots[l.params.hfSlot as HFSlot];
      if (!cfg || !item || item.kind !== k) continue;
      if (PICTURE.has(k)) {
        const src = String(l.params.src ?? '');
        if (src && src !== (item.src ?? '')) { item.src = src; return true; }
      } else if (TYPED.has(k)) {
        const text = String(l.params.text ?? '');
        if (k === 'title') { if (text && text !== d.title) { d.title = text; return true; } }
        else if (text !== (item.text ?? value(d, 0, item))) {
          const was = item.text ?? value(d, 0, item);
          item.text = text;
          // A slide with its own setting that still said the same words was sharing them, not
          // overriding them: it follows too. One that says something else keeps it.
          if (l.params.hfScope !== 'slide') for (const s of d.slides) {
            const own = s.headerFooter?.slots[l.params.hfSlot as HFSlot];
            if (own && own.kind === k && (own.text ?? value(d, 0, own)) === was) own.text = text;
          }
          return true;
        }
      }
    }
  }
  return false;
}

/** Anything a slide should show but does not, or shows but should not — a new slide, a moved one. */
export function headerFooterStale(d: Deck): boolean {
  if (!d.headerFooter && !d.slides.some((s) => s.headerFooter)) return d.slides.some((s) => s.layers.some(isHF));
  return d.slides.some((slide, index) => {
    const { cfg } = hfConfig(d, slide);
    const on = cfg.enabled && !(cfg.hideOnCover && isCover(slide, index));
    const want = on ? HF_SLOTS.filter((s) => cfg.slots[s] && cfg.slots[s]!.kind !== 'empty') : [];
    const have = slide.layers.filter(isHF);
    if (have.length !== want.length) return true;
    return have.some((l) => {
      const item = cfg.slots[l.params.hfSlot as HFSlot];
      if (!item || item.kind !== l.params.hfKind) return true;
      return !TYPED.has(item.kind) && !PICTURE.has(item.kind) && l.params.text !== value(d, index, item);
    });
  });
}
