import { createLayer } from '../defaults';
import type { LayoutStyle } from '../layouts';
import type { Anim, GameSettings, Layer, Params, Slide, SlideGame } from '../types';
import { BASE, EY, FOOT, HY, LEFT, LIFT, ON_RIGHT, PAD, RIGHT, TOPBAND, W, box, centred, clock, display, eyebrow, fitSize, ground, headingClock, hero, rect, rgba, sizedHero, slideOf, textHeight, textWidth, txt, wordBoxes } from './kit';

// The games, designed in the lab. Two sources, one look: SlideForge's showcase games — Spot the Error,
// Ranking, True/False Showdown, Predict the Outcome, Fill the Blanks, Odd One Out, Compare & Contrast,
// Beat the Clock (assets/games.json, tools/lab-games.mjs) — and the quiz games inside the activity
// catalogue (assets/activities.json). Each opens on its cover, then runs two slides a question: the
// asking, then the answer in the same layout. The phones and the scoring are SlideForge's live
// session; the lab draws the wall.
//
// The rules every wall keeps:
// 1. The small heading says the game, what to do and how far in; the clock sits at its right (question
//    slides only). The question follows, full width, sized to its length and never more than two
//    lines: a long one comes down in size rather than taking a third.
// 2. The answers start right under the question.
// 3. Rows and tiles are only as tall as their words, with PADV above and below; nothing stretches.
// 4. A set shares one size, as large as the question where it fits; on the lettered walls (multiple
//    choice) the question comes down to the options' size, so the two read as one.
// 5. The answers are set in the body face and the marks (letters, numbers, handles) in the muted ink,
//    so nothing under the question reads as part of the heading; words are centred in their cell.
// 6. Every question is answered on the slide after it, in its own layout: the reason under the
//    question, the right parts green. Nothing waits hidden on the question's slide.
// 7. Green is only for what is right, on its own rows or tiles; everything else is the theme's.
// 8. One shade for every cell, rules between, so no two cells read as a pair.

/** One question as the walls read it: SlideForge's compiled quiz slide, or an activity game's question. */
export interface GameQuestion {
  type?: string; question?: string; options?: string[]; correct?: number; answer?: string; explanation?: string;
  headPrompt?: string; timeLimit?: number; roundSeconds?: number;
  errorFrom?: number; errorTo?: number; fix?: string;
  fillParts?: string[]; gapAnswers?: number[];
  itemA?: string; itemB?: string; sortBins?: string[];
  points?: number; difficulty?: string; bossDamage?: number; accept?: string[];
  min?: number; max?: number; step?: number; target?: number; tolerance?: number; unit?: string;
}
/** One of SlideForge's showcase games, as tools/lab-games.mjs writes it. */
export interface ShowcaseGame { format: string; style: string; label: string; styleLabel: string; aim: string; howToPlay: string[]; title: string; slides: GameQuestion[]; /** Multiple choice's look (types.ts GameLook); the walls when not said. */ look?: 'buttons' | 'walls' }
/** A game from the activity catalogue. */
export interface Question { question: string; options: string[]; correct: number; explanation: string }
export interface GameDef { title: string; style: string; styleLabel: string; steps: string[]; questions: Question[]; /** What the cover says under the title, when not a count of questions. */ count?: string }

export const PADV = 24;
const MARK = 130;
/** A question's clock: at the end of the heading row, in the heading's own type. */
export const TIMER = (st: LayoutStyle, q: GameQuestion) => (q.timeLimit ? [headingClock(st, q.timeLimit / 60)] : []);
export const note = (q: GameQuestion) => [q.answer ? `Answer: ${q.answer}` : '', q.explanation ?? ''].filter(Boolean).join('\n');
export const FACE = (st: LayoutStyle): Params => ({ font: st.body, weight: '700', lineHeight: 1.15 });
export const named = (name: string, i: number, answer: boolean) => `${name} · ${i + 1}${answer ? ' · the answer' : ''}`;
/** What the small heading says: the game, what to do (or that this is the answer), how far in. */
export const tag = (game: string, cue: string, i: number, n: number, answer: boolean) => `${game} · ${answer ? 'the answer' : cue}${n > 1 ? ` · ${i + 1} of ${n}` : ''}`;

