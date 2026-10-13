// The lab host against a recording of the classic host (tests/fixtures/sessions/game-choice.json, M0.2):
// the relay's side of the recording is fed to the lab host through a stand-in socket, the teacher's
// actions are replayed at the moments the recorder took them (its `steps`), and what the lab host sends
// must be what classic sent. lab-engine-plan M7, the replay harness.
//
// The show is the deck the recorder hosted (SlideForge's Multiple choice starter, lab/src/assets/games.json),
// step for step, so the comparison is of the host's wire behaviour. Turning a lab deck into a show
// (showFromDeck) is exercised end to end in live-host.test.ts.
//
// Normalised before comparing (the README leaves this to the replay):
//  - ids: slide, question, source-slide and game ids are renamed by order of first appearance, on each side;
//  - `report` frames are dropped from both: classic sends one from its overview pane's refresh (debounced,
//    and on every teacher-window `hello`), which is UI timing, not room behaviour. The lab host sends
//    `report` only when asked (LiveHost.report).
// Known gaps, left visible rather than normalised away beyond the rule below:
//  - classic sends every `at` twice on landing (once from onSlide, once more after the round check), the
//    second identical to the first; the relay takes the repeat as a no-op apart from re-broadcasting
//    `context`. The lab sends it once, so an `at` identical to the previous `at` is dropped from the
//    recording, and only then. The lab's `round` therefore follows the one `at`, as classic's first did.
//  - classic's Definition challenge sends every recall `question` twice (once as the slide asks it, once from its
//    `definitionAsk` event), the second identical to the first; the lab sends it once. A `question` identical to the one
//    sent just before it, with no other frame between, is dropped from the recording on the same grounds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LiveHost, type RoomShow, type RoomSlide, type SocketLike, type HostMessage } from '../src/live';

type Frame = { ms: number; seq: number; dir: string; data?: Record<string, unknown> };
type Step = { ms: number; what: string; answer?: { id?: string; playerId: number; choice?: number; text?: string; value?: number; order?: number[]; fill?: number[]; sort?: number[] }; names?: string[]; team?: number };
const root = resolve(process.cwd(), '..');
type Rec = { host: Frame[]; steps: Step[] };
const load = (name: string) => JSON.parse(readFileSync(resolve(root, `tests/fixtures/sessions/${name}.json`), 'utf8')) as Rec;
const games = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/games.json'), 'utf8')) as unknown;
const list = (Array.isArray(games) ? games : ((games as { games?: unknown[] }).games ?? Object.values(games as object))) as { format: string; title: string; slides: Record<string, unknown>[] }[];

/** The recorded deck, as the room's steps: the section, How to play, the three questions, the scores. Its
 *  slide and game ids are the recorded deck's (read off the frames), as the relay's frames quote them. */
function recordedShow(rec: Rec, format: string, scores = true): RoomShow {
  const starter = list.find((g) => g.format === format)!;
  const sent = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  const ids = [...new Set(sent.filter((m) => m.t === 'at').map((m) => String(m.slideId)))];
  const gid = String(sent.find((m) => m.t === 'round')!.gameId);
  let k = 0;
  const slides: RoomSlide[] = starter.slides.map((s): RoomSlide => {
    const id = ids[k++];
    if (s.type === 'section') return { id, title: String(s.title), text: String(s.subtitle ?? ''), activity: 'moment', gameId: gid, style: 'points' };
    if (s.type === 'content') return { id, title: String(s.title), text: (s.bullets as string[]).join('\n'), activity: 'moment', gameId: gid, style: 'points' };
    return { id, title: String(s.question), text: String(s.question), activity: 'question', gameId: gid, style: String(s.style), quiz: { ...(s as object), id, gameId: gid } as RoomSlide['quiz'] };
  });
  if (scores) slides.push({ id: ids[k], title: `${starter.title} — scores`, text: '', activity: 'moment', gameId: gid, style: 'points', results: true });
  return { title: starter.title, slides };
}

