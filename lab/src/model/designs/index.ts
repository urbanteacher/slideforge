import { feedbackOf, type SFSlide } from '../fromSlideForge';
import { cardsSlide, keywordsSlide, splitSlide, tableSlide, type LayoutStyle } from '../layouts';
import type { ActivitySettings, Slide } from '../types';
import { briefHero } from './brief';
import { activityGameSlides, type GameDef } from './games';
import { CY, LEFT, W, box, clock, headingClock, rowsOf, type Row } from './kit';
import { briefCard, panelCards, timelineSteps } from './legacy';
import { connectGrid, hookSplit, quadrants, stations } from './panels';
import { numberedRun, rowBands } from './rows';
import { stageBand, stageTrack, type Stage } from './stages';
import { THINK_PAIR_SHARE } from './thinkPairShare';

// SlideForge's 54 activities, each designed in the lab. What an activity says comes from SlideForge
// (assets/activities.json, written by tools/lab-activities.mjs); how it looks is the lab's, by its
// shape — a timed routine, numbered steps, an opening brief, four panels, stations, a grid to connect,
// a hook beside its picture, labelled rows, or a game. Each is offered in the lab's design and, where
// SlideForge draws it differently, in SlideForge's too, rebuilt from the lab's own layers.

export interface ActivityEntry {
  key: string; title: string; icon: string; blurb: string;
  phase: string; phaseLabel: string; phaseIcon: string; minutes: number;
  target: string; presentation: string; steps: string[]; materials: string[]; teacherNotes: string;
  slides?: SFSlide[];
  /** Written on a topic (the Activity panel's Write it): its own words, not the catalogue's wall copy. */
  written?: boolean;
  game?: { title: string; style: string; format: string; styleLabel: string; questions: { question: string; options: string[]; correct: number; explanation: string }[] };
}
export interface ActivityData { activities: ActivityEntry[] }
export interface ActivityOption { id: 'lab' | 'slideforge'; label: string; make: (st: LayoutStyle) => Slide[] }

type Shape = 'stages' | 'steps' | 'brief' | 'panels' | 'cards' | 'split' | 'table' | 'rows';
const LABELS: Record<Shape, [string, string]> = {
  stages: ['Stage band', 'Stage track'], steps: ['Numbered run', 'Timeline'], brief: ['Brief', 'Brief card'],
  panels: ['Quadrants', 'Panel cards'], cards: ['Stations', 'Cards'], split: ['Hook', 'Picture and text'], table: ['Grid', 'Table'], rows: ['Bands', 'Labelled rows'],
};

function shapeOf(s: SFSlide): Shape {
  const p = String((s as { activityPresentation?: string }).activityPresentation ?? '');
  if (s.type === 'keywords') return p === 'stages' ? 'stages' : p === 'steps' ? 'steps' : p === 'brief' ? 'brief' : p === 'panels' ? 'panels' : 'rows';
  if (s.type === 'cards') return 'cards';
  if (s.type === 'split') return 'split';
  if (s.type === 'table') return 'table';
  return 'rows';
}

/** Each stage's job on the track: SlideForge's declared one, or what its name says the room does. */
export const JOB_BY_NAME: Record<string, string> = {
  think: 'Silent thinking', pair: 'With a partner', square: 'Two pairs together', share: 'With the room', connect: 'Pulling it together',
  agree: 'As a class', debrief: 'As a class', reflect: 'On your own', 'i do': 'Watch', 'we do': 'Together', switch: 'Swap roles',
};

/** The routine a stages slide holds. A leading untimed row is its brief, and its label says what the
 *  brief is. With none, a question that opens the first stage and is followed by what to do with it is
 *  the prompt ("What makes a discussion go well…? Note one of each."): the stage keeps the instruction. */
function routineOf(a: ActivityEntry, s: SFSlide) {
  // Its copy is tuned for the wall; its notes come from the catalogue, as every activity's do.
  if (a.key === 'think-pair-share' && !a.written) return { ...THINK_PAIR_SHARE, notes: undefined };
  const rows = rowsOf(s.bullets);
  const lead = rows[0] && !rows[0].minutes && rows.slice(1).some((r) => r.minutes) ? rows[0] : null;
  const stages: Stage[] = (lead ? rows.slice(1) : rows).map((r) => ({
    name: r.label, task: r.text, minutes: r.minutes, job: r.job ?? JOB_BY_NAME[r.label.toLowerCase()], ...(r.jobKey ? { jobKey: r.jobKey } : {}),
  }));
  let prompt = lead ? lead.text || lead.label : '';
  if (!prompt && stages[0]) {
    const m = stages[0].task.match(/^(.*\?)\s+(\S.*)$/);
    if (m) { prompt = m[1].trim(); stages[0] = { ...stages[0], task: m[2].trim() }; }
  }
  if (!prompt) prompt = s.title && s.title !== a.title ? s.title : a.blurb;
  return { title: a.title, prompt, stages, label: lead?.label };
}

