'use strict';
/* Emoji Guess.
 *
 * What it used to be: the typed engine with emoji pasted into the question
 * text. That is a typed question in a larger font — no letter pattern, no
 * hint, and nothing the difficulty setting could mean.
 *
 * What it is: quiz-shaped, because one puzzle at a time is a question and not
 * a board. What it owns is the scaffolding. The clues are often not enough on
 * their own, so help is released a press at a time — the letter pattern, then
 * a hint — and the difficulty decides how much help exists to release.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

function load() {
  const sandbox = {};
  global.window = sandbox;
  delete require.cache[require.resolve('../js/model.js')];
  require('../js/model.js');
  delete global.window;
  return sandbox.SF;
}

const puzzle = (SF, over) => SF.normalizeQuestion(
  Object.assign(SF.makeQuestion('emoji'), over), 'emoji');

const compiled = (SF, over) => {
  const g = SF.makeGame('Emoji', 'emoji');
  g.settings.intro = false;
  g.settings.scoreSlide = false;
  g.questions = [puzzle(SF, over)];
  return SF.gameToRunDeck(g).slides.find((s) => s.type === 'quiz');
};

test('emoji guess is its own format, not the typed engine with big text', () => {
  const SF = load();
  assert.equal(SF.formatStyle('emoji-guess'), 'emoji');
  assert.equal(SF.GAME_STYLES.emoji.input, 'text', 'still answerable on a phone');
  const s = compiled(SF, { clues: '🌱 ☀️ 💧', accept: ['photosynthesis'],
    hint: 'How a plant feeds itself', difficulty: 'easy' });
  assert.equal(s.clues, '🌱 ☀️ 💧');
  assert.equal(s.question, '🌱 ☀️ 💧', 'the clues are the question');
  assert.equal(s.answer, 'photosynthesis');
  assert.equal(s.hint, 'How a plant feeds itself');
});

test('the hint is every puzzle\'s heading; the difficulty decides the pattern', () => {
  const SF = load();
  const help = (over) => SF.emojiHelp(compiled(SF, over));
  /* The hint belongs to the puzzle, not to a difficulty. It is the title line,
     and gating it by difficulty left the medium and hard puzzles with a bare
     "Q2" and no heading at all. */
  ['easy', 'medium', 'hard'].forEach((level) => {
    assert.equal(help({ difficulty: level, hint: 'A hint' }).hint, 'A hint', level);
  });

  /* What the difficulty decides is the letter pattern: given, asked for, or
     not available. */
  assert.equal(help({ difficulty: 'easy' }).pattern, 'shown');
  assert.equal(help({ difficulty: 'medium' }).pattern, 'step');
  assert.equal(help({ difficulty: 'hard' }).pattern, 'none');

  /* A hint nobody wrote is not a failure — the title line falls back to the
     instruction. */
  assert.equal(help({ hint: '' }).hint, '');
  assert.equal(SF.GAME_STYLES.emoji.problems(puzzle(SF, { hint: '' }), 2), null);
});

test('the pattern says how long the answer is, not what it is', () => {
  const SF = load();
  const s = compiled(SF, { accept: ['cell membrane'] });
  const mask = SF.wordRevealMask(s.answer, 0);
  assert.equal(mask, '____ ________', 'letters hidden, the space kept');
  assert.equal(mask.replace(/[^_]/g, '').length, 'cellmembrane'.length);
  assert.ok(!mask.includes('c'), 'no letter of the answer is in it');
});

test('the answer waits for a reveal even with no phones in the room', () => {
  const SF = load();
  /* A teacher running this from Present has no phones and does not need any —
     the room shouts. The answer box used to hold only while hosting, so in
     that mode the answer was on the wall from the moment the slide arrived. */
  assert.equal(compiled(SF, {}).hideAnswerUntilReveal, true);
  const word = SF.gameToRunDeck(SF.makeGame('Word', 'wordreveal'))
    .slides.find((s) => s.type === 'quiz');
  assert.equal(word.hideAnswerUntilReveal, true, 'the same next door');
  /* An ordinary typed question is not a guessing game and is unaffected. */
  const typed = SF.gameToRunDeck(SF.makeGame('Typed', 'type'))
    .slides.find((s) => s.type === 'quiz');
  assert.equal(typed.hideAnswerUntilReveal, undefined);
});

