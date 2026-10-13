// The replay harness (lab-engine-plan M7): the lab host against a recording of the classic host. Shared by live-replay.test.ts
// and live-replay-spoken.test.ts; see live-replay.test.ts for what is normalised and what is left visible.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LiveHost, type RoomShow, type RoomSlide, type SocketLike, type HostMessage } from '../src/live';
import { bossHpOf, type Mechanic } from '../src/live/mechanics';

export type Frame = { ms: number; seq: number; dir: string; data?: Record<string, unknown> };
export type Step = { ms: number; what: string; answer?: { id?: string; playerId: number; choice?: number; text?: string; value?: number; order?: number[]; fill?: number[]; sort?: number[] }; names?: string[]; team?: number; recipient?: unknown; choice?: number; pid?: number; text?: string; button?: string };
export const root = resolve(process.cwd(), '..');
export type Rec = { host: Frame[]; steps: Step[] };
export const load = (name: string) => JSON.parse(readFileSync(resolve(root, `tests/fixtures/sessions/${name}.json`), 'utf8')) as Rec;
export const games = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/games.json'), 'utf8')) as unknown;
export const list = (Array.isArray(games) ? games : ((games as { games?: unknown[] }).games ?? Object.values(games as object))) as { format: string; title: string; slides: Record<string, unknown>[] }[];

/** The recorded deck, as the room's steps: the section, How to play, the three questions, the scores. Its
 *  slide and game ids are the recorded deck's (read off the frames), as the relay's frames quote them. */
export function recordedShow(rec: Rec, format: string, scores = true): RoomShow {
  const starter = list.find((g) => g.format === format)!;
  const sent = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  const ids = [...new Set(sent.filter((m) => m.t === 'at').map((m) => String(m.slideId)))];
  const gid = String(sent.find((m) => m.t === 'round')!.gameId);
  let k = 0;
  // What the lesson's lead game makes of the room (the first question's style): the phones' skin on every step that is not a question.
  const first = String(starter.slides.find((x) => x.type === 'quiz')?.style ?? '');
  const mechanic: Mechanic = first === 'race' || first === 'boss' || first === 'wordreveal' ? first : 'points';
  const slides: RoomSlide[] = starter.slides.map((s): RoomSlide => {
    const id = ids[k++];
    if (s.type === 'section') return { id, title: String(s.title), text: String(s.subtitle ?? ''), activity: 'moment', gameId: gid, style: mechanic };
    if (s.type === 'content') return { id, title: String(s.title), text: (s.bullets as string[]).join('\n'), activity: 'moment', gameId: gid, style: mechanic };
    return { id, title: String(s.question), text: String(s.question), activity: 'question', gameId: gid, style: String(s.style), quiz: { ...(s as object), id, gameId: gid } as RoomSlide['quiz'] };
  });
  if (scores) slides.push({ id: ids[k], title: `${starter.title} — scores`, text: '', activity: 'moment', gameId: gid, style: mechanic, results: true });
  // A race's track, a boss's HP from its own game's questions.
  const asked = slides.filter((x) => x.quiz).map((x) => x.quiz!);
  // How the room plays, as the recorded `host` frame says (a teams room has its team names).
  const hosted = sent.find((m) => m.t === 'host') as { mode: 'individual' | 'teams'; teams: { name: string }[] };
  return { title: starter.title, slides, mode: hosted.mode, teams: hosted.teams.map((t) => t.name), mechanic, ...(mechanic === 'race' ? { trackLength: 5 } : {}), ...(mechanic === 'boss' ? { bossHp: bossHpOf(asked) } : {}) };
}

