// The show's controls (presenter/controls.ts): one key table for the wall's keys, the shortcuts sheet and the Teacher
// Presenter's buttons; the room view cycle; the presenter's new commands; who answered what; and the room frames
// behind the Phones and Room controls (blank phones, the 10-second warning, ask again), as classic sends them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTROLS, controlFor, keyLabel, keyName, nextRoomView, toggleBoard } from '../src/presenter/controls';
import { PRESENTER_CHANNEL, PRESENTER_CMDS, ShowSide, WindowSide, parseToShow, type ChannelLike, type PresenterCmd, type PresenterState } from '../src/presenter/protocol';
import { LiveHost, type RoomShow } from '../src/live';
import { whoAnswered } from '../src/show/desk';
import { Recorded } from './replay-kit';

test('no two actions share a key in one mode, and every control has a key', () => {
  for (const mode of ['show', 'draw'] as const) {
    const seen = new Map<string, string>();
    for (const c of CONTROLS.filter((x) => x.mode === mode || x.mode === 'any')) {
      assert.ok(c.keys.length > 0, `${c.action} has a key`);
      for (const k of c.keys) {
        const had = seen.get(k);
        assert.ok(!had || had === c.action, `${mode}: ${keyLabel(k)} is both ${had} and ${c.action}`);
        seen.set(k, c.action);
      }
    }
  }
});

test('a key press is named as the table names it, and finds its control in and out of Draw', () => {
  assert.equal(keyName({ key: 'B', shiftKey: true }), 'Shift+b');
  assert.equal(keyName({ key: 'B' }), 'b', 'caps lock is not Shift');
  assert.equal(keyName({ key: 'ƒ', code: 'KeyF', altKey: true }), 'Alt+f', 'a Mac\'s Alt+F');
  assert.equal(keyName({ key: 'c', metaKey: true }), null, 'Cmd is the browser\'s');
  assert.equal(keyName({ key: '?', shiftKey: true }), '?');
  assert.equal(controlFor('z', false)?.action, 'freeze');
  assert.equal(controlFor('z', true)?.action, 'undo', 'Z inside Draw stays undo');
  assert.equal(controlFor('Alt+f', true)?.action, 'freeze');
  assert.equal(controlFor('Escape', false)?.action, 'exit');
  assert.equal(controlFor('Escape', true)?.action, 'drawDone');
  assert.equal(controlFor('d', false)?.action, 'draw');
  assert.equal(controlFor('i', false)?.action, 'draw', 'I is an alias');
  assert.equal(controlFor('p', false)?.action, 'presenter');
  assert.equal(controlFor('w', false)?.action, 'white', 'W stays white screen');
  assert.equal(controlFor('Shift+w', false)?.action, 'who');
  assert.equal(controlFor('e', false)?.action, 'roomView');
  assert.equal(controlFor('s', false)?.action, 'scores');
  assert.equal(controlFor('Shift+b', false)?.action, 'blankPhones');
  assert.equal(controlFor('Shift+h', false)?.action, 'floor');
  assert.equal(controlFor('r', false)?.action, 'again');
  assert.equal(controlFor('j', false)?.action, 'join');
  assert.equal(controlFor('?', false)?.action, 'help');
  assert.equal(controlFor('y', false), null);
  assert.equal(keyLabel('Shift+b'), 'Shift+B');
  assert.equal(keyLabel(' '), 'Space');
});

test('every desk button the table names is a command the window may send, or one of its own panels', () => {
  const panels = new Set(['who', 'questions', 'help', 'entry', 'exit']);
  for (const c of CONTROLS) {
    if (!c.desk || panels.has(c.action)) continue;
    assert.ok(PRESENTER_CMDS.includes(c.action as PresenterCmd), `${c.action} is a presenter command`);
  }
});

test('the room view cycles hidden, beside, full; S toggles the full board', () => {
  assert.equal(nextRoomView('hidden'), 'beside');
  assert.equal(nextRoomView('beside'), 'full');
  assert.equal(nextRoomView('full'), 'hidden');
  assert.equal(toggleBoard('beside'), 'full');
  assert.equal(toggleBoard('hidden'), 'full');
  assert.equal(toggleBoard('full'), 'beside');
});

function bus() {
  const all: ChannelLike[] = [];
  return (name: string): ChannelLike => {
    void name;
    const ch: ChannelLike = { onmessage: null, close() { all.splice(all.indexOf(ch), 1); }, postMessage(m) { const copy = JSON.parse(JSON.stringify(m)); for (const x of [...all]) if (x !== ch) x.onmessage?.({ data: copy }); } };
    all.push(ch);
    return ch;
  };
}

