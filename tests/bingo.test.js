'use strict';
/* Bingo.
 *
 * What it used to be: one grid of nine terms on the wall, no definitions to
 * call from, and a question sent to every phone whose two options were
 * "Line!" and "Keep playing". Nothing about that was the game.
 *
 * What it is: the authored pairs are a pool, every team is dealt a different
 * card from it, and the teacher calls a definition. A team that holds the
 * term explains it to claim the square. Each term is called once, so a square
 * nobody could explain is gone — which is the only thing that makes a miss
 * cost anything. A row, column or diagonal wins; there are no points.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* Everything the engine returns is built inside the vm context, so its arrays
   and objects have that realm's prototypes. deepStrictEqual refuses them on
   identity alone, which says nothing about the values — so compare plain
   copies. */
const plain = (v) => JSON.parse(JSON.stringify(v));

function load() {
  const dir = path.resolve(__dirname, '..');
  const context = { window: {}, console, setInterval, clearInterval, Date, Math };
  context.globalThis = context;
  vm.createContext(context);
  /* The board runtimes moved into the boards engine and ship inside
     js/model.js, which installs them; loading the bundle is enough. */
  for (const f of ['js/model.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), context);
  }
  const SF = context.window.SF;
  /* model.js brings SF.el nowhere near a DOM, so render() needs a stand-in. */
  const stub = () => ({ appendChild() {}, focus() {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {}, replaceChildren() {}, querySelector: () => null,
    dataset: {}, style: {} });
  SF.el = stub;
  return { SF, stub };
}

function pool(n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ id: 'p' + i, term: 'T' + i, definition: 'Definition ' + i });
  return out;
}

const board = (over) => Object.assign({
  gridSize: 3, participants: ['Red', 'Blue'], pool: pool(12)
}, over);

/* Put a chosen term on the table. The real 'call' action picks at random —
   that is its own test below — and a test that wants a specific term cannot
   walk there without possibly consuming the terms it needs next. transition
   is pure, so handing it the state it would have reached is honest. */
function callTerm(SF, b, s, term) {
  const i = b.pool.findIndex(p => p.term === term);
  if (i < 0) throw new Error('no such term ' + term);
  return Object.assign({}, s, { current: i, called: [...s.called, i], revealed: false });
}

/** Called and revealed — the point at which the teacher can mark. */
function onTheTable(SF, b, s, term) {
  return SF.Bingo.transition(b, callTerm(SF, b, s, term), 'reveal');
}

test('every team is dealt a different card from the pool', () => {
  const { SF } = load();
  const b = board();
  const cards = SF.Bingo.deal(b);
  assert.equal(cards.length, 2);
  for (const cells of cards) {
    assert.equal(cells.length, 9, 'a 3×3 card is nine squares');
    const terms = cells.map(c => c.term);
    assert.equal(new Set(terms).size, 9, 'no term appears twice on one card');
    for (const t of terms) assert.ok(b.pool.some(p => p.term === t), t + ' came from the pool');
  }
  /* Twelve terms into nine squares, twice: the odds of two identical deals are
     tiny, but the guarantee worth testing is that the deal is independent. */
  const deals = new Set();
  for (let i = 0; i < 40; i++) deals.add(SF.Bingo.deal(b)[0].map(c => c.term).join(','));
  assert.ok(deals.size > 1, 'the deal is shuffled, not fixed');
});

test('a pool the size of the card still deals a full card', () => {
  const { SF } = load();
  const cards = SF.Bingo.deal(board({ gridSize: 2, pool: pool(4) }));
  assert.deepEqual(plain(cards[0].map(c => c.term)).sort(), ['T1', 'T2', 'T3', 'T4']);
});