/** A socket that is open at once, records what it is sent, and hands over whatever the test feeds it. */
class Recorded implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open', {}); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { if (this.readyState === 3) return; this.readyState = 3; this.fire('close', {}); }
  feed(m: unknown) { this.fire('message', { data: JSON.stringify(m) }); }
  private fire(type: string, ev: { data?: unknown }) { for (const f of this.fns[type] ?? []) f(ev); }
}

const ID_KEYS = ['slideId', 'id', 'sourceSlideId', 'gameId'];
function normalise(frames: Record<string, unknown>[]): Record<string, unknown>[] {
  const ids = new Map<string, string>();
  const name = (v: string) => { if (!ids.has(v)) ids.set(v, `#${ids.size + 1}`); return ids.get(v)!; };
  let lastAt = '', lastQuestion = '';
  const out: Record<string, unknown>[] = [];
  for (const f of frames) {
    if (f.t === 'report') continue;
    if (f.t === 'at') { const k = JSON.stringify(f); if (k === lastAt) continue; lastAt = k; }
    if (f.t === 'question') { const k = JSON.stringify(f); if (k === lastQuestion) continue; lastQuestion = k; } else lastQuestion = '';
    const g: Record<string, unknown> = { ...f };
    for (const k of ID_KEYS) if (typeof g[k] === 'string' && g[k] !== '') g[k] = name(g[k] as string);
    out.push(g);
  }
  return out;
}

