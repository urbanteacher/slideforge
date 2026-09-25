import type { LayoutStyle } from '../layouts';
import type { Layer, Params, Slide } from '../types';
import { gameCover } from './games';
import { BASE, EY, FOOT, HY, LEFT, ON_RIGHT, PAD, RIGHT, W, box, centred, clock, display, eyebrow, fitSize, ground, hero, rect, rgba, sizedHero, slideOf, textHeight, textWidth, txt } from './kit';

// The premium games (docs/games-premium-audit.md), each designed in the lab for its own mechanic: the
// wall is a stage — one big thing, flush inside the deck's frame, type set large — and the game's
// flow is two slides a question: the asking, then the answer in the same layout. What each says comes from SlideForge's own sample game, compiled by
// SlideForge (assets/games.json, tools/lab-games.mjs). The phones and the scoring are SlideForge's
// live session; the lab draws the wall.

/** One of SlideForge's compiled question slides: the fields the premium walls read. */
export interface PQuestion {
  type: string; question?: string; options?: string[]; correct?: number; answer?: string; explanation?: string;
  headPrompt?: string; timeLimit?: number; roundSeconds?: number;
  errorFrom?: number; errorTo?: number; fix?: string;
  fillParts?: string[]; gapAnswers?: number[];
  itemA?: string; itemB?: string; sortBins?: string[];
}
export interface PremiumGame { format: string; style: string; label: string; styleLabel: string; aim: string; howToPlay: string[]; title: string; slides: PQuestion[] }

// ─── The rules every premium wall keeps ─────────────────────────────────────
// 1. The small heading, the clock in its row (question slides only), then the question: full width,
//    sized to its length.
// 2. The answers start right under the question.
// 3. Rows and tiles are only as tall as their words, with PADV above and below; nothing stretches.
// 4. A set shares one size, as large as the question where it fits.
// 5. Words are centred in their cell.
// 6. Every game answers on the slide after its question, in the question's own layout: the reason
//    under the question, the right parts green. Nothing waits hidden on the question's slide.
// 7. Green is only for what is right, on its own rows or tiles; everything else is the theme's.
// 8. One shade for every cell, rules between, so no two cells read as a pair.

const PADV = 24;
const TIMER = (st: LayoutStyle, q: PQuestion) => (q.timeLimit ? [clock(st, 'Clock', q.timeLimit / 60, box(W - LEFT - 190, EY - 8, 190, 60))] : []);
const note = (q: PQuestion) => [q.answer ? `Answer: ${q.answer}` : '', q.explanation ?? ''].filter(Boolean).join('\n');
const BODY = (st: LayoutStyle) => ({ font: st.body, weight: '600', lineHeight: 1.15 });
const DISPLAY = (st: LayoutStyle) => ({ font: st.display, weight: st.displayWeight, lineHeight: 1.05 });

/** Rule 1, and on the answer slide rule 6's reason: what opens every wall, and where its answers start. */
function opening(st: LayoutStyle, q: PQuestion, game: string, cue: string, i: number, n: number, question: string, answer: boolean, o: { sizes?: number[]; maxH?: number } = {}) {
  const layers: Layer[] = [ground(st), eyebrow(st, `${game} · ${answer ? 'the answer' : cue} · ${i + 1} of ${n}`), ...(answer ? [] : TIMER(st, q))];
  const qn = sizedHero(st, 'Question', question, LEFT, HY, W - LEFT * 2, { sizes: o.sizes, maxH: o.maxH ?? 330, anim: answer ? { type: 'none', duration: 0 } : undefined });
  layers.push(qn.layer);
  let top = qn.bottom + 28;
  if (answer && q.explanation) {
    const p = { font: st.body, size: 44, color: st.muted, lineHeight: 1.2 };
    const h = Math.min(120, textHeight(q.explanation, W - LEFT * 2, p) + 6);
    layers.push(txt('Why', q.explanation, box(LEFT, qn.bottom + 12, W - LEFT * 2, h), p, { type: 'fade', duration: 0.6, delay: 0.3 }));
    top = qn.bottom + 12 + h + 24;
  }
  return { layers, qn, top };
}

