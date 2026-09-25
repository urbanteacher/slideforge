import { createLayer } from '../defaults';
import type { LayoutStyle } from '../layouts';
import type { Anim, Box, Layer, Slide } from '../types';
import {
  FACE, PADV, bins, buttonsWall, choiceWall, finishGame, gameCover, grid, named, note, opening, paired, showcaseSlides, SHOWCASE, tag, tagGame, trueFalseWall, typedWall,
  type Cell, type GameQuestion, type ShowcaseGame, type Wall,
} from './games';
import { BASE, EY, FOOT, LEFT, ON_RIGHT, PAD, RIGHT, W, box, centred, clock, fitSize, rect, rgba, slideOf, textHeight, txt } from './kit';

// SlideForge's other game formats, each built in the lab to its own playbook (js/playbook.js): its
// phases are its slides, in order, and what the room does in each is what the wall shows. A number
// line to estimate on, a timeline that grows, a quiz bowl board whose cells open their questions, a
// boss with a health bar, a race track, memory cards, bingo calls, a word that drips in letter by
// letter, a cube that rolls. They keep the rules the other games keep (games.ts): the heading line,
// the question under it, sets sized to their words, one shade, green only for what is right, and
// the answer on the slide after.

/** The fields these formats read, beyond a plain question. */
interface Q extends GameQuestion {
  min?: number; max?: number; step?: number; target?: number; tolerance?: number; unit?: string;
  timeline?: { label: string; year: number }[];
  passage?: string; clues?: string; hint?: string; word?: string; preReveal?: number;
  term?: string; category?: string; difficulty?: string; bossDamage?: number; challenge?: string; prompt?: string;
  itemA?: string; itemB?: string;
}
interface Pair { term: string; definition: string }
interface Boards {
  lowstakesBoard?: { timeLimit?: number; items: { question: string; answer: string }[] };
  bowlBoard?: { categories: string[]; values: number[]; cells: { category: string; value: number; row: number; col: number; questions: { question: string; answer: string }[] }[] };
  memoryBoard?: { kind: string; studySeconds?: number; participants?: string[]; pairs: Pair[] };
  bingoBoard?: { gridSize?: number; participants?: string[]; pool: Pair[] };
  recallBoard?: { words: string[]; studySeconds?: number; recallSeconds?: number };
  subtitle?: string; type?: string;
}

const fade = (delay = 0.3): Partial<Anim> => ({ type: 'fade', duration: 0.5, delay });
const bottomOf = (layers: Layer[]) => Math.max(0, ...layers.filter((l) => l.name !== 'Ground' && l.box && !l.params.hfSlot).map((l) => l.box!.y + l.box!.h));
const TEAMS = ['Red', 'Blue', 'Green', 'Yellow'];
/** Name a layer for Morph: the layer with the same name on the next slide is where it travels. */
const keyed = (l: Layer, key: string) => { l.params.morph = key; return l; };


/** Every layer of a set's cell `k` (its tile, rules and words) takes you to `to` when clicked. */
function linkCell(layers: Layer[], name: string, k: number, to: Slide) {
  const re = new RegExp(`^${name} ${k + 1}( —|$)`);
  layers.filter((l) => re.test(l.name)).forEach((l) => { l.interact = { ...l.interact, click: 'goto', gotoId: to.id }; });
}
/** A button in the heading row, where a question's clock would sit: a solid ink tab, its words
 *  reversed out, that takes you to `to`. */
function button(st: LayoutStyle, label: string, to: Slide, w = 280): Layer {
  return createLayer('shape', {
    name: `${label} — button`, box: box(W - LEFT - w, EY - 12, w, 64), anim: fade(0.4),
    params: { shape: 'rect', radius: 0, fill: st.ink, strokeWidth: 0, label, labelColor: st.ground, labelSize: 32, labelFont: st.body, labelWeight: '700' },
    interact: { click: 'goto', gotoId: to.id },
  });
}
/** One green row under what is there: the answer, as big as its words allow. */
const answerRow = (st: LayoutStyle, text: string, top: number, max = 88) => grid(st, [{ text, right: true }], top, { cols: 1, max, name: 'Answer', lines: 2 }).layers;
/** A quiet row: where the room's answer goes, or what to do. */
const quietRow = (st: LayoutStyle, text: string, top: number) => grid(st, [{ text, quiet: true }], top, { cols: 1, max: 52, name: 'Prompt', lines: 1 }).layers;

// ─── A number line: Slider, Time traveler ───────────────────────────────────
/** estimate → reveal band. The line from min to max under the question, marked in fifths; the answer
 *  puts the true value on it as a green pin with the band that scores around it. On a timeline the
 *  events already placed stay on the line, so it grows across the game. */
function lineWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false, timeline = false): Slide {
  const game = timeline ? 'Time traveler' : 'Estimate';
  const o = opening(st, q, tag(game, timeline ? 'place it in time' : 'place it on the line', i, n, answer), q.question ?? '', answer, { sizes: [112, 104, 96, 88], maxH: 240 });
  const min = q.min ?? 0, max = q.max ?? 100, span = max - min || 1;
  const x0 = LEFT, x1 = W - LEFT, at = (v: number) => x0 + ((Math.min(max, Math.max(min, v)) - min) / span) * (x1 - x0);
  const unit = q.unit && q.unit.length <= 2 ? q.unit : '';
  // The line sits at one height on both slides, clear of the reason and the pin above it, with room
  // under its values for the events already placed.
  const y = Math.min(FOOT - 270, o.qn.bottom + 360);
  const L = o.layers;
  L.push(rect('Line', box(x0, y - 3, x1 - x0, 6), rgba(st.ink, 0.35), { type: 'wipeRight', duration: 0.7, delay: 0.2 }));
  for (let k = 0; k <= 4; k++) {
    const v = Math.round((min + (span * k) / 4) / (q.step ?? 1)) * (q.step ?? 1);
    L.push(
      rect(`Tick ${k + 1}`, box(at(v) - 1, y - 18, 2, 36), rgba(st.ink, 0.35), fade(0.3)),
      txt(`Tick ${k + 1} — value`, `${v}${unit}`, box(Math.min(x1 - 240, Math.max(x0, at(v) - 120)), y + 30, 240, 56), { font: st.body, weight: '600', size: 40, color: st.muted, align: k === 0 ? 'left' : k === 4 ? 'right' : 'center' }, fade(0.35)),
    );
  }
  // The events already on the timeline: a dot each on the line, its name and year under the values.
  (q.timeline ?? []).forEach((e, k) => {
    const ex = at(e.year);
    L.push(
      createLayer('shape', { name: `Placed ${k + 1}`, box: box(ex - 14, y - 14, 28, 28), params: { shape: 'ellipse', fill: st.ink, strokeWidth: 0 }, anim: fade(0.3) }),
      rect(`Placed ${k + 1} — stem`, box(ex - 1, y, 2, 96 + (k % 2) * 92), rgba(st.ink, 0.35), fade(0.3)),
      txt(`Placed ${k + 1} — label`, `${e.year} · ${e.label}`, box(Math.min(x1 - 480, Math.max(x0, ex - 240)), y + 100 + (k % 2) * 92, 480, 84), { font: st.body, weight: '600', size: 32, color: st.ink, lineHeight: 1.15, align: 'center' }, fade(0.35)),
    );
  });
  if (answer && q.target != null) {
    const t = at(q.target), tol = q.tolerance ?? 0;
    const said = `${q.target}${unit}`;
    const tw = Math.max(240, Math.min(560, said.length * 40 + 80));
    // The band that scores: kept on the slide even at no tolerance, so the Game panel can widen it.
    L.push({ ...rect('Scoring band', box(at(q.target - tol), y - 36, Math.max(8, at(q.target + tol) - at(q.target - tol)), 72), rgba(RIGHT, 0.3), fade(0.4)), visible: tol > 0 });
    L.push(
      rect('Pin', box(t - 4, y - 120, 8, 156), RIGHT, { type: 'rise', duration: 0.5, delay: 0.5 }),
      rect('Value', box(Math.min(x1 - tw, Math.max(x0, t - tw / 2)), y - 214, tw, 94), RIGHT, { type: 'rise', duration: 0.5, delay: 0.5 }),
      centred('Value — words', said, box(Math.min(x1 - tw, Math.max(x0, t - tw / 2)), y - 214, tw, 94), { ...FACE(st), size: 60, color: ON_RIGHT, align: 'center' }, { type: 'rise', duration: 0.5, delay: 0.5 }, 16, 16),
    );
  }
  return slideOf(named(name, i, answer), L, st, answer ? note(q) : 'Every phone places its answer on the line. Next shows where it really goes.');
}

