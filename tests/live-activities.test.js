'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs');
function setup() {
  const storage = new Map();
  const scope = { document: { getElementById: () => null }, console,
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) } };
  scope.window = scope; vm.createContext(scope);
  for (const file of ['model', 'lesson-runtime', 'live-activities']) vm.runInContext(fs.readFileSync(require.resolve('../js/' + file + '.js'), 'utf8'), scope);
  const SF = scope.SF;
  const deck = SF.makeDeck('Original lesson'); deck.slides = [SF.makeSlide('content'), SF.makeSlide('content')];
  SF.Store.save(deck);
  const run = SF.buildRunDeck(deck, id => SF.GameStore.get(id));
  SF.Player = {
    open: true, deck: run, idx: 0, started: 123, answers: { previous: 2 }, spontaneous: null,
    goTo(i) { this.idx = i; }, syncPresenter() {},
    /* The real Player always has this; the stub did not, which is why adding
       a single emit to the launch path broke two tests that were not about it. */
    emit() {},
    openSpontaneous(session) {
      this.spontaneous = {
        id: session.id, title: session.title, slides: session.slides, index: 0, game: session.game || null
      };
      return true;
    },
    endSpontaneous() {
      if (!this.spontaneous) return false;
      this.spontaneous = null;
      return true;
    }
  };
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

test('launch projects an overlay without splicing the lesson and end restores the wall', async () => {
  const { SF, api, deck } = setup();
  SF.Live = { active: true, pin: '123456', mode: 'teams', teams: [{ name: 'Oak' }, { name: 'Elm' }] };
  const live = SF.Live, run = SF.Player.deck, first = run.slides[0].id;
  const draft = await create(api, 'game', 'bingo');
  const preview = await api.handle({ action: 'preview', draft });
  assert.deepEqual(Array.from(preview.slides.find(s => s.bingoBoard).bingoBoard.participants), ['Oak', 'Elm']);
  const beforeLen = run.slides.length;
  const result = await api.handle({ action: 'launch', draft });
  assert.equal(result.showing, true);
  assert.equal(result.inserted, false);
  assert.equal(SF.Live, live); assert.equal(SF.Live.pin, '123456');
  assert.equal(SF.Player.deck, run); assert.equal(SF.Player.answers.previous, 2);
  assert.equal(SF.Player.idx, 0);
  assert.equal(run.slides.length, beforeLen);
  assert.ok(SF.Player.spontaneous);
  assert.ok(SF.Player.spontaneous.slides.some(s => s.type === 'quiz' || s.bingoBoard));
  assert.equal(SF.GameStore.list().length, 0);
  assert.equal(SF.Store.get(deck.id).slides.length, 2);
  await api.handle({ action: 'end' });
  assert.equal(SF.Player.spontaneous, null);
  assert.equal(run.slides[SF.Player.idx].id, first);
  assert.equal(run.slides.length, beforeLen);
});