/** The frames are the same, in order; on a difference the first differing frame is the message (not the whole list). */
function assertSame(lab: Record<string, unknown>[], classic: Record<string, unknown>[]) {
  const show = (f: unknown) => JSON.stringify(f, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
  const i = classic.findIndex((f, k) => show(f) !== show(lab[k]));
  if (i >= 0) console.log(classic.slice(Math.max(0, i - 4), i + 1).map((f) => f.t).join(','), '|', lab.slice(Math.max(0, i - 4), i + 2).map((f) => f.t).join(','));
  if (i >= 0) assert.fail(`frame ${i} differs\n classic ${show(classic[i])}\n lab     ${show(lab[i])}`);
  if (lab.length !== classic.length) console.log('tails', classic.slice(-3).map((f) => f.t).join(','), '|', lab.slice(-4).map((f) => f.t).join(','), JSON.stringify(lab[lab.length - 1]).slice(0, 200));
  assert.equal(lab.length, classic.length, 'the lab sent frames classic did not');
}

/** Feed a recording to the lab host and return it, the frames it sent, and the classic frames, normalised. */
async function replay(rec: Rec, format: string, scores = true, tweak?: (show: RoomShow) => void) {
  const sock = new Recorded();
  const show = recordedShow(rec, format, scores);
  tweak?.(show);
  const host = new LiveHost({ url: 'ws://replay', show, makeSocket: () => sock });

  // The relay's frames and the recorder's steps, on the recording's one clock.
  type Ev = { ms: number; k: number; recv?: unknown; step?: Step };
  const evs: Ev[] = [
    ...rec.host.filter((f) => f.dir === 'recv').map((f) => ({ ms: f.ms, k: f.seq, recv: f.data })),
    ...rec.steps.map((s, i) => ({ ms: s.ms, k: 1e6 + i, step: s })),
  ].sort((a, b) => a.ms - b.ms || a.k - b.k);

  let ended: Promise<unknown> | null = null;
  for (const e of evs) {
    if (e.recv) { sock.feed(e.recv); continue; }
    const s = e.step!;
    if (s.what === 'hosting') { host.start(); await new Promise((r) => setTimeout(r, 0)); }
    else if (s.what === 'manual:add') host.manualAdd(s.names!, s.team ?? 0);
    else if (s.what === 'begin') host.begin();
    else if (s.what === 'next') host.next();
    else if (s.what === 'manual:answer') host.manualAnswer(s.answer!.playerId, s.answer!.order ? { order: s.answer!.order } : s.answer!.fill ? { fill: s.answer!.fill } : s.answer!.sort ? { sort: s.answer!.sort } : s.answer!.value != null ? { value: s.answer!.value } : s.answer!.text ?? s.answer!.choice!, s.answer!.id);
    else if (s.what === 'stop') ended = host.end();
  }
  await ended;

  const classic = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  return { host, classic: normalise(classic), lab: normalise(sock.sent as unknown as Record<string, unknown>[]) };
}

test('the lab host sends what the classic host sent for a Multiple choice game', async () => {
  const { host, classic, lab } = await replay(load('game-choice'), 'choice');
  assert.equal(classic.length, 23, 'host, manualAdd, begin, each slide (at, round, idle or question), two answers by key, three reveals, finish, end');
  assertSame(lab, classic);
  // The room as the host saw it: the relay's scores, and the questions it revealed.
  assert.equal(host.state.revealed.length, 3);
  assert.equal(host.state.scores[1], 3000, 'Ada answered all three right');
  assert.ok(host.state.ended);
});

// True or false (format 'truefalse', the plain one: its recording has no `showdown` frame, and the reveal follows the
// question at once). Showdown is the format 'true-false' (game-true-false.json): not ported, and still the classic
// host's, so it is not replayed here. The wire is Multiple choice's with two options and the style `truefalse`.
test('the lab host sends what the classic host sent for a True or false game', async () => {
  const rec = load('game-truefalse');
  assert.ok(!rec.host.some((f) => f.dir === 'send' && f.data?.t === 'showdown'), 'the plain True or false recording has no showdown');
  const { host, classic, lab } = await replay(rec, 'truefalse');
  assert.equal(classic.length, 23, 'the same frames as the Multiple choice game: host, manualAdd, begin, six steps, answers, reveals, finish, end');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.deepEqual(q.options, ['True', 'False']); assert.equal(q.style, 'truefalse'); assert.equal(q.input, 'choice'); }
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Type answer (format 'type', typed recall). The wire is a question with input 'text' and no options, a reveal
// with correct -1 and the first accepted spelling as the answer, and the teacher's typed entry as `text`. The
// recording's three phones typed "Paris" for each question (wrong all three), Dee was entered by key with "Paris",
// and one entry for a phone's row was refused by the relay (a `manualError`, not a lab frame). The show is the
// starter the recorder hosted.
test('the lab host sends what the classic host sent for a Type answer game', async () => {
  const { host, classic, lab } = await replay(load('game-type'), 'type');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.deepEqual(q.options, []); assert.equal(q.style, 'type'); assert.equal(q.input, 'text'); }
  const reveals = lab.filter((f) => f.t === 'reveal');
  assert.deepEqual(reveals.map((r) => [r.correct, r.answer]).slice(0, 2), [[-1, 'mitochondria'], [-1, 'Au']]);
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && f.text === 'Paris'), "the teacher's typed entry is sent as text");
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Slider (format 'slider', a numeric estimate; Time traveler is another format). The wire is a question with input
// 'number' and the line's range (min, max, step, unit), a reveal with correct -1 and the answer said with its unit,
// verdicts by the tolerance, and the teacher's number entry as `value`.
test('the lab host sends what the classic host sent for a Slider game', async () => {
  const { host, classic, lab } = await replay(load('game-slider'), 'slider');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 2);
  for (const q of asked) { assert.deepEqual(q.options, []); assert.equal(q.style, 'slider'); assert.equal(q.input, 'number'); assert.ok(q.range); }
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && f.value === 1990), "the teacher's number entry is sent as value");
  assert.equal(host.state.revealed.length, 2);
  assert.ok(host.state.ended);
});