test('each term is called once, and the call order is not the authored order', () => {
  const { SF } = load();
  const b = board();
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  const seen = [];
  for (let i = 0; i < b.pool.length; i++) {
    s = SF.Bingo.transition(b, s, 'call');
    seen.push(s.current);
  }
  assert.equal(new Set(seen).size, b.pool.length, 'no term called twice');
  /* And the pool is exhausted rather than wrapping round. */
  const exhausted = SF.Bingo.transition(b, s, 'call');
  assert.equal(exhausted.called.length, b.pool.length);
  assert.equal(exhausted.current, s.current, 'nothing left to call');
});

test('the term stays off the wall until it is revealed', () => {
  const { SF } = load();
  const b = board();
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  s = SF.Bingo.transition(b, s, 'call');
  assert.equal(s.revealed, false, 'a definition is the question; the term is the answer');
  s = SF.Bingo.transition(b, s, 'reveal');
  assert.equal(s.revealed, true);
});

test('only a team holding the called term can claim it, and only once', () => {
  const { SF } = load();
  const b = board();
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  /* Deal known cards so the assertions do not depend on the shuffle. */
  s.cards = [
    ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' })),
    ['T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(t => ({ term: t, state: 'open' }))
  ];
  s = onTheTable(SF, b, s, 'T1');

  assert.equal(SF.Bingo.blocked(s, b, 0), null, 'Red holds T1');
  assert.equal(SF.Bingo.blocked(s, b, 1), 'Not on this card', 'Blue does not, and is told why');

  const claimed = SF.Bingo.transition(b, s, 'claim', 0);
  assert.equal(claimed.cards[0][0].state, 'claimed');
  assert.equal(SF.Bingo.blocked(claimed, b, 0), 'Already claimed');

  /* Blue pressing claim on a term it does not hold changes nothing at all. */
  const refused = SF.Bingo.transition(b, s, 'claim', 1);
  assert.deepEqual(plain(refused.cards), plain(s.cards));
});

test('a missed square is gone, because its term is never called again', () => {
  const { SF } = load();
  const b = board();
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  s.cards = [['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' }))];
  s = onTheTable(SF, b, s, 'T1');
  const missed = SF.Bingo.transition(b, s, 'miss', 0);
  assert.equal(missed.cards[0][0].state, 'missed');
  assert.equal(SF.Bingo.blocked(missed, b, 0), 'Missed earlier');
  /* Not claimable later by pressing the other button. */
  const retried = SF.Bingo.transition(b, missed, 'claim', 0);
  assert.equal(retried.cards[0][0].state, 'missed');
});