interface Cell { text: string; mark?: string; right?: boolean }
/** Rules 3, 4, 5, 7 and 8: a set of cells laid out `cols` across under the question, each row only as
 *  tall as its words, one size for all, words centred, one shade with rules between, right cells green. */
function grid(st: LayoutStyle, cells: Cell[], top: number, o: { cols: number; face: Params; max: number; min?: number; name: string; markW?: number; lines?: number }): { layers: Layer[]; bottom: number; size: number } {
  const cols = Math.max(1, o.cols), rows = Math.ceil(cells.length / cols);
  const cw = W / cols, markW = o.markW ?? 0;
  const textW = (c: number) => cw - (c === 0 ? LEFT : PAD) - PAD - markW;
  const texts = cells.map((x) => x.text).filter(Boolean);
  const lh = Number(o.face.lineHeight ?? 1.15);
  // As large as the set allows, no more lines than it asks, and every row clear of the foot.
  const room = (FOOT - top) / Math.max(1, rows) - PADV * 2;
  const size = fitSize(texts, textW(0), Math.min(o.max * lh * (o.lines ?? 2) + 4, room), o.face, o.max, o.min ?? 44);
  const tallest = Math.max(size * lh, ...cells.map((x, k) => (x.text ? textHeight(x.text, textW(k % cols), { ...o.face, size }) : 0)));
  const rowH = Math.min((BASE - top) / Math.max(1, rows), tallest + PADV * 2);
  // Tiles centre their words; rows with a number or a handle hang them after it.
  const align = markW ? 'left' : 'center';
  const layers: Layer[] = [];
  cells.forEach((x, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    const cell = box(c * cw, top + r * rowH, cw, rowH);
    const a = { type: 'fade' as const, duration: 0.5, delay: 0.25 + 0.04 * k };
    const ink = x.right ? ON_RIGHT : st.ink;
    const ruleCol = x.right ? 'rgba(255,255,255,0.3)' : rgba(st.ink, 0.14);
    const padL = c === 0 ? LEFT : PAD;
    layers.push(rect(`${o.name} ${k + 1}`, cell, x.right ? RIGHT : rgba(st.ink, 0.06), a));
    if (c > 0) layers.push(rect(`${o.name} ${k + 1} — rule`, box(cell.x, cell.y, 2, cell.h), ruleCol, a));
    if (r > 0) layers.push(rect(`${o.name} ${k + 1} — rule across`, box(cell.x, cell.y, cell.w, 2), ruleCol, a));
    if (x.mark && markW) layers.push(centred(`${o.name} ${k + 1} — mark`, x.mark, box(cell.x + padL, cell.y, markW, cell.h), { ...o.face, size, color: x.right ? ON_RIGHT : st.accent, lineHeight: 1 }, a, 0, 0));
    if (x.text) layers.push(centred(`${o.name} ${k + 1} — words`, x.text, box(cell.x + padL + markW, cell.y, cell.w - padL - markW, cell.h), { ...o.face, size, color: ink, align }, { ...a, delay: a.delay + 0.05 }, 0, PAD));
  });
  return { layers, bottom: top + rows * rowH, size };
}

// ─── Spot the error ─────────────────────────────────────────────────────────
/** The passage is the stage. The answer: the passage again, the reason, then one green row — the
 *  wrong words struck through, the arrow in the middle, the fix. */
export function spotWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  // The passage keeps room under it for the reason and the answer row, so both slides set it alike.
  const o = opening(st, q, 'Spot the error', 'find the one mistake', i, n, q.question ?? '', answer, { sizes: [140, 128, 120, 112, 104], maxH: FOOT - HY - 340 });
  if (answer) {
    const words = q.options ?? [];
    const wrong = words.slice(q.errorFrom ?? q.correct ?? 0, (q.errorTo ?? q.errorFrom ?? q.correct ?? 0) + 1).join(' ').replace(/[,.;:]$/, '');
    const MID = W / 2, GAP = 80;
    const face = { ...DISPLAY(st), lineHeight: 1 };
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
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, note(q));
}