// Ranking (format 'ranking', style 'order'). The wire is a question with input 'order' (the items in their right order),
// the teacher's entry as `order`, and a reveal that carries the host's part marks: `gains` of round(10 x the share in
// place) per answer, beside the verdicts (right only when every item is in place). Two phones answered the right
// order, one the reverse, and Dee was entered by key with the reverse.
test('the lab host sends what the classic host sent for a Ranking game', async () => {
  const { host, classic, lab } = await replay(load('game-ranking'), 'ranking');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 2);
  for (const q of asked) { assert.equal(q.style, 'order'); assert.equal(q.input, 'order'); assert.equal((q.options as string[]).length, 4); }
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && Array.isArray(f.order)), "the teacher's entry is sent as an order");
  const reveals = lab.filter((f) => f.t === 'reveal');
  assert.deepEqual(reveals[0].gains, [[1, 10], [2, 0], [3, 10], [4, 0]]);
  assert.equal(host.state.revealed.length, 2);
  assert.ok(host.state.ended);
});

// Odd one out (format 'odd-one-out', style 'oddone'): an unmarked vote (marks [], no points), never revealed by itself,
// the phones told their role (`discuss`) in `at` and in the question, and after each reveal a brainstorm prompt
// ("defend a pick") that closes on the next step. The game has no scores slide, so the show ends on its last question.
test('the lab host sends what the classic host sent for an Odd one out game', async () => {
  const { host, classic, lab } = await replay(load('game-odd-one-out'), 'odd-one-out', false);
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 4);
  for (const q of asked) { assert.equal(q.unmarked, true); assert.equal(q.input, 'choice'); assert.equal(q.headPrompt, 'Odd one out'); assert.equal(q.points, 0); }
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => r.marks), [[], [], [], []]);
  assert.equal(lab.filter((f) => f.t === 'prompt').length, 4, 'a defence prompt after each reveal');
  assert.equal(lab.filter((f) => f.t === 'promptEnd').length, 3, 'closed when the show moves on (the last ends with the room)');
  assert.equal(host.state.revealed.length, 4);
  assert.ok(host.state.ended);
});

// Predict the outcome (format 'predict-outcome', the choice engine with `predict`). The question frame carries
// `predict: true`; the first Next locks the predictions (`closeAnswers`), the second reveals; the reveal carries the
// host's bet gains (right and sure x1.5, right x1, wrong and sure -x0.5, wrong and unsure 0).
test('the lab host sends what the classic host sent for a Predict the outcome game', async () => {
  const { host, classic, lab } = await replay(load('game-predict-outcome'), 'predict-outcome');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 2);
  for (const q of asked) { assert.equal(q.predict, true); assert.equal(q.confidence, true); }
  const t = lab.map((f) => f.t);
  assert.deepEqual(t.filter((x) => x === 'closeAnswers' || x === 'reveal'), ['closeAnswers', 'reveal', 'closeAnswers', 'reveal'], 'lock, then reveal, for each question');
  assert.deepEqual(lab.filter((f) => f.t === 'reveal')[0].gains, [[1, 1500], [2, 0], [3, -500], [4, 0]]);
  assert.equal(host.state.revealed.length, 2);
  assert.ok(host.state.ended);
});

// True / false showdown (format 'true-false'; style 'truefalse' with `showdown`). The question frame carries
// `showdown: true`; the first Next shows the room its split (`showdown`), the phones may switch once, the next Next
// reveals the final answers. (The relay's `tally` carries `split` and `switched`, which the host does not send back.)
test('the lab host sends what the classic host sent for a True / false showdown game', async () => {
  const { host, classic, lab } = await replay(load('game-true-false'), 'true-false');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.showdown, true); assert.equal(q.style, 'truefalse'); assert.deepEqual(q.options, ['True', 'False']); }
  assert.deepEqual(lab.map((f) => f.t).filter((x) => x === 'showdown' || x === 'reveal'), ['showdown', 'reveal', 'showdown', 'reveal', 'showdown', 'reveal']);
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Time traveler (format 'time-traveler', the slider engine). The question frame is Slider's with `timeTravel: true` and
// the timeline of the events already placed (it grows a round at a time), on one line for the whole game; the reveal says
// the year. (The starter's questions are the recorded ones, with their span and timelines already compiled.)
test('the lab host sends what the classic host sent for a Time traveler game', async () => {
  const { host, classic, lab } = await replay(load('game-time-traveler'), 'time-traveler');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.timeTravel, true); assert.equal(q.input, 'number'); assert.equal(q.style, 'slider'); }
  assert.deepEqual(asked.map((q) => (q.timeline as unknown[]).length), [0, 1, 2], 'the timeline grows');
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => r.answer), ['1666', '1928', '1969']);
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Spot the error (format 'spot-the-error', style 'spot', tap input). The question's options are the passage's words and
// its input is 'tap'; the `at` and the question carry the heading; the reveal says the correction (`answer`) with `correct`
// the word the error starts on, and marks a tap anywhere in the error's words. The phones' taps are held off the wall until
// then (a wall matter, not a frame). The game has no scores slide, so the show ends on its last answer.
test('the lab host sends what the classic host sent for a Spot the error game', async () => {
  const { host, classic, lab } = await replay(load('game-spot-the-error'), 'spot-the-error', false);
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 4);
  for (const q of asked) { assert.equal(q.input, 'tap'); assert.equal(q.style, 'spot'); assert.equal(q.headPrompt, 'There is one error in this sentence. Find it.'); }
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => r.answer), ['mitochondria → chloroplasts', 'fastest → not at all', '6 → 3', 'Scotland → England']);
  assert.equal(host.state.revealed.length, 4);
  assert.ok(host.state.ended);
});