test('a row wins, and the round ends when the host finishes', () => {
  const { SF } = load();
  const b = board({ participants: ['Red', 'Blue'] });
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  s.cards = [
    ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' })),
    ['T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(t => ({ term: t, state: 'open' }))
  ];
  for (const term of ['T1', 'T2', 'T3']) {
    s = onTheTable(SF, b, s, term);
    s = SF.Bingo.transition(b, s, 'claim', 0);
  }
  assert.equal(s.phase, 'calling', 'stay open so another team can claim this call');
  assert.deepEqual(plain(s.winners), [0]);
  s = SF.Bingo.transition(b, s, 'call');
  assert.equal(s.phase, 'complete');
  assert.equal(SF.Bingo.winner(b, s), 'Red has a line.');
  assert.deepEqual(plain(SF.Bingo.scores(b, s)), [
    { name: 'Red', score: 3, won: true },
    { name: 'Blue', score: 0, won: false }
  ]);
  /* And nothing more can be marked once it is over. */
  const after = onTheTable(SF, b, s, 'T10');
  assert.equal(SF.Bingo.transition(b, after, 'claim', 1).cards[1][6].state, 'open');
});

test('when every term is called with no line, the round completes', () => {
  const { SF } = load();
  const b = board({ participants: ['Red'], gridSize: 2, pool: pool(4) });
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  s.cards = [
    ['T1','T2','T3','T4'].map(t => ({ term: t, state: 'open' }))
  ];
  for (const term of ['T1', 'T2', 'T3', 'T4']) {
    s = onTheTable(SF, b, s, term);
    s = SF.Bingo.transition(b, s, 'miss', 0);
  }
  assert.equal(s.called.length, 4);
  assert.equal(s.phase, 'calling');
  assert.deepEqual(plain(s.winners), []);
  s = SF.Bingo.transition(b, s, 'call');
  assert.equal(s.phase, 'complete');
  assert.equal(SF.Bingo.winner(b, s), 'No line yet.');
  const again = SF.Bingo.transition(b, s, 'restart');
  assert.equal(again.phase, 'ready');
});

test('two teams can share a win on the same call', () => {
  const { SF } = load();
  const b = board({ participants: ['Red', 'Blue'] });
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  /* Both hold T1–T3 on the top row — the last call completes both lines. */
  s.cards = [
    ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' })),
    ['T1','T2','T3','T10','T11','T12','T13','T14','T15'].map(t => ({ term: t, state: 'open' }))
  ];
  for (const term of ['T1', 'T2']) {
    s = onTheTable(SF, b, s, term);
    s = SF.Bingo.transition(b, s, 'claim', 0);
    s = SF.Bingo.transition(b, s, 'claim', 1);
  }
  s = onTheTable(SF, b, s, 'T3');
  s = SF.Bingo.transition(b, s, 'claim', 0);
  assert.equal(s.phase, 'calling');
  assert.deepEqual(plain(s.winners), [0]);
  s = SF.Bingo.transition(b, s, 'claim', 1);
  assert.equal(s.phase, 'calling');
  assert.deepEqual(plain(s.winners), [0, 1]);
  assert.equal(SF.Bingo.winner(b, s), 'A shared line: Red & Blue');
  s = SF.Bingo.transition(b, s, 'call');
  assert.equal(s.phase, 'complete');
  assert.equal(SF.Bingo.winner(b, s), 'A shared line: Red & Blue');
});

test('a claim and a miss each report a verdict; calling and revealing do not', (t) => {
  const { SF, stub } = load();
  const b = board({ participants: ['Red', 'Blue'] });
  const slide = { id: 'bingo-1', title: 'Cell parts', bingoBoard: b };
  const player = { bingoStates: {} };
  const sent = [];
  SF.Bingo.onVerdict = v => sent.push(v);
  const pad = stub();
  SF.Bingo.mount(player, slide, { querySelector: () => pad, contains: () => false });
  t.after(() => SF.Bingo.unmount());

  SF.Bingo.command('start');
  /* Fix the cards so the verdicts are predictable. */
  player.bingoStates[slide.id].cards = [
    ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' })),
    ['T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(t => ({ term: t, state: 'open' }))
  ];
  /* Drive the call straight to T1 rather than fighting the shuffle. */
  player.bingoStates[slide.id] = callTerm(SF, b, player.bingoStates[slide.id], 'T1');
  SF.Bingo.command('reveal');
  assert.equal(sent.length, 0, 'a call is not a verdict');
  SF.Bingo.command('claim', 0);
  assert.equal(sent.length, 1);

  player.bingoStates[slide.id] = onTheTable(SF, b, player.bingoStates[slide.id], 'T4');
  SF.Bingo.command('miss', 1);
  /* Blue pressing a term it does not hold reports nothing — there is nothing
     to report, and a refused press must not enter the record. */
  player.bingoStates[slide.id] = onTheTable(SF, b, player.bingoStates[slide.id], 'T10');
  SF.Bingo.command('claim', 0);
  SF.Bingo.unmount();

  assert.deepEqual(sent.map(v => [v.term, v.participant, v.right]), [
    ['T1', 'Red', true],
    ['T4', 'Blue', false]
  ]);
  assert.equal(sent[0].kind, 'bingo');
  assert.equal(sent[0].slideId, 'bingo-1');
});

test('one participant is the room, and needs no name on the verdict', (t) => {
  const { SF, stub } = load();
  const b = board({ participants: ['The class'], gridSize: 2, pool: pool(4) });
  const slide = { id: 'b2', title: 'Solo card', bingoBoard: b };
  const player = { bingoStates: {} };
  const sent = [];
  SF.Bingo.onVerdict = v => sent.push(v);
  const pad = stub();
  SF.Bingo.mount(player, slide, { querySelector: () => pad, contains: () => false });
  t.after(() => SF.Bingo.unmount());
  SF.Bingo.command('start');
  player.bingoStates[slide.id] = onTheTable(SF, b, player.bingoStates[slide.id], 'T1');
  SF.Bingo.command('claim', 0);
  SF.Bingo.unmount();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].participant, null);
});

