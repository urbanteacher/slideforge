// M11a: the Teacher Presenter's message protocol, the notes channel's frames, and the bar's jump and overview logic.
// No browser: a BroadcastChannel pair and a WebSocket are stood in for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Deck } from '../src/core';
import type { SocketLike } from '../src/live';
import { PRESENTER_CHANNEL, ShowSide, WindowSide, parseToShow, parseToWindow, type ChannelLike, type PresenterCmd, type PresenterState } from '../src/presenter/protocol';
import { clock, parseCountdown, remaining } from '../src/presenter/timer';
import { gridColumns, gridMove, jumpTarget, presenterState, prompterFrame, pushDigit, slideTitle } from '../src/show/desk';
import { PrompterLink, prompterLinkFor } from '../src/show/prompter';
import type { Wall } from '../src/show/wallModel';

/** Channels of one name that hear each other (not themselves), as BroadcastChannel does. */
function bus() {
  const all: { name: string; ch: ChannelLike }[] = [];
  const make = (name: string): ChannelLike => {
    const ch: ChannelLike = {
      onmessage: null, close() { const i = all.findIndex((x) => x.ch === ch); if (i >= 0) all.splice(i, 1); },
      postMessage(m) { const copy = JSON.parse(JSON.stringify(m)); for (const x of [...all]) if (x.name === name && x.ch !== ch) x.ch.onmessage?.({ data: copy }); },
    };
    all.push({ name, ch });
    return ch;
  };
  return make;
}

const deck = (n: number, notes = true): Deck => ({
  title: 'Air', width: 1920, height: 1080,
  slides: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Slide ${i + 1} name`, notes: notes ? `note ${i + 1}` : '', layers: [] })),
} as unknown as Deck);

const state = (over: Partial<PresenterState> = {}): PresenterState => ({ index: 0, total: 3, title: 'a', notes: '', nextTitle: 'b', deck: 'Air', startedAt: 1, screen: 'none', room: null, ...over });

test('a window that says hello gets the deck and the state; later states and commands pass between the ends', () => {
  const make = bus();
  const cmds: [PresenterCmd, number | undefined][] = [];
  const show = new ShowSide(deck(3), state(), (c, n) => cmds.push([c, n]), make);
  const got: string[] = [];
  let seen: PresenterState | null = null;
  const win = new WindowSide({ deck: (d, s) => { got.push(`deck:${d.slides.length}`); seen = s; }, state: (s) => { seen = s; got.push(`state:${s.index}`); }, bye: () => got.push('bye') }, make);
  assert.deepEqual(got, ['deck:3']);
  show.publish(state({ index: 2 }));
  assert.equal(seen!.index, 2);
  win.send('next');
  win.send('goto', 3);
  assert.deepEqual(cmds, [['next', undefined], ['goto', 3]]);
  show.close();
  assert.equal(got.at(-1), 'bye');
  win.close();
});

test('the show keeps working with no window: publishing and closing say nothing to nobody', () => {
  const make = bus();
  const show = new ShowSide(deck(2), state(), () => assert.fail('no command'), make);
  show.publish(state({ index: 1 }));
  show.close();
});

test('messages are checked: unknown commands and shapes are dropped, a goto number is whole', () => {
  assert.equal(parseToShow({ t: 'cmd', cmd: 'explode' }), null);
  assert.equal(parseToShow({ t: 'nope' }), null);
  assert.equal(parseToShow('x'), null);
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'goto', n: '4.7' }), { t: 'cmd', cmd: 'goto', n: 4 });
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'next' }), { t: 'cmd', cmd: 'next', n: undefined });
  // The quick poll carries what to ask; a poll without a question and a kind is dropped to a bare command.
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'poll', poll: { kind: 'poll', prompt: 'Q', options: ['A', 'B'] } }), { t: 'cmd', cmd: 'poll', n: undefined, poll: { kind: 'poll', prompt: 'Q', options: ['A', 'B'] } });
  assert.deepEqual(parseToShow({ t: 'cmd', cmd: 'poll', poll: 'x' }), { t: 'cmd', cmd: 'poll', n: undefined });
  assert.equal(parseToWindow({ t: 'state' }), null);
  assert.equal(parseToWindow({ t: 'bye' })?.t, 'bye');
  assert.equal(PRESENTER_CHANNEL, 'slideforge.lab.presenter.v1');
});

test('the desk state: this slide, the next, the notes, and the room status', () => {
  const d = deck(3);
  const wall = { view: 'question', players: [{ id: 1, name: 'a', connected: true }, { id: 2, name: 'b', connected: true }], question: { answered: 1, players: 2 } } as unknown as Wall;
  const s = presenterState({ deck: d, index: 1, startedAt: 5, screen: 'black', room: { wall, connected: true, pin: '123456', canClose: false, canShow: false } });
  assert.equal(s.title, 'Slide 2 name');
  assert.equal(s.notes, 'note 2');
  assert.equal(s.nextTitle, 'Slide 3 name');
  assert.equal(s.screen, 'black');
  assert.deepEqual(s.room, { pin: '123456', connected: true, players: 2, view: 'question', open: true, answered: 1, total: 2, revealed: false, canClose: false, canShow: false, quick: false, canPoll: false,
    floor: 'auto', roomView: 'beside', phonesBlank: false, blankSoonAt: 0, reactions: true, joinCard: false, canAgain: false, answers: [], entry: null });
  assert.equal(presenterState({ deck: d, index: 2, startedAt: 5, screen: 'none' }).nextTitle, '');
  assert.equal(presenterState({ deck: d, index: 0, startedAt: 5, screen: 'none' }).room, null);
});

test('the notes frame is the one classic sends: titles, notes, the next, the deck, when it began', () => {
  const f = prompterFrame(deck(3), 0, 99);
  assert.deepEqual(f, { index: 0, total: 3, title: 'Slide 1 name', notes: 'note 1', next: 'Slide 2 name', deck: 'Air', startedAt: 99 });
  assert.equal(prompterFrame(deck(3), 2, 99).next, '');
  assert.equal(slideTitle({ name: '  ' } as never, 4), 'Slide 4');
  assert.equal(slideTitle({ name: 'a\n  b' } as never, 1), 'a b');
  assert.equal(prompterLinkFor('abc', 'http://h/prompter.html'), 'http://h/prompter.html?p=abc');
});

/** A WebSocket that records what is sent and lets the test speak as the relay. */
function fakeSocket() {
  const sent: { t: string; state?: { index: number; notes: string } }[] = [];
  const on: Record<string, ((ev: { data?: unknown }) => void)[]> = {};
  let ready = 0;
  const sock: SocketLike & { say(m: unknown): void; open(): void; drop(): void } = {
    get readyState() { return ready; }, send: (d: string) => { sent.push(JSON.parse(d)); }, close() { ready = 3; },
    addEventListener: (t, fn) => { (on[t] ||= []).push(fn); },
    say: (m) => on.message?.forEach((f) => f({ data: JSON.stringify(m) })),
    open() { ready = 1; on.open?.forEach((f) => f({})); },
    drop() { ready = 3; on.close?.forEach((f) => f({})); },
  };
  return { sock, sent };
}

test('notes on another device: open, a frame per slide once ready, Next and Back from the device, the end', () => {
  const { sock, sent } = fakeSocket();
  const cmds: string[] = [];
  let changes = 0;
  const link = new PrompterLink({ url: 'ws://x', link: (id) => prompterLinkFor(id, 'http://h/prompter.html'), onCmd: (c) => cmds.push(c), onChange: () => changes++, makeSocket: () => sock });
  const d = deck(3);
  link.send(prompterFrame(d, 0, 7)); // asked before the channel exists: held
  link.start();
  sock.open();
  assert.deepEqual(sent, [{ t: 'prompterOpen' }]);
  sock.say({ t: 'prompterReady', id: 'a'.repeat(32) });
  assert.equal(link.url, `http://h/prompter.html?p=${'a'.repeat(32)}`);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].t, 'prompterState');
  assert.equal(sent[1].state?.notes, 'note 1');
  link.send(prompterFrame(d, 1, 7));
  assert.equal(sent[2].state?.index, 1);
  sock.say({ t: 'prompterWatchers', n: 2 });
  assert.equal(link.watchers, 2);
  sock.say({ t: 'prompterCmd', cmd: 'next' });
  sock.say({ t: 'prompterCmd', cmd: 'prev' });
  sock.say({ t: 'prompterCmd', cmd: 'delete' });
  assert.deepEqual(cmds, ['next', 'prev']);
  link.stop();
  assert.equal(link.closed, true);
  assert.equal(link.ready, false);
  assert.ok(changes >= 3);
});

