'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs');
function setup() {
  const storage = new Map();
  const scope = { document: { getElementById: () => null }, console,
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) } };
  scope.window = scope; vm.createContext(scope);
  for (const file of ['model', 'editor', 'activities', 'live-activities']) vm.runInContext(fs.readFileSync(require.resolve('../js/' + file + '.js'), 'utf8'), scope);
  const SF = scope.SF;
  const deck = SF.makeDeck('Original lesson'); deck.slides = [SF.makeSlide('content'), SF.makeSlide('content')];
  SF.Store.save(deck);
  SF.Player = { open: true, deck: SF.buildRunDeck(deck, id => SF.GameStore.get(id)), idx: 0, started: 123,
    answers: { previous: 2 }, goTo(i) { this.idx = i; }, syncPresenter() {} };
  return { SF, storage, api: SF.LiveActivities, deck };
}
async function create(api, kind = 'game', key = 'choice') { return (await api.handle({ action: 'draft', kind, key })).draft; }

test('all activity templates draft and validate without changing the running or saved lesson', async () => {
  const { SF, api, deck } = setup();
  const before = JSON.stringify(SF.Player.deck);
  for (const a of api.catalogue().activities) {
    const draft = await create(api, 'activity', a.key);
    const result = await api.handle({ action: 'preview', draft });
    assert.ok(result.slides.length, a.key);
  }
  assert.equal(JSON.stringify(SF.Player.deck), before);
  assert.equal(SF.GameStore.list().length, 0);
  assert.equal(SF.Store.get(deck.id).slides.length, 2);
});

test('every game engine can be edited through its own question shape and validated', async () => {
  const { api } = setup();
  for (const g of api.catalogue().games) {
    const draft = await create(api, 'game', g.key);
    assert.equal(draft.game.style, g.key);
    assert.ok((await api.handle({ action: 'preview', draft })).slides.length, g.key);
  }
});

test('launch preserves the room and answers, rejects duplicate insertion and can return to original slide', async () => {
  const { SF, api, deck } = setup();
  SF.Live = { active: true, pin: '123456', mode: 'teams', teams: [{ name: 'Oak' }, { name: 'Elm' }] };
  const live = SF.Live, run = SF.Player.deck, first = run.slides[0].id;
  const draft = await create(api, 'game', 'bingo');
  const preview = await api.handle({ action: 'preview', draft });
  assert.deepEqual(Array.from(preview.slides.find(s => s.bingoBoard).bingoBoard.participants), ['Oak', 'Elm']);
  await api.handle({ action: 'launch', draft });
  assert.equal(SF.Live, live); assert.equal(SF.Live.pin, '123456');
  assert.equal(SF.Player.deck, run); assert.equal(SF.Player.answers.previous, 2);
  assert.equal(SF.Player.idx, 1); assert.equal(SF.GameStore.list().length, 0);
  assert.equal(SF.Store.get(deck.id).slides.length, 2);
  const count = run.slides.length;
  await assert.rejects(api.handle({ action: 'launch', draft }), /already in the lesson/);
  assert.equal(run.slides.length, count);
  await api.handle({ action: 'return' });
  assert.equal(run.slides[SF.Player.idx].id, first);
});

test('queue retains creation order and saved drafts are separate reusable copies', async () => {
  const { SF, api } = setup();
  const a = await create(api), b = await create(api);
  a.title = 'First'; b.title = 'Second';
  await api.handle({ action: 'queue', draft: a });
  await api.handle({ action: 'queue', draft: b });
  assert.equal(SF.Player.idx, 0);
  const slides = SF.Player.deck.slides;
  assert.ok(slides.findIndex(s => s.gameTitle === 'First') < slides.findIndex(s => s.gameTitle === 'Second'));
  await api.handle({ action: 'save', draft: a });
  const saved = SF.GameStore.get(a.game.id);
  assert.equal(saved.title, 'First');
  const copy = await create(api, 'saved', saved.id);
  assert.notEqual(copy.game.id, saved.id);
  copy.game.questions[0].question = 'Changed copy';
  assert.notEqual(SF.GameStore.get(saved.id).questions[0].question, 'Changed copy');
});

test('board validation and AI failures leave lesson and library untouched', async () => {
  const { SF, api } = setup();
  const draft = await create(api, 'game', 'bingo');
  draft.game.questions.length = 1;
  const before = JSON.stringify(SF.Player.deck);
  await assert.rejects(api.handle({ action: 'launch', draft }), /needs|terms|pool/i);
  SF.AI = { generateQuestionsForGame: async () => ({ error: 'No AI key configured' }) };
  await assert.rejects(api.handle({ action: 'draft', kind: 'game', key: 'choice', ai: true, topic: 'Cells' }), /No AI key/);
  assert.equal(JSON.stringify(SF.Player.deck), before);
  assert.equal(SF.GameStore.list().length, 0);
});