// Definition challenge (format 'definition-challenge', style 'definition'): a reading phase, then the recall question. On
// landing the room is told to watch (`at` with role `watch`, then `idle` with the same words) and nothing is asked; the
// teacher's Next asks it (`at` with the heading "Recall from memory", then `question`), the next reveals by the typed answer.
// The recording's two teacher entries came during the reading, before the question: the relay refuses them (not a lab frame).
test('the lab host sends what the classic host sent for a Definition challenge game', async () => {
  const { host, classic, lab } = await replay(load('game-definition-challenge'), 'definition-challenge');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.input, 'text'); assert.equal(q.style, 'definition'); assert.equal(q.headPrompt, 'Recall from memory'); assert.deepEqual(q.options, []); }
  const idles = lab.filter((f) => f.t === 'idle' && f.role === 'watch');
  assert.equal(idles.length, 3, 'one reading phase a question, the phones idle');
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => [r.correct, r.answer]), [[-1, 'the catalyst'], [-1, 'water'], [-1, 'it is lost']]);
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Emoji guess (format 'emoji-guess', style 'emoji'). A typed question whose frame carries the clues (`clueMode`, `clues`);
// the teacher's Nexts release the help before the reveal: each is an `at` with the next `step`, and the hint (the last) is
// preceded by `hintOut`. The puzzles are easy (the hint is the one step), medium (the pattern, then the hint) and hard (the
// hint). The relay halves what is answered after `hintOut`, so the reveal carries no gains.
test('the lab host sends what the classic host sent for an Emoji guess game', async () => {
  const { host, classic, lab } = await replay(load('game-emoji-guess'), 'emoji-guess');
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.input, 'text'); assert.equal(q.style, 'emoji'); assert.equal(q.clueMode, 'emoji'); assert.equal(q.headPrompt, 'What do these clues point to?'); }
  assert.equal(lab.filter((f) => f.t === 'hintOut').length, 3, 'one hint a puzzle');
  assert.deepEqual(lab.filter((f) => f.t === 'at' && f.activity === 'question').map((f) => f.step), [0, 1, 0, 1, 2, 0, 1], 'the steps released, easy: hint; medium: pattern, hint; hard: hint');
  assert.ok(lab.filter((f) => f.t === 'reveal').every((r) => r.gains === undefined));
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

/** Fill the gaps, Compare & contrast's sort: classic shuffles the word bank (the statements) at random when it compiles a game, so
 *  the recording has its own draw and the starter another. The recorded draw is put on the show's questions, from the question
 *  frames the recorder saw, as classic's compile would have left them: a Fill's gaps from the words each reveal said; a sort's
 *  columns from the starter's own statement and column, re-ordered to the recorded statements (its reveal says nothing). */