/** The scoring band on a number line's answer, as wide as the tolerance says, on the line it is drawn on. */
export function scoringBand(s: Slide) {
  const range = s.game?.settings.range, tol = s.game?.settings.tolerance ?? 0;
  const line = s.layers.find((l) => l.name === 'Line'), band = s.layers.find((l) => l.name === 'Scoring band');
  if (!range || !line?.box || !band?.box) return;
  const [min, max, target] = range, span = max - min || 1;
  const at = (v: number) => line.box!.x + ((Math.min(max, Math.max(min, v)) - min) / span) * line.box!.w;
  band.box.x = Math.round(at(target - tol));
  band.box.w = Math.max(8, Math.round(at(target + tol) - at(target - tol)));
  band.visible = tol > 0;
}

// ─── Low-stakes quiz ────────────────────────────────────────────────────────
/** ready → quiz (write) → reveal answers. Every question on the board at once and the quiz clock in
 *  the heading row; the answers slide sets each answer, green, beside its question. */
function lowStakes(st: LayoutStyle, name: string, b: NonNullable<Boards['lowstakesBoard']>, answer: boolean): Slide {
  const items = b.items.slice(0, 8);
  const o = opening(st, { timeLimit: b.timeLimit }, `Low-stakes quiz · ${answer ? 'the answers' : 'write on paper — no notes'}`, answer ? 'How did you do?' : 'Write your answers on paper.', answer, { sizes: [112, 104], maxH: 240 });
  const cells: Cell[] = answer ? items.flatMap((it, k) => [{ text: it.question, mark: String(k + 1), id: `q-${k}` }, { text: it.answer, right: true }]) : items.map((it, k) => ({ text: it.question, mark: String(k + 1), id: `q-${k}` }));
  o.layers.push(...grid(st, cells, o.top, { cols: answer ? 2 : 1, max: answer ? 52 : 64, min: 36, name: 'Question', marks: true }).layers);
  const s = slideOf(`${name}${answer ? ' · the answers' : ''}`, o.layers, st, items.map((it, k) => `${k + 1}. ${it.question} — ${it.answer}`).join('\n'));
  return answer ? tagGame(s, 'end') : tagGame(s, 'board', undefined, undefined, 'Quiz time', { seconds: b.timeLimit ?? 180 });
}

// ─── Quiz bowl ──────────────────────────────────────────────────────────────
/** setup → category board → end. The board: the categories as a strip, the values in a grid under
 *  them; a cell, clicked, opens its question. Each question is answered aloud and marked by the
 *  teacher; its answer follows, with the way back to the board. */
function quizBowl(st: LayoutStyle, g: ShowcaseGame, b: NonNullable<Boards['bowlBoard']>): Slide[] {
  const cats = b.categories;
  const cells = [...b.cells].sort((p, q) => p.row - q.row || p.col - q.col);
  const o = opening(st, {}, 'Quiz bowl · pick a category and a value', 'Pick a category and a value.', false, { sizes: [112, 104], maxH: 200 });
  const board = slideOf(`${g.label} · the board`, o.layers, st, 'Click a cell to open its question. Answer aloud; the teacher marks Correct (the value) or Wrong. Back to the board from the answer.');
  o.layers.push(...bins(st, cats, o.top));
  const set = grid(st, cells.map((c) => ({ text: String(c.value) })), o.top + 96, { cols: cats.length, max: 120, name: 'Cell', lines: 1 });
  o.layers.push(...set.layers);
  const out: Slide[] = [board];
  cells.forEach((c, k) => {
    const item = c.questions[0];
    if (!item) return;
    const head = (answer: boolean) => `Quiz bowl · ${c.category} · ${c.value}${answer ? ' · the answer' : ''}`;
    const asked = opening(st, {}, head(false), item.question, false);
    asked.layers.push(button(st, '← Board', board), ...quietRow(st, 'Answer aloud — your teacher marks it', asked.top));
    const said = opening(st, {}, head(true), item.question, true);
    said.layers.push(button(st, '← Board', board), ...answerRow(st, item.answer, said.top));
    const qs = tagGame(slideOf(`${g.label} · ${c.category} ${c.value}`, asked.layers, st, `Answer: ${item.answer}`), 'question', undefined, String(k), undefined, { points: c.value });
    out.push(qs, tagGame(slideOf(`${g.label} · ${c.category} ${c.value} · the answer`, said.layers, st, `Correct: award ${c.value}. Wrong: 0, and the cell is still used.`), 'answer', undefined, String(k), undefined, { points: c.value }));
    linkCell(board.layers, 'Cell', k, qs);
  });
  board.layers = o.layers;
  return out;
}

// ─── Boss battle ────────────────────────────────────────────────────────────
/** The boss's health: a bar the full width, a segment per question as wide as the damage it deals.
 *  The question on the wall is lit — the accent while it is asked, green on its answer. */
export const DAMAGE: Record<string, number> = { easy: 1, medium: 2, hard: 3, boss: 5 };
const hpLabel = (difficulty: string | undefined, dmg: number, big: boolean) => big ? `${(difficulty ?? '').toUpperCase()}\n${dmg} HP` : `${(difficulty ?? '').toUpperCase()} · ${dmg}`;
function bossBar(st: LayoutStyle, qs: Q[], current: number, answer: boolean, y: number, H = 72): Layer[] {
  const total = qs.reduce((m, q) => m + (q.bossDamage ?? 1), 0) || 1;
  const labelSize = H > 100 ? 44 : 30;
  let x = 0;
  return qs.flatMap((q, k) => {
    const dmg = q.bossDamage ?? 1, w = (W * dmg) / total;
    const lit = k === current;
    const fill = lit ? (answer ? RIGHT : st.accent) : k < current ? rgba(st.ink, 0.04) : rgba(st.ink, 0.1);
    const ink = lit ? (answer ? ON_RIGHT : st.ground) : k < current ? rgba(st.ink, 0.35) : st.ink;
    const cell = box(x, y, w, H);
    x += w;
    return [
      keyed(rect(`HP ${k + 1}`, cell, fill, { type: 'wipeRight', duration: 0.6, delay: 0.2 + 0.05 * k }), `hp-${k}`),
      ...(k > 0 ? [keyed(rect(`HP ${k + 1} — rule`, box(cell.x, y, 3, H), st.ground, fade(0.2)), `hp-${k}:rule`)] : []),
      keyed(centred(`HP ${k + 1} — damage`, hpLabel(q.difficulty, dmg, H > 100), cell, { font: st.body, weight: '700', size: labelSize, color: ink, align: 'center', tracking: 0.08 }, fade(0.3), 12, 12), `hp-${k}:label`),
    ];
  });
}
/** Lay every boss bar in a game out again from its questions' damage, after one is changed in the
 *  Game panel: each segment as wide as its hit, its label its difficulty and damage, and the intro's
 *  total with them. */
export function relayBoss(slides: Slide[]) {
  const qs = slides.filter((s) => s.game?.role === 'question');
  const dmg = qs.map((s) => s.game!.settings.damage ?? 1), diff = qs.map((s) => s.game!.settings.difficulty);
  const total = dmg.reduce((m, d) => m + d, 0) || 1;
  for (const s of slides) {
    let x = 0;
    dmg.forEach((d, k) => {
      const w = (W * d) / total;
      for (const l of s.layers) {
        if (!l.box) continue;
        if (l.name === `HP ${k + 1}`) { l.box.x = Math.round(x); l.box.w = Math.round(w); }
        else if (l.name === `HP ${k + 1} — rule`) l.box.x = Math.round(x);
        else if (l.name === `HP ${k + 1} — damage`) { l.box.x = Math.round(x + 12); l.box.w = Math.round(w - 24); l.params.text = hpLabel(diff[k], d, l.box.h > 100); }
      }
      x += w;
    });
    const hero = s.layers.find((l) => l.name === 'Question' && /^The boss has \d+ HP\.$/.test(String(l.params.text)));
    if (hero) hero.params.text = `The boss has ${total} HP.`;
  }
}
/** A question with a strip under it — the boss's health, the race's steps — and its options under that. */
function stripWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer: boolean, heading: string, strip: (y: number) => Layer[], notes: string): Slide {
  const o = opening(st, q, heading, q.question ?? '', answer, { sizes: [104, 96, 88, 80], maxH: 240 });
  o.layers.push(...strip(o.top));
  const opts = (q.options ?? []).slice(0, 4);
  o.layers.push(...grid(st, opts.map((t, k) => ({ text: t, mark: 'ABCD'[k], right: answer && k === q.correct })), o.top + 72 + 20, { cols: 1, max: Math.min(o.qn.size, 80), name: 'Option', marks: true }).layers);
  return slideOf(named(name, i, answer), o.layers, st, answer ? note(q) : notes);
}
/** The boss itself: its face, as it stands — full of fight, weakening, beaten. */
const bossFace = (st: LayoutStyle, face: string, y: number, size = 300) =>
  txt('Boss', face, box(W - LEFT - size, y, size, size), { font: st.body, size: size * 0.8, lineHeight: 1, align: 'right', fit: 'shrink' }, { type: 'pop', duration: 0.6, delay: 0.3 });
