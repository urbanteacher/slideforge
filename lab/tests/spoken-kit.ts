// What the spoken games' unit tests share: a lesson of one spoken game, and a room opened on a fake relay with two phones in it.
import type { Slide } from '../src/core';
import { LiveHost, type HostMessage, type HostOptions, type SocketLike } from '../src/live';
import { shownDeck, stepsOf } from '../src/show/steps';
import { wallOf } from '../src/show/wallModel';

export const slide = (id: string, name: string, game?: Slide['game']) =>
  ({ id, name, background: '', layers: [], transition: { type: 'none', duration: 0 }, notes: '', game }) as unknown as Slide;
export const deckOf = (format: string, quizzes: object[], settings: object = {}) => ({ title: 'Spoken', slides: [
  slide('c', 'Cover', { id: 'g', format, label: 'Spoken', role: 'cover', settings } as never),
  ...quizzes.map((quiz, i) => slide(`q${i}`, `Q${i}`, { id: 'g', format, label: 'Spoken', role: 'question', key: String(i), settings, quiz } as never)),
] });
export const quiz = (style: string, extra: object = {}) => ({ type: 'quiz', style, input: 'choice', question: 'Say it', options: ['x'], correct: 0, points: 0, explanation: 'why', ...extra });

export class Fake implements SocketLike {
  readyState = 0;
  sent: HostMessage[] = [];
  private fns: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  constructor() { queueMicrotask(() => { this.readyState = 1; this.fire('open'); }); }
  addEventListener(type: string, fn: (ev: { data?: unknown }) => void) { (this.fns[type] ??= []).push(fn); }
  send(data: string) { this.sent.push(JSON.parse(data) as HostMessage); }
  close() { this.readyState = 3; this.fire('close'); }
  feed(m: unknown) { this.fire('message', JSON.stringify(m)); }
  private fire(type: string, data?: unknown) { for (const f of this.fns[type] ?? []) f({ data }); }
}

/** A room opened on a fake relay with two phones in it, the show begun and on its first question. */
export async function room(d: ReturnType<typeof deckOf>, mode: 'individual' | 'teams' = 'individual', opts: Partial<HostOptions> = {}) {
  const sock = new Fake();
  const { show, steps } = stepsOf(shownDeck(d));
  const host = new LiveHost({ url: 'ws://fake', show: { ...show, mode, teams: ['Red', 'Blue'] }, makeSocket: () => sock, ...opts });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed({ t: 'hosted', session: { id: 's', title: 'S', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode, teams: ['Red', 'Blue'] });
  sock.feed({ t: 'players', pin: '123456', joinUrl: 'http://x/join.html', joinOpen: true, waiting: 0, round: 0, mode, rows: [], counts: null, list: [
    { id: 1, name: 'Ada', score: 0, connected: true, away: false, manual: false, team: mode === 'teams' ? 0 : null },
    { id: 2, name: 'Bo', score: 0, connected: true, away: false, manual: false, team: mode === 'teams' ? 1 : null }] });
  host.begin();
  host.next(); // the first question
  const sent = (t: string) => sock.sent.filter((f) => f.t === t) as Record<string, unknown>[];
  const relayTook = (id: string) => { sock.feed({ t: 'teamAnswers', correct: 0, counts: [] }); sock.feed({ t: 'players', pin: '123456', joinUrl: 'http://x/join.html', joinOpen: false, waiting: 0, round: 1, mode, rows: [], counts: null, list: host.state.players }); return id; };
  const wall = (at = 1) => wallOf({ room: host.state, steps, at, scoresOn: false, fallbackJoin: '' });
  return { host, sock, show, sent, relayTook, wall };
}