function withRecordedDraw(rec: Rec, kind: 'fill' | 'sort') {
  return (show: RoomShow) => {
    const sent = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
    const frames = sent.filter((m) => m.t === 'question'), reveals = sent.filter((m) => m.t === 'reveal');
    show.slides.filter((s) => s.quiz).forEach((s, i) => {
      const q = s.quiz as unknown as Record<string, unknown>, options = frames[i].options as string[], said = String(reveals[i].answer);
      const before = { options: q.options, sortAnswers: q.sortAnswers };
      q.options = options;
      if (kind === 'fill') q.gapAnswers = said.split(' · ').map((w) => options.findIndex((o) => o.toLowerCase() === w.toLowerCase()));
      else {
        const was = new Map((before.options as string[]).map((o, k) => [o, (before.sortAnswers as number[])[k]]));
        q.sortAnswers = options.map((o) => was.get(o)!);
      }
    });
  };
}

// Fill in the blanks (format 'fill-in-the-blanks', style 'fill'). The question frame is input 'fill' with the word bank in
// `options` and the text around the gaps in `fillParts`; the reveal says the right words (`answer`, `correct` -1) with the
// host's part marks: `gains` of round(points x the share of gaps right) per answer, beside the verdicts (right only when every
// gap is). The teacher's entry is a word per gap (`fill`). The recording's word bank is its own draw (see withRecordedDraw).
test('the lab host sends what the classic host sent for a Fill in the blanks game', async () => {
  const rec = load('game-fill-in-the-blanks');
  const { host, classic, lab } = await replay(rec, 'fill-in-the-blanks', true, withRecordedDraw(rec, 'fill'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.equal(q.input, 'fill'); assert.equal(q.style, 'fill'); assert.ok(Array.isArray(q.fillParts)); assert.equal((q.options as string[]).length, 5); }
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && Array.isArray(f.fill)), "the teacher's entry is sent as a word per gap");
  assert.deepEqual(lab.filter((f) => f.t === 'reveal').map((r) => r.gains), [[[1, 0], [2, 500], [3, 0], [4, 0]], [[1, 0], [2, 0], [3, 1000]], [[1, 500], [2, 0], [3, 0]]]);
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});

// Compare & contrast, the sort (format 'compare-contrast', style 'compare', input 'sort'). The `at` and the question give the
// phones no role and the heading "Sort it"; the question frame names the columns (`bins`) and carries the statements as options;
// the teacher's entry is a column per statement (`sort`); the reveal has no answer in words and carries `gains` of
// round(points x the share right) (the sort's points are 0 here, so every gain is 0). No scores slide. The statements' order is
// the recording's own draw (see withRecordedDraw). Two late markStale frames show two things in the host: one for a question the
// show has left (the third) is not answered, and one after `end` (the fourth) is not either, as classic's are not.
test('the lab host sends what the classic host sent for a Compare & contrast game', async () => {
  const rec = load('game-compare-contrast');
  const { host, classic, lab } = await replay(rec, 'compare-contrast', false, withRecordedDraw(rec, 'sort'));
  assertSame(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 4);
  for (const q of asked) { assert.equal(q.input, 'sort'); assert.equal(q.style, 'compare'); assert.equal(q.headPrompt, 'Sort it'); assert.equal((q.bins as string[]).length, 3); assert.equal((q.bins as string[])[1], 'Both'); }
  assert.deepEqual(asked[0].bins, ['Photosynthesis only', 'Both', 'Respiration only']);
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && Array.isArray(f.sort)), "the teacher's entry is sent as a column per statement");
  assert.ok(lab.filter((f) => f.t === 'reveal').every((r) => r.answer === '' && r.correct === -1));
  // The relay took the first two reveals and refused the last two as stale (answers came in after the marks were made, `markStale`);
  // by then the show had moved on, and neither host sends them again. The teacher's Next still moved on from each, as classic's did.
  assert.equal(lab.filter((f) => f.t === 'reveal').length, 4);
  assert.equal(host.state.revealed.length, 2);
  assert.ok(host.state.ended);
});
