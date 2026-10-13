// Audience feedback in the studio's room (lab-engine-plan M9): poll, word cloud, brainstorm and scale. Fast, no browser:
//  - the host against the classic recordings (tests/fixtures/sessions/feedback-*.json): the frames it sends on a
//    feedback slide (at, prompt, idle) and on leaving it (at, promptEnd, idle) are the ones classic sent, and the
//    relay's `responses` are kept as the room's digest (same normalising as live-replay.test.ts);
//  - the teacher's close, and a held prompt;
//  - routing: a lesson of feedback slides and/or room games is hosted in the studio;
//  - the wall's view models: poll bars, the scale's spread with its ends, the sized word cloud, the idea cards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Slide } from '../src/core';
import { LiveHost, emptyRoom, feedbackOf, showFromDeck, type HostMessage, type RoomShow, type RoomSlide, type RoomState, type SocketLike } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import { cloudOf, feedbackWallOf, IDEAS_RAIL, WORD_MAX, WORD_MIN } from '../src/show/feedbackWall';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

type Frame = { ms: number; seq: number; dir: string; data?: Record<string, unknown> };
type Step = { ms: number; what: string; names?: string[]; team?: number };
type Rec = { deck: { feedback: Record<string, unknown> }; host: Frame[]; steps: Step[] };
const load = (name: string) => JSON.parse(readFileSync(resolve(process.cwd(), '..', `tests/fixtures/sessions/${name}.json`), 'utf8')) as Rec;

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

/** The recorded lesson as the room's steps: each slide the host landed on, the middle one asking the recorded feedback. */
function recordedShow(rec: Rec): RoomShow {
  const ats = rec.host.filter((f) => f.dir === 'send' && f.data?.t === 'at').map((f) => f.data!);
  const seen = new Set<string>();
  const slides: RoomSlide[] = [];
  for (const a of ats) {
    const id = String(a.slideId);
    if (seen.has(id)) continue;
    seen.add(id);
    const base = { id, title: String(a.title), text: String(a.text), style: String(a.style) };
    const feedback = a.activity === 'feedback' ? feedbackOf({ id, feedback: rec.deck.feedback } as unknown as Slide) : null;
    slides.push(feedback ? { ...base, activity: 'feedback', feedback } : { ...base, activity: 'content' });
  }
  return { title: String(rec.host.find((f) => f.data?.t === 'host')!.data!.title), slides };
}

const ID_KEYS = ['slideId', 'id'];
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

async function replay(name: string) {
  const rec = load(name);
  const sock = new Recorded();
  const host = new LiveHost({ url: 'ws://replay', show: recordedShow(rec), makeSocket: () => sock });
  type Ev = { ms: number; k: number; recv?: unknown; step?: Step };
  const evs: Ev[] = [
    ...rec.host.filter((f) => f.dir === 'recv').map((f) => ({ ms: f.ms, k: f.seq, recv: f.data })),
    ...rec.steps.map((s, i) => ({ ms: s.ms, k: 1e6 + i, step: s })),
  ].sort((a, b) => a.ms - b.ms || a.k - b.k);
  const digests: RoomState['feedback'][] = [];
  host.subscribe((s) => { if (s.feedback?.digest) digests.push(s.feedback); });
  let ended: Promise<unknown> | null = null;
  for (const e of evs) {
    if (e.recv) { sock.feed(e.recv); continue; }
    const s = e.step!;
    if (s.what === 'hosting') { host.start(); await new Promise((r) => setTimeout(r, 0)); }
    else if (s.what === 'manual:add') host.manualAdd(s.names!, s.team ?? 0);
    else if (s.what === 'begin') host.begin();
    else if (s.what === 'next') host.next();
    else if (s.what === 'stop') ended = host.end();
  }
  await ended;
  const classic = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  return { host, sock, digests, classic: normalise(classic), lab: normalise(sock.sent as unknown as Record<string, unknown>[]) };
}

for (const kind of ['poll', 'wordcloud', 'brainstorm', 'scale']) {
  test(`the lab host sends what the classic host sent for a ${kind}: the prompt on the slide, promptEnd on leaving it`, async () => {
    const { classic, lab, digests, host } = await replay(`feedback-${kind}`);
    assert.deepEqual(lab, classic);
    const prompt = lab.find((f) => f.t === 'prompt')!;
    assert.equal(prompt.kind, kind);
    assert.ok(lab.findIndex((f) => f.t === 'prompt') < lab.findIndex((f) => f.t === 'promptEnd'));
    // The relay's digest is kept as the room's, and cleared when the prompt ends.
    assert.ok(digests.length >= 3, 'a digest for each reply');
    assert.equal(digests.at(-1)!.digest!.kind, kind);
    assert.equal(host.state.feedback, null);
  });
}

