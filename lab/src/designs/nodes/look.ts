import type { LayoutStyle } from '../../layouts';
import { createLayer, type Anim, type Layer } from '../../core';
import { LEFT, W, box, rgba, textWidth, txt } from '../engage/kit';

// The Nodes look, in the lesson's own style: the illustrated parts the Nodes decks are drawn from
// (tools/nodes-lab/kit.js) — rounded cards, pills, chains of boxes joined by arrows, numbered badges,
// element dots, answer tabs, cards with an accent bar — set in the theme's faces and colours, so the
// ground and the theme stay the lesson's. The links keep Nodes' own colours (Okabe-Ito, colour-blind
// safe): blue for a point, green for a link, amber for a judgement, vermilion for what breaks.

export const LINK = { U: '#0072b2', A: '#009e73', C: '#e69f00', X: '#d55e00', J: '#cc79a7' };
export const LINKS = [LINK.U, LINK.A, LINK.A, LINK.C, LINK.J];

const FADE: Partial<Anim> = { type: 'fade', duration: 0.45 };
export const still: Partial<Anim> = { type: 'none', duration: 0 };
export const enter = (): Partial<Anim> => ({ ...FADE, trigger: 'withSlide' });
export const onClick = (): Partial<Anim> => ({ ...FADE, trigger: 'onClick' });
export const after = enter;

/** A rounded card: the theme's panel, a hairline in its ink. */
export function card(st: LayoutStyle, name: string, x: number, y: number, w: number, h: number, o: { fill?: string; stroke?: string; sw?: number; radius?: number } = {}, anim: Partial<Anim> = enter()): Layer {
  return createLayer('shape', { name, box: box(x, y, w, h), anim,
    params: { shape: 'rect', radius: o.radius ?? 22, fill: o.fill ?? st.panel, fillOpacity: 1, stroke: o.stroke ?? rgba(st.ink, 0.16), strokeWidth: o.sw ?? 2, strokeOpacity: 1 } });
}

/** A round badge with a number or a letter in it. */
export function badge(st: LayoutStyle, x: number, y: number, d: number, fill: string, label: string, anim: Partial<Anim> = enter(), ring?: string): Layer {
  return createLayer('shape', { name: label ? `Badge ${label}` : 'Dot', box: box(x, y, d, d), anim,
    params: { shape: 'ellipse', fill, fillOpacity: 1, stroke: ring ?? fill, strokeWidth: ring ? 3 : 0, strokeOpacity: 1, label, labelColor: '#ffffff', labelFont: st.body, labelWeight: '800', labelSize: Math.round(d * 0.5) } });
}

/** Text in the theme's body face. */
export const T = (st: LayoutStyle, name: string, value: string, x: number, y: number, w: number, h: number, p: Record<string, unknown> = {}, anim: Partial<Anim> = enter()): Layer =>
  txt(name, value, box(x, y, w, h), { font: st.body, weight: '400', size: 40, color: st.ink, lineHeight: 1.25, ...p }, anim);

/** Small capitals: what a slide or a card is. */
export const label = (st: LayoutStyle, value: string, x: number, y: number, w: number, color = st.accent, size = 28, anim: Partial<Anim> = still): Layer =>
  T(st, 'Eyebrow', value.toUpperCase(), x, y, w, size * 1.5, { weight: '800', size, color, tracking: 0.12 }, anim);

/** The slide's heading, in the display face. */
export const heading = (st: LayoutStyle, value: string, y: number, size = 64, w = W - LEFT * 2, h = size * 2.4): Layer =>
  txt('Heading', value, box(LEFT, y, w, h), { font: st.display, weight: st.displayWeight, size, color: st.ink, lineHeight: 1.08, tracking: -0.01, fit: 'shrink', balance: true }, still);

/** A rounded pill of words, tinted. */
export function pill(st: LayoutStyle, name: string, value: string, x: number, y: number, o: { fill?: string; color?: string; size?: number; w?: number; h?: number; weight?: string } = {}, anim: Partial<Anim> = enter()): Layer[] {
  const size = o.size ?? 28, h = o.h ?? Math.round(size * 2.1);
  const w = o.w ?? textWidth(value, { font: st.body, size, weight: o.weight ?? '800' }) + 48;
  return [
    card(st, `${name} — pill`, x, y, w, h, { fill: o.fill ?? rgba(LINK.A, 0.16), sw: 0, radius: Math.round(h / 2) }, anim),
    T(st, name, value, x, y + (h - size * 1.3) / 2, w, size * 1.4, { weight: o.weight ?? '800', size, align: 'center', color: o.color ?? st.ink, fit: 'shrink' }, after()),
  ];
}

