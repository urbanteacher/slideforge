import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { FOOT, H, LEFT, W, box, eyebrow, ground, hero, rect, rgba, slideOf, tint, txt } from './kit';

// The games, designed in the lab: a cover, then each question as the room sees it. The room answers
// in SlideForge's live session; the wall is drawn here, and the reveal is a click — the right answer
// lit, its reason shown. Every part a layer.

export interface Question { question: string; options: string[]; correct: number; explanation: string }
export interface GameDef { title: string; style: string; styleLabel: string; steps: string[]; questions: Question[] }

const LETTERS = 'ABCDEF';
const reveal = (delay = 0): { type: 'fade'; duration: number; delay: number; trigger: 'onClick' | 'withSlide' } => ({ type: 'fade', duration: 0.5, delay, trigger: delay ? 'withSlide' : 'onClick' });

/** The cover: the accent full-bleed, the game's name reversed out of it, how many questions, how to play. */
export function gameCover(st: LayoutStyle, g: GameDef): Slide {
  const n = g.questions.length;
  const layers: Layer[] = [
    ground(st),
    rect('Accent ground', box(0, 0, W, H), st.accent, { type: 'fade', duration: 0.6 }),
    txt('Eyebrow', `GAME · ${g.styleLabel.toUpperCase()}`, box(LEFT, 170, 1400, 50), { font: st.body, weight: '600', size: 40, color: st.ground, tracking: 0.14 }),
    txt('Title', g.title, box(LEFT, 250, W - LEFT * 2, 360), { font: st.display, weight: st.displayWeight, size: 170, color: st.ground, lineHeight: 0.98, tracking: -0.02, fit: 'fill', balance: true },
      { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.8, stagger: 0.12 }),
    txt('Count', `${n} ${n === 1 ? 'question' : 'questions'}`, box(LEFT, 640, 1200, 70), { font: st.body, weight: '600', size: 60, color: st.ground }, { type: 'fade', duration: 0.6, delay: 0.4 }),
  ];
  const rules = g.steps.slice(0, 3);
  const colW = (W - LEFT * 2) / Math.max(1, rules.length);
  rules.forEach((r, i) => layers.push(
    rect(`Rule ${i + 1} — mark`, box(LEFT + i * colW, 780, 60, 6), st.ground, { type: 'wipeRight', duration: 0.5, delay: 0.5 + i * 0.1 }),
    txt(`Rule ${i + 1}`, r, box(LEFT + i * colW, 806, colW - 60, FOOT - 816), { font: st.body, size: 42, color: st.ground, lineHeight: 1.25 }, { type: 'fade', duration: 0.6, delay: 0.55 + i * 0.1 }),
  ));
  return slideOf(g.title, layers, st, `${g.title} — ${g.styleLabel}. SlideForge's live session runs the game; the lab draws it.\n\nHow to play:\n${g.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
}

const head = (st: LayoutStyle, g: GameDef, i: number, top: number, q: Question): Layer[] => [
  ground(st),
  eyebrow(st, `${g.styleLabel} · ${i + 1} of ${g.questions.length}`),
  hero(st, 'Question', q.question, box(LEFT, 206, W - LEFT * 2, top - 206 - (q.explanation ? 116 : 40)), 104),
];
/** Why, under the question: last in the list, so it arrives with the reveal's click, or is that click
 *  itself when there is no answer to light. */
const why = (st: LayoutStyle, q: Question, top: number): Layer[] =>
  q.explanation ? [txt('Why', q.explanation, box(LEFT, top - 104, W - LEFT * 2, 72), { font: st.body, size: 44, color: st.muted }, reveal(q.correct >= 0 && q.correct < q.options.length ? 0.2 : 0))] : [];
const answerNote = (q: Question) => [q.correct >= 0 && q.options[q.correct] ? `Answer: ${q.options[q.correct]}` : '', q.explanation].filter(Boolean).join('\n');

/** A choice question: the options as tiles flush edge to edge under the question; a click lights the answer. */
export function choiceTiles(st: LayoutStyle, g: GameDef, i: number): Slide {
  const q = g.questions[i];
  const opts = q.options.slice(0, 6);
  const two = opts.length <= 2;
  const TOP = two ? 560 : 520;
  const layers = head(st, g, i, TOP, q);
  const cols = opts.length <= 2 ? Math.max(1, opts.length) : opts.length <= 4 ? 2 : 3;
  const lines = Math.ceil(opts.length / cols);
  const cw = W / cols, ch = (H - TOP) / lines;
  opts.forEach((o, k) => {
    const c = k % cols, l = Math.floor(k / cols);
    const cell = box(c * cw, TOP + l * ch, cw, ch);
    const pad = c === 0 ? LEFT : 56;
    const textBox = box(cell.x + pad + (two ? 0 : 130), cell.y + 30, cell.w - pad - 56 - (two ? 0 : 130), Math.min(cell.y + cell.h, FOOT) - cell.y - 50);
    const size = two ? 120 : opts.length > 4 ? 52 : 60;
    const a = { type: 'wipeUp' as const, duration: 0.5, delay: 0.3 + 0.08 * k };
    layers.push(
      rect(`Option ${LETTERS[k]}`, cell, (c + l) % 2 ? rgba(st.ink, 0.07) : st.panel, a),
      ...(two ? [] : [txt(`Option ${LETTERS[k]} — letter`, LETTERS[k], box(cell.x + pad, cell.y + 26, 110, 110), { font: st.display, weight: st.displayWeight, size: 96, color: st.accent, lineHeight: 1 }, a)]),
      txt(`Option ${LETTERS[k]} — text`, o, textBox, { font: two ? st.display : st.body, weight: two ? st.displayWeight : '600', size, color: st.ink, lineHeight: 1.15 }, a),
    );
    // The reveal: the answer's tile turns to the accent, its words reversed out of it.
    if (k === q.correct) layers.push(
      rect(`Answer — ${LETTERS[k]}`, cell, st.accent, reveal()),
      ...(two ? [] : [txt('Answer — letter', LETTERS[k], box(cell.x + pad, cell.y + 26, 110, 110), { font: st.display, weight: st.displayWeight, size: 96, color: st.ground, lineHeight: 1 }, reveal(0.05))]),
      txt('Answer — text', `${o}  ✓`, textBox, { font: two ? st.display : st.body, weight: two ? st.displayWeight : '700', size, color: st.ground, lineHeight: 1.15 }, reveal(0.05)),
    );
  });
  layers.push(...why(st, q, TOP));
  return slideOf(`${g.title} · ${i + 1}`, layers, st, answerNote(q));
}

/** SlideForge's own quiz wall: the question, then the options as cards with lettered badges, spaced
 *  in a grid, and the answer marked on a click. */
export function choiceCards(st: LayoutStyle, g: GameDef, i: number): Slide {
  const q = g.questions[i];
  const opts = q.options.slice(0, 6);
  const TOP = 540, gap = 28;
  const layers = head(st, g, i, TOP, q);
  const cols = opts.length <= 2 ? Math.max(1, opts.length) : opts.length <= 4 ? 2 : 3;
  const lines = Math.ceil(opts.length / cols);
  const cw = (W - LEFT * 2 - gap * (cols - 1)) / cols, ch = (FOOT - 20 - TOP - gap * (lines - 1)) / lines;
  opts.forEach((o, k) => {
    const c = k % cols, l = Math.floor(k / cols);
    const card = box(LEFT + c * (cw + gap), TOP + l * (ch + gap), cw, ch);
    const a = { type: 'rise' as const, duration: 0.5, delay: 0.3 + 0.08 * k };
    layers.push(
      rect(`Option ${LETTERS[k]} — card`, card, st.panel, a, 22),
      rect(`Option ${LETTERS[k]} — badge`, box(card.x + 28, card.y + (card.h - 84) / 2, 84, 84), st.accent, a, 16),
      txt(`Option ${LETTERS[k]} — letter`, LETTERS[k], box(card.x + 28, card.y + (card.h - 84) / 2 + 12, 84, 60), { font: st.body, weight: '800', size: 48, color: st.ground, align: 'center' }, a),
      txt(`Option ${LETTERS[k]} — text`, o, box(card.x + 140, card.y + 20, card.w - 170, card.h - 40), { font: st.body, weight: '600', size: 54, color: st.ink, lineHeight: 1.15 }, a),
    );
    if (k === q.correct) layers.push(rect(`Answer — ${LETTERS[k]}`, box(card.x - 6, card.y - 6, card.w + 12, card.h + 12), rgba(st.accent, 0.22), reveal(), 26));
  });
  layers.push(...why(st, q, TOP));
  return slideOf(`${g.title} · ${i + 1}`, layers, st, answerNote(q));
}

/** A typed answer: the question as the hero, and a band across the foot where the answer arrives on a click. */
export function typedAnswer(st: LayoutStyle, g: GameDef, i: number, cards = false): Slide {
  const q = g.questions[i];
  const TOP = 700;
  const layers: Layer[] = [ground(st), eyebrow(st, `${g.styleLabel} · ${i + 1} of ${g.questions.length}`), hero(st, 'Question', q.question, box(LEFT, 206, W - LEFT * 2, TOP - 246), 120)];
  const band = cards ? box(LEFT, TOP, W - LEFT * 2, FOOT - TOP - 20) : box(0, TOP, W, H - TOP);
  layers.push(
    rect('Answer band', band, st.panel, { type: 'wipeUp', duration: 0.6, delay: 0.3 }, cards ? 22 : 0),
    txt('Prompt', 'TYPE YOUR ANSWER ON YOUR PHONE', box(LEFT + (cards ? 40 : 0), TOP + 40, 1200, 50), { font: st.body, weight: '600', size: 38, color: st.muted, tracking: 0.12 }, { type: 'fade', duration: 0.5, delay: 0.4 }),
  );
  if (q.explanation) layers.push(txt('Answer', q.explanation, box(LEFT + (cards ? 40 : 0), TOP + 104, W - LEFT * 2 - (cards ? 80 : 0), FOOT - TOP - 130), { font: st.display, weight: st.displayWeight, size: 96, color: st.accent, lineHeight: 1 }, reveal()));
  return slideOf(`${g.title} · ${i + 1}`, layers, st, q.explanation ? `Answer: ${q.explanation}` : '');
}

/** Heads up: the term set huge on the accent, full-bleed; its meaning arrives on a click. */
export function termCard(st: LayoutStyle, g: GameDef, i: number): Slide {
  const q = g.questions[i];
  const layers: Layer[] = [
    ground(st),
    rect('Accent ground', box(0, 0, W, H), st.accent),
    txt('Eyebrow', `EXPLAIN IT — DON’T SAY IT · ${i + 1} OF ${g.questions.length}`, box(LEFT, 170, 1500, 50), { font: st.body, weight: '600', size: 40, color: st.ground, tracking: 0.14 }),
    txt('Term', q.question, box(LEFT, 300, W - LEFT * 2, 420), { font: st.display, weight: st.displayWeight, size: 240, color: st.ground, lineHeight: 0.95, fit: 'fill', balance: true }, { type: 'zoomIn', duration: 0.6 }),
  ];
  if (q.explanation) layers.push(txt('Meaning', q.explanation, box(LEFT, 780, W - LEFT * 2, FOOT - 800), { font: st.body, size: 56, color: st.ground, lineHeight: 1.25 }, reveal()));
  return slideOf(`${g.title} · ${i + 1}`, layers, st, q.explanation ? `Meaning: ${q.explanation}` : '');
}

/** A board of questions at once (a low-stakes quiz): numbered bands edge to edge under the heading. */
export function questionBoard(st: LayoutStyle, g: GameDef): Slide {
  const qs = g.questions.slice(0, 6);
  const TOP = 360, n = Math.max(1, qs.length);
  const layers: Layer[] = [ground(st), eyebrow(st, `${g.styleLabel} · ${n} questions`), hero(st, 'Heading', g.title, box(LEFT, 206, W - LEFT * 2, TOP - 236), 100)];
  const rowH = (H - TOP) / n;
  qs.forEach((q, i) => {
    const y = TOP + i * rowH, h = Math.min(rowH, FOOT - y) - 16;
    const a = { type: 'wipeRight' as const, duration: 0.5, delay: 0.2 + 0.08 * i };
    layers.push(
      rect(`Q${i + 1} — band`, box(0, y, W, rowH), tint(st, i), a),
      txt(`Q${i + 1} — number`, String(i + 1), box(LEFT, y + 10, 100, h), { font: st.display, weight: st.displayWeight, size: Math.min(88, rowH * 0.7), color: st.accent, lineHeight: 1 }, a),
      txt(`Q${i + 1} — question`, q.question, box(LEFT + 130, y + 14, W - LEFT * 2 - 130, h), { font: st.body, weight: '600', size: n > 5 ? 46 : 52, color: st.ink, lineHeight: 1.2 }, a),
    );
  });
  return slideOf(g.title, layers, st, g.questions.map((q, i) => `${i + 1}. ${q.question}${q.explanation ? ` — ${q.explanation}` : ''}`).join('\n'));
}

/** A question cube: its six faces as tiles edge to edge, a roll per click lighting one. */
export function cubeFaces(st: LayoutStyle, g: GameDef): Slide {
  const qs = g.questions.slice(0, 6);
  const TOP = 340;
  const layers: Layer[] = [ground(st), eyebrow(st, 'Question cube · roll to choose'), hero(st, 'Heading', g.title, box(LEFT, 206, W - LEFT * 2, TOP - 230), 96)];
  const cols = 3, cw = W / cols, ch = (H - TOP) / 2;
  qs.forEach((q, k) => {
    const c = k % cols, l = Math.floor(k / cols);
    const cell = box(c * cw, TOP + l * ch, cw, ch);
    const pad = c === 0 ? LEFT : 52;
    const step = { set: 'faces', i: k, mode: 'spot' as const };
    const a = { type: 'pop' as const, duration: 0.5, delay: 0, trigger: 'onClick' as const, step };
    const w = { type: 'fade' as const, duration: 0.5, delay: 0.05, trigger: 'withSlide' as const, step };
    layers.push(
      rect(`Face ${k + 1}`, cell, (c + l) % 2 ? rgba(st.ink, 0.07) : st.panel, a),
      txt(`Face ${k + 1} — pips`, String(k + 1), box(cell.x + pad, cell.y + 28, 120, 110), { font: st.display, weight: st.displayWeight, size: 100, color: st.accent, lineHeight: 1 }, w),
      txt(`Face ${k + 1} — question`, q.question, box(cell.x + pad, cell.y + 150, cell.w - pad - 52, Math.min(cell.y + cell.h, FOOT) - cell.y - 170), { font: st.body, weight: '600', size: 50, color: st.ink, lineHeight: 1.2 }, w),
    );
  });
  return slideOf(g.title, layers, st, g.questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n'));
}

/** Compare and sort: the prompt, and three columns edge to edge to sort into — one, both, the other. */
export function sortBoard(st: LayoutStyle, g: GameDef, i: number): Slide {
  const q = g.questions[i];
  const TOP = 500;
  const layers: Layer[] = [ground(st), eyebrow(st, `${g.styleLabel} · ${i + 1} of ${g.questions.length}`), hero(st, 'Prompt', q.question, box(LEFT, 206, W - LEFT * 2, TOP - 246), 104)];
  ['Only the first', 'Both', 'Only the second'].forEach((name, k) => {
    const col = box(Math.round((k * W) / 3), TOP, Math.round(((k + 1) * W) / 3) - Math.round((k * W) / 3), H - TOP);
    const pad = k === 0 ? LEFT : 56;
    const a = { type: 'wipeUp' as const, duration: 0.6, delay: 0.3 + 0.1 * k };
    layers.push(
      rect(`${name} — column`, col, k === 1 ? rgba(st.accent, 0.14) : tint(st, k), a),
      txt(`${name} — label`, name, box(col.x + pad, col.y + 44, col.w - pad - 52, 90), { font: st.display, weight: st.displayWeight, size: 80, color: k === 1 ? st.accent : st.ink }, a),
    );
  });
  return slideOf(`${g.title} · ${i + 1}`, layers, st, q.explanation);
}
