import { createLayer, type Layer, type Slide } from '../core';
import { CONTENT_FOOT, CONTENT_TOP, after, shape, slide, text, titleBar, titleRow } from './blocks';
import { GRID, type LayoutStyle } from './style';

// ─── SlideForge's last slide types (lab-engine-plan M13) ─────────────────────────────────────────
// The ones a lesson could still hold that the lab had no form for, which kept the lesson on SlideForge's
// show and room (js/lab-engine.js classicOnly): a question's explanation, a results slide, spot the fake
// and a blank slide. Each is built of the lab's own layers, as SlideForge lays it out.

/** The games' green for the right answer (designs/engage/kit.ts RIGHT): layouts do not import the games. */
const RIGHT = '#1f9d5a';
const W = 1920 - GRID.left * 2;

/** One item of a set built a click at a time (as infographics.ts sets them): its layers arrive with the click. */
function byClick(items: Layer[][], set: string, clicks: boolean, delay = 0.25) {
  items.forEach((layers, i) => layers.forEach((l, j) => {
    l.anim = clicks
      ? { ...l.anim, type: 'fade', duration: 0.6, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'on' } }
      : { ...l.anim, type: 'fade', duration: 0.6, delay: delay + i * 0.12 };
  }));
  return items.flat();
}
const uniq = (name: string) => name + '-' + Math.random().toString(36).slice(2, 9);

/** A question's explanation (SlideForge's explain slide, src/render/quiz.js layoutExplain): the question,
 *  the right answer on green with its letter (✎ for a typed one, ↔ for a number), then the reasoning, a
 *  paragraph a click when the lesson builds it, and its source under it. */
export function explainSlide(st: LayoutStyle, o: { number?: number; question: string; answer: string; key: string; body: string; source: string; clicks: boolean }): Slide {
  const layers: Layer[] = [];
  if (o.number) layers.push(text('Number', `Q${o.number}`, { x: GRID.left, y: GRID.top - 64, w: 400, h: 48, rot: 0 }, { font: st.body, weight: '700', size: 34, color: st.accent, tracking: 0.08 }, after(0)));
  layers.push(titleRow(st, o.question), titleBar(st));
  const row = { x: GRID.left, y: CONTENT_TOP, w: W, h: 124, rot: 0 };
  layers.push(
    shape('Answer', row, { shape: 'rect', radius: 18, fill: RIGHT }, after(0.2)),
    text('Answer key', o.key, { x: row.x + 36, y: row.y + 22, w: 80, h: 80, rot: 0 }, { font: st.body, weight: '800', size: 60, color: '#ffffff', align: 'center' }, after(0.25)),
    text('Answer text', o.answer, { x: row.x + 150, y: row.y + 22, w: row.w - 300, h: 80, rot: 0 }, { font: st.body, weight: '700', size: 52, color: '#ffffff' }, after(0.25)),
    text('Tick', '✓', { x: row.x + row.w - 116, y: row.y + 22, w: 80, h: 80, rot: 0 }, { font: st.body, weight: '800', size: 60, color: '#ffffff', align: 'center' }, after(0.3)),
  );
  // Blank lines make paragraphs, as in SlideForge; a single line break stays one.
  const paras = o.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const foot = o.source ? CONTENT_FOOT - 72 : CONTENT_FOOT, top = row.y + row.h + 48;
  const each = (foot - top) / Math.max(1, paras.length);
  layers.push(...byClick(paras.map((p, i) => [
    text('Reason', p, { x: GRID.left, y: top + i * each, w: W, h: each - 16, rot: 0 }, { font: st.body, weight: '400', size: 44, color: st.ink, lineHeight: 1.35, fitGroup: 'explain-reasons' }),
  ]), uniq('explain'), o.clicks, 0.4));
  if (o.source) layers.push(text('Source', o.source, { x: GRID.left, y: CONTENT_FOOT - 48, w: W, h: 48, rot: 0 }, { font: st.body, weight: '400', size: 34, color: st.muted }, after(0.5)));
  return slide(st, 'Explanation', layers);
}

/** A results slide (SlideForge's, src/render/quiz.js layoutResults): its title, and the space the scores
 *  take. In a hosted lesson it is the scores step of the questions before it (decks/fromQuiz.ts), which the
 *  room's wall draws; shown without a room, it says where the scores will be. */
export function resultsSlide(st: LayoutStyle, title: string): Slide {
  return slide(st, 'Results', [
    titleRow(st, title || 'Results'), titleBar(st),
    text('Scores', 'The room’s scores show here when the lesson is hosted.', { x: GRID.left, y: CONTENT_TOP + 120, w: W, h: 160, rot: 0 }, { font: st.body, weight: '400', size: 52, color: st.muted, align: 'center' }, after(0.3)),
  ]);
}

/** Spot the fake (SlideForge's, js/render.js layoutSpotFake): two pictures side by side under their names,
 *  then which one is real (green) and which AI-made (the accent), each on its own picture, then the tells
 *  that give the fake away. A click each when the lesson builds it; the room argues before it is told. */
export function spotfakeSlide(st: LayoutStyle, o: { title: string; names: [string, string]; pictures: [string, string]; real: 0 | 1; tells: string[]; clicks: boolean }): Slide {
  const tells = o.tells.slice(0, 4), gap = 72, colW = (W - gap) / 2;
  const picH = tells.length ? 400 : 540, nameY = CONTENT_TOP + picH + 12;
  const layers: Layer[] = [titleRow(st, o.title), titleBar(st)];
  const verdicts: Layer[][] = [];
  o.pictures.forEach((src, i) => {
    const x = GRID.left + i * (colW + gap), box = { x, y: CONTENT_TOP, w: colW, h: picH, rot: 0 };
    layers.push(
      createLayer('image', { name: `Picture ${o.names[i]}`, box, params: { src, fit: 'cover' }, anim: { type: 'fade', duration: 0.8, delay: 0.15 + i * 0.1 } }),
      text('Name', o.names[i], { x, y: nameY, w: colW, h: 52, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, align: 'center', fitGroup: 'fake-names' }, after(0.3)),
    );
    // The verdict rides on the picture, so at the back of a room the answer is a colour on it.
    const real = i === o.real, band = { x: x + 24, y: CONTENT_TOP + picH - 104, w: colW - 48, h: 80, rot: 0 };
    verdicts.push([
      shape('Verdict', band, { shape: 'rect', radius: 14, fill: real ? RIGHT : st.accent }),
      text('Verdict text', real ? 'Real' : 'AI-generated', { ...band, y: band.y + 12, h: 56 }, { font: st.body, weight: '800', size: 44, color: '#ffffff', align: 'center', uppercase: true, tracking: 0.06 }),
    ]);
  });
  const top = nameY + 80, each = tells.length ? (CONTENT_FOOT - top) / tells.length : 0;
  const rows = tells.map((t, i) => [text('Tell', t, { x: GRID.left, y: top + i * each, w: W, h: each - 8, rot: 0 }, { font: st.body, weight: '400', size: 40, color: st.ink, list: 'bullets', fitGroup: 'fake-tells' })]);
  layers.push(...byClick([...verdicts, ...rows], uniq('fake'), o.clicks, 0.5));
  return slide(st, 'Spot the fake', layers);
}