test('the presenter\'s new commands reach the show; an unknown one does not', () => {
  const make = bus();
  const got: string[] = [];
  const st = { index: 0, total: 1, title: '', notes: '', nextTitle: '', deck: '', startedAt: 0, screen: 'none', room: null } as PresenterState;
  const show = new ShowSide({ title: '', width: 1, height: 1, slides: [] } as never, st, (c, _n, d) => got.push(d?.floor ? `${c}:${d.floor}` : c), make);
  const win = new WindowSide({ deck: () => {}, state: () => {}, bye: () => {} }, make);
  const fresh: PresenterCmd[] = ['steps', 'freeze', 'roomView', 'scores', 'join', 'again', 'reactions', 'blankPhones', 'blankSoon', 'draw', 'spot', 'clearInk', 'notesElsewhere', 'floor'];
  for (const c of fresh) win.send(c);
  win.send('floor', undefined, { floor: 'shut' });
  assert.deepEqual(got, [...fresh, 'floor:shut']);
  assert.equal(parseToShow({ t: 'cmd', cmd: 'teleport' }), null);
  assert.equal(PRESENTER_CHANNEL, 'slideforge.lab.presenter.v1');
  win.close(); show.close();
});

test('who answered what: by name, a choice by its letter and words, an order by its words', () => {
  const rows = whoAnswered([
    { id: 2, name: 'Zed', team: null, response: 1, sure: true, elapsedMs: 0 },
    { id: 1, name: 'Ann', team: null, response: 'oxygen', sure: null, elapsedMs: 0 },
    { id: 3, name: 'Bo', team: null, response: [1, 0], sure: false, elapsedMs: 0 },
  ], ['Air', 'Water']);
  assert.deepEqual(rows, [
    { name: 'Ann', answer: 'oxygen', sure: null },
    { name: 'Bo', answer: 'Water → Air', sure: false },
    { name: 'Zed', answer: 'B. Water', sure: true },
  ]);
  assert.deepEqual(whoAnswered(null), []);
});

const HOSTED = { t: 'hosted', session: { id: 's', title: 't', createdAt: 0 }, hostToken: 'h', pin: '123456', joinUrl: 'http://x/join.html', mode: 'individual', teams: [] };
const quiz = { type: 'quiz', id: 'q1', question: 'Q?', options: ['A', 'B'], correct: 0, explanation: '', timeLimit: 0, points: 100, style: 'classic', input: 'choice', gameId: 'g' };
const show: RoomShow = { title: 'Air', slides: [{ id: 'q1', title: 'Q', text: '', activity: 'question', style: 'classic', gameId: 'g', quiz: quiz as never }] };

async function hosted() {
  const sock = new Recorded();
  const host = new LiveHost({ url: 'ws://test', show, makeSocket: () => sock });
  host.start();
  await new Promise((r) => setTimeout(r, 0));
  sock.feed(HOSTED);
  return { sock, host };
}

test('blank phones and the 10-second warning send classic\'s frames; pressed again, the warning is taken back', async () => {
  const { sock, host } = await hosted();
  const phones = () => sock.sent.filter((m) => m.t === 'blankPhones' || m.t === 'blankSoon');
  assert.equal(host.blankSoon(), 'soon');
  assert.ok(host.state.blankSoonAt > Date.now());
  assert.equal(host.blankSoon(), 'cancelled');
  assert.deepEqual(phones(), [{ t: 'blankSoon', seconds: 10 }, { t: 'blankSoon', seconds: 0 }]);
  assert.equal(host.state.blankSoonAt, 0);
  assert.equal(host.blankPhones(), true);
  assert.equal(host.state.phonesBlank, true);
  assert.equal(host.blankSoon(), 'blank', 'phones already dark');
  const before = sock.sent.length;
  sock.feed(HOSTED); // a relay restart: the new room is told the phones are dark
  assert.ok(sock.sent.slice(before).some((m) => m.t === 'blankPhones' && m.on === true));
  assert.equal(host.blankPhones(), false);
  await host.end();
});

test('ask again: the revealed question is forgotten and asked afresh (a moment first, so the relay takes it again)', async () => {
  const { sock, host } = await hosted();
  host.begin();
  assert.equal(sock.sent.filter((m) => m.t === 'question').length, 1);
  sock.feed({ t: 'reveal', id: 'q1' });
  host.state.revealed.push('q1');
  const before = sock.sent.length;
  assert.equal(host.again(), true);
  const after = sock.sent.slice(before);
  assert.deepEqual(after.map((m) => m.t === 'at' ? `at:${m.activity}` : m.t), ['at:moment', 'at:question', 'question']);
  assert.equal(host.state.revealed.includes('q1'), false);
  await host.end();
});