// ─── The cover ──────────────────────────────────────────────────────────────
/** The accent full-bleed, the game's name reversed out of it, how many questions, how to play. */
export function gameCover(st: LayoutStyle, g: GameDef): Slide {
  const n = g.questions.length;
  const layers: Layer[] = [
    ground(st),
    rect('Accent ground', box(0, TOPBAND, W, BASE - TOPBAND), st.accent, { type: 'fade', duration: 0.6 }),
    txt('Eyebrow', `GAME · ${g.styleLabel.toUpperCase()}`, box(LEFT, EY + 20, 1400, 50), { font: st.body, weight: '600', size: 40, color: st.ground, tracking: 0.14 }),
    txt('Title', g.title, box(LEFT, HY + 44, W - LEFT * 2, 360), { font: st.display, weight: st.displayWeight, size: 170, color: st.ground, lineHeight: 0.98, tracking: -0.02, fit: 'fill', balance: true },
      { type: 'words', feel: 'rise', easing: 'easyEase', duration: 0.8, stagger: 0.12 }),
    txt('Count', g.count ?? `${n} ${n === 1 ? 'question' : 'questions'}`, box(LEFT, 640 - LIFT, 1200, 70), { font: st.body, weight: '600', size: 60, color: st.ground }, { type: 'fade', duration: 0.6, delay: 0.4 }),
  ];
  const rules = g.steps.slice(0, 3);
  const colW = (W - LEFT * 2) / Math.max(1, rules.length);
  rules.forEach((r, i) => layers.push(
    rect(`Rule ${i + 1} — mark`, box(LEFT + i * colW, 780 - LIFT, 60, 6), st.ground, { type: 'wipeRight', duration: 0.5, delay: 0.5 + i * 0.1 }),
    txt(`Rule ${i + 1}`, r, box(LEFT + i * colW, 806 - LIFT, colW - 60, FOOT - 816 + LIFT), { font: st.body, size: 42, color: st.ground, lineHeight: 1.25 }, { type: 'fade', duration: 0.6, delay: 0.55 + i * 0.1 }),
  ));
  return slideOf(g.title, layers, st, `${g.title} — ${g.styleLabel}. SlideForge's live session runs the game; the lab draws it.\n\nHow to play:\n${g.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);
}

// ─── The shared parts ───────────────────────────────────────────────────────
/** Rule 1, and on the answer slide rule 6's reason: what opens every wall, and where its answers start. */
export function opening(st: LayoutStyle, q: GameQuestion, heading: string, question: string, answer: boolean, o: { sizes?: number[]; maxH?: number; why?: string; width?: number } = {}) {
  const layers: Layer[] = [ground(st), eyebrow(st, heading), ...(answer ? [] : TIMER(st, q))];
  // Rule 1: never more than two lines, however long the question.
  const qn = sizedHero(st, 'Question', question, LEFT, HY, o.width ?? W - LEFT * 2, { sizes: o.sizes, maxH: o.maxH ?? 330, lines: 2, anim: answer ? { type: 'none', duration: 0 } : undefined });
  layers.push(qn.layer);
  let top = qn.bottom + 28;
  const why = o.why ?? q.explanation;
  if (answer && why) {
    const p = { font: st.body, size: 44, color: st.muted, lineHeight: 1.2 };
    const h = Math.min(120, textHeight(why, W - LEFT * 2, p) + 6);
    layers.push(txt('Why', why, box(LEFT, qn.bottom + 12, W - LEFT * 2, h), p, { type: 'fade', duration: 0.6, delay: 0.3 }));
    top = qn.bottom + 12 + h + 24;
  }
  return { layers, qn, top };
}

/** A cell of a set. `id` names what it is, the same on the question and its answer, so a Morph
 *  carries it from one to the other: an item into its place, a word into its gap. */
export interface Cell { text: string; mark?: string; right?: boolean; quiet?: boolean; id?: string }
/** Rules 3, 4, 5, 7 and 8: a set of cells laid out `cols` across under the question, each row only as
 *  tall as its words, one size for all, words centred, one shade with rules between, right cells green.
 *  With `step`, each cell arrives on a click of its own and the one before it dims. */
export function grid(st: LayoutStyle, cells: Cell[], top: number, o: { cols: number; max: number; min?: number; name: string; marks?: boolean; lines?: number; step?: string }): { layers: Layer[]; bottom: number; size: number } {
  const face = FACE(st);
  const cols = Math.max(1, o.cols), rows = Math.ceil(cells.length / cols);
  // A last row the set does not fill is made up with blank tiles, so the band stays whole.
  cells = [...cells, ...Array.from({ length: rows * cols - cells.length }, () => ({ text: '' }))];
  // Tiles three across keep a narrower column for their mark.
  const cw = W / cols, markW = o.marks ? (cols > 2 ? 80 : MARK) : 0;
  const textW = (c: number) => cw - (c === 0 ? LEFT : PAD) - PAD - markW;
  const texts = cells.map((x) => x.text).filter(Boolean);
  const lh = Number(face.lineHeight ?? 1.15);
  // As large as the set allows, no more lines than it asks, and every row clear of the foot.
  const room = (FOOT - top) / Math.max(1, rows) - PADV * 2;
  const size = fitSize(texts, textW(0), Math.min(o.max * lh * (o.lines ?? 2) + 4, room), face, o.max, o.min ?? 44);
  const tallest = Math.max(size * lh, ...cells.map((x, k) => (x.text ? textHeight(x.text, textW(k % cols), { ...face, size }) : 0)));
  const rowH = Math.min((BASE - top) / Math.max(1, rows), tallest + PADV * 2);
  // Tiles centre their words; rows with a number, a letter or a handle hang them after it.
  const align = markW ? 'left' : 'center';
  const layers: Layer[] = [];
  cells.forEach((x, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    const cell = box(c * cw, top + r * rowH, cw, rowH);
    const step = o.step ? { set: o.step, i: k, mode: 'spot' as const } : undefined;
    const a: Partial<Anim> = step ? { type: 'pop', duration: 0.5, delay: 0, trigger: 'onClick', step } : { type: 'fade', duration: 0.5, delay: 0.25 + 0.04 * k };
    const w: Partial<Anim> = step ? { type: 'fade', duration: 0.5, delay: 0.05, trigger: 'withSlide', step } : { ...a, delay: (a.delay ?? 0) + 0.05 };
    const ink = x.right ? ON_RIGHT : x.quiet ? st.muted : st.ink;
    const ruleCol = x.right ? 'rgba(255,255,255,0.3)' : rgba(st.ink, 0.14);
    const padL = c === 0 ? LEFT : PAD;
    const keyed = (l: Layer, part = '') => { if (x.id) l.params.morph = `${x.id}${part}`; return l; };
    layers.push(keyed(rect(`${o.name} ${k + 1}`, cell, x.right ? RIGHT : rgba(st.ink, 0.06), a)));
    if (c > 0) layers.push(rect(`${o.name} ${k + 1} — rule`, box(cell.x, cell.y, 2, cell.h), ruleCol, w));
    if (r > 0) layers.push(rect(`${o.name} ${k + 1} — rule across`, box(cell.x, cell.y, cell.w, 2), ruleCol, w));
    if (x.mark && markW) layers.push(keyed(centred(`${o.name} ${k + 1} — mark`, x.mark, box(cell.x + padL, cell.y, markW, cell.h), { ...face, size, color: x.right ? ON_RIGHT : st.muted, lineHeight: 1 }, w, 0, 0), ':mark'));
    if (x.text) layers.push(keyed(centred(`${o.name} ${k + 1} — words`, x.text, box(cell.x + padL + markW, cell.y, cell.w - padL - markW, cell.h), { ...face, size, color: ink, align }, w, 0, PAD), ':words'));
  });
  return { layers, bottom: top + rows * rowH, size };
}

/** Three bins as a solid strip of the ink, the names reversed out of it. */
export function bins(st: LayoutStyle, names: string[], y: number): Layer[] {
  const STRIP = 96;
  return names.flatMap((bin, k) => {
    const x0 = Math.round((k * W) / names.length), x1 = Math.round(((k + 1) * W) / names.length);
    const cell = box(x0, Math.min(BASE - STRIP, y), x1 - x0, STRIP);
    return [
      rect(`${bin} — bin`, cell, st.ink, { type: 'fade', duration: 0.5, delay: 0.3 }),
      ...(k > 0 ? [rect(`${bin} — bin rule`, box(x0, cell.y, 2, STRIP), rgba(st.ground, 0.3), { type: 'fade', duration: 0.5, delay: 0.3 })] : []),
      centred(`${bin} — name`, bin, cell, { font: st.body, weight: '700', size: 44, color: st.ground, lineHeight: 1, align: 'center' }, { type: 'fade', duration: 0.5, delay: 0.35 }, k === 0 ? LEFT : PAD),
    ];
  });
}

// ─── Spot the error ─────────────────────────────────────────────────────────
/** The passage is the stage. The answer: the passage again, the reason, then one green row — the
 *  wrong words struck through, the arrow in the middle, the fix. */
export function spotWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  // The passage keeps room under it for the reason and the answer row, so both slides set it alike.
  const o = opening(st, q, tag('Spot the error', 'find the one mistake', i, n, answer), q.question ?? '', answer, { sizes: [140, 128, 120, 112, 104], maxH: FOOT - HY - 340 });
  if (answer) {
    const words = q.options ?? [];
    // The wrong words struck through where they stand in the passage, as the answer row strikes them.
    const from = q.errorFrom ?? q.correct ?? 0, to = q.errorTo ?? from;
    const qb = o.qn.layer.box!, spots = wordBoxes(String(o.qn.layer.params.text ?? ''), qb.w, o.qn.layer.params);
    spots.slice(from, to + 1).forEach((b, k) => o.layers.push(rect(`Error ${k + 1} — strike`, box(qb.x + b.x, qb.y + b.y + b.h * 0.52, b.w, Math.max(6, o.qn.size * 0.07)), st.ink, { type: 'wipeRight', duration: 0.5, delay: 0.3 })));
    const wrong = words.slice(q.errorFrom ?? q.correct ?? 0, (q.errorTo ?? q.errorFrom ?? q.correct ?? 0) + 1).join(' ').replace(/[,.;:]$/, '');
    const MID = W / 2, GAP = 80;
    const face = { ...FACE(st), lineHeight: 1 };
    const size = Math.min(96, fitSize([wrong, q.fix ?? ''], MID - GAP - LEFT, 110, face, 96, 48));
    const rowH = size * 1.1 + PADV * 2, y = o.top;
    const strikeW = Math.min(MID - GAP - LEFT, textWidth(display(wrong), { ...face, size }));
    const a = { type: 'fade' as const, duration: 0.5, delay: 0.3 };
    o.layers.push(
      rect('Answer', box(0, y, W, rowH), RIGHT, a),
      centred('Answer — wrong', display(wrong), box(LEFT, y, MID - GAP - LEFT, rowH), { ...face, size, color: 'rgba(255,255,255,0.72)', align: 'right' }, a, 0, 0),
      rect('Answer — strike', box(MID - GAP - strikeW, y + rowH / 2 - 4, strikeW, 8), ON_RIGHT, { type: 'wipeRight', duration: 0.5, delay: 0.5 }),
      centred('Answer — arrow', '→', box(MID - 50, y, 100, rowH), { ...face, size, color: ON_RIGHT, align: 'center' }, a, 0, 0),
      centred('Answer — fix', display(q.fix ?? ''), box(MID + GAP, y, W - LEFT - MID - GAP, rowH), { ...face, size, color: ON_RIGHT }, { ...a, delay: 0.45 }, 0, 0),
    );
  }
  return slideOf(named(name, i, answer), o.layers, st, note(q));
}

// ─── Ranking ────────────────────────────────────────────────────────────────
/** A fixed shuffle, so the wall never shows the answer as the starting order. */
const shuffled = <T,>(xs: T[]) => xs.map((x, k) => ({ x, k: (k * 7 + 3) % (xs.length + 2) })).sort((a, b) => a.k - b.k).map((o) => o.x);

/** The items as full-width rows in a mixed order; the answer has them in order, green, numbered. */
export function rankingWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const items = (q.options ?? []).slice(0, 6);
  const o = opening(st, q, tag('Ranking', 'put them in order', i, n, answer), q.question ?? '', answer);
  // Each item keeps its name across the two slides, so on the answer it moves into its place.
  const list = answer ? items.map((_, k) => k) : shuffled(items.map((_, k) => k));
  o.layers.push(...grid(st, list.map((j, k) => ({ text: items[j], id: `item-${j}`, mark: answer ? String(k + 1) : '⋮⋮', right: answer })), o.top, { cols: 1, max: Math.min(o.qn.size, 88), name: answer ? 'Order' : 'Item', marks: true, lines: 1 }).layers);
  return slideOf(named(name, i, answer), o.layers, st, note(q) || items.map((it, k) => `${k + 1}. ${it}`).join('\n'));
}

// ─── True or false ──────────────────────────────────────────────────────────
/** The statement, then TRUE and FALSE side by side at the statement's size. The room votes (in the
 *  showdown, sees its split and may switch once on the phones); the answer lights the true one. */
export function trueFalseWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false, hold = true): Slide {
  const opts = (q.options?.length ? q.options : ['True', 'False']).slice(0, 2);
  const cells = opts.map((t, k) => ({ text: t.toUpperCase(), id: `choice-${k}`, right: answer && k === q.correct }));
  const { o, set } = matched((sizes) => {
    const o = opening(st, q, tag('True or false', hold ? 'vote, then hold' : 'vote', i, n, answer), q.question ?? '', answer, { sizes: sizes ?? [140, 120, 104, 88], maxH: 360 });
    return { o, set: grid(st, cells, o.top, { cols: 2, max: o.qn.size, name: 'Choice', lines: 1 }) };
  });
  o.layers.push(...set.layers);
  const held = 'After the vote: show the room its split; each phone may switch once. Then Next for the answer.';
  return slideOf(named(name, i, answer), o.layers, st, answer || !hold ? note(q) : held);
}

/** The Buttons looks' reason: under the buttons, not under the question, so the buttons stand in the
 *  same place on the question and its answer and the reveal lights them where they are. Its room is
 *  kept on both slides; it is written on the answer. It is "Reason", not "Why": the walls' Why stays
 *  put under the question when a game is centred (centreGame), and this one moves with its buttons. */
function underWhy(st: LayoutStyle, q: GameQuestion): { h: number; params: Params } {
  const why = q.explanation ?? '';
  const params: Params = { font: st.body, size: 40, color: st.muted, lineHeight: 1.2 };
  return { h: why ? Math.min(120, textHeight(why, W - LEFT * 2, params) + 6) + 24 : 0, params };
}
function whyLayer(q: GameQuestion, under: { params: Params }, y: number): Layer[] {
  return q.explanation ? [txt('Reason', q.explanation, box(LEFT, y + 24, W - LEFT * 2, 120), under.params, { type: 'fade', duration: 0.6, delay: 0.3 })] : [];
}

/** True or false, the Buttons look: SlideForge's two doors (css/app.css .present-truefalse .tf-duo).
 *  The statement centred over two tall rounded doors side by side, True's edge touched with green and
 *  False's with red; on the answer the right door is green where it stood and the other goes quiet. */
export function doorsWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false, hold = true): Slide {
  const opts = (q.options?.length ? q.options : ['True', 'False']).slice(0, 2);
  const under = underWhy(st, q);
  const { o, set } = matched((sizes) => {
    const o = opening(st, q, tag('True or false', hold ? 'vote, then hold' : 'vote', i, n, answer), q.question ?? '', answer, { sizes: sizes ?? [140, 120, 104, 88], maxH: 360, why: '' });
    o.qn.layer.params.align = 'center';
    return { o, set: doors(st, opts, o.top, Math.min(o.qn.size, 96), answer ? q.correct : undefined, under.h) };
  });
  o.layers.push(...set.layers, ...(answer ? whyLayer(q, under, set.bottom) : []));
  const held = 'After the vote: show the room its split; each phone may switch once. Then Next for the answer.';
  return slideOf(named(name, i, answer), o.layers, st, answer || !hold ? note(q) : held);
}

/** Two doors, 1380px across together and centred, 42px apart, as tall as SlideForge's (168px at its
 *  size) or their words; the words centred, one size. */
function doors(st: LayoutStyle, opts: string[], top: number, max: number, right?: number, reserve = 0): { layers: Layer[]; size: number; bottom: number } {
  const face = { ...FACE(st), align: 'center' };
  const gap = 42, span = 1380, w = (span - gap) / 2, x0 = (W - span) / 2, y = top + 36, foot = FOOT - reserve;
  const size = fitSize(opts.map((t) => t.toUpperCase()), w - PAD * 2, Math.min(max * 1.15 * 2 + 4, foot - y - PADV * 2), face, max, 44);
  const h = Math.min(foot - y, Math.max(252, size * 1.15 * 2 + PADV * 2));
  const edge = ['#34c98a', '#ff5f6d'];
  const layers: Layer[] = [];
  opts.forEach((t, k) => {
    const b = box(x0 + k * (w + gap), y, w, h);
    const lit = right === k, quiet = right != null && right !== k;
    const a: Partial<Anim> = { type: 'pop', duration: 0.5, delay: 0.25 + 0.08 * k };
    const door = createLayer('shape', { name: `Door ${k + 1}`, box: b, anim: a, params: {
      shape: 'rect', radius: 21, fill: lit ? RIGHT : rgba(st.ink, quiet ? 0.03 : 0.05),
      stroke: lit ? RIGHT : edge[k], strokeOpacity: lit ? 1 : quiet ? 0.2 : 0.55, strokeWidth: 4.5 } });
    door.params.morph = `choice-${k}`;
    const words = centred(`Door ${k + 1} — words`, t.toUpperCase(), b, { ...face, size, color: lit ? ON_RIGHT : quiet ? st.muted : st.ink }, { ...a, delay: (a.delay ?? 0) + 0.05 });
    words.params.morph = `choice-${k}:words`;
    layers.push(door, words);
  });
  return { layers, size, bottom: y + h };
}

// ─── Lettered choices: multiple choice, predict the outcome ─────────────────
/** Rule 4 for the lettered walls: the question and its options at one size. The options are sized
 *  under the question, the question is brought down to their size, and they are laid out again under
 *  it, until the two agree (the question's two lines can take it lower still). */
function matched<T extends { size: number }>(build: (sizes?: number[]) => { o: ReturnType<typeof opening>; set: T }) {
  let r = build();
  for (let k = 0; k < 3 && r.o.qn.size > r.set.size; k++) r = build([r.set.size]);
  return r;
}

/** The question, then its options as full-width rows, letter and words at one size. The answer lights
 *  the right one, with why. */
export function choiceWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false, game = 'Multiple choice', cue = 'choose one', held = ''): Slide {
  const opts = (q.options ?? []).slice(0, 6);
  const cells = opts.map((t, k) => ({ text: t, id: `option-${k}`, mark: 'ABCDEF'[k], right: answer && k === q.correct }));
  const { o, set } = matched((sizes) => {
    const o = opening(st, q, tag(game, cue, i, n, answer), q.question ?? '', answer, { sizes: sizes ?? [120, 104, 92, 80] });
    return { o, set: grid(st, cells, o.top, { cols: 1, max: Math.min(o.qn.size, 88), name: 'Option', marks: true }) };
  });
  o.layers.push(...set.layers);
  return slideOf(named(name, i, answer), o.layers, st, answer || !held ? note(q) : held);
}

/** SlideForge's quiz, the Buttons look: the options as buttons, two by two, a letter on each. On the
 *  answer the right one is green where it stood and the rest go quiet, the reason under the question,
 *  so the reveal reads as the button lighting up. */
export function buttonsWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const opts = (q.options ?? []).slice(0, 6);
  const cells: Cell[] = opts.map((t, k) => ({ text: t, id: `option-${k}`, mark: 'ABCDEF'[k], right: answer && k === q.correct, quiet: answer && k !== q.correct }));
  const under = underWhy(st, q);
  const { o, set } = matched((sizes) => {
    const o = opening(st, q, tag('Multiple choice', 'choose one', i, n, answer), q.question ?? '', answer, { sizes: sizes ?? [120, 104, 92, 80], why: '' });
    return { o, set: buttons(st, cells, o.top, Math.min(o.qn.size, 88), under.h) };
  });
  o.layers.push(...set.layers, ...(answer ? whyLayer(q, under, set.bottom) : []));
  return slideOf(named(name, i, answer), o.layers, st, note(q));
}

/** Buttons two by two under the question, rounded, apart, each as tall as the tallest's words; one
 *  size for all. The right one green (rule 7), a quiet one faded. */
function buttons(st: LayoutStyle, cells: Cell[], top: number, max: number, reserve = 0): { layers: Layer[]; size: number; bottom: number } {
  const face = FACE(st), gap = 28;
  const cols = cells.length > 2 ? 2 : Math.max(1, cells.length), rows = Math.ceil(cells.length / cols);
  const w = (W - LEFT * 2 - gap * (cols - 1)) / cols;
  const markW = 72, inL = 36, inR = 40, textW = w - inL - markW - inR;
  const lh = Number(face.lineHeight ?? 1.15);
  const room = (FOOT - reserve - top - gap * (rows - 1)) / Math.max(1, rows);
  const size = fitSize(cells.map((x) => x.text).filter(Boolean), textW, Math.min(max * lh * 2 + 4, room - PADV * 2), face, max, 44);
  const tallest = Math.max(size * lh, ...cells.map((x) => (x.text ? textHeight(x.text, textW, { ...face, size }) : 0)));
  const h = Math.min(room, tallest + PADV * 2 + 12);
  const layers: Layer[] = [];
  cells.forEach((x, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    const b = box(LEFT + c * (w + gap), top + r * (h + gap), w, h);
    const a: Partial<Anim> = { type: 'pop', duration: 0.5, delay: 0.25 + 0.06 * k };
    const inner: Partial<Anim> = { ...a, delay: (a.delay ?? 0) + 0.05 };
    const keyed = (l: Layer, part = '') => { if (x.id) l.params.morph = `${x.id}${part}`; return l; };
    layers.push(keyed(rect(`Button ${k + 1}`, b, x.right ? RIGHT : rgba(st.ink, x.quiet ? 0.035 : 0.07), a, 18)));
    if (x.mark) layers.push(keyed(centred(`Button ${k + 1} — mark`, x.mark, box(b.x + inL, b.y, markW, b.h), { ...face, size, color: x.right ? ON_RIGHT : x.quiet ? st.muted : st.accent, lineHeight: 1 }, inner, 0, 0), ':mark'));
    if (x.text) layers.push(keyed(centred(`Button ${k + 1} — words`, x.text, box(b.x + inL + markW, b.y, w - inL - markW, b.h), { ...face, size, color: x.right ? ON_RIGHT : x.quiet ? st.muted : st.ink, align: 'left' }, inner, 0, inR), ':words'));
  });
  return { layers, size, bottom: top + rows * h + (rows - 1) * gap };
}

/** Predict the outcome: lettered futures; the phones commit and say how sure before the answer. */
export const predictWall = (st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false) =>
  choiceWall(st, name, q, i, n, answer, 'Predict the outcome', 'commit, and say how sure',
    'When the room has committed: lock the predictions and show the split, then show what happens. Next gives the answer.');

// ─── Fill the gaps ──────────────────────────────────────────────────────────
/** The passage with each gap a line, and the word bank as tiles under it. The answer: the passage, the
 *  reason, and a green row per gap in the passage's order. */
export function fillWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const parts = q.fillParts ?? [q.question ?? ''];
  // Each gap numbered, so the answer's numbered rows say which is which.
  const passage = parts.map((p, k) => (k < parts.length - 1 ? `${p}${'①②③④⑤⑥⑦⑧'[k] ?? ''}______` : p)).join('').replace(/\s+/g, ' ').trim();
  const bank = (q.options ?? []).slice(0, 6);
  const o = opening(st, q, tag('Fill the gaps', 'a word from the bank for each', i, n, answer), passage, answer, { sizes: [104, 96, 88, 80], maxH: 340 });
  // A bank word and the gap it fills share a name, so the answer drops each word into its row.
  const cells: Cell[] = answer ? (q.gapAnswers ?? []).map((j, k) => ({ text: bank[j] ?? '', id: `word-${j}`, mark: String(k + 1), right: true })) : bank.map((t, j) => ({ text: t, id: `word-${j}` }));
  o.layers.push(...grid(st, cells, o.top, { cols: answer ? 1 : bank.length <= 3 ? Math.max(1, bank.length) : 3, max: o.qn.size, name: answer ? 'Gap' : 'Word', marks: answer, lines: 1 }).layers);
  return slideOf(named(name, i, answer), o.layers, st, note(q));
}

// ─── Odd one out ────────────────────────────────────────────────────────────
/** Four items as tiles two by two, at the question's size. The answer lights the odd one, with its
 *  rule; anyone who picked another defends it. */
export function oddOneWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const items = (q.options ?? []).slice(0, 4);
  // One size for the question and the items: as large as the items allow, no larger than a heading.
  const size = Math.min(120, fitSize(items, W / 2 - LEFT - PAD, 200, FACE(st), 150, 60));
  const o = opening(st, q, tag('Odd one out', 'vote, then defend', i, n, answer), q.headPrompt ?? q.question ?? '', answer, { sizes: [size, size - 8, size - 16], maxH: 300 });
  o.layers.push(...grid(st, items.map((t, k) => ({ text: t, id: `item-${k}`, right: answer && k === q.correct })), o.top, { cols: 2, max: size, name: 'Item', lines: 1 }).layers);
  return slideOf(named(name, i, answer), o.layers, st, answer ? `${note(q)}\n\nPicked another? Defend it with a rule of your own.` : note(q));
}

// ─── Compare & contrast ─────────────────────────────────────────────────────
/** The statements as tiles under the question, the three bins as a strip under them. The answer:
 *  each statement in a green row in its bin's column, the rows level across, the same strip below. */
export function compareWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const a = q.itemA ?? 'A', b = q.itemB ?? 'B';
  const names = q.sortBins?.length === 3 ? q.sortBins : [`${a} only`, 'Both', `${b} only`];
  const placed = new Map<string, string[]>(names.map((x) => [x, []]));
  for (const pair of String(q.answer ?? '').split(' · ')) {
    const [stmt, bin] = pair.split(' → ').map((s) => s.trim());
    if (stmt && bin && placed.has(bin)) placed.get(bin)!.push(stmt);
  }
  const statements = (q.options ?? []).slice(0, 9);
  const o = opening(st, q, tag('Compare & contrast', 'sort each one', i, n, answer), `${a}, ${b} — or both?`, answer, { sizes: [120, 104, 92, 84], maxH: 220 });
  const sorted = names.map((x) => placed.get(x) ?? []);
  const rows = Math.max(1, ...sorted.map((c) => c.length));
  const cells: Cell[] = answer
    ? Array.from({ length: rows * 3 }, (_, k) => { const t = sorted[k % 3][Math.floor(k / 3)] ?? ''; return { text: t, right: !!t, ...(t ? { id: `statement-${statements.indexOf(t)}` } : {}) }; })
    : statements.map((t, j) => ({ text: t, id: `statement-${j}` }));
  const set = grid(st, cells, o.top, { cols: 3, max: 72, min: 40, name: answer ? 'Sorted' : 'Statement' });
  o.layers.push(...set.layers, ...bins(st, names, set.bottom + 14));
  return slideOf(named(name, i, answer), o.layers, st, note(q));
}

/** A sort with no statements on the wall (a card sort, a Venn): the prompt, the three bins under it,
 *  and the columns below them marked out by rules for the room's cards. */
export function sortWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number): Slide {
  const o = opening(st, q, tag('Compare & contrast', 'sort it', i, n, false), q.question ?? '', false, { sizes: [112, 104, 96, 88] });
  const names = binsOf(q.question ?? '');
  o.layers.push(...bins(st, names, o.top));
  const y = o.top + 96;
  names.forEach((bin, k) => { if (k > 0) o.layers.push(rect(`${bin} — column rule`, box(Math.round((k * W) / 3), y, 2, FOOT - y), rgba(st.ink, 0.14), { type: 'fade', duration: 0.6, delay: 0.4 })); });
  return slideOf(named(name, i, false), o.layers, st, q.explanation ?? '');
}
/** The bins a sort's prompt names: "…: the boundary, the surface, or both?" or "Compare area and
 *  perimeter", else one, both and the other. */
function binsOf(prompt: string): string[] {
  const cap = (s: string) => s.trim().replace(/^the\s+/i, '').replace(/^./, (c) => c.toUpperCase());
  const m = prompt.match(/:\s*([^,:]+),\s*([^,]+?),?\s+or both\??\s*$/i) ?? prompt.match(/compare\s+(.+?)\s+and\s+(.+?)[.?:]/i);
  return m ? [`${cap(m[1])} only`, 'Both', `${cap(m[2])} only`] : ['Only the first', 'Both', 'Only the second'];
}

// ─── A typed answer ─────────────────────────────────────────────────────────
/** The question, and under it the row the room's answers are typed into; the answer fills that row,
 *  green. The activity catalogue keeps a typed question's answer as its explanation. */
export function typedWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const said = q.answer ?? q.explanation ?? '';
  const o = opening(st, q, tag('Type your answer', 'on your phone', i, n, answer), q.question ?? '', answer, { sizes: [132, 120, 104, 92], why: q.answer ? q.explanation : '' });
  const cell: Cell = answer ? { text: said, right: true } : { text: 'Type it on your phone', quiet: true };
  o.layers.push(...grid(st, [cell], o.top, { cols: 1, max: answer ? Math.min(o.qn.size, 96) : 56, name: answer ? 'Answer' : 'Answer row', lines: 1 }).layers);
  return slideOf(named(name, i, answer), o.layers, st, said ? `Answer: ${said}` : '');
}

// ─── Heads up ───────────────────────────────────────────────────────────────
/** The term, as big as the slide takes; one learner explains it without saying it. The answer slide
 *  keeps the term and gives its meaning in a green row. */
export function termWall(st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer = false): Slide {
  const o = opening(st, q, tag('Heads up', 'explain it — don’t say it', i, n, answer), q.question ?? '', answer, { sizes: [320, 260, 200, 150], maxH: 480, why: '' });
  if (answer && q.explanation) o.layers.push(...grid(st, [{ text: q.explanation, right: true }], o.top, { cols: 1, max: 72, name: 'Meaning' }).layers);
  return slideOf(named(name, i, answer), o.layers, st, q.explanation ? `Meaning: ${q.explanation}` : '');
}

// ─── Boards: every question on one slide ────────────────────────────────────
/** A low-stakes quiz: the questions as numbered rows under the heading, all on one slide. */
export function questionBoard(st: LayoutStyle, g: GameDef): Slide {
  const qs = g.questions.slice(0, 6);
  const o = opening(st, {}, `${g.styleLabel} · ${qs.length} questions`, g.title, false, { sizes: [112, 104, 96], maxH: 240 });
  o.layers.push(...grid(st, qs.map((q, k) => ({ text: q.question, mark: String(k + 1) })), o.top, { cols: 1, max: 72, min: 40, name: 'Question', marks: true }).layers);
  return slideOf(g.title, o.layers, st, g.questions.map((q, i) => `${i + 1}. ${q.question}${q.explanation ? ` — ${q.explanation}` : ''}`).join('\n'));
}

/** A question cube: its six faces as numbered tiles three by two; each roll is a click lighting one. */
export function cubeFaces(st: LayoutStyle, g: GameDef): Slide {
  const qs = g.questions.slice(0, 6);
  const o = opening(st, {}, 'Question cube · roll to choose', g.title, false, { sizes: [112, 104, 96], maxH: 240 });
  o.layers.push(...grid(st, qs.map((q, k) => ({ text: q.question, mark: String(k + 1) })), o.top, { cols: 3, max: 64, min: 40, name: 'Face', marks: true, lines: 5, step: 'faces' }).layers);
  return slideOf(g.title, o.layers, st, g.questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n'));
}

// ─── Beat the clock ─────────────────────────────────────────────────────────
/** The sprint: the wall is the clock, as big as the slide takes, and one line of what to do. Each
 *  phone runs its own stream; the answers follow on their own slide. */
export function sprintWall(st: LayoutStyle, name: string, qs: GameQuestion[]): Slide {
  const secs = qs.find((q) => q.roundSeconds)?.roundSeconds ?? 60;
  const size = Math.min(640, BASE - HY - 60);
  const layers: Layer[] = [
    ground(st),
    eyebrow(st, `Beat the clock · ${qs.length} questions`),
    clock(st, 'Round clock', secs / 60, box(LEFT, HY, size, size), { type: 'zoomIn', duration: 0.6 }, true),
    hero(st, 'Go', 'Answer on your phone — as many as you can.', box(LEFT + size + 100, HY + 40, W - LEFT * 2 - size - 100, 420), 120),
    txt('Rule', 'Fast, correct answers score more. The clock is the same for everyone.', box(LEFT + size + 100, HY + 480, W - LEFT * 2 - size - 100, 150), { font: st.body, size: 50, color: st.muted, lineHeight: 1.25 }, { type: 'fade', duration: 0.6, delay: 0.3 }),
  ];
  return tagGame(slideOf(`${name} · the sprint`, layers, st, qs.map((q, k) => `${k + 1}. ${q.question} — ${q.options?.[q.correct ?? -1] ?? ''}`).join('\n')), 'board', undefined, undefined, 'Round', { seconds: secs, ...(qs[0]?.points != null ? { points: qs[0].points } : {}) });
}

/** After the sprint: each question beside its answer, the answers green. */
export function sprintAnswers(st: LayoutStyle, name: string, qs: GameQuestion[]): Slide {
  const list = qs.slice(0, 6);
  const o = opening(st, {}, 'Beat the clock · the answers', 'How did the room do?', true, { sizes: [112] });
  const cells: Cell[] = list.flatMap((q) => [{ text: q.question ?? '' }, { text: q.options?.[q.correct ?? -1] ?? '', right: true }]);
  o.layers.push(...grid(st, cells, o.top, { cols: 2, max: 72, min: 40, name: 'Answer' }).layers);
  return tagGame(slideOf(`${name} · the answers`, o.layers, st), 'end');
}

// ─── The sets ───────────────────────────────────────────────────────────────
export type Wall = (st: LayoutStyle, name: string, q: GameQuestion, i: number, n: number, answer?: boolean) => Slide;
/** Asked, then answered on the slide after. */
export const paired = (wall: Wall, name: string, st: LayoutStyle, qs: GameQuestion[]) => qs.flatMap((q, i) => [
  tagGame(wall(st, name, q, i, qs.length), 'question', q, String(i)), tagGame(wall(st, name, q, i, qs.length, true), 'answer', q, String(i)),
]);

/** A question's settings, as SlideForge's compiled slide carries them. */
export function settingsOf(q: GameQuestion = {}): GameSettings {
  const s: GameSettings = {};
  if (q.timeLimit) s.seconds = q.timeLimit;
  if (q.points != null) s.points = q.points;
  if (q.difficulty) s.difficulty = q.difficulty;
  if (q.bossDamage != null) s.damage = q.bossDamage;
  if (q.tolerance != null) s.tolerance = q.tolerance;
  if (q.min != null && q.max != null && q.target != null) s.range = [q.min, q.max, q.target];
  if (q.accept?.length) s.accept = [...q.accept];
  return s;
}
/** Mark a slide as a part of its game: what it is, the question it asks, and what its clock times. */
export function tagGame(s: Slide, role: SlideGame['role'], q?: GameQuestion, key?: string, clock?: string, extra: GameSettings = {}): Slide {
  s.game = { id: '', format: '', label: '', role, ...(key != null ? { key } : {}), ...(clock ? { clock } : {}), settings: { ...settingsOf(q), ...extra } };
  // The question itself goes with it, for the live room (src/deck/labshow.js).
  if (role === 'question' && q) s.game.quiz = JSON.parse(JSON.stringify(q)) as Record<string, unknown>;
  return s;
}
/** What stays where it is when a slide's content is centred: the ground, the heading row (its
 *  words, its clock, a button back to the board), the question and its reason under it, a boss's
 *  face beside it, the header and footer, anything the slide's size. */
const pinned = (l: Layer) => !l.box || l.name === 'Ground' || l.name === 'Eyebrow' || l.name === 'Question' || l.name === 'Why' || l.name === 'Boss' || (l.kind === 'timer' && l.name === 'Clock') || / — button$/.test(l.name) || typeof l.params.hfSlot === 'string' || (l.box.w >= W * 0.9 && l.box.h >= 1080 * 0.9);
/** How far a slide's content can come down to sit in the middle of the space between the question
 *  and the foot: none when it already fills it. */
function slack(s: Slide): number {
  const block = s.layers.filter((l) => !pinned(l));
  if (!block.length) return 0;
  const bottom = Math.max(...block.map((l) => l.box!.y + l.box!.h));
  return Math.max(0, Math.round((FOOT - bottom) / 2));
}
/** Centre each slide's content — its tiles, rows and strips — in the space under its question. A question and its answer move
 *  together, by the smaller of their two, so the question holds still between them. Covers keep their
 *  own layout. */
export function centreGame(slides: Slide[]) {
  const groups = new Map<string, Slide[]>();
  slides.forEach((s, k) => {
    if (s.game?.role === 'cover') return;
    const key = s.game?.key != null ? `key:${s.game.key}` : `slide:${k}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  });
  for (const group of groups.values()) {
    const dy = Math.min(...group.map(slack));
    if (dy > 0) for (const s of group) for (const l of s.layers) if (!pinned(l)) l.box = { ...l.box!, y: l.box!.y + dy };
  }
  return slides;
}
/** Every slide of one game: the same game id, its format, the cover first, the rest boards unless marked. */
export function finishGame(slides: Slide[], format: string, label: string): Slide[] {
  const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  slides.forEach((s, k) => {
    s.game = { ...(s.game ?? { role: k === 0 ? 'cover' : 'board', settings: {} }), id, format, label };
    // A catalogue game's question is plainer than a compiled one: it says what it is from its game.
    const q = s.game.quiz;
    if (q) { q.type = 'quiz'; q.style ??= format; q.input ??= format === 'type' ? 'text' : 'choice'; q.gameTitle ??= label; }
    if (s.game.role === 'question' && !s.game.clock) s.game.clock = 'Time limit';
    // Every step of a game morphs: what the two slides share travels — the lit tile, the item into
    // its place, the card into its reveal — and the rest crossfades.
    s.transition = { type: 'morph', duration: 0.8 };
  });
  return centreGame(slides);
}