test('queue is an overlay alias and saved drafts are separate reusable copies', async () => {
  const { SF, api } = setup();
  const a = await create(api), b = await create(api);
  a.title = 'First'; b.title = 'Second';
  await api.handle({ action: 'queue', draft: a });
  assert.ok(SF.Player.spontaneous);
  assert.equal(SF.Player.spontaneous.title, 'First');
  assert.equal(SF.Player.deck.slides.length, 2);
  await api.handle({ action: 'end' });
  await api.handle({ action: 'queue', draft: b });
  assert.equal(SF.Player.spontaneous.title, 'Second');
  assert.equal(SF.Player.deck.slides.length, 2);
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

test('game mechanics and progress are restored when leaving a spontaneous game overlay', async () => {
  const { SF, api } = setup();
  SF.Live = { active: true, mode: 'individual', teams: [], mechanic: 'points', trackLength: 5, pos: { old: 2 }, winners: [], bossHp: 0, bossMax: 0 };
  const run = SF.Player.deck, original = run.slides[0];
  const race = await create(api, 'game', 'race');
  await api.handle({ action: 'launch', draft: race });
  const raceSlide = SF.Player.spontaneous.slides[0];
  api.beforeSlide(run, raceSlide);
  assert.equal(run.mechanic, 'race'); assert.equal(SF.Live.mechanic, 'race');
  SF.Live.pos.learner = 3;
  await api.handle({ action: 'end' });
  api.beforeSlide(run, original);
  assert.equal(SF.Live.mechanic, 'points'); assert.equal(SF.Live.pos.old, 2);
  assert.equal(run.presenterGameId, null);
});

test('invalid answer selection is rejected before normalization can select a different answer', async () => {
  const { SF, api } = setup();
  const draft = await create(api);
  draft.game.questions[0].options = ['Only one', 'Another'];
  draft.game.questions[0].correct = 3;
  await assert.rejects(api.handle({ action: 'preview', draft }), /correct answer/);
  assert.equal(SF.Player.deck.slides.length, 2);
});

test('launch clears temporary audience overlays and freeze via openSpontaneous', async () => {
  const { SF, api } = setup();
  const calls = [];
  SF.Live = { endCustomPrompt: () => calls.push('poll') };
  const baseOpen = SF.Player.openSpontaneous.bind(SF.Player);
  SF.Player.openSpontaneous = function (session) {
    if (SF.Live.endCustomPrompt) SF.Live.endCustomPrompt();
    if (this.momentCommand) this.momentCommand({ action: 'clear' });
    if (this.frozen && this.toggleFreeze) this.toggleFreeze(false);
    if (this.blank && this.toggleBlank) this.toggleBlank();
    return baseOpen(session);
  };
  Object.assign(SF.Player, { frozen: true, blank: true, toggleFreeze: () => calls.push('freeze'), toggleBlank: () => calls.push('blank'), momentCommand: () => calls.push('moment') });
  await api.handle({ action: 'launch', draft: await create(api) });
  assert.deepEqual(calls, ['poll', 'moment', 'freeze', 'blank']);
  assert.ok(SF.Player.spontaneous);
  assert.equal(SF.Player.deck.slides.length, 2);
});

test('impromptu AI quiz overlays the wall and keeps the lesson untouched', async () => {
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
  assert.equal(SF.Player.idx, 0);
  assert.equal(SF.Player.deck.slides.length, 2);
  assert.equal(SF.Player.deck.slides.map(s => s.id).join(), original.join());
  assert.ok(SF.Player.spontaneous);
  assert.equal(SF.Player.spontaneous.slides[0].type, 'quiz');
});

/* Launching put the activity on the wall and said "End or Esc to return",
   with no PIN, link or QR anywhere in the flow — a teacher drafting a quiz
   mid-lesson had to know to press J on the wall. */
function hosted() {
  const ctx = setup();
  ctx.emitted = [];
  ctx.SF.Player.emit = (name, payload) => ctx.emitted.push({ name, payload });
  ctx.SF.Live = { active: true };
  return ctx;
}

test('launching an activity the room answers puts the join code up', async () => {
  const ctx = hosted();
  const draft = await create(ctx.api, 'game', 'choice');
  const res = await ctx.api.handle({ action: 'launch', draft });
  const join = ctx.emitted.filter(e => e.name === 'joinToggle');
  assert.equal(join.length, 1, 'the join card is asked for exactly once');
  /* Field by field: the payload is built inside the vm context, so its
     prototype is not this realm's and deepStrictEqual rejects it. */
  assert.equal(join[0].payload.open, true,
    'asked for, not toggled — a teacher who already had it open must not have it closed');
  assert.equal(join[0].payload.close, undefined);
  assert.match(res.message, /join code/);
});

test('a quiet activity, and a room that is not hosted, leave the card alone', async () => {
  /* Nothing to join: no game and no learner responses. */
  const quiet = hosted();
  const slideDraft = await create(quiet.api, 'activity', quiet.api.catalogue().activities[0].key);
  if (!slideDraft.game && !(slideDraft.slides || []).some(s => s.feedback && s.feedback.enabled !== false)) {
    await quiet.api.handle({ action: 'launch', draft: slideDraft });
    assert.equal(quiet.emitted.filter(e => e.name === 'joinToggle').length, 0);
  }

  /* No room: the card has no PIN to show, and toggleJoinCard refuses to open
     without one, so asking would be a no-op dressed up as an answer. */
  const solo = hosted();
  solo.SF.Live = { active: false };
  const gameDraft = await create(solo.api, 'game', 'choice');
  const res = await solo.api.handle({ action: 'launch', draft: gameDraft });
  assert.equal(solo.emitted.filter(e => e.name === 'joinToggle').length, 0);
  assert.doesNotMatch(res.message, /join code/);
});
