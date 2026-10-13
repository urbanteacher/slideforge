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
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LiveHost, type RoomShow, type RoomSlide, type SocketLike, type HostMessage } from '../src/live';

type Frame = { ms: number; seq: number; dir: string; data?: Record<string, unknown> };
type Step = { ms: number; what: string; answer?: { playerId: number; choice?: number; text?: string }; names?: string[]; team?: number };
const root = resolve(process.cwd(), '..');
type Rec = { host: Frame[]; steps: Step[] };
const load = (name: string) => JSON.parse(readFileSync(resolve(root, `tests/fixtures/sessions/${name}.json`), 'utf8')) as Rec;
const games = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/games.json'), 'utf8')) as unknown;
const list = (Array.isArray(games) ? games : ((games as { games?: unknown[] }).games ?? Object.values(games as object))) as { format: string; title: string; slides: Record<string, unknown>[] }[];

/** The recorded deck, as the room's steps: the section, How to play, the three questions, the scores. Its
 *  slide and game ids are the recorded deck's (read off the frames), as the relay's frames quote them. */
function recordedShow(rec: Rec, format: string): RoomShow {
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
  slides.push({ id: ids[k], title: `${starter.title} — scores`, text: '', activity: 'moment', gameId: gid, style: 'points', results: true });
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
  let lastAt = '';
  const out: Record<string, unknown>[] = [];
  for (const f of frames) {
    if (f.t === 'report') continue;
    if (f.t === 'at') { const k = JSON.stringify(f); if (k === lastAt) continue; lastAt = k; }
    const g: Record<string, unknown> = { ...f };
    for (const k of ID_KEYS) if (typeof g[k] === 'string' && g[k] !== '') g[k] = name(g[k] as string);
    out.push(g);
  }
  return out;
}

/** Feed a recording to the lab host and return it, the frames it sent, and the classic frames, normalised. */
async function replay(rec: Rec, format: string) {
  const sock = new Recorded();
  const host = new LiveHost({ url: 'ws://replay', show: recordedShow(rec, format), makeSocket: () => sock });

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
    else if (s.what === 'manual:answer') host.manualAnswer(s.answer!.playerId, s.answer!.text ?? s.answer!.choice!);
    else if (s.what === 'stop') ended = host.end();
  }
  await ended;

  const classic = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  return { host, classic: normalise(classic), lab: normalise(sock.sent as unknown as Record<string, unknown>[]) };
}

test('the lab host sends what the classic host sent for a Multiple choice game', async () => {
  const { host, classic, lab } = await replay(load('game-choice'), 'choice');
  assert.equal(classic.length, 23, 'host, manualAdd, begin, each slide (at, round, idle or question), two answers by key, three reveals, finish, end');
  assert.deepEqual(lab, classic);
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
  assert.deepEqual(lab, classic);
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
  assert.deepEqual(lab, classic);
  const asked = lab.filter((f) => f.t === 'question');
  assert.equal(asked.length, 3);
  for (const q of asked) { assert.deepEqual(q.options, []); assert.equal(q.style, 'type'); assert.equal(q.input, 'text'); }
  const reveals = lab.filter((f) => f.t === 'reveal');
  assert.deepEqual(reveals.map((r) => [r.correct, r.answer]).slice(0, 2), [[-1, 'mitochondria'], [-1, 'Au']]);
  assert.ok(lab.some((f) => f.t === 'manualAnswer' && f.text === 'Paris'), "the teacher's typed entry is sent as text");
  assert.equal(host.state.revealed.length, 3);
  assert.ok(host.state.ended);
});