// ─── Ranking ────────────────────────────────────────────────────────────────
/** A fixed shuffle, so the wall never shows the answer as the starting order. */
const shuffled = <T,>(xs: T[]) => xs.map((x, k) => ({ x, k: (k * 7 + 3) % (xs.length + 2) })).sort((a, b) => a.k - b.k).map((o) => o.x);

/** The items as full-width rows in a mixed order; the answer has them in order, green, numbered. */
export function rankingWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const items = (q.options ?? []).slice(0, 6);
  const o = opening(st, q, 'Ranking', 'put them in order', i, n, q.question ?? '', answer);
  const list = answer ? items : shuffled(items);
  o.layers.push(...grid(st, list.map((t, k) => ({ text: t, mark: answer ? String(k + 1) : '⋮⋮', right: answer })), o.top, { cols: 1, face: BODY(st), max: Math.min(o.qn.size, 88), name: answer ? 'Order' : 'Item', markW: 130, lines: 1 }).layers);
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, note(q) || items.map((it, k) => `${k + 1}. ${it}`).join('\n'));
}

// ─── True / false showdown ──────────────────────────────────────────────────
/** The statement, then TRUE and FALSE side by side at the statement's size. The room votes, sees its
 *  split and may switch once on the phones; the answer lights the true one. */
export function showdownWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const opts = (q.options ?? ['True', 'False']).slice(0, 2);
  const o = opening(st, q, 'True or false', 'vote, then hold', i, n, q.question ?? '', answer, { sizes: [140, 120, 104, 88], maxH: 360 });
  o.layers.push(...grid(st, opts.map((t, k) => ({ text: t.toUpperCase(), right: answer && k === q.correct })), o.top, { cols: 2, face: DISPLAY(st), max: o.qn.size, name: 'Choice', lines: 1 }).layers);
  const hold = 'After the vote: show the room its split; each phone may switch once. Then Next for the answer.';
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, answer ? note(q) : hold);
}

// ─── Predict the outcome ────────────────────────────────────────────────────
/** The scenario, then the futures as full-width rows, letter and words at one size. The phones commit
 *  and say how sure; the answer lights what happens, with why. */
export function predictWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const opts = (q.options ?? []).slice(0, 4);
  const o = opening(st, q, 'Predict the outcome', 'commit, and say how sure', i, n, q.question ?? '', answer, { sizes: [120, 104, 92, 80] });
  o.layers.push(...grid(st, opts.map((t, k) => ({ text: t, mark: 'ABCD'[k], right: answer && k === q.correct })), o.top, { cols: 1, face: BODY(st), max: Math.min(o.qn.size, 88), name: 'Future', markW: 130 }).layers);
  const lock = 'When the room has committed: lock the predictions and show the split, then show what happens. Next gives the answer.';
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, answer ? note(q) : lock);
}

// ─── Fill the gaps ──────────────────────────────────────────────────────────
/** The passage with each gap a line, and the word bank as tiles under it. The answer: the passage, the
 *  reason, and a green row per gap in the passage's order. */
export function fillWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const parts = q.fillParts ?? [q.question ?? ''];
  const passage = parts.map((p, k) => (k < parts.length - 1 ? `${p}________` : p)).join('').replace(/\s+/g, ' ').trim();
  const bank = (q.options ?? []).slice(0, 6);
  const answers = (q.gapAnswers ?? []).map((k) => bank[k] ?? '');
  const o = opening(st, q, 'Fill the gaps', 'a word from the bank for each', i, n, passage, answer, { sizes: [104, 96, 88, 80], maxH: 340 });
  const cells: Cell[] = answer ? answers.map((t, k) => ({ text: t, mark: String(k + 1), right: true })) : bank.map((t) => ({ text: t }));
  o.layers.push(...grid(st, cells, o.top, { cols: answer ? 1 : bank.length <= 3 ? Math.max(1, bank.length) : 3, face: DISPLAY(st), max: o.qn.size, name: answer ? 'Gap' : 'Word', markW: answer ? 130 : 0, lines: 1 }).layers);
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, note(q));
}

