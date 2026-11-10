// Design rules the editor checks (BACKLOG CS-02, from Claude Slides' written rules): what makes a slide hard to read
// from the back of the room, said in the Slide panel with what to do. Nothing is refused or changed. The rules:
//   - no text under 24px on a 1080-high slide (the footer band, the header and footer, is left out);
//   - text holds 4.5:1 contrast on what is behind it, 3:1 at 44px and up (WCAG's large text);
//   - text that has had to shrink to fit is a slide with too much on it: split it, rather than shrinking the words;
//   - a lesson with more than six text sizes no longer reads as one design (four or five is the aim).
import type { Deck, Layer, Slide } from '../core';
import { groupSizes, textSize } from '../engine';
import { contrast } from '../theme';

export const DESIGN_RULES = { minPx: 24, contrast: 4.5, largeContrast: 3, largePx: 44, shrunk: 0.8, sizes: 6 };

const HEX = /^#[0-9a-f]{6}$/i;
const TEXT_KINDS = new Set(['text', 'note', 'quote', 'table']);
const inside = (b: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** The words a layer shows, and the colour they are in, when it is a text layer that has some. */
function textOf(l: Layer): { words: string; colour: string } | null {
  if (!TEXT_KINDS.has(l.kind) || !l.visible || !l.box || l.face === 'back') return null;
  const p = l.params as Record<string, unknown>;
  if (typeof p.hfSlot === 'string') return null;
  const words = String(p.text ?? p.quote ?? p.data ?? '').trim();
  if (!words) return null;
  return { words, colour: String(p.color ?? p.textColor ?? '') };
}

/** What is behind a layer's middle: the topmost flat colour under it, or null when it is a picture, a video, an
 *  effect or a gradient, which the check cannot read (so it says nothing). */
function behind(slide: Slide, l: Layer): string | null {
  const b = l.box!, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const below = slide.layers.slice(0, slide.layers.indexOf(l)).reverse();
  for (const u of below) {
    if (!u.visible || u.opacity < 0.9) continue;
    const p = u.params as Record<string, unknown>;
    if (u.kind === 'solid') return HEX.test(String(p.color)) ? String(p.color) : null;
    if (!u.box || !inside(u.box, cx, cy)) continue;
    if (u.kind === 'shape') {
      if (Number(p.fillOpacity ?? 1) < 0.9) continue;
      if (p.gradient || !HEX.test(String(p.fill))) return null;
      if (p.shape === 'line' || p.shape === 'curve' || p.shape === 'ring' || p.shape === 'arrow') continue;
      return String(p.fill);
    }
    if (TEXT_KINDS.has(u.kind) || u.kind === 'icon' || u.kind === 'connector' || u.kind === 'timer') continue;
    // A picture, a video, a chart, an effect: not a colour the check can read.
    return null;
  }
  return HEX.test(slide.background) ? slide.background : null;
}

/** The size a text layer is drawn at, on a 1080-high slide, after its fit and its fit group. */
function drawnPx(l: Layer, groups: Map<string, number>, deckH: number): number {
  const own = textSize(l);
  const g = l.params.fitGroup ? groups.get(String(l.params.fitGroup)) : undefined;
  return (Math.min(own, g ?? Infinity) * 1080) / deckH;
}

/** What on this slide breaks a design rule, as sentences that say what to do; empty when nothing does. */
export function designCheck(slide: Slide, deck: Pick<Deck, 'height'>): string[] {
  const out: string[] = [];
  const groups = groupSizes(slide.layers);
  const r = DESIGN_RULES;
  for (const l of slide.layers) {
    const t = textOf(l);
    if (!t) continue;
    const name = l.name || 'Text';
    const px = drawnPx(l, groups, deck.height);
    const set = Number(l.params.size ?? 0);
    if (px < r.minPx) out.push(`“${name}” is drawn at ${Math.round(px)}px, under the ${r.minPx}px the back of the room can read. Make it larger, or move it to the notes.`);
    if (l.params.fit === 'shrink' && set > 0 && px < set * r.shrunk * (1080 / deck.height)) {
      out.push(`“${name}” has shrunk to ${Math.round((px / ((set * 1080) / deck.height)) * 100)}% of its size to fit. There is too much on the slide: split it rather than shrinking the words.`);
    }
    const ground = behind(slide, l);
    if (ground && HEX.test(t.colour)) {
      const need = px >= r.largePx ? r.largeContrast : r.contrast;
      const ratio = contrast(t.colour, ground);
      if (ratio < need) out.push(`“${name}” has a contrast of ${ratio.toFixed(1)}:1 on what is behind it; it needs ${need}:1${px >= r.largePx ? ' at this size' : ` (${r.largeContrast}:1 at ${r.largePx}px and up)`}. Darken or lighten the text, or the ground.`);
    }
  }
  return out;
}

/** The steps of a lesson's type scale, largest first: its shown text sizes, with sizes within 15% of the step above
 *  them counted as that step (120 and 124 are one size to the eye; a statement sized to fill its box is one size
 *  however its words fall). */
export function deckTextSizes(deck: Deck): number[] {
  const sizes: number[] = [];
  for (const s of deck.slides) {
    if (s.hidden) continue;
    const groups = groupSizes(s.layers);
    for (const l of s.layers) if (textOf(l)) sizes.push(drawnPx(l, groups, deck.height));
  }
  const steps: number[] = [];
  for (const px of sizes.sort((a, b) => b - a)) if (!steps.length || px < steps[steps.length - 1] / 1.15) steps.push(Math.round(px));
  return steps;
}

/** Said once for the lesson when it uses more text sizes than read as one design; '' otherwise. */
export function typeScaleNote(deck: Deck): string {
  const n = deckTextSizes(deck).length;
  return n > DESIGN_RULES.sizes ? `This lesson sets its words in ${n} sizes. Four or five read as one design: use the layouts' heading, body and label sizes, and fewer of your own.` : '';
}