test('a new game opens on a pool that can already fill a card', () => {
  const { SF } = load();
  const style = SF.GAME_STYLES.bingo;
  const game = SF.makeGame('Fresh', 'bingo');
  /* It used to open on one pair and fail its own board check before the
     teacher had typed anything. The other pair-based boards have always
     shipped a bank; this one now does too. */
  assert.ok(game.questions.length >= 9, 'a 3×3 card needs nine terms, got ' + game.questions.length);
  assert.equal(style.board(game), null);
  for (const [i, q] of game.questions.entries()) {
    assert.equal(style.problems(q, i + 1), null, 'starter ' + (i + 1));
  }
  const terms = game.questions.map((q) => q.term.toLowerCase());
  assert.equal(new Set(terms).size, terms.length, 'a duplicate term shrinks the pool');
});

test('a game is refused when the pool cannot fill a card', () => {
  const { SF } = load();
  const style = SF.GAME_STYLES.bingo;
  const game = SF.makeGame('Too few', 'bingo');
  /* Trimmed on purpose. This used to rely on the factory handing back a
     single pair, which is the fault the bank fixed. */
  game.questions = game.questions.slice(0, 1);
  assert.match(style.board(game), /3×3 card needs 9 different terms and this has 1/);

  /* Nine distinct terms clears it; nine of the same term does not. */
  game.questions = pool(9).map((p, i) => SF.normalizeQuestion(
    Object.assign(SF.makeQuestion('bingo'), { term: p.term, definition: p.definition }), 'bingo'));
  assert.equal(style.board(game), null);
  game.questions.forEach(q => { q.term = 'Same'; });
  assert.match(style.board(game), /and this has 1/);
});

test('the compiled board carries the pool and the teams, not a vote', () => {
  const { SF } = load();
  const game = SF.makeGame('Cell parts', 'bingo');
  game.settings.mode = 'teams';
  game.settings.teams = [{ name: 'Red' }, { name: 'Blue' }, { name: 'Green' }];
  game.questions = pool(10).map(p => SF.normalizeQuestion(
    Object.assign(SF.makeQuestion('bingo'), { term: p.term, definition: p.definition }), 'bingo'));
  const run = SF.gameToRunDeck(game);
  const slide = run.slides.find(s => s.bingoBoard);
  assert.ok(slide, 'one board slide');
  assert.equal(run.slides.filter(s => s.bingoBoard).length, 1, 'and only one');
  assert.equal(slide.bingoBoard.gridSize, 3);
  assert.deepEqual(plain(slide.bingoBoard.participants), ['Red', 'Blue', 'Green']);
  assert.equal(slide.bingoBoard.pool.length, 10);
  assert.equal(run.slides.some(s => s.type === 'quiz'), false);
  /* The old shape left these on the question. Nothing should reintroduce a
     "Line!" / "Keep playing" vote. */
  assert.equal(game.questions[0].options, undefined);
  assert.equal(game.questions[0].terms, undefined);
});

test('an individual game plays one card for the room', () => {
  const { SF } = load();
  const game = SF.makeGame('Solo', 'bingo');
  game.settings.mode = 'individual';
  game.questions = pool(9).map(p => SF.normalizeQuestion(
    Object.assign(SF.makeQuestion('bingo'), { term: p.term, definition: p.definition }), 'bingo'));
  const slide = SF.gameToRunDeck(game).slides.find(s => s.bingoBoard);
  assert.deepEqual(plain(slide.bingoBoard.participants), ['The class']);
});