// ─── Odd one out ────────────────────────────────────────────────────────────
/** Four items as tiles two by two, at the question's size. The answer lights the odd one, with its
 *  rule; anyone who picked another defends it. */
export function oddOneWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const items = (q.options ?? []).slice(0, 4);
  // One size for the question and the items: as large as the items allow, no larger than a heading.
  const size = Math.min(120, fitSize(items, W / 2 - LEFT - PAD, 200, DISPLAY(st), 150, 60));
  const o = opening(st, q, 'Odd one out', 'vote, then defend', i, n, q.headPrompt ?? q.question ?? '', answer, { sizes: [size, size - 8, size - 16], maxH: 300 });
  o.layers.push(...grid(st, items.map((t, k) => ({ text: t, right: answer && k === q.correct })), o.top, { cols: 2, face: DISPLAY(st), max: size, name: 'Item', lines: 1 }).layers);
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, answer ? `${note(q)}\n\nPicked another? Defend it with a rule of your own.` : note(q));
}

// ─── Compare & contrast ─────────────────────────────────────────────────────
/** The statements as tiles under the question, the three bins as a strip under them. The answer:
 *  each statement in a green row in its bin's column, the rows level across, the same strip below. */
export function compareWall(st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer = false): Slide {
  const a = q.itemA ?? 'A', b = q.itemB ?? 'B';
  const bins = q.sortBins?.length === 3 ? q.sortBins : [`${a} only`, 'Both', `${b} only`];
  const placed = new Map<string, string[]>(bins.map((x) => [x, []]));
  for (const pair of String(q.answer ?? '').split(' · ')) {
    const [stmt, bin] = pair.split(' → ').map((s) => s.trim());
    if (stmt && bin && placed.has(bin)) placed.get(bin)!.push(stmt);
  }
  const statements = (q.options ?? []).slice(0, 9);
  const o = opening(st, q, 'Compare & contrast', 'sort each one', i, n, `${a}, ${b} — or both?`, answer, { sizes: [120, 104, 92, 84], maxH: 220 });
  const sorted = bins.map((x) => placed.get(x) ?? []);
  const rows = Math.max(1, ...sorted.map((c) => c.length));
  const cells: Cell[] = answer
    ? Array.from({ length: rows * 3 }, (_, k) => { const t = sorted[k % 3][Math.floor(k / 3)] ?? ''; return { text: t, right: !!t }; })
    : statements.map((t) => ({ text: t }));
  const set = grid(st, cells, o.top, { cols: 3, face: BODY(st), max: 72, min: 40, name: answer ? 'Sorted' : 'Statement' });
  o.layers.push(...set.layers);
  // The bins: a solid strip of the ink right under the set, the names reversed out of it.
  const STRIP = 96, y = Math.min(BASE - STRIP, set.bottom + 14);
  bins.forEach((bin, k) => {
    const x0 = Math.round((k * W) / 3), x1 = Math.round(((k + 1) * W) / 3);
    const cell = box(x0, y, x1 - x0, STRIP);
    o.layers.push(
      rect(`${bin} — bin`, cell, st.ink, { type: 'fade', duration: 0.5, delay: 0.3 }),
      ...(k > 0 ? [rect(`${bin} — bin rule`, box(x0, y, 2, STRIP), rgba(st.ground, 0.3), { type: 'fade', duration: 0.5, delay: 0.3 })] : []),
      centred(`${bin} — name`, bin, cell, { font: st.body, weight: '700', size: 44, color: st.ground, lineHeight: 1, align: 'center' }, { type: 'fade', duration: 0.5, delay: 0.35 }, k === 0 ? LEFT : PAD),
    );
  });
  return slideOf(`${g.label} · ${i + 1}${answer ? ' · the answer' : ''}`, o.layers, st, note(q));
}