/** Grid tiles from "1. Perimeter | 2. 100 cm | …" lines. */
const tilesOf = (body = '') => body.split(/\n|\|/).map((t) => t.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean);
const pairs = (rows: Row[]) => rows.map((r) => [r.label, r.text] as [string, string]);

function build(a: ActivityEntry, s: SFSlide, st: LayoutStyle, which: 'lab' | 'slideforge'): Slide {
  const shape = shapeOf(s);
  const title = s.title || a.title;
  const rows = rowsOf(s.bullets);
  if (which === 'slideforge') {
    switch (shape) {
      case 'stages': return stageTrack(st, routineOf(a, s));
      // SlideForge's own looks for a keywords slide (css/app.css .activity-steps, -panels, -brief).
      case 'steps': return timelineSteps(st, title, rows);
      case 'panels': return panelCards(st, title, rows);
      case 'brief': return briefCard(st, title, rows);
      case 'cards': return cardsSlide(st, title, pairs(rows));
      case 'split': return splitSlide(st, title, s.bullets ?? [], 'right');
      case 'table': return tableSlide(st, title, tilesOf(s.body).reduce<string[][]>((m, t, i) => { (m[Math.floor(i / 4)] ??= []).push(t); return m; }, []).map((r) => r.join('\t')).join('\n'));
      default: return keywordsSlide(st, title, pairs(rows));
    }
  }
  switch (shape) {
    case 'stages': return stageBand(st, routineOf(a, s));
    case 'steps': return numberedRun(st, { title, eyebrow: a.title === title ? a.phaseLabel : a.title, rows });
    case 'brief': return briefHero(st, { title, brief: rows[0] ?? { label: '', text: a.blurb, minutes: 0 }, rows: rows.slice(1) });
    case 'panels': return quadrants(st, { title, rows, ladder: /ladder/.test(a.key), eyebrow: a.phaseLabel });
    case 'cards': return stations(st, { title, rows });
    case 'split': return hookSplit(st, { title, prompts: s.bullets ?? [] });
    case 'table': return connectGrid(st, { title, tiles: tilesOf(s.body) });
    default: return rowBands(st, { title, eyebrow: a.title !== title ? a.title : a.phaseLabel, rows });
  }
}