test('marking is the typed engine`s, and a hint does not change the score', () => {
  const SF = load();
  const s = compiled(SF, { accept: ['respiration', 'aerobic respiration'],
    difficulty: 'easy', hint: 'Releasing energy' });
  assert.equal(SF.markResponse(s, 'respiration'), true);
  assert.equal(SF.markResponse(s, 'aerobic respiration'), true, 'a second spelling');
  assert.equal(SF.markResponse(s, 'respration'), true, 'a typo, since typos are allowed');
  assert.equal(SF.markResponse(s, 'photosynthesis'), false);
  /* Word Reveal scores by how much was still hidden. Emoji guess does not:
     the source game is one point either way, and inventing a penalty for
     asking for the hint would discourage the thing the hint is for. So the
     points are the game's, identical across all three help levels. */
  const points = (level) => compiled(SF, { difficulty: level, hint: 'Releasing energy' }).points;
  assert.equal(points('easy'), points('hard'));
  assert.equal(points('medium'), points('hard'));
});

test('a game saved as a typed question keeps its clues', () => {
  const SF = load();
  /* The old shape put the emoji in the question text, because it was the
     typed engine. Read them back from there rather than opening blank. */
  const carried = SF.normalizeQuestion({
    question: '🧪 🔥 → ⚡', accept: ['respiration']
  }, 'emoji');
  assert.equal(carried.clues, '🧪 🔥 → ⚡', 'their emoji, not the sample ones');
  assert.equal(carried.difficulty, 'medium');
  assert.equal(SF.GAME_STYLES.emoji.problems(carried, 1), null);
  /* And a puzzle with no clues at all is refused with the right reason. */
  assert.match(SF.GAME_STYLES.emoji.problems(
    SF.normalizeQuestion({ clues: '', question: '', accept: ['x'] }, 'emoji'), 1),
    /no emoji clues/);

  /* And a new puzzle still arrives with a worked example. */
  const fresh = SF.normalizeQuestion(SF.makeQuestion('emoji'), 'emoji');
  assert.ok(fresh.clues.length > 0);
  assert.equal(SF.GAME_STYLES.emoji.problems(fresh, 1), null);
});

test('every puzzle has a heading, and it is never the clues again', () => {
  const SF = load();
  /* The emoji were the question text, so they printed twice: once as the
     stage hero and once small in the title row, which asked the room nothing.
     The title row asks what to do with the clues instead — on every puzzle,
     at every difficulty. Dropping it entirely left the ones with no hint to
     release showing a bare "Q2" and no heading at all. */
  const s = compiled(SF, { clues: '🧪 🔥 → ⚡', accept: ['respiration'] });
  assert.equal(s.headPrompt, 'What do these clues point to?');
  assert.notEqual(s.headPrompt, s.clues);

  /* Including the two that release no hint: medium has only the pattern, hard
     has nothing, and both still have a title line. */
  ['easy', 'medium', 'hard'].forEach(function (level) {
    const at = compiled(SF, { difficulty: level, hint: 'A hint' });
    assert.equal(at.headPrompt, 'What do these clues point to?', level);
  });

  /* And the clues stay the question underneath, because that is what tells
     one puzzle from another in the rail, the report and a CSV row. */
  assert.equal(s.question, '🧪 🔥 → ⚡');

  /* Nothing else loses its title: an ordinary question is its own heading, and
     an absent headPrompt is not the same as an empty one. */
  const typed = SF.gameToRunDeck(SF.makeGame('Typed', 'type'))
    .slides.find((x) => x.type === 'quiz');
  assert.equal(typed.headPrompt, undefined);
});

test('emoji clue layout tiles graphemes the wall and phone share', () => {
  const SF = load();
  const layout = SF.emojiClueLayout('🌱☀️💧→🌿');
  assert.equal(layout.tiled, true);
  assert.ok(layout.pieces.length >= 4);
  assert.equal(SF.emojiClueLayout('photosynthesis').tiled, false,
    'lettered clues stay a single line');
});