test('the teacher closes a prompt: promptEnd, and it stays closed until the show leaves the slide; held results are shown by the teacher', async () => {
  const rec = load('feedback-poll');
  const sock = new Recorded();
  const show = recordedShow(rec);
  show.slides[1].feedback!.hold = true;
  const host = new LiveHost({ url: 'ws://replay', show, makeSocket: () => sock });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed({ t: 'hosted', session: { id: 's', title: 't', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] });
  host.begin();
  host.next(); // the poll
  const ts = () => sock.sent.map((m) => m.t);
  const fbs = () => host.state.feedback;
  assert.equal(sock.sent.filter((m) => m.t === 'prompt').length, 1);
  assert.equal((sock.sent.find((m) => m.t === 'prompt') as { hold: boolean }).hold, true);
  assert.equal(fbs()?.shown, false);
  host.showFeedback();
  assert.equal(fbs()?.shown, true);
  host.closeFeedback();
  assert.equal(fbs(), null);
  assert.equal(ts().filter((t) => t === 'promptEnd').length, 1);
  host.goTo(1); // the same slide again (a redraw): still closed
  assert.equal(ts().filter((t) => t === 'prompt').length, 1);
  host.next(); // leaves the slide: nothing open to end
  assert.equal(ts().filter((t) => t === 'promptEnd').length, 1);
  host.goTo(1); // coming back opens it again, fresh
  assert.equal(ts().filter((t) => t === 'prompt').length, 2);
  assert.equal(fbs()?.shown, false);
});

// ---- the lab deck, the routing

const slide = (id: string, name: string, extra: Partial<Slide> = {}) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', ...extra }) as unknown as Slide;
const poll = { kind: 'poll', prompt: 'Ready to move on?', options: ['Yes', 'No', 'Not sure'], max: 1, presentAs: 'rail' };
const scale = { kind: 'scale', prompt: 'How confident are you?', points: 5, lowLabel: 'Not at all', highLabel: 'Completely', presentAs: 'focus' };

test('a slide with feedback is a step that asks it, with the fields classic sends; an incomplete one is only a slide', () => {
  const { slides } = showFromDeck({ title: 'T', slides: [slide('a', 'A'), slide('p', 'Poll', { feedback: poll } as never), slide('s', 'Scale', { feedback: scale } as never), slide('x', 'Empty', { feedback: { kind: 'poll', prompt: '' } } as never)] });
  assert.deepEqual(slides.map((s) => s.activity), ['content', 'feedback', 'feedback', 'content']);
  assert.deepEqual(slides[1].feedback, { id: 'p:fb', kind: 'poll', prompt: 'Ready to move on?', options: ['Yes', 'No', 'Not sure'], ends: null, max: 1, presentAs: 'rail', hold: false });
  assert.deepEqual(slides[2].feedback, { id: 's:fb', kind: 'scale', prompt: 'How confident are you?', options: ['1', '2', '3', '4', '5'], ends: { low: 'Not at all', high: 'Completely' }, max: 1, presentAs: 'focus', hold: false });
});

test('canHostInStudio: a lesson of feedback slides is hosted in the studio; a game slide that also asks, and nothing to ask, are not', () => {
  assert.deepEqual(canHostInStudio({ slides: [slide('a', 'A'), slide('p', 'Poll', { feedback: poll } as never)] }), { ok: true, reason: '' });
  assert.match(canHostInStudio({ slides: [slide('a', 'A'), slide('e', 'Empty', { feedback: { kind: 'poll' } } as never)] }).reason, /no .* question or feedback prompt/);
  const g = slide('g', 'G', { game: { id: 'g1', format: 'choice', label: 'Air', role: 'cover', settings: {} }, feedback: poll } as never);
  assert.match(canHostInStudio({ slides: [slide('p', 'Poll', { feedback: poll } as never), g] }).reason, /game slide that also asks the room for poll feedback/);
  assert.equal(canHostInStudio({ slides: [slide('p', 'Poll', { feedback: poll, hidden: true } as never)] }).ok, false, 'a hidden slide is not in the show');
});

// ---- the wall

const open = (p: Record<string, unknown>, digest: unknown, over: Record<string, unknown> = {}) => ({
  prompt: { id: 'x:fb', ends: null, max: 1, presentAs: 'rail', hold: false, options: [], ...p }, shown: false, answered: 3, players: 4, digest, ...over,
}) as never;

test('poll: a bar per option with its count and share; the leading option is marked; held shows only the count until shown', () => {
  const o = { kind: 'poll', prompt: 'Ready?', options: ['Yes', 'No', 'Not sure'] };
  const fb = feedbackWallOf(open(o, { kind: 'poll', counts: [2, 1, 1], total: 4 }));
  assert.deepEqual(fb.bars.map((b) => [b.label, b.count, b.pct, b.leading]), [['Yes', 2, 50, true], ['No', 1, 25, false], ['Not sure', 1, 25, false]]);
  assert.equal(fb.said, '3 of 4 answered. Yes leads.');
  assert.deepEqual(feedbackWallOf(open(o, null)).bars.map((b) => b.count), [0, 0, 0], 'before any reply the bars are empty');
  const held = feedbackWallOf(open({ ...o, hold: true }, { kind: 'poll', counts: [2, 1, 1], total: 4 }));
  assert.deepEqual([held.held, held.bars.length, held.said], [true, 0, '3 of 4 answered. Results are held.']);
  assert.equal(feedbackWallOf(open({ ...o, hold: true }, { kind: 'poll', counts: [2, 1, 1], total: 4 }, { shown: true })).bars.length, 3);
});