test('notes channel: a relay that closes the socket ends the card, and a socket that cannot open ends it too', () => {
  const { sock } = fakeSocket();
  const link = new PrompterLink({ url: 'ws://x', link: (id) => id, onCmd: () => {}, onChange: () => {}, makeSocket: () => sock });
  link.start();
  sock.open();
  sock.drop();
  assert.equal(link.closed, true);
  const bad = new PrompterLink({ url: 'ws://x', link: (id) => id, onCmd: () => {}, onChange: () => {}, makeSocket: () => { throw new Error('no'); } });
  bad.start();
  assert.equal(bad.closed, true);
});

test('jump by number: digits build it, it must name a slide of the lesson', () => {
  let b = '';
  for (const k of ['1', '2']) b = pushDigit(b, k)!;
  assert.equal(b, '12');
  assert.equal(pushDigit('1', 'a'), null);
  assert.equal(pushDigit('', '0'), '');
  assert.equal(pushDigit('12345', '6'), '1234');
  assert.equal(jumpTarget('12', 30), 11);
  assert.equal(jumpTarget('31', 30), null);
  assert.equal(jumpTarget('', 30), null);
  assert.equal(jumpTarget('1', 1), 0);
});

test('overview grid: columns by count, arrow moves stay inside', () => {
  assert.deepEqual([1, 4, 9, 16, 30, 80].map(gridColumns), [1, 4, 3, 4, 6, 8]);
  assert.equal(gridMove(0, 'ArrowLeft', 9), 0);
  assert.equal(gridMove(0, 'ArrowRight', 9), 1);
  assert.equal(gridMove(0, 'ArrowDown', 9), 3);
  assert.equal(gridMove(7, 'ArrowDown', 9), 8);
  assert.equal(gridMove(4, 'End', 9), 8);
  assert.equal(gridMove(4, 'Home', 9), 0);
  assert.equal(gridMove(4, 'x', 9), 4);
});

test('the desk clocks: elapsed format, countdown input, time left', () => {
  assert.equal(clock(83), '1:23');
  assert.equal(clock(3723), '1:02:03');
  assert.equal(clock(-5), '0:00');
  assert.equal(parseCountdown('10'), 600);
  assert.equal(parseCountdown('5:30'), 330);
  assert.equal(parseCountdown('90s'), 90);
  assert.equal(parseCountdown(''), null);
  assert.equal(parseCountdown('abc'), null);
  assert.equal(parseCountdown('0'), null);
  assert.equal(remaining(10_000, 8_500), 2);
  assert.ok(remaining(10_000, 12_000) < 0);
});