/**
 * Boxes joined by arrows, a link at a time, as the Nodes decks draw a chain. Widths follow the words
 * (or are given); the whole chain is scaled to fit the slide's width. `build`: the first box with the
 * slide and each later link on a click, or every link on a click.
 */
export function chain(st: LayoutStyle, links: string[], x: number, y: number, o: { h?: number; size?: number; gap?: number; fill?: string; strokes?: string[]; widths?: number[]; build?: 'click' | 'still'; weight?: string; firstOnClick?: boolean; name?: string } = {}): Layer[] {
  const size0 = o.size ?? 38, gap = o.gap ?? 76, h = o.h ?? 100, weight = o.weight ?? '700';
  const room = W - LEFT - x;
  let widths = o.widths ?? links.map((t) => textWidth(t, { font: st.body, size: size0, weight }) + 72);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (links.length - 1);
  const k = total > room ? (room - gap * (links.length - 1)) / (total - gap * (links.length - 1)) : 1;
  widths = widths.map((w) => Math.floor(w * k));
  const out: Layer[] = [];
  let cx = x;
  links.forEach((t, i) => {
    const w = widths[i], stroke = o.strokes?.[i] ?? LINK.A;
    const first = o.build === 'still' ? enter() : i === 0 && !o.firstOnClick ? enter() : onClick();
    if (i) out.push(T(st, 'Arrow', '→', cx - gap + 8, y + h / 2 - size0 * 0.8, gap - 16, size0 * 1.6, { weight: '700', size: size0 * 1.15, align: 'center', color: st.muted }, first));
    out.push(card(st, `${o.name ?? 'Link'} ${i + 1}`, cx, y, w, h, { fill: o.fill, stroke, sw: 3, radius: 18 }, i ? after() : first));
    out.push(T(st, `${o.name ?? 'Link'} ${i + 1} — words`, t, cx + 20, y + 12, w - 40, h - 24, { weight, size: size0, align: 'center', valign: 'middle', lineHeight: 1.15, fit: 'shrink' }, after()));
    cx += w + gap;
  });
  return out;
}

/** The element dots over an answer: filled for each useful element, with the count beside them. */
export function elementDots(st: LayoutStyle, n: number, of: number, x: number, y: number, color: string = LINK.U): Layer[] {
  const out: Layer[] = [];
  for (let i = 0; i < of; i++) out.push(badge(st, x + i * 42, y, 30, i < n ? color : st.panel, '', enter(), color));
  out.push(T(st, 'Element count', `${n} of ${of} elements`, x + of * 42 + 16, y - 6, 420, 44, { weight: '800', size: 30 }));
  return out;
}

/** The three answers' tabs, with one on: weak, stable, excellent. */
export function answerTabs(st: LayoutStyle, on: number, y: number, names = ['Weak answer', 'Stable answer', 'Excellent answer']): Layer[] {
  let x = LEFT; const out: Layer[] = [];
  names.forEach((n, i) => {
    const w = textWidth(n, { font: st.body, size: 26, weight: '700' }) + 60, lit = i === on;
    out.push(card(st, `Answer tab ${n}`, x, y, w, 60, { fill: lit ? st.ink : st.panel, radius: 14 }, still));
    out.push(T(st, `Answer tab label ${n}`, n, x, y + 12, w, 36, { weight: '700', size: 26, align: 'center', color: lit ? st.ground : st.ink }, still));
    x += w + 12;
  });
  return out;
}

/** A card with an accent bar down its left: a quote, a model, the feedback for an answer. */
export function barCard(st: LayoutStyle, name: string, x: number, y: number, w: number, h: number, bar: string, fill = st.panel, anim: Partial<Anim> = onClick()): Layer[] {
  return [
    card(st, name, x, y, w, h, { fill, sw: fill === st.panel ? 2 : 0, radius: 18 }, anim),
    card(st, `${name} — bar`, x, y, 10, h, { fill: bar, sw: 0, radius: 0 }, after()),
  ];
}