const SHOWCASE_WALLS: Record<string, Wall> = {
  'spot-the-error': spotWall, ranking: rankingWall, 'true-false': trueFalseWall, 'predict-outcome': predictWall,
  'fill-in-the-blanks': fillWall, 'odd-one-out': oddOneWall, 'compare-contrast': compareWall,
};
/** SlideForge's showcase games, in the games audit's order. */
export const SHOWCASE = ['spot-the-error', 'ranking', 'true-false', 'predict-outcome', 'fill-in-the-blanks', 'odd-one-out', 'compare-contrast', 'beat-the-clock'];

/** A showcase game as slides: its cover (the game's own How to play), then each question and its answer. */
export function showcaseSlides(g: ShowcaseGame, st: LayoutStyle): Slide[] {
  const qs = g.slides.filter((s) => s.type === 'quiz');
  // SlideForge's sample Compare game reuses its first question's statements under later pairs (RAM
  // and SSD sorting "needs light"); a question whose statements an earlier one already had is skipped.
  if (g.format === 'compare-contrast') {
    const seen = new Set<string>();
    for (let k = 0; k < qs.length; k++) {
      const sig = [...(qs[k].options ?? [])].sort().join('|');
      if (seen.has(sig)) qs.splice(k--, 1); else seen.add(sig);
    }
  }
  const cover = gameCover(st, { title: g.label, style: g.style, styleLabel: g.styleLabel, steps: g.howToPlay, questions: qs.map((q) => ({ question: q.question ?? '', options: q.options ?? [], correct: q.correct ?? -1, explanation: q.explanation ?? '' })) });
  cover.notes = [g.aim, cover.notes].filter(Boolean).join('\n\n');
  if (g.format === 'beat-the-clock') return finishGame([cover, sprintWall(st, g.label, qs), sprintAnswers(st, g.label, qs)], g.format, g.label);
  const wall = g.format === 'true-false' && g.look === 'buttons' ? doorsWall : SHOWCASE_WALLS[g.format] ?? spotWall;
  return finishGame([cover, ...paired(wall, g.label, st, qs)], g.format, g.label);
}

/** An activity's game as slides, on the same walls: its cover, then its questions by style. */
export function activityGameSlides(g: GameDef, st: LayoutStyle): Slide[] {
  const qs: GameQuestion[] = g.questions;
  const plain: Wall = (s, name, q, i, n, answer) => trueFalseWall(s, name, q, i, n, answer, false);
  let body: Slide[];
  switch (g.style) {
    case 'lowstakes': body = [questionBoard(st, g)]; break;
    case 'randomchallenge': body = [cubeFaces(st, g)]; break;
    case 'compare': body = qs.map((q, i) => sortWall(st, g.title, q, i, qs.length)); break;
    case 'headsup': body = paired(termWall, g.title, st, qs); break;
    case 'type': body = paired(typedWall, g.title, st, qs); break;
    case 'truefalse': body = paired(plain, g.title, st, qs); break;
    case 'speed': body = [sprintWall(st, g.title, qs), sprintAnswers(st, g.title, qs)]; break;
    default: body = paired(choiceWall, g.title, st, qs);
  }
  return finishGame([gameCover(st, g), ...body], g.style, g.title);
}