test('six teams is the most a card board carries', () => {
  const { SF } = load();
  const game = SF.makeGame('Crowded', 'bingo');
  game.settings.mode = 'teams';
  game.settings.teams = 'ABCDEFGH'.split('').map(n => ({ name: 'Team ' + n }));
  game.questions = pool(9).map(p => SF.normalizeQuestion(
    Object.assign(SF.makeQuestion('bingo'), { term: p.term, definition: p.definition }), 'bingo'));
  const slide = SF.gameToRunDeck(game).slides.find(s => s.bingoBoard);
  assert.equal(slide.bingoBoard.participants.length, 6);
});

test('nothing can be marked before the term is revealed', () => {
  const { SF } = load();
  /* Marking early would also mark the wall: a row of "not on this card"
     under the teams while the definition is still a question tells the room
     exactly which cards hold the answer. */
  const b = board();
  let s = SF.Bingo.transition(b, SF.Bingo.create(b), 'start');
  s.cards = [
    ['T1','T2','T3','T4','T5','T6','T7','T8','T9'].map(t => ({ term: t, state: 'open' })),
    ['T4','T5','T6','T7','T8','T9','T10','T11','T12'].map(t => ({ term: t, state: 'open' }))
  ];
  const called = callTerm(SF, b, s, 'T1');
  assert.equal(SF.Bingo.transition(b, called, 'claim', 0).cards[0][0].state, 'open');
  assert.equal(SF.Bingo.transition(b, called, 'miss', 0).cards[0][0].state, 'open');
  const shown = SF.Bingo.transition(b, called, 'reveal');
  assert.equal(SF.Bingo.transition(b, shown, 'claim', 0).cards[0][0].state, 'claimed');
});

test('a game saved under the old shape reopens with its first term', () => {
  const { SF } = load();
  /* Bingo used to keep the whole term bank on one question, with no
     definitions anywhere and a "Line!" / "Keep playing" vote for the phones.
     There is nothing to migrate the bank into — a definition was never
     authored — so one term is kept and the readiness check asks for the rest
     rather than opening an empty game. */
  const old = SF.normalizeQuestion({
    terms: ['Photosynthesis', 'Respiration', 'Transpiration'],
    options: ['Line!', 'Keep playing'],
    correct: 0
  }, 'bingo');
  /* Their term, not the sample one makeQuestion fills in. */
  assert.equal(old.term, 'Photosynthesis');
  assert.equal(old.terms, undefined);
  assert.equal(old.options, undefined);
  assert.equal(old.definition, '', 'no definition was ever authored, so none is invented');
  assert.match(SF.GAME_STYLES.bingo.problems(old, 1), /needs a definition/);

  /* And a genuinely new question still gets the worked example. */
  const fresh = SF.normalizeQuestion(SF.makeQuestion('bingo'), 'bingo');
  assert.equal(fresh.term, 'Nucleus');
  assert.ok(fresh.definition.length > 0);
});