test('scale: the spread over the points with both ends named, and the average', () => {
  const fb = feedbackWallOf(open({ kind: 'scale', prompt: 'Confident?', options: ['1', '2', '3', '4', '5'], ends: { low: 'Not at all', high: 'Completely' }, presentAs: 'focus' }, { kind: 'scale', counts: [1, 0, 1, 2, 0], total: 4 }));
  assert.equal(fb.presentAs, 'focus');
  assert.deepEqual(fb.scale!.points.map((p) => p.count), [1, 0, 1, 2, 0]);
  assert.deepEqual([fb.scale!.low, fb.scale!.high, fb.scale!.mean], ['Not at all', 'Completely', '3.0']);
  assert.equal(feedbackWallOf(open({ kind: 'scale', options: ['1', '2', '3'], ends: { low: 'a', high: 'b' } }, null)).scale!.mean, null);
});

test('word cloud: sized by count, between the least and the most, largest in the middle; the same words give the same cloud', () => {
  const words = [{ text: 'energy', n: 4 }, { text: 'cells', n: 2 }, { text: 'atoms', n: 2 }, { text: 'heat', n: 1 }, { text: 'light', n: 1 }];
  const cloud = cloudOf(words);
  assert.deepEqual(cloud, cloudOf([...words].reverse()));
  const sizes = Object.fromEntries(cloud.map((w) => [w.text, w.size]));
  assert.equal(sizes.energy, WORD_MAX);
  assert.ok(sizes.cells > sizes.heat && sizes.heat >= WORD_MIN);
  assert.ok(Math.min(...Object.values(sizes)) >= 36, 'wall text is 36px at 1920 wide or more');
  assert.equal(cloud[Math.floor(cloud.length / 2)].text, 'energy', 'the biggest word sits in the middle of the row');
  const fb = feedbackWallOf(open({ kind: 'wordcloud', prompt: 'One word' }, { kind: 'wordcloud', words, total: 10, unique: 5 }));
  assert.equal(fb.words.length, 5);
  assert.equal(fb.total, 10);
});

test('brainstorm: idea cards newest first with names, fewer in the rail than in the full-screen view', () => {
  const items = Array.from({ length: 14 }, (_, i) => ({ name: `P${i}`, pid: i, text: `idea ${i}`, seq: 140 - i }));
  const d = { kind: 'brainstorm', items, total: 14 };
  const rail = feedbackWallOf(open({ kind: 'brainstorm', prompt: 'Try first?' }, d));
  assert.equal(rail.ideas.length, IDEAS_RAIL);
  assert.deepEqual(rail.ideas[0], { key: '140', name: 'P0', text: 'idea 0' });
  assert.equal(feedbackWallOf(open({ kind: 'brainstorm', prompt: 'Try first?', presentAs: 'focus' }, d)).ideas.length, 12);
});

test('the wall shows the feedback view on a feedback step, with the prompt open, and the slide again once it is closed', () => {
  const { steps } = stepsOf(shownDeck({ title: 'T', width: 1920, height: 1080, slides: [slide('a', 'A'), slide('p', 'Poll', { feedback: poll } as never)] } as never));
  const room: RoomState = {
    ...emptyRoom(), connected: true, live: true, pin: '123456', joinUrl: 'http://10.0.0.5:8787/join.html', phase: 'idle',
    players: [1, 2].map((id) => ({ id, name: `P${id}`, score: 0, connected: true, away: false, manual: false, team: null })),
    feedback: open({ kind: 'poll', prompt: 'Ready to move on?', options: ['Yes', 'No', 'Not sure'] }, { kind: 'poll', counts: [1, 0, 0], total: 1 }, { prompt: { id: 'p:fb', kind: 'poll', prompt: 'Ready to move on?', options: ['Yes', 'No', 'Not sure'], ends: null, max: 1, presentAs: 'rail', hold: false } }),
  };
  const input = { steps, at: 1, scoresOn: false, fallbackJoin: '' };
  const w = wallOf({ ...input, room });
  assert.equal(w.view, 'feedback');
  assert.equal(w.rail, null, 'the prompt takes the standings\' place');
  assert.equal(w.feedback!.bars[0].count, 1);
  assert.equal(wallOf({ ...input, room: { ...room, feedback: null } }).view, 'slide', 'closed: the slide');
  assert.equal(wallOf({ ...input, at: 0, room }).view, 'slide', 'a prompt left open from another slide is not drawn');
});