/** What the teacher needs beside the slides: what it is, the steps in order, the materials and the notes. */
function notesOf(a: ActivityEntry): string {
  return [
    `${a.title} — ${a.phaseLabel}${a.minutes ? `, about ${a.minutes} min` : ''}. ${a.blurb}`.trim(),
    a.steps.length ? `How to run it:\n${a.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : '',
    a.materials.length ? `Materials: ${a.materials.join(' · ')}` : '',
    a.teacherNotes,
  ].filter(Boolean).join('\n\n');
}

const KIND_NAMES: Record<string, string> = { poll: 'Poll', wordcloud: 'Word cloud', brainstorm: 'Brainstorm', scale: 'Scale' };

/** What the activity does in the room, onto a slide built from it: its feedback (the eyebrow says what
 *  the phones do), and, for a slide that is timed but not a routine, its time flush in the top right. */
function carry(slide: Slide, s: SFSlide, shape: Shape, st: LayoutStyle, which: 'lab' | 'slideforge') {
  const f = feedbackOf(s.feedback);
  if (f) {
    slide.feedback = f;
    const eb = slide.layers.find((l) => l.name === 'Eyebrow' && l.kind === 'text');
    if (eb) eb.params = { ...eb.params, text: `${String(eb.params.text ?? '')} · PHONES: ${(KIND_NAMES[f.kind] ?? f.kind).toUpperCase()}` };
  }
  const secs = Number(s.timeLimit);
  const eyebrowRow = ['rows', 'brief', 'panels', 'cards', 'table'].includes(shape) && slide.layers.some((l) => l.name === 'Eyebrow');
  if (secs > 0 && which === 'lab' && eyebrowRow) slide.layers.push(headingClock(st, secs / 60));
  // SlideForge's own looks keep its ring clock in the top right, beside the heading (legacy.ts leaves room).
  if (secs > 0 && which === 'slideforge' && ['steps', 'panels', 'brief'].includes(shape)) slide.layers.push(clock(st, 'Clock', secs / 60, box(W - LEFT - 170, CY, 170, 170), { type: 'fade', duration: 0.5 }, true));
}
function activitySlides(a: ActivityEntry, st: LayoutStyle, which: 'lab' | 'slideforge'): Slide[] {
  const notes = notesOf(a);
  const out = (a.slides ?? []).map((s, i) => {
    const made = build(a, s, st, which);
    carry(made, s, shapeOf(s), st, which);
    made.name = (a.slides?.length ?? 0) > 1 ? `${a.title} · ${i + 1}` : a.title;
    made.activity = { key: a.key, page: i, settings: settingsOf(a, s, which) };
    const own = made.notes ? `\n\n${made.notes}` : '';
    made.notes = i === 0 ? `${notes}${own}` : `Part ${i + 1} of ${a.title}; the brief is on its first slide.${own}`;
    return made;
  });
  return out;
}

/** How an activity slide runs, recorded as it is built: its look, and each stage's time and phone
 *  job (a routine) or its one time (any other shape). The Activity panel edits these. */
function settingsOf(a: ActivityEntry, s: SFSlide, which: 'lab' | 'slideforge'): ActivitySettings {
  const out: ActivitySettings = { look: which };
  if (shapeOf(s) === 'stages') out.stages = routineOf(a, s).stages.slice(0, 5).map((x) => ({ name: x.name, minutes: x.minutes, ...(x.jobKey ? { job: x.jobKey } : {}) }));
  else if (Number(s.timeLimit) > 0) out.seconds = Number(s.timeLimit);
  return out;
}

/** An activity slide built again in `which` design, from the catalogue: the same page, as added. */
export function rebuildActivity(a: ActivityEntry, page: number, st: LayoutStyle, which: 'lab' | 'slideforge'): Slide | null {
  const s = a.slides?.[page];
  if (!s || a.game) return null;
  const made = build(a, s, st, which);
  carry(made, s, shapeOf(s), st, which);
  made.activity = { key: a.key, page, settings: settingsOf(a, s, which) };
  return made;
}

/** An activity's two looks, by their names: the lab's, then SlideForge's. */
export function looksOf(a: ActivityEntry): [string, string] {
  return LABELS[a.slides?.[0] ? shapeOf(a.slides[0]) : 'rows'];
}

function gameOf(a: ActivityEntry): GameDef {
  const g = a.game!;
  return { title: a.title, style: g.style, styleLabel: g.styleLabel, steps: a.steps, questions: g.questions };
}

/** A game as slides, on the walls every game shares (games.ts): its cover, then its questions. */
function gameSlides(a: ActivityEntry, st: LayoutStyle): Slide[] {
  const out = activityGameSlides(gameOf(a), st);
  out.forEach((s, i) => { s.activity = { key: a.key, page: i }; if (i === 0) s.notes = `${notesOf(a)}\n\n${s.notes}`; });
  return out;
}

/** The ways an activity can go into a lesson: the lab's design first, then SlideForge's where it
 *  differs. A game has one. */
export function optionsFor(a: ActivityEntry): ActivityOption[] {
  // A game has one design, the one every game shares.
  if (a.game) return [{ id: 'lab', label: 'Add', make: (st) => gameSlides(a, st) }];
  const shape = a.slides?.[0] ? shapeOf(a.slides[0]) : 'rows';
  const [labLabel, sfLabel] = LABELS[shape];
  return [
    { id: 'lab', label: labLabel, make: (st) => activitySlides(a, st, 'lab') },
    { id: 'slideforge', label: sfLabel, make: (st) => activitySlides(a, st, 'slideforge') },
  ];
}

/** The catalogue's phases, in the order a lesson runs through them, each with its activities. */
export function byPhase(data: ActivityData) {
  const out: { phase: string; label: string; icon: string; items: ActivityEntry[] }[] = [];
  for (const a of data.activities) {
    let g = out.find((x) => x.phase === a.phase);
    if (!g) out.push((g = { phase: a.phase, label: a.phaseLabel, icon: a.phaseIcon, items: [] }));
    g.items.push(a);
  }
  return out;
}

export { type ShowcaseGame } from './games';
export { GAMES, LAB_GAMES, gameSlides } from './formats';
export { setFrame } from './kit';