test('compiling leaves the saved game untouched, twice over', () => {
  const { SF } = load();
  /* A board is played on: squares get marked, cards get dealt. None of that
     may reach the authored game, or a lesson would come back changed by
     having been taught. */
  const game = SF.makeGame('Cell parts', 'bingo');
  game.settings.mode = 'teams';
  game.settings.teams = [{ name: 'Red' }, { name: 'Blue' }];
  game.questions = pool(10).map(p => SF.normalizeQuestion(
    Object.assign(SF.makeQuestion('bingo'), { term: p.term, definition: p.definition }), 'bingo'));
  const snapshot = JSON.stringify(game);

  const first = SF.gameToRunDeck(game).slides.find(s => s.bingoBoard);
  const second = SF.gameToRunDeck(game).slides.find(s => s.bingoBoard);
  assert.equal(JSON.stringify(game), snapshot, 'compiling changed the game');

  /* Two runs are two boards, sharing nothing that play can write to. */
  assert.notEqual(first, second);
  assert.notEqual(first.bingoBoard, second.bingoBoard);
  assert.notEqual(first.bingoBoard.pool[0], second.bingoBoard.pool[0]);
  first.bingoBoard.pool[0].term = 'SCRIBBLED';
  first.bingoBoard.participants[0] = 'SCRIBBLED';
  assert.equal(second.bingoBoard.pool[0].term, 'T1');
  assert.equal(second.bingoBoard.participants[0], 'Red');
  assert.equal(JSON.stringify(game), snapshot, 'playing changed the game');

  /* And the run deck carries no quiz machinery for a board: no options, no
     correct index, no results slide totting up points that do not exist. */
  const deck = SF.gameToRunDeck(game);
  assert.equal(deck.slides.some(s => s.type === 'quiz'), false);
  assert.equal(deck.slides.some(s => s.type === 'results'), false);
  assert.equal(deck.slides.some(s => Array.isArray(s.options) && s.options.length), false);
});

test('a short pool still draws the board, with the gaps named', () => {
  const { SF, stub } = load();
  /* Two wrong answers here. Padding the shortfall with blank squares looks
     like a working board; replacing the board with a panel of text shows an
     author neither the cards nor how a round moves through them. Draw it, and
     let the squares it cannot fill say so. */
  const drawn = [];
  SF.el = (tag, cls, text) => {
    const node = stub();
    if (text) drawn.push(String(text));
    if (cls) drawn.push('@' + cls);
    return node;
  };
  const pad = stub();
  let children = 0;
  pad.appendChild = () => { children++; };
  SF.Bingo.render(pad, { title: 'Bingo', bingoBoard: {
    gridSize: 4, participants: ['Red'],
    pool: [{ id: 'p1', term: 'Nucleus', definition: 'Holds the DNA' }]
  } }, {});

  assert.ok(children > 3, 'the header, the call, the cards and the footer are all there');
  const said = drawn.join(' | ');
  assert.ok(said.includes('Nucleus'), 'the one real term is on the card');
  assert.equal(drawn.filter((d) => d === 'needs a term').length, 15, 'and fifteen named gaps');
  assert.ok(drawn.some((d) => d.includes('is-gap')), 'which are drawn as gaps');
  assert.match(said, /needs 16 different terms and there is 1 — add 15 more/);

  /* A full pool says none of that. */
  drawn.length = 0;
  SF.Bingo.render(pad, { title: 'Bingo', bingoBoard: {
    gridSize: 2, participants: ['Red'],
    pool: [1, 2, 3, 4].map((n) => ({ id: 'p' + n, term: 'T' + n, definition: 'D' + n }))
  } }, {});
  assert.equal(drawn.filter((d) => d === 'needs a term').length, 0);
  assert.doesNotMatch(drawn.join(' | '), /different terms and there/);
});

test('the same term written twice is one square, not two', () => {
  const { SF } = load();
  /* A duplicate is easy to write — duplicate a term to edit it and forget to
     change the word. On a card it was two squares for one call: marking the
     term struck one of them, and a line could then need a square whose term
     had already been spent. */
  const b = board({ gridSize: 2, pool: [
    { id: 'a', term: 'Osmosis', definition: 'One wording' },
    { id: 'b', term: 'osmosis', definition: 'The same term, different case' },
    { id: 'c', term: 'Diffusion', definition: 'Spreading out' },
    { id: 'd', term: 'Turgor', definition: 'Firm with water' }
  ] });
  const cells = SF.Bingo.deal(b)[0];
  assert.equal(cells.length, 4, 'a 2×2 card is still four squares');
  const terms = cells.map((c) => c.term).filter(Boolean);
  assert.deepEqual(plain(terms).map((t) => t.toLowerCase()).sort(),
    ['diffusion', 'osmosis', 'turgor'], 'three distinct terms');
  assert.equal(cells.filter((c) => !c.term).length, 1, 'and one honest gap');
});