// ─── Beat the clock ─────────────────────────────────────────────────────────
/** The sprint: the wall is the clock, as big as the slide takes, and one line of what to do. Each
 *  phone runs its own stream; the answers follow on their own slide. */
export function sprintWall(st: LayoutStyle, g: PremiumGame, qs: PQuestion[]): Slide {
  const secs = qs.find((q) => q.roundSeconds)?.roundSeconds ?? 60;
  const size = Math.min(640, BASE - HY - 60);
  const layers: Layer[] = [
    ground(st),
    eyebrow(st, `Beat the clock · ${qs.length} questions`),
    clock(st, 'Round clock', secs / 60, box(LEFT, HY, size, size), { type: 'zoomIn', duration: 0.6 }, true),
    hero(st, 'Go', 'Answer on your phone — as many as you can.', box(LEFT + size + 100, HY + 40, W - LEFT * 2 - size - 100, 420), 120),
    txt('Rule', 'Fast, correct answers score more. The clock is the same for everyone.', box(LEFT + size + 100, HY + 480, W - LEFT * 2 - size - 100, 150), { font: st.body, size: 50, color: st.muted, lineHeight: 1.25 }, { type: 'fade', duration: 0.6, delay: 0.3 }),
  ];
  return slideOf(`${g.label} · the sprint`, layers, st, qs.map((q, k) => `${k + 1}. ${q.question} — ${q.options?.[q.correct ?? -1] ?? ''}`).join('\n'));
}

/** After the sprint: each question beside its answer, the answers green. */
export function sprintAnswers(st: LayoutStyle, g: PremiumGame, qs: PQuestion[]): Slide {
  const list = qs.slice(0, 6);
  const layers: Layer[] = [ground(st), eyebrow(st, 'Beat the clock · the answers')];
  const qn = sizedHero(st, 'Heading', 'How did the room do?', LEFT, HY, W - LEFT * 2, { sizes: [112] });
  layers.push(qn.layer);
  const cells: Cell[] = list.flatMap((q) => [{ text: q.question ?? '' }, { text: q.options?.[q.correct ?? -1] ?? '', right: true }]);
  layers.push(...grid(st, cells, qn.bottom + 28, { cols: 2, face: BODY(st), max: 72, min: 40, name: 'Answer' }).layers);
  return slideOf(`${g.label} · the answers`, layers, st);
}

// ─── The set ────────────────────────────────────────────────────────────────
const WALLS: Record<string, (st: LayoutStyle, g: PremiumGame, q: PQuestion, i: number, n: number, answer?: boolean) => Slide> = {
  'spot-the-error': spotWall, ranking: rankingWall, 'true-false': showdownWall, 'predict-outcome': predictWall,
  'fill-in-the-blanks': fillWall, 'odd-one-out': oddOneWall, 'compare-contrast': compareWall,
};
export const PREMIUM = ['spot-the-error', 'ranking', 'true-false', 'predict-outcome', 'fill-in-the-blanks', 'odd-one-out', 'compare-contrast', 'beat-the-clock'];

/** A premium game as slides: its cover (the game's own How to play), then each question and, the slide
 *  after it, its answer. */
export function premiumSlides(g: PremiumGame, st: LayoutStyle): Slide[] {
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
  if (g.format === 'beat-the-clock') return [cover, sprintWall(st, g, qs), sprintAnswers(st, g, qs)];
  const wall = WALLS[g.format] ?? spotWall;
  return [cover, ...qs.flatMap((q, i) => [wall(st, g, q, i, qs.length), wall(st, g, q, i, qs.length, true)])];
}