test('AI drafts stay private and a changed lesson invalidates pending generation and old drafts', async () => {
  const { SF, api } = setup();
  const draft = await create(api);
  let finish;
  SF.AI = { generateQuestionsForGame: () => new Promise(resolve => { finish = resolve; }) };
  const pending = api.handle({ action: 'draft', kind: 'game', key: 'choice', ai: true, topic: 'Cells' });
  SF.Player.started++;
  finish({ questions: draft.game.questions });
  await assert.rejects(pending, /lesson changed/);
  await assert.rejects(api.handle({ action: 'queue', draft }), /earlier lesson/);
  assert.equal(SF.Player.deck.slides.length, 2);
});

test('multi-page AI content fills each page privately and can be saved as a reusable lesson', async () => {
  const { SF, api } = setup();
  let calls = 0;
  SF.AI = { generateActivityContent: async a => {
    calls++;
    return { values: Object.fromEntries(a.fields.filter(f => f.type !== 'minutes').map(f => [f.slide, 'Page ' + calls + ': ' + f.label])) };
  } };
  const { draft } = await api.handle({ action: 'draft', kind: 'activity', key: 'flipped-instruction', ai: true, topic: 'Cells' });
  assert.equal(calls, 3); assert.equal(draft.slides.length, 3);
  assert.equal(SF.Player.deck.slides.length, 2);
  await api.handle({ action: 'save', draft });
  assert.equal(SF.Store.get(draft.id).slides.length, 3);
  assert.match(JSON.stringify(SF.Store.get(draft.id).slides[2]), /Page 3/);
});

test('game mechanics and progress are restored when moving between an impromptu game and the lesson', async () => {
  const { SF, api } = setup();
  SF.Live = { active: true, mode: 'individual', teams: [], mechanic: 'points', trackLength: 5, pos: { old: 2 }, winners: [], bossHp: 0, bossMax: 0 };
  const run = SF.Player.deck, original = run.slides[0];
  const race = await create(api, 'game', 'race');
  await api.handle({ action: 'launch', draft: race });
  const raceSlide = run.slides[SF.Player.idx];
  api.beforeSlide(run, raceSlide);
  assert.equal(run.mechanic, 'race'); assert.equal(SF.Live.mechanic, 'race');
  SF.Live.pos.learner = 3;
  api.beforeSlide(run, original);
  assert.equal(SF.Live.mechanic, 'points'); assert.equal(SF.Live.pos.old, 2);
  assert.equal(run.presenterGameId, null);
  api.beforeSlide(run, raceSlide);
  assert.equal(SF.Live.pos.learner, 3);
});

test('invalid answer selection is rejected before normalization can select a different answer', async () => {
  const { SF, api } = setup();
  const draft = await create(api);
  draft.game.questions[0].options = ['Only one', 'Another'];
  draft.game.questions[0].correct = 3;
  await assert.rejects(api.handle({ action: 'preview', draft }), /correct answer/);
  assert.equal(SF.Player.deck.slides.length, 2);
});

test('launch clears temporary audience overlays and freeze, but queue leaves them alone', async () => {
  const { SF, api } = setup();
  const calls = [];
  SF.Live = { endCustomPrompt: () => calls.push('poll') };
  Object.assign(SF.Player, { frozen: true, blank: true, toggleFreeze: () => calls.push('freeze'), toggleBlank: () => calls.push('blank'), momentCommand: () => calls.push('moment') });
  await api.handle({ action: 'queue', draft: await create(api) });
  assert.equal(calls.length, 0);
  await api.handle({ action: 'launch', draft: await create(api) });
  assert.deepEqual(calls, ['poll', 'moment', 'freeze', 'blank']);
});

test('impromptu AI quiz preserves keywords and rejection counts, skips rules and keeps the lesson tail', async () => {
  const { SF, api } = setup();
  SF.Playbook = { forGame: () => ({ title: 'Multiple choice', howToPlay: ['Read the question'] }) };
  const original = SF.Player.deck.slides.map(s => s.id);
  let brief;
  SF.AI = { generateQuestionsForGame: async (game, options) => {
    brief = options;
    return { questions: game.questions.slice(0, 2), rejected: 1 };
  } };
  const { draft } = await api.handle({ action: 'draft', kind: 'game', key: 'choice', ai: true, impromptu: true,
    topic: 'Osmosis in plant cells', notes: 'water potential, turgid', count: 3 });
  assert.equal(brief.notes, 'water potential, turgid');
  assert.equal(draft.generated.accepted, 2); assert.equal(draft.generated.rejected, 1);
  assert.equal(SF.Player.deck.slides.length, 2, 'generation remains private');
  const preview = await api.handle({ action: 'preview', draft });
  assert.equal(preview.slides.length, 2);
  assert.ok(preview.slides.every(s => s.type === 'quiz'));
  await api.handle({ action: 'launch', draft });
  assert.equal(SF.Player.idx, 1);
  assert.equal(SF.Player.deck.slides[1].type, 'quiz');
  assert.equal(SF.Player.deck.slides[0].id, original[0]);
  assert.equal(SF.Player.deck.slides.at(-1).id, original[1]);
});