/** A socket that is open at once, records what it is sent, and hands over whatever the test feeds it. */
export class Recorded implements SocketLike {
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

export const ID_KEYS = ['slideId', 'id', 'sourceSlideId', 'gameId'];
export function normalise(frames: Record<string, unknown>[]): Record<string, unknown>[] {
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
export function assertSame(lab: Record<string, unknown>[], classic: Record<string, unknown>[]) {
  const show = (f: unknown) => JSON.stringify(f, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
  const i = classic.findIndex((f, k) => show(f) !== show(lab[k]));
  if (i >= 0) console.log(classic.slice(Math.max(0, i - 4), i + 1).map((f) => f.t).join(','), '|', lab.slice(Math.max(0, i - 4), i + 2).map((f) => f.t).join(','));
  if (i >= 0) assert.fail(`frame ${i} differs\n classic ${show(classic[i])}\n lab     ${show(lab[i])}`);
  if (lab.length !== classic.length) console.log('tails', classic.slice(-3).map((f) => f.t).join(','), '|', lab.slice(-4).map((f) => f.t).join(','), JSON.stringify(lab[lab.length - 1]).slice(0, 200));
  assert.equal(lab.length, classic.length, 'the lab sent frames classic did not');
}

/** Feed a recording to the lab host and return it, the frames it sent, and the classic frames, normalised. */
/** `onStep`: a recorder step the kit does not know (a board's buttons), for the test to play on the host. */
export async function replay(rec: Rec, format: string, scores = true, tweak?: (show: RoomShow) => void, onStep?: (s: Step, host: LiveHost) => void) {
  const sock = new Recorded();
  const show = recordedShow(rec, format, scores);
  tweak?.(show);
  // What runs on time apart from the relay (Heads up's round and its move on after a verdict) runs on the recording's clock, so the
  // seconds left in a frame are the recorded ones: a timer set at `ms` for `d` is due at `ms + d`, and fires before the first event after that.
  const clock = { ms: 0, due: [] as { at: number; fn: () => void }[] };
  const host = new LiveHost({ url: 'ws://replay', show, makeSocket: () => sock, now: () => clock.ms, after: (fn, d) => { clock.due.push({ at: clock.ms + d, fn }); } });

  // The relay's frames and the recorder's steps, on the recording's one clock.
  type Ev = { ms: number; k: number; recv?: unknown; step?: Step };
  const evs: Ev[] = [
    ...rec.host.filter((f) => f.dir === 'recv').map((f) => ({ ms: f.ms, k: f.seq, recv: f.data })),
    ...rec.steps.map((s, i) => ({ ms: s.ms, k: 1e6 + i, step: s })),
  ].sort((a, b) => a.ms - b.ms || a.k - b.k);

  let ended: Promise<unknown> | null = null;
  for (const e of evs) {
    for (;;) {
      const due = clock.due.filter((d) => d.at <= e.ms).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      clock.due.splice(clock.due.indexOf(due), 1);
      clock.ms = due.at;
      due.fn();
    }
    clock.ms = e.ms;
    if (e.recv) { sock.feed(e.recv); continue; }
    const s = e.step!;
    if (s.what === 'hosting') { host.start(); await new Promise((r) => setTimeout(r, 0)); }
    else if (s.what === 'manual:add') host.manualAdd(s.names!, s.team ?? 0);
    else if (s.what === 'begin') host.begin();
    else if (s.what === 'next') host.next();
    else if (s.what === 'manual:answer') host.manualAnswer(s.answer!.playerId, s.answer!.order ? { order: s.answer!.order } : s.answer!.fill ? { fill: s.answer!.fill } : s.answer!.sort ? { sort: s.answer!.sort } : s.answer!.value != null ? { value: s.answer!.value } : s.answer!.text ?? s.answer!.choice!, s.answer!.id);
    else if (s.what === 'manual:recipient') host.recipient(s.recipient);
    else if (s.what === 'manual:verdictRoom') host.verdictRoom();
    else if (s.what === 'manual:revealWith') host.revealWith(s.choice!);
    else if (s.what === 'stop') ended = host.end();
    else onStep?.(s, host);
  }
  await ended;

  const classic = rec.host.filter((f) => f.dir === 'send').map((f) => f.data!);
  return { host, classic: normalise(classic), lab: normalise(sock.sent as unknown as Record<string, unknown>[]) };
}