function bossBattle(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide[] {
  const total = qs.reduce((m, q) => m + (q.bossDamage ?? 1), 0);
  const faceW = 320;
  const intro = opening(st, {}, 'Boss battle · the boss', `The boss has ${total} HP.`, false, { sizes: [150, 132], width: W - LEFT * 2 - faceW });
  // The boss is its health: the bar as big as the slide gives it, a segment per question.
  intro.layers.push(bossFace(st, '😈', intro.qn.layer.box!.y - 40, faceW), ...bossBar(st, qs, -1, false, Math.max(intro.top, intro.qn.layer.box!.y + faceW - 20), 220));
  intro.layers.push(...quietRow(st, 'A right answer hits it for that question’s damage. Bring it to zero before the questions run out.', bottomOf(intro.layers) + 28));
  // Each question: the boss's bar right under it, this question's hit lit, and the options under that.
  const walls = qs.flatMap((q, i) => [false, true].map((answer) => tagGame(
    stripWall(st, g.label, q, i, qs.length, answer, tag('Boss battle', `${q.difficulty ?? 'a'} hit · ${q.bossDamage ?? 1} damage`, i, qs.length, answer), (y) => bossBar(st, qs, i, answer, y), `A right answer hits the boss for ${q.bossDamage ?? 1}.`),
    answer ? 'answer' : 'question', q, String(i))));
  const end = opening(st, {}, 'Boss battle · the end', 'Defeated — or did the boss survive?', true, { sizes: [132, 120], width: W - LEFT * 2 - faceW });
  end.layers.push(bossFace(st, '🏆', end.qn.layer.box!.y - 40, faceW), ...bossBar(st, qs, qs.length, false, Math.max(end.top, end.qn.layer.box!.y + faceW - 20), 220));
  return [slideOf(`${g.label} · the boss`, intro.layers, st), ...walls, tagGame(slideOf(`${g.label} · the end`, end.layers, st, 'HP left at zero: defeated. Any left: the boss survived.'), 'end')];
}

// ─── Horse race ─────────────────────────────────────────────────────────────
/** The race on every question: its steps as a strip, the one this question moves teams onto lit,
 *  the steps run already set back, the finish at the end. */
function raceStrip(st: LayoutStyle, steps: number, current: number, answer: boolean, y: number): Layer[] {
  const H = 72, w = W / steps;
  return Array.from({ length: steps }, (_, k) => {
    const lit = k === current;
    const fill = lit ? (answer ? RIGHT : st.accent) : k < current ? rgba(st.ink, 0.04) : rgba(st.ink, 0.1);
    const ink = lit ? (answer ? ON_RIGHT : st.ground) : k < current ? rgba(st.ink, 0.35) : st.ink;
    const cell = box(k * w, y, w, H);
    return [
      keyed(rect(`Step ${k + 1}`, cell, k === steps - 1 && !lit ? st.ink : fill, { type: 'wipeRight', duration: 0.5, delay: 0.2 + 0.04 * k }), `step-${k}`),
      ...(k > 0 ? [keyed(rect(`Step ${k + 1} — rule`, box(cell.x, y, 3, H), st.ground, fade(0.2)), `step-${k}:rule`)] : []),
      centred(`Step ${k + 1} — name`, k === steps - 1 ? 'FINISH' : `STEP ${k + 1}`, cell, { font: st.body, weight: '700', size: 30, color: k === steps - 1 && !lit ? st.ground : ink, align: 'center', tracking: 0.1 }, fade(0.3), 12, 12),
    ];
  }).flat();
}
/** The track: a lane per team, the steps across, the finish line at the end. The start has every
 *  horse on the line; the finish asks who is furthest. */
function track(st: LayoutStyle, g: ShowcaseGame, steps: number, start: boolean): Slide {
  const o = opening(st, {}, `Horse race · ${start ? 'on your marks' : 'the finish'}`, start ? 'A right answer moves your team one step.' : 'Who crossed the line — or got furthest?', !start, { sizes: [120, 104], maxH: 220 });
  const L = o.layers, teams = TEAMS, NAME = 300, FIN = 24;
  const head = 64, top = o.top, laneH = Math.min(190, (FOOT - top - head) / teams.length);
  const stepW = (W - NAME - FIN) / steps;
  for (let s = 0; s < steps; s++) L.push(centred(`Step ${s + 1}`, s === steps - 1 ? 'FINISH' : String(s + 1), box(NAME + s * stepW, top, stepW, head), { font: st.body, weight: '700', size: 32, color: st.muted, align: 'center', tracking: 0.1 }, fade(0.2), 0, 0));
  teams.forEach((team, k) => {
    const y = top + head + k * laneH;
    L.push(rect(`${team} — lane`, box(0, y, W, laneH), rgba(st.ink, 0.06), { type: 'wipeRight', duration: 0.6, delay: 0.2 + 0.06 * k }));
    if (k > 0) L.push(rect(`${team} — lane rule`, box(0, y, W, 2), rgba(st.ink, 0.14), fade(0.2)));
    L.push(centred(`${team} — name`, team, box(0, y, NAME, laneH), { ...FACE(st), size: 48, color: st.ink }, fade(0.3), LEFT, 12));
    for (let s = 1; s < steps; s++) L.push(rect(`${team} — step ${s}`, box(NAME + s * stepW, y, 2, laneH), rgba(st.ink, 0.1), fade(0.2)));
    if (start) L.push(createLayer('shape', { name: `${team} — horse`, box: box(NAME - laneH * 0.35, y + laneH * 0.15, laneH * 0.7, laneH * 0.7), anim: { type: 'pop', duration: 0.5, delay: 0.4 + 0.08 * k },
      params: { shape: 'ellipse', fill: st.accent, strokeWidth: 0, label: team[0], labelColor: st.ground, labelSize: 0, labelFont: st.body, labelWeight: '800' } }));
  });
  L.push(rect('Finish line', box(W - FIN, top + head, FIN, laneH * teams.length), st.ink, { type: 'wipeUp', duration: 0.6, delay: 0.3 }));
  return slideOf(`${g.label} · ${start ? 'the start' : 'the finish'}`, L, st, start ? 'Each team has a lane. A right answer (or the team’s majority) moves it one step; first to the finish wins.' : 'First to the finish wins; otherwise the team furthest along.');
}
function horseRace(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide[] {
  const steps = Math.max(3, qs.length);
  const walls = qs.flatMap((q, i) => [false, true].map((answer) => tagGame(
    stripWall(st, g.label, q, i, qs.length, answer, tag('Horse race', 'right answers move one step', i, qs.length, answer), (y) => raceStrip(st, steps, i, answer, y), 'Teams that get it right move onto the lit step.'),
    answer ? 'answer' : 'question', q, String(i))));
  return [track(st, g, steps, true), ...walls, tagGame(track(st, g, steps, false), 'end')];
}

// ─── Memory: Memory flip, Memory match, Knowledge flip ──────────────────────
interface Face { main: string; sub?: string; quiet?: boolean; id?: string }
/** Cards as tiles in a grid, each its main words over its small ones. Returns the layers, and each
 *  card's tile name so a click can be given to it. */
function cardGrid(st: LayoutStyle, faces: Face[], top: number, cols: number, name = 'Card'): Layer[] {
  const rows = Math.ceil(faces.length / cols), cw = W / cols;
  const main = { ...FACE(st), lineHeight: 1.1 }, sub = { font: st.body, weight: '400', lineHeight: 1.2 };
  const tw = (c: number) => cw - (c === 0 ? LEFT : PAD) - PAD;
  const mainSize = fitSize(faces.map((f) => f.main), tw(0), 150, main, 88, 44);
  const subSize = 38;
  const subH = Math.max(0, ...faces.map((f, k) => (f.sub ? textHeight(f.sub, tw(k % cols), { ...sub, size: subSize }) + 12 : 0)));
  const mainH = Math.max(mainSize * 1.1, ...faces.map((f, k) => textHeight(f.main, tw(k % cols), { ...main, size: mainSize })));
  // A card is a card: never flatter than a third of its width, and never past the foot.
  const rowH = Math.min((FOOT - top) / rows, Math.max(cw / 3, mainH + subH + PADV * 3));
  const L: Layer[] = [];
  faces.forEach((f, k) => {
    const c = k % cols, r = Math.floor(k / cols), padL = c === 0 ? LEFT : PAD;
    const cell = box(c * cw, top + r * rowH, cw, rowH);
    const a = fade(0.25 + 0.05 * k);
    const tile = rect(`${name} ${k + 1}`, cell, rgba(st.ink, 0.06), a);
    L.push(f.id ? keyed(tile, f.id) : tile);
    if (c > 0) L.push(rect(`${name} ${k + 1} — rule`, box(cell.x, cell.y, 2, cell.h), rgba(st.ink, 0.14), a));
    if (r > 0) L.push(rect(`${name} ${k + 1} — rule across`, box(cell.x, cell.y, cell.w, 2), rgba(st.ink, 0.14), a));
    const mainBox = box(cell.x, cell.y, cell.w, f.sub ? cell.h - subH - PADV : cell.h);
    L.push(centred(`${name} ${k + 1} — words`, f.main, mainBox, { ...main, size: f.quiet ? Math.min(120, mainSize * 1.4) : mainSize, color: f.quiet ? st.muted : st.ink, align: 'center' }, a, padL, PAD));
    if (f.sub) L.push(txt(`${name} ${k + 1} — more`, f.sub, box(cell.x + padL, cell.y + cell.h - subH - PADV, cell.w - padL - PAD, subH), { ...sub, size: subSize, color: st.muted, align: 'center' }, a));
  });
  return L;
}
function memory(st: LayoutStyle, g: ShowcaseGame, b: NonNullable<Boards['memoryBoard']>): Slide[] {
  const pairs = b.pairs.slice(0, 8);
  const cols = pairs.length <= 4 ? 2 : pairs.length <= 6 ? 3 : 4;
  const kind = b.kind;
  const game = kind === 'memorymatch' ? 'Memory match' : kind === 'knowledgeflip' ? 'Knowledge flip' : 'Memory flip';
  const out: Slide[] = [];
  // Study: every pair face up, the study clock in the heading row. Knowledge flip has none.
  if (kind !== 'knowledgeflip') {
    const study = opening(st, { timeLimit: b.studySeconds }, `${game} · study — then the cards hide`, 'Study the pairs.', false, { sizes: [112], maxH: 200 });
    study.layers.push(...cardGrid(st, pairs.map((p, k) => ({ main: p.term, sub: p.definition, id: `card-${k}` })), study.top, cols));
    out.push(tagGame(slideOf(`${g.label} · study`, study.layers, st, `Study for ${b.studySeconds ?? 10} seconds, then Next hides the cards.`), 'board', undefined, undefined, 'Study time', { seconds: b.studySeconds ?? 10 }));
  }
  // The board: Memory flip keeps the terms up, Memory match hides the cards entirely, Knowledge flip
  // shows its keywords. A card, clicked, opens its reveal.
  const cue = kind === 'memorymatch' ? 'your turn — choose a card and explain it' : kind === 'knowledgeflip' ? 'choose a keyword — explain it aloud' : 'choose a card — explain its meaning';
  const boardO = opening(st, {}, `${game} · ${cue}`, kind === 'memorymatch' ? 'What was on each card?' : 'What does each one mean?', false, { sizes: [112], maxH: 200 });
  boardO.layers.push(...cardGrid(st, pairs.map((p, k) => (kind === 'memorymatch' ? { main: String(k + 1), quiet: true, id: `card-${k}` } : { main: p.term, id: `card-${k}` })), boardO.top, cols));
  const board = slideOf(`${g.label} · the board`, boardO.layers, st, `Click a card to reveal it. The teacher claims it or passes${kind === 'memorymatch' ? '; the turn moves to the next team' : ''}. Back to the board from the reveal.`);
  out.push(board);
  pairs.forEach((p, k) => {
    const o = opening(st, {}, `${game} · card ${k + 1} · the answer`, p.term, true, { sizes: [150, 132, 120], maxH: 240 });
    // The card opens into its answer: the board's tile travels into the green row.
    o.layers.push(button(st, '← Board', board), ...grid(st, [{ text: p.definition, right: true, id: `card-${k}` }], o.top, { cols: 1, max: 72, name: 'Answer', lines: 2 }).layers);
    const reveal = tagGame(slideOf(`${g.label} · card ${k + 1}`, o.layers, st, `${p.term}: ${p.definition}. Claim it, or pass${kind === 'knowledgeflip' ? '' : ' — a missed card stays for another try'}.`), 'answer', undefined, `card ${k}`);
    out.push(reveal);
    linkCell(board.layers, 'Card', k, reveal);
  });
  const done = opening(st, {}, `${game} · the set`, 'Every card collected?', true, { sizes: [132, 120], maxH: 200 });
  done.layers.push(...grid(st, pairs.flatMap((p) => [{ text: p.term }, { text: p.definition, right: true }]), done.top, { cols: 2, max: 52, min: 36, name: 'Pair' }).layers);
  out.push(tagGame(slideOf(`${g.label} · the set`, done.layers, st), 'end'));
  return out;
}

// ─── Definition challenge ───────────────────────────────────────────────────
/** reading → question → answer. The passage alone while the clock runs; then it clears and the
 *  question asks for what it said; then the answer. */
function definition(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide[] {
  return qs.flatMap((q, i) => {
    const n = qs.length, ask = q.headPrompt ?? q.question ?? '';
    const read = opening(st, q, tag('Definition challenge', 'read it — then it clears', i, n, false), q.passage ?? '', false, { sizes: [104, 96, 88, 80], maxH: 560 });
    read.layers.push(...quietRow(st, 'Phones stay closed while you read', Math.max(read.top, bottomOf(read.layers) + 28)));
    const asked = opening(st, q, tag('Definition challenge', 'answer from memory', i, n, false), ask, false);
    asked.layers.push(...quietRow(st, 'Type it on your phone', asked.top));
    const said = opening(st, q, tag('Definition challenge', '', i, n, true), ask, true);
    said.layers.push(...answerRow(st, q.answer ?? '', said.top));
    return [
      // The same limit for the reading and the answering, as SlideForge plays it: one setting, both clocks.
      tagGame(slideOf(`${g.label} · ${i + 1} · read`, read.layers, st, 'Read while it is on screen. Next clears it and asks.'), 'question', q, String(i), 'Reading and answering time'),
      tagGame(slideOf(named(g.label, i, false), asked.layers, st, `Answer: ${q.answer ?? ''}`), 'question', q, String(i), 'Reading and answering time'),
      tagGame(slideOf(named(g.label, i, true), said.layers, st, note(q)), 'answer', q, String(i)),
    ];
  });
}

// ─── Emoji guess ────────────────────────────────────────────────────────────
/** emoji clue → optional support → type → reveal. The clues as big as the slide takes; the letter
 *  pattern and then the hint come a click each, when the room is stuck; the answer follows. */
function emojiWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false): Slide {
  const level = q.difficulty ?? 'medium';
  const o = opening(st, q, tag('Emoji guess', `${level} · ${(q.headPrompt ?? 'what do these clues point to?').replace(/\?$/, '')}`, i, n, answer), q.clues ?? q.question ?? '', answer, { sizes: [260, 220, 180], maxH: 320 });
  if (answer) o.layers.push(...answerRow(st, q.answer ?? '', o.top));
  else {
    const pattern = String(q.answer ?? '').split('').map((ch, k) => (ch === ' ' ? '  ' : k === 0 ? ch.toUpperCase() : '_')).join(' ');
    const support = grid(st, [{ text: pattern }, { text: q.hint ?? '' }], o.top, { cols: 2, max: 52, min: 36, name: 'Support', lines: 2 }).layers;
    // Each half of the support is a click of its own: the pattern, then the hint.
    support.forEach((l) => { const half = /^Support 2/.test(l.name) ? 1 : 0; l.anim = { ...l.anim, type: 'fade', duration: 0.5, delay: 0, trigger: 'onClick', step: { set: 'support', i: half, mode: 'on' } }; });
    o.layers.push(...support);
  }
  const s = slideOf(named(name, i, answer), o.layers, st, answer ? note(q) : `Stuck? Click for the support this difficulty allows. Answers after the hint score half. Answer: ${q.answer ?? ''}`);
  emojiSupport(s, level);
  return s;
}
/** What support an emoji puzzle gives, by its difficulty: easy the letter pattern and the hint, medium
 *  the pattern only, hard none. The layers stay on the slide, hidden, so a change of mind brings them back. */
export function emojiSupport(s: Slide, difficulty = 'medium') {
  const keep = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 0 : 1;
  for (const l of s.layers) { const m = l.name.match(/^Support (\d)/); if (m) l.visible = Number(m[1]) <= keep; }
}

// ─── Word reveal ────────────────────────────────────────────────────────────
/** letter drip → guess. The word as a row of tiles the width of the slide, some letters showing;
 *  each click drips in another. The earlier the guess, the more it scores. The answer fills them all. */
function wordWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false): Slide {
  const word = String(q.word ?? q.answer ?? '').toUpperCase();
  const level = q.difficulty ?? 'medium';
  const o = opening(st, q, tag('Word reveal', `${level} · guess it early — the letters drip in`, i, n, answer), q.question ?? '', answer, { sizes: [104, 96], maxH: 220 });
  const len = Math.max(1, word.length), cw = W / len;
  const h = Math.min(220, Math.max(120, cw * 1.25)), y = o.top;
  const size = Math.min(150, cw * 0.62);
  const L = o.layers;
  [...word].forEach((_, k) => {
    const cell = box(k * cw, y, cw, h);
    L.push(keyed(rect(`Letter ${k + 1}`, cell, answer ? RIGHT : rgba(st.ink, 0.06), fade(0.2 + 0.02 * k)), `letter-${k}`));
    if (k > 0) L.push(rect(`Letter ${k + 1} — rule`, box(cell.x, y, 2, h), answer ? 'rgba(255,255,255,0.3)' : rgba(st.ink, 0.14), fade(0.2)));
  });
  const face = { ...FACE(st), size, align: 'center', lineHeight: 1 };
  if (answer) [...word].forEach((ch, k) => L.push(keyed(centred(`Letter ${k + 1} — ${ch}`, ch, box(k * cw, y, cw, h), { ...face, color: ON_RIGHT }, fade(0.3), 0, 0), `letter-${k}:ch`)));
  else {
    // Each tile holds a faded ? and its letter; the letter takes the ?'s place when it drips in. The
    // letters go in the drip's order, so each click brings the next.
    const order = [...word].map((_, k) => k).sort((a, b) => ((a * 7 + 3) % len) - ((b * 7 + 3) % len));
    order.forEach((k) => L.push(
      centred(`Letter ${k + 1} — ?`, '?', box(k * cw, y, cw, h), { ...face, color: rgba(st.ink, 0.25) }, fade(0.3), 0, 0),
      keyed(centred(`Letter ${k + 1} — ${word[k]}`, word[k], box(k * cw, y, cw, h), { ...face, color: st.ink }, fade(0.3), 0, 0), `letter-${k}:ch`),
    ));
    if (q.hint) L.push(...quietRow(st, `Hint: ${q.hint}`, y + h + 28));
  }
  const s = slideOf(named(name, i, answer), L, st, answer ? note(q) : `Each click drips in a letter. Answer: ${q.answer ?? word.toLowerCase()}`);
  if (!answer) dripWord(s, level, q.preReveal);
  return s;
}
const SHOWN: Record<string, number> = { easy: 0.6, medium: 0.4, hard: 0.2 };
/** How much of a word shows before the drip starts, by difficulty (or SlideForge's own fraction):
 *  those letters come with the slide; each of the rest waits behind its ?, a click each, in order. */
export function dripWord(s: Slide, difficulty = 'medium', fraction?: number) {
  const letters = s.layers.filter((l) => /^Letter \d+ — [^?]$/.test(l.name));
  const shown = Math.round((fraction ?? SHOWN[difficulty] ?? 0.4) * letters.length);
  letters.forEach((l, j) => {
    const k = l.name.match(/^Letter (\d+)/)![1];
    const mark = s.layers.find((x) => x.name === `Letter ${k} — ?`);
    const set = `drip-${k}`;
    if (j < shown) {
      l.anim = { ...l.anim, trigger: 'withSlide', delay: 0.3, step: undefined };
      if (mark) { mark.visible = false; mark.anim = { ...mark.anim, trigger: 'withSlide', step: undefined }; }
    } else {
      l.anim = { ...l.anim, trigger: 'onClick', delay: 0, step: { set, i: 1, mode: 'swap' } };
      if (mark) { mark.visible = true; mark.anim = { ...mark.anim, trigger: 'withSlide', delay: 0.3, step: { set, i: 0, mode: 'swap' } }; }
    }
  });
}

// ─── Heads up ───────────────────────────────────────────────────────────────
/** timed round → correct/pass → end. The round starts with the guesser facing away and one clock;
 *  each term then fills the slide for the room to describe; at time, the count. */
function headsUp(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide[] {
  const secs = qs.find((q) => q.roundSeconds)?.roundSeconds ?? 60;
  const start = opening(st, {}, 'Heads up · the round', 'Guesser, face away from the wall.', false, { sizes: [132, 120], maxH: 280 });
  const size = Math.min(420, FOOT - start.top - 20);
  start.layers.push(clock(st, 'Round clock', secs / 60, box(LEFT, start.top, size, size), { type: 'zoomIn', duration: 0.6 }, true),
    txt('Rule', 'Describe each term without saying it. Correct or Pass moves to the next.', box(LEFT + size + 80, start.top + 40, W - LEFT * 2 - size - 80, size - 80), { font: st.body, weight: '600', size: 56, color: st.muted, lineHeight: 1.25 }, fade(0.3)));
  const terms = qs.map((q, i) => {
    const o = opening(st, {}, tag('Heads up', `${q.category ?? 'describe it'} — don’t say it`, i, qs.length, false), q.term ?? q.question ?? '', false, { sizes: [320, 260, 200, 150], maxH: 480 });
    return tagGame(slideOf(named(g.label, i, false), o.layers, st, q.explanation ? `${q.term ?? q.question}: ${q.explanation}` : ''), 'question', { ...q, timeLimit: undefined }, String(i), 'none');
  });
  const end = opening(st, {}, 'Heads up · time', 'Time! How many did they get?', true, { sizes: [150, 132] });
  // The answers: each term the round used, beside what it means.
  end.layers.push(...grid(st, qs.flatMap((q) => [{ text: q.term ?? q.question ?? '' }, { text: q.explanation ?? '', right: true }]), end.top, { cols: 2, max: 52, min: 34, name: 'Term' }).layers);
  return [tagGame(slideOf(`${g.label} · the round`, start.layers, st, `One ${secs}-second clock for the round. Choose the guesser in Live answers; every other phone shows the term.`), 'board', undefined, undefined, 'Round', { seconds: secs }), ...terms, tagGame(slideOf(`${g.label} · time`, end.layers, st), 'end')];
}

// ─── Spin & explain ─────────────────────────────────────────────────────────
/** shuffled draw → explanation → teacher verdict. The concept drawn, large, with the three things a
 *  good explanation gives; the answer gives its meaning and the verdicts to choose from. */
function spinWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false): Slide {
  const o = opening(st, q, tag('Spin & explain', `draw ${i + 1} of ${n}`, 0, 1, answer), q.term ?? q.question ?? '', answer, { sizes: [240, 200, 160], maxH: 300, why: '' });
  if (answer) {
    o.layers.push(...answerRow(st, q.explanation ?? '', o.top, 72));
    o.layers.push(...grid(st, ['Clear', 'With hint', 'Reject'].map((t) => ({ text: t, quiet: true })), bottomOf(o.layers) + 28, { cols: 3, max: 48, name: 'Verdict', lines: 1 }).layers);
  } else o.layers.push(...grid(st, ['What it means', 'An example', 'A connection'].map((t) => ({ text: t })), o.top, { cols: 3, max: 60, name: 'Explain', lines: 1 }).layers);
  return slideOf(named(name, i, answer), o.layers, st, answer ? `Meaning: ${q.explanation ?? ''}\nClear credits the speaker’s team; with the hint, half; reject or time up, nothing.` : `Hint, if needed: ${q.hint ?? ''}`);
}

/** spin: the concepts round a wheel, the pointer at the top, the hub in the accent. Each draw after it
 *  is the wheel's pick. */
function spinWheel(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide {
  const terms = qs.map((q) => q.term ?? q.question ?? '').slice(0, 8);
  const o = opening(st, {}, 'Spin & explain · spin to draw', 'Spin the wheel.', false, { sizes: [132, 120], width: W / 2 - LEFT });
  const top = EY + 40, D = Math.min(FOOT - top - 20, 860), R = D / 2;
  const cx = W - LEFT - R, cy = top + R, n = Math.max(1, terms.length);
  const L = o.layers;
  L.push(
    txt('Rule', 'Each spin draws a concept. Explain what it means, give an example, and make a connection.', box(LEFT, o.top, W / 2 - LEFT - 40, 260), { font: st.body, weight: '600', size: 52, color: st.muted, lineHeight: 1.25 }, fade(0.3)),
    createLayer('shape', { name: 'Wheel', box: box(cx - R, cy - R, D, D), anim: { type: 'zoomIn', duration: 0.7, delay: 0.2 }, params: { shape: 'ellipse', fill: rgba(st.ink, 0.06), stroke: rgba(st.ink, 0.4), strokeWidth: 6 } }),
  );
  terms.forEach((term, k) => {
    // A spoke on each boundary, the concept in the middle of its sector.
    const a = (-90 + (k * 360) / n) * (Math.PI / 180), m = a + Math.PI / n;
    L.push(
      { ...rect(`Spoke ${k + 1}`, box(cx + (Math.cos(a) * R) / 2 - R / 2, cy + (Math.sin(a) * R) / 2 - 1.5, R, 3), rgba(st.ink, 0.3), fade(0.3)), box: { ...box(cx + (Math.cos(a) * R) / 2 - R / 2, cy + (Math.sin(a) * R) / 2 - 1.5, R, 3), rot: (a * 180) / Math.PI } },
      txt(`Sector ${k + 1}`, term, box(cx + Math.cos(m) * R * 0.6 - 170, cy + Math.sin(m) * R * 0.6 - 45, 340, 90), { ...FACE(st), size: 44, color: st.ink, align: 'center', valign: 'middle' }, fade(0.4 + 0.05 * k)),
    );
  });
  L.push(
    createLayer('shape', { name: 'Hub', box: box(cx - 50, cy - 50, 100, 100), anim: { type: 'pop', duration: 0.5, delay: 0.5 }, params: { shape: 'ellipse', fill: st.accent, strokeWidth: 0 } }),
    { ...createLayer('shape', { name: 'Pointer', box: box(cx - 44, top - 56, 88, 76), anim: { type: 'pop', duration: 0.5, delay: 0.6 }, params: { shape: 'triangle', fill: st.accent, strokeWidth: 0 } }) },
  );
  const ptr = L[L.length - 1];
  ptr.box = { ...ptr.box!, rot: 180 };
  return tagGame(slideOf(`${g.label} · the wheel`, L, st, `Spin to draw: ${terms.join(', ')}. The draws follow, in a fresh order each run in SlideForge.`), 'board');
}

/** The line at the end: every event the game placed, on the one timeline. */
function timelineEnd(st: LayoutStyle, g: ShowcaseGame, last: Q): Slide {
  const label = String(last.question ?? '').replace(/^Place it in time:\s*/i, '');
  const all = [...(last.timeline ?? []), ...(last.target != null ? [{ label, year: last.target }] : [])];
  const s = lineWall(st, g.label, { ...last, question: 'The timeline the room built.', timeline: all, timeLimit: undefined }, 0, 1, false, true);
  const eb = s.layers.find((l) => l.name === 'Eyebrow');
  if (eb) eb.params.text = 'TIME TRAVELER · THE TIMELINE';
  s.name = `${g.label} · the timeline`;
  s.notes = all.map((e) => `${e.year} — ${e.label}`).join('\n');
  return tagGame(s, 'end');
}

// ─── Connection maker ───────────────────────────────────────────────────────
/** two ideas → explain → teacher accept. The two concepts as halves, a bridge between them; the
 *  answer lays one bridge under them, green. */
function connectWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false): Slide {
  const o = opening(st, q, tag('Connection maker', 'find the bridge', i, n, answer), q.question ?? '', answer, { sizes: [104, 96], maxH: 220, why: '' });
  // The two ideas keep clear of the bridge between them.
  const set = grid(st, [{ text: q.itemA ?? '', id: 'idea-a' }, { text: q.itemB ?? '', id: 'idea-b' }], o.top, { cols: 2, max: 96, name: 'Idea', lines: 1 });
  const d = Math.min(96, set.bottom - o.top - 16);
  o.layers.push(...set.layers, createLayer('shape', { name: 'Bridge', box: box(W / 2 - d / 2, o.top + (set.bottom - o.top - d) / 2, d, d), anim: { type: 'pop', duration: 0.5, delay: 0.4 },
    params: { shape: 'ellipse', fill: answer ? RIGHT : st.ink, strokeWidth: 0, label: '↔', labelColor: answer ? ON_RIGHT : st.ground, labelSize: 0, labelFont: st.body, labelWeight: '700' } }));
  if (answer) o.layers.push(...answerRow(st, q.explanation ?? '', set.bottom + 28, 60));
  else o.layers.push(...quietRow(st, 'Send your bridge from your phone', set.bottom + 28));
  return slideOf(named(name, i, answer), o.layers, st, answer ? `One bridge: ${q.explanation ?? ''}` : 'The bridges arrive beside the slide without names. Use one on the desk: its author explains it; accept or ask for another.');
}

// ─── Random challenge ───────────────────────────────────────────────────────
/** draw a card → attempt it → Complete or Pass. The card drawn, and the cards left in the deck
 *  beside it; what counts as done follows. */
function challengeWall(st: LayoutStyle, name: string, q: Q, i: number, n: number, answer = false): Slide {
  const o = opening(st, q, tag('Random challenge', `card ${i + 1} of ${n}`, 0, 1, answer), q.challenge ?? q.question ?? '', answer, { sizes: [132, 120, 104], maxH: 360, why: '' });
  if (answer) o.layers.push(...answerRow(st, `What counts: ${q.explanation ?? ''}`, o.top, 60));
  else {
    const left = n - i - 1, cw = 110, ch = 150, y = o.top + 12;
    o.layers.push(txt('Deck — count', left ? `${left} ${left === 1 ? 'card' : 'cards'} left in the deck` : 'The last card', box(LEFT, y + ch + 16, 900, 50), { font: st.body, weight: '600', size: 38, color: st.muted }, fade(0.4)));
    for (let k = 0; k < left; k++) o.layers.push(rect(`Deck ${k + 1}`, box(LEFT + k * (cw + 16), y, cw, ch), rgba(st.ink, 0.1), fade(0.3 + 0.05 * k)));
  }
  return slideOf(named(name, i, answer), o.layers, st, answer ? 'Mark it Complete or Pass; the count of completed challenges grows.' : 'Choose who takes it in Live answers.');
}

// ─── Concept chain ──────────────────────────────────────────────────────────
/** start term → add link → accept → grow. The chain so far as tiles joined by arrows, the next link
 *  a question mark; each slide the chain is one longer. */
function chainRow(st: LayoutStyle, terms: string[], open: boolean, top: number, next?: string): Layer[] {
  // The open link is a ?, or on its answer the next concept, green; either way the same tile.
  const cells: Cell[] = [...terms.map((t, k) => ({ text: t, id: `link-${k}` })), ...(open ? [next ? { text: next, right: true, id: `link-${terms.length}` } : { text: '?', quiet: true, id: `link-${terms.length}` }] : [])];
  const set = grid(st, cells, top, { cols: cells.length, max: 72, min: 36, name: 'Link', lines: 2 });
  const cw = W / cells.length, h = set.bottom - top, d = Math.min(72, h - 12);
  const arrows = cells.slice(1).map((_, k) => createLayer('shape', { name: `Link ${k + 2} — arrow`, box: box((k + 1) * cw - d / 2, top + (h - d) / 2, d, d), anim: fade(0.4 + 0.05 * k),
    params: { shape: 'ellipse', fill: st.ink, strokeWidth: 0, label: '→', labelColor: st.ground, labelSize: 0, labelFont: st.body, labelWeight: '700' } }));
  return [...set.layers, ...arrows];
}
function conceptChain(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide[] {
  const terms = qs.map((q) => q.term ?? '');
  const links = qs.map((q, i) => {
    const o = opening(st, q, tag('Concept chain', 'add the next justified link', i, qs.length, false), q.prompt ?? q.question ?? '', false, { sizes: [104, 96], maxH: 220 });
    o.layers.push(...chainRow(st, terms.slice(0, i + 1), true, o.top));
    const asked = tagGame(slideOf(named(g.label, i, false), o.layers, st, 'Phones send links; they appear beside the slide without names. Use one on the desk: its author justifies it. Accept grows the chain; Reject asks for another.'), 'question', q, String(i), 'Time for each link');
    // Its answer, where the game has one: the concept the chain goes on to, in the ?'s place.
    const next = terms[i + 1];
    if (!next) return [asked];
    const a = opening(st, q, tag('Concept chain', '', i, qs.length, true), q.prompt ?? q.question ?? '', true, { sizes: [104, 96], maxH: 220 });
    a.layers.push(...chainRow(st, terms.slice(0, i + 1), true, a.top, next));
    return [asked, tagGame(slideOf(named(g.label, i, true), a.layers, st, `One link: ${terms[i]} → ${next}. Accept any link the speaker can justify.`), 'answer', q, String(i))];
  });
  const end = opening(st, {}, 'Concept chain · the chain', 'The chain the room built.', true, { sizes: [132, 120] });
  end.layers.push(...chainRow(st, terms, false, end.top));
  return [...links.flat(), tagGame(slideOf(`${g.label} · the chain`, end.layers, st), 'end')];
}

// ─── Bingo ──────────────────────────────────────────────────────────────────
/** ready → call/mark → bingo. The terms in play as a grid; each call is a definition read out, the
 *  grid under it with the terms already called set back; its answer lights the term. */
function bingo(st: LayoutStyle, g: ShowcaseGame, b: NonNullable<Boards['bingoBoard']>): Slide[] {
  const pool = b.pool.slice(0, 16);
  const cols = pool.length > 12 ? 4 : pool.length > 6 ? 4 : 3;
  const calls = pool.map((_, k) => k).sort((a, c) => ((a * 5 + 2) % pool.length) - ((c * 5 + 2) % pool.length));
  const poolO = opening(st, {}, `Bingo · the ${pool.length} terms in play`, 'Mark your card as each definition is called.', false, { sizes: [112, 104], maxH: 220 });
  poolO.layers.push(...grid(st, pool.map((p, j) => ({ text: p.term, id: `term-${j}` })), poolO.top, { cols, max: 72, min: 36, name: 'Term', lines: 1 }).layers);
  const out: Slide[] = [slideOf(`${g.label} · the terms`, poolO.layers, st, `${b.gridSize ?? 3}×${b.gridSize ?? 3} cards, one per team. First complete row, column or diagonal wins.`)];
  calls.forEach((k, c) => {
    const called = new Set(calls.slice(0, c));
    [false, true].forEach((answer) => {
      const o = opening(st, {}, tag('Bingo', 'which term is this?', c, calls.length, answer), pool[k].definition, answer, { sizes: [104, 96, 88], maxH: 220 });
      o.layers.push(...grid(st, pool.map((p, j) => ({ text: p.term, id: `term-${j}`, right: answer && j === k, quiet: called.has(j) })), o.top, { cols, max: 64, min: 32, name: 'Term', lines: 1 }).layers);
      out.push(tagGame(slideOf(named(`${g.label} · call`, c, answer), o.layers, st, answer ? `${pool[k].term}. A team with it explains it to claim the square.` : `Read it out; the term stays hidden. Answer: ${pool[k].term}`), answer ? 'answer' : 'question', undefined, `call ${c}`, 'none'));
    });
  });
  const end = opening(st, {}, 'Bingo · a line', 'Bingo! Check the line.', true, { sizes: [150, 132] });
  out.push(tagGame(slideOf(`${g.label} · bingo`, end.layers, st, 'A completed row, column or diagonal wins. Check each square against the calls.'), 'end'));
  return out;
}

// ─── Question cube ──────────────────────────────────────────────────────────
/** roll a face → think → answer aloud. The six faces, each its kind of question over the question
 *  itself; each roll is a click lighting the next face, in the order of the draw. */
function questionCube(st: LayoutStyle, g: ShowcaseGame, qs: Q[]): Slide {
  const faces = qs.slice(0, 6);
  const o = opening(st, {}, 'Question cube · roll to choose', 'Roll the cube.', false, { sizes: [132, 120], maxH: 200 });
  const cols = 3, rows = Math.ceil(faces.length / cols), cw = W / cols;
  const qFace = FACE(st), label = { font: st.body, weight: '700', size: 34, tracking: 0.1, color: st.muted };
  const size = fitSize(faces.map((q) => q.challenge ?? q.question ?? ''), cw - LEFT - PAD, 240, qFace, 60, 36);
  const rowH = Math.min((BASE - o.top) / rows, Math.max(...faces.map((q) => textHeight(q.challenge ?? q.question ?? '', cw - LEFT - PAD, { ...qFace, size }))) + 50 + PADV * 3);
  faces.forEach((q, k) => {
    const c = k % cols, r = Math.floor(k / cols), padL = c === 0 ? LEFT : PAD;
    const cell = box(c * cw, o.top + r * rowH, cw, rowH);
    const step = { set: 'faces', i: k, mode: 'spot' as const };
    const roll: Partial<Anim> = { type: 'pop', duration: 0.5, delay: 0, trigger: 'onClick', step }, w: Partial<Anim> = { type: 'fade', duration: 0.4, delay: 0.05, trigger: 'withSlide', step };
    o.layers.push(rect(`Face ${k + 1}`, cell, rgba(st.ink, 0.06), roll));
    if (c > 0) o.layers.push(rect(`Face ${k + 1} — rule`, box(cell.x, cell.y, 2, cell.h), rgba(st.ink, 0.14), w));
    if (r > 0) o.layers.push(rect(`Face ${k + 1} — rule across`, box(cell.x, cell.y, cell.w, 2), rgba(st.ink, 0.14), w));
    o.layers.push(
      txt(`Face ${k + 1} — kind`, (q.category ?? `Face ${k + 1}`).toUpperCase(), box(cell.x + padL, cell.y + PADV, cell.w - padL - PAD, 44), label, w),
      centred(`Face ${k + 1} — question`, q.challenge ?? q.question ?? '', box(cell.x, cell.y + 50, cell.w, cell.h - 50), { ...qFace, size, color: st.ink, align: 'center' }, w, padL, PAD),
    );
  });
  return tagGame(slideOf(`${g.label} · the cube`, o.layers, st, faces.map((q, k) => `${k + 1}. ${q.category ?? ''}: ${q.challenge ?? q.question}`).join('\n')), 'board');
}

// ─── Mind reveal ────────────────────────────────────────────────────────────
/** study → recall → reveal. The words on the board while the study clock runs; then they go, each
 *  tile a ?, while the room writes down every one it remembers against the recall clock; then they
 *  come back, green, each into its own tile, and the room counts. The lab's own game: on paper. */
export function mindRevealSlides(st: LayoutStyle, name: string, b: NonNullable<Boards['recallBoard']>): Slide[] {
  const words = b.words.map((w) => w.trim()).filter(Boolean).slice(0, 20);
  // Long words take fewer columns, so every word stays large.
  const long = Math.max(0, ...words.map((w) => w.length)) > 11;
  const n = words.length, cols = n <= 6 || long ? 3 : n <= 12 ? 4 : 5;
  const set = (cells: Cell[], top: number) => grid(st, cells, top, { cols, max: 64, min: 36, name: 'Word', lines: 1 }).layers;
  const study = opening(st, { timeLimit: b.studySeconds ?? 20 }, 'Mind reveal · remember as many as you can', `Remember these ${n} words.`, false, { sizes: [112, 104], maxH: 200 });
  study.layers.push(...set(words.map((w, k) => ({ text: w, id: `word-${k}` })), study.top));
  const recall = opening(st, { timeLimit: b.recallSeconds ?? 60 }, 'Mind reveal · write down every word you remember', 'What were they?', false, { sizes: [112, 104], maxH: 200 });
  recall.layers.push(...set(words.map((_, k) => ({ text: '?', quiet: true, id: `word-${k}` })), recall.top));
  const reveal = opening(st, {}, 'Mind reveal · the answers', 'How many did you remember?', true, { sizes: [112, 104], maxH: 200 });
  reveal.layers.push(...set(words.map((w, k) => ({ text: w, right: true, id: `word-${k}` })), reveal.top));
  reveal.layers.push(...quietRow(st, `Count them: how many of the ${n} did you get?`, bottomOf(reveal.layers) + 28));
  const all = { words };
  return [
    tagGame(slideOf(`${name} · study`, study.layers, st, `Study for ${b.studySeconds ?? 20} seconds: no writing yet. Next takes the words away.`), 'board', undefined, 'study', 'Study time', { seconds: b.studySeconds ?? 20, ...all }),
    tagGame(slideOf(`${name} · recall`, recall.layers, st, `Everyone writes down every word they remember, on paper, before the clock runs out. The words: ${words.join(', ')}.`), 'board', undefined, 'recall', 'Recall time', { seconds: b.recallSeconds ?? 60, ...all }),
    tagGame(slideOf(`${name} · the answers`, reveal.layers, st, 'Each word comes back into its own place. Count your own, then compare with a partner.'), 'end', undefined, 'reveal', undefined, all),
  ];
}

/** The lab's own games, beside SlideForge's: what they are and the content they start with. */
export const LAB_GAMES: ShowcaseGame[] = [{
  format: 'mind-reveal', style: 'recall', label: 'Mind reveal', styleLabel: 'Recall',
  aim: 'Encode, then retrieve: a set of words studied for moments, taken away, and recalled from memory.',
  howToPlay: ['The words go up on the board for 20 seconds. No writing.', 'They are taken away. Write down every word you remember before the clock runs out.', 'They come back: count how many you got.'],
  title: 'Mind reveal',
  slides: [{ type: 'section', subtitle: '12 words · 20 s to study · 60 s to recall' } as GameQuestion, { type: 'content', recallBoard: { words: ['Nucleus', 'Ribosome', 'Chloroplast', 'Mitochondrion', 'Vacuole', 'Cell wall', 'Cytoplasm', 'Membrane', 'Enzyme', 'Diffusion', 'Osmosis', 'Chromosome'], studySeconds: 20, recallSeconds: 60 } } as GameQuestion],
}];

// ─── Every game ─────────────────────────────────────────────────────────────
/** All of SlideForge's playable game formats, in the order the Engage tab lists them: the games
 *  audit's eight first, then the rest by what the room does. Memory Maze is not listed: SlideForge
 *  marks it not yet available. */
export const GAMES = [
  ...SHOWCASE,
  'choice', 'truefalse', 'type', 'slider', 'time-traveler',
  'low-stakes-quiz', 'quiz-bowl', 'boss-battle', 'horse-race',
  'memory-flip', 'memory-match', 'knowledge-flip', 'bingo',
  'definition-challenge', 'emoji-guess', 'word-reveal',
  'heads-up', 'spin-explain', 'connection-maker', 'concept-chain', 'random-challenge', 'question-cube',
  'mind-reveal',
];

/** A game as slides: its cover, then its phases as SlideForge's playbook sets them out. */
/** Games played on SlideForge's own board in the live room — their state is the room's, as it plays —
 *  and what of SlideForge's compiled game plays there. */
const LIVE_BOARD: Record<string, (s: GameQuestion & Boards) => boolean> = {
  'low-stakes-quiz': (s) => !!s.lowstakesBoard, 'quiz-bowl': (s) => !!s.bowlBoard, bingo: (s) => !!s.bingoBoard,
  'memory-flip': (s) => !!s.memoryBoard, 'memory-match': (s) => !!s.memoryBoard, 'knowledge-flip': (s) => !!s.memoryBoard,
  'beat-the-clock': (s) => s.type === 'quiz', 'question-cube': (s) => s.type === 'quiz',
};
/** A board game's first slide after its cover carries SlideForge's board, for the live room. */
function withLiveBoard(g: ShowcaseGame, slides: Slide[]): Slide[] {
  const of = LIVE_BOARD[g.format];
  const first = slides.find((s) => s.game && s.game.role !== 'cover');
  const board = of ? (g.slides as (GameQuestion & Boards)[]).filter(of) : [];
  if (first?.game && board.length) first.game.board = JSON.parse(JSON.stringify(board)) as Record<string, unknown>[];
  return slides;
}

export function gameSlides(g: ShowcaseGame, st: LayoutStyle): Slide[] {
  const slides = withLiveBoard(g, gameSlidesOf(g, st));
  // Multiple choice remembers its look, so the Game panel can show it and build the other.
  if (g.format === 'choice') for (const s of slides) if (s.game) s.game.look = g.look ?? 'walls';
  return slides;
}
function gameSlidesOf(g: ShowcaseGame, st: LayoutStyle): Slide[] {
  if (SHOWCASE.includes(g.format)) return showcaseSlides(g, st);
  const all = g.slides as (Q & Boards)[];
  const qs = all.filter((s) => s.type === 'quiz') as Q[];
  const boards = all.find((s) => s.lowstakesBoard || s.bowlBoard || s.memoryBoard || s.bingoBoard || s.recallBoard) ?? {};
  const subtitle = all.find((s) => s.type === 'section')?.subtitle;
  const cover = gameCover(st, { title: g.label, style: g.style, styleLabel: g.styleLabel, steps: g.howToPlay, count: subtitle,
    questions: qs.map((q) => ({ question: q.question ?? '', options: q.options ?? [], correct: q.correct ?? -1, explanation: q.explanation ?? '' })) });
  cover.notes = [g.aim, cover.notes].filter(Boolean).join('\n\n');
  const line = (timeline: boolean): Wall => (s, name, q, i, n, answer) => lineWall(s, name, q as Q, i, n, answer, timeline);
  let body: Slide[] = [];
  switch (g.format) {
    case 'choice': body = paired(g.look === 'buttons' ? buttonsWall : choiceWall, g.label, st, qs); break;
    case 'truefalse': body = paired(trueFalseWall, g.label, st, qs); break;
    case 'type': body = paired(typedWall, g.label, st, qs); break;
    case 'slider': body = paired(line(false), g.label, st, qs); break;
    case 'time-traveler': body = [...paired(line(true), g.label, st, qs), ...(qs.length ? [timelineEnd(st, g, qs[qs.length - 1])] : [])]; break;
    case 'low-stakes-quiz': if (boards.lowstakesBoard) body = [lowStakes(st, g.label, boards.lowstakesBoard, false), lowStakes(st, g.label, boards.lowstakesBoard, true)]; break;
    case 'quiz-bowl': if (boards.bowlBoard) body = quizBowl(st, g, boards.bowlBoard); break;
    case 'boss-battle': body = bossBattle(st, g, qs); break;
    case 'horse-race': body = horseRace(st, g, qs); break;
    case 'memory-flip': case 'memory-match': case 'knowledge-flip': if (boards.memoryBoard) body = memory(st, g, boards.memoryBoard); break;
    case 'bingo': if (boards.bingoBoard) body = bingo(st, g, boards.bingoBoard); break;
    case 'definition-challenge': body = definition(st, g, qs); break;
    case 'emoji-guess': body = paired(emojiWall, g.label, st, qs); break;
    case 'word-reveal': body = paired(wordWall, g.label, st, qs); break;
    case 'heads-up': body = headsUp(st, g, qs); break;
    case 'spin-explain': body = [spinWheel(st, g, qs), ...paired(spinWall, g.label, st, qs)]; break;
    case 'connection-maker': body = paired(connectWall, g.label, st, qs); break;
    case 'concept-chain': body = conceptChain(st, g, qs); break;
    case 'random-challenge': body = paired(challengeWall, g.label, st, qs); break;
    case 'question-cube': body = [questionCube(st, g, qs)]; break;
    case 'mind-reveal': if (boards.recallBoard) body = mindRevealSlides(st, g.label, boards.recallBoard); break;
    default: body = paired(choiceWall, g.label, st, qs);
  }
  return finishGame([cover, ...body], g.format, g.label);
}

export type { Box };
