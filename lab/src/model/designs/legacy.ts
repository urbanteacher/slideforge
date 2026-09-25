import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { FOOT, LEFT, W, box, ground, labelled, rect, rgba, slideOf, tiers, txt, type Row } from './kit';

// SlideForge's own looks for an activity's keywords slide, rebuilt from the lab's layers so a lesson
// can keep them: the steps as a timeline of numbered circles down a rule (css/app.css
// .activity-steps), four panels as tinted cards in a two-by-two grid (.activity-panels), and the
// opening brief as a card with a heavy left edge across the top, the rest in two columns (.activity-brief).

const heading = (st: LayoutStyle, title: string): Layer[] => [
  ground(st),
  // Short of the top right, where SlideForge's clock sits when the slide is timed.
  txt('Heading', title, box(LEFT, 150, W - LEFT * 2 - 240, 110), { font: st.display, weight: st.displayWeight, size: 88, color: st.ink, lineHeight: 1.05, fit: 'fill' }, { type: 'rise', duration: 0.8 }),
  rect('Accent bar', box(LEFT, 276, 132, 8), st.accent, { type: 'wipeRight', duration: 0.7 }),
];

/** The steps: a rule down the left, each step's number in a circle on it, its label and words beside. */
export function timelineSteps(st: LayoutStyle, title: string, rows: Row[]): Slide {
  const steps = rows.slice(0, 6);
  const top = 330, rowH = (FOOT - 20 - top) / Math.max(1, steps.length);
  const x = LEFT + 40;
  const layers = heading(st, title);
  layers.push(rect('Timeline rule', box(x, top, 4, rowH * steps.length - 24), rgba(st.ink, 0.18)));
  steps.forEach((s, i) => {
    const y = top + i * rowH;
    const a = { type: 'fade' as const, duration: 0.6, delay: 0.2 + 0.1 * i };
    layers.push(
      createCircle(st, `Step ${i + 1} — marker`, box(x - 34, y, 72, 72), a),
      txt(`Step ${i + 1} — number`, String(i + 1).padStart(2, '0'), box(x - 34, y + 16, 72, 40), { font: st.body, weight: '800', size: 36, color: st.ground, align: 'center' }, a),
      txt(`Step ${i + 1} — label`, labelled(s), box(x + 80, y + 4, W - x - 80 - LEFT, 56), { font: st.body, weight: '700', size: 48, color: st.ink, fitGroup: 'step-label' }, a),
      txt(`Step ${i + 1} — text`, s.text, box(x + 80, y + 66, W - x - 80 - LEFT, rowH - 84), { font: st.body, size: 42, color: st.muted, lineHeight: 1.25, fitGroup: 'step-text' }, a),
    );
  });
  return slideOf(title, layers, st);
}

const createCircle = (st: LayoutStyle, name: string, b: ReturnType<typeof box>, anim: Parameters<typeof rect>[3]) => rect(name, b, st.accent, anim, b.w / 2);

/** Four panels: tinted cards two by two, each its label over its words. */
export function panelCards(st: LayoutStyle, title: string, rows: Row[]): Slide {
  const shown = rows.slice(0, 4);
  const top = 330, gap = 36;
  const cw = (W - LEFT * 2 - gap) / 2, ch = (FOOT - 20 - top - gap) / 2;
  // A colour of its own for each panel, as SlideForge gives them.
  const tints = tiers(st);
  const layers = heading(st, title);
  shown.forEach((r, i) => {
    const c = i % 2, l = Math.floor(i / 2);
    const card = box(LEFT + c * (cw + gap), top + l * (ch + gap), cw, ch);
    const a = { type: 'rise' as const, duration: 0.6, delay: 0.2 + 0.1 * i };
    layers.push(
      rect(`${r.label} — card`, card, tints[i], a, 24),
      txt(`${r.label} — label`, labelled(r), box(card.x + 40, card.y + 32, card.w - 80, 60), { font: st.body, weight: '700', size: 48, color: st.ink, fitGroup: 'panel-label' }, a),
      txt(`${r.label} — text`, r.text, box(card.x + 40, card.y + 106, card.w - 80, card.h - 136), { font: st.body, size: 42, color: st.muted, lineHeight: 1.25, fitGroup: 'panel-text' }, a),
    );
  });
  return slideOf(title, layers, st);
}

/** The opening brief: a card across the top with a heavy left edge, and the other rows in two columns. */
export function briefCard(st: LayoutStyle, title: string, rows: Row[]): Slide {
  const [brief, ...rest] = rows;
  const layers = heading(st, title);
  const top = 330;
  const cardH = rest.length ? 230 : FOOT - 20 - top;
  if (brief) layers.push(
    rect('Brief — card', box(LEFT, top, W - LEFT * 2, cardH), st.panel, { type: 'fade', duration: 0.6, delay: 0.2 }, 16),
    rect('Brief — edge', box(LEFT, top, 12, cardH), st.ink, { type: 'wipeUp', duration: 0.6, delay: 0.2 }),
    txt('Brief — label', labelled(brief), box(LEFT + 48, top + 28, W - LEFT * 2 - 96, 50), { font: st.body, weight: '700', size: 40, color: st.accent }, { type: 'fade', duration: 0.6, delay: 0.25 }),
    txt('Brief — text', brief.text, box(LEFT + 48, top + 86, W - LEFT * 2 - 96, cardH - 110), { font: st.body, weight: '600', size: 54, color: st.ink, lineHeight: 1.2 }, { type: 'fade', duration: 0.6, delay: 0.3 }),
  );
  const shown = rest.slice(0, 6), gapX = 56, gapY = 28;
  const y0 = top + cardH + 44;
  const lines = Math.ceil(shown.length / 2);
  const cw = (W - LEFT * 2 - gapX) / 2, rh = (FOOT - 20 - y0 - gapY * (lines - 1)) / Math.max(1, lines);
  shown.forEach((r, i) => {
    // A last row on its own spans both columns, as SlideForge sets it.
    const alone = i === shown.length - 1 && shown.length % 2 === 1;
    const c = i % 2, l = Math.floor(i / 2);
    const b = box(LEFT + (alone ? 0 : c * (cw + gapX)), y0 + l * (rh + gapY), alone ? W - LEFT * 2 : cw, rh);
    const a = { type: 'fade' as const, duration: 0.6, delay: 0.35 + 0.08 * i };
    layers.push(
      txt(`${r.label} — label`, labelled(r), box(b.x, b.y, b.w, 52), { font: st.body, weight: '700', size: 44, color: st.ink, fitGroup: 'brief-label' }, a),
      txt(`${r.label} — text`, r.text, box(b.x, b.y + 60, b.w, b.h - 60), { font: st.body, size: 42, color: st.muted, lineHeight: 1.25, fitGroup: 'brief-text' }, a),
    );
  });
  return slideOf(title, layers, st);
}
