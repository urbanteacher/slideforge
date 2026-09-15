'use strict';
/* Per-word choreography — the AI button in the Motion pane.
 *
 * Everything else in that pane is a choice from a list. This one produces
 * coordinates: where each word starts, how it is turned and scaled, how soft
 * it begins, and when it moves. Which means two things have to hold that no
 * preset ever needed — the numbers must be survivable whatever a language
 * model sends, and a plan must expire when the words it was written for
 * change.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRender() {
  const sandbox = {
    addEventListener: () => {}, removeEventListener: () => {},
    document: {
      addEventListener: () => {}, removeEventListener: () => {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        setAttribute() {}, appendChild() {} }),
      body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
    },
    location: { protocol: 'http:', origin: 'http://localhost:8787' },
    URL: URL, URLSearchParams: URLSearchParams,
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/model.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/render.js'), 'utf8'), sandbox);
  return sandbox.SF;
}
const SF = loadRender();

const LINE = 'Every chart is a choice';
const step = (over) => Object.assign({ dx: 0, dy: 0, rot: 0, scale: 1, blur: 0, delay: 0 }, over);
const slide = (words, text) => ({ design: { wordPlan: { text: text === undefined ? LINE : text, words: words } } });

test('a plan is applied only to the words it was written for', () => {
  const five = [step(), step(), step(), step(), step()];
  assert.equal(SF.wordPlan(slide(five), LINE, 5).length, 5);
  /* The line was edited: five steps for two words would place words that are
     not there and leave the ones that are unplaced. */
  assert.equal(SF.wordPlan(slide(five), 'Charts lie', 5), null);
  /* Trailing whitespace is not an edit. */
  assert.ok(SF.wordPlan(slide(five), '  ' + LINE + ' ', 5));
  /* The count has to match what was actually wrapped, even when the text does
     — a plan written before a word was added is still wrong. */
  assert.equal(SF.wordPlan(slide(five), LINE, 4), null);
  assert.equal(SF.wordPlan({ design: {} }, LINE, 5), null);
  assert.equal(SF.wordPlan({}, LINE, 5), null);
  assert.equal(SF.wordPlan(slide([]), LINE, 0), null, 'an empty plan is no plan');
});

test('every number is clamped, because a model wrote it', () => {
  const wild = [step({ dx: 9000, dy: -40, rot: 900, scale: 0, blur: 300, delay: 999999 })];
  const got = SF.wordPlan(slide(wild, 'Motion'), 'Motion', 1)[0];
  /* A dy of 4000 flings a word off a projector; a scale of 0 is an invisible
     word; a delay of a minute is a line that never finishes arriving. */
  assert.equal(got.dx, '3.00em');
  assert.equal(got.dy, '-3.00em');
  assert.equal(got.rot, '30.0deg');
  assert.equal(got.scale, 0.4);
  assert.equal(got.blur, '14.0px');
  assert.equal(got.delay, 3000);
  /* Nonsense becomes the resting value rather than NaN in a transform, which
     would drop the whole rule and leave the word invisible. */
  const junk = SF.wordPlan(slide([step({ dx: 'left', scale: null, delay: 'soon' })], 'Motion'), 'Motion', 1)[0];
  assert.equal(junk.dx, '0.00em');
  assert.equal(junk.scale, 1);
  assert.equal(junk.delay, 0);
  /* em, not px: a word set at 320px and one at 44px must not travel the same
     distance. */
  assert.match(got.dx, /em$/);
  assert.match(got.rot, /deg$/);
  assert.match(got.blur, /px$/);
});

test('the stylesheet can draw a planned word, and hold it still on request', () => {
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  assert.match(css, /@keyframes sf-word-plan/, 'no keyframes for a planned entrance');
  assert.match(css, /@keyframes sf-cycle-plan/, 'a planned line cannot loop');
  ['--wx', '--wy', '--wr', '--ws', '--wb'].forEach((v) => {
    assert.ok(css.includes(v), 'the keyframes ignore ' + v);
  });
  assert.match(css, /prefers-reduced-motion[\s\S]{0,300}words-plan \.w[\s\S]{0,80}animation: none/,
    'a choreography must stop for anyone who asked for less motion');
});

test('an arc is a keyframe set, and an unknown one still lands', () => {
  const arcs = [step({ arc: 'bounce' }), step({ arc: 'mist' }), step({ arc: 'settle' }),
    step({ arc: 'explode' }), step({})];
  const got = SF.wordPlan(slide(arcs), LINE, 5);
  assert.deepEqual(got.map((w) => w.arc), ['bounce', 'mist', 'settle', 'settle', 'settle'],
    'an arc the stylesheet has never heard of must not become an animation-name');
  /* Each arc names a real keyframe set for both the entrance and the loop —
     a name with no @keyframes behind it is a word that never animates. */
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  Object.keys(SF.WORD_ARCS).forEach((name) => {
    const pair = SF.WORD_ARCS[name];
    assert.ok(css.includes('@keyframes ' + pair.on), name + ' has no entrance keyframes');
    assert.ok(css.includes('@keyframes ' + pair.loop), name + ' has no loop keyframes');
  });
  /* A bounce has to pass the resting place: the overshoot is a fraction of
     the word's own offset, so it stays proportional to the journey. */
  const bounce = css.slice(css.indexOf('@keyframes sf-word-plan-bounce'));
  assert.match(bounce.slice(0, 900), /var\(--wx, 0px\) \* -0\.\d+/,
    'the bounce never travels past rest, so it is a settle with extra steps');
  /* Mist supplies its own fog floor, so an arc chosen with blur 0 still mists. */
  const mist = css.slice(css.indexOf('@keyframes sf-word-plan-mist'));
  assert.match(mist.slice(0, 900), /blur\(max\(var\(--wb[^)]*\), \d+px\)\)/);
});

test('a plan can be written in letters, and the line still breaks in words', () => {
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  /* Letters are only safe to animate individually if each word stays one
     box — otherwise a narrow slide breaks a word down the middle. */
  assert.match(css, /\.statement \.wword \{[^}]*display: inline-block/);
  assert.match(css, /\.statement \.wword \{[^}]*white-space: pre/,
    'without this the spaces inside an inline-block word collapse');
  assert.match(css, /words-letters \.w \{[^}]*transform-origin: 50% 50%/,
    'a letter rotating about a point below its middle swings instead of pivoting');
  /* The unit is read off the plan, because it decides how to split the line. */
  assert.equal(SF.wordPlanUnit({ design: { wordPlan: { unit: 'letter', words: [] } } }), 'letter');
  assert.equal(SF.wordPlanUnit({ design: { wordPlan: { words: [] } } }), 'word');
  assert.equal(SF.wordPlanUnit({}), 'word', 'no plan is a word plan, not a crash');
  assert.equal(SF.wordPlanUnit({ design: { wordPlan: { unit: 'syllable' } } }), 'word');
  /* "Every chart is a choice" is 19 letters — under the ceiling. The ceiling
     itself has to match the one the AI is told about. */
  assert.equal(SF.LETTER_CAP, 30);
  const ai = fs.readFileSync(require.resolve('../js/ai.js'), 'utf8');
  assert.match(ai, /var LETTER_CAP = 30;/, 'the AI would offer letter plans the renderer drops');
  const names = /var WORD_ARC_NAMES = \[([^\]]*)\]/.exec(ai);
  assert.ok(names, 'the AI has no list of arcs to hold the model to');
  assert.deepEqual(
    names[1].split(',').map((t) => t.trim().replace(/'/g, '')).sort(),
    Object.keys(SF.WORD_ARCS).sort(),
    'the arcs the AI may ask for and the arcs the renderer can draw have drifted apart');
});

/* --- the AI side, with the network stubbed ------------------------------- */

function loadAI(handler) {
  const AI_PATH = path.join(__dirname, '..', 'js', 'ai.js');
  delete require.cache[require.resolve(AI_PATH)];
  const calls = [];
  global.window = global;
  global.SF = {};
  global.location = { origin: 'http://test.local' };
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init });
    return handler(String(url), init, calls.length);
  };
  return { AI: require(AI_PATH), calls: calls };
}
const reply = (body, status) => ({ ok: !status || status < 400, status: status || 200, json: async () => body });

test('the model is asked for one step per word, and held to it', async () => {
  const good = { note: 'Deliberate, a little uneasy', words: [
    { dx: -1.5, dy: -0.5, rot: -12, scale: 1.2, blur: 4, delay: 0 },
    { dx: 0.8, dy: 1.5, rot: 8, scale: 0.9, blur: 6, delay: 400 },
    { dx: -0.5, dy: 1, rot: -5, scale: 1, blur: 2, delay: 800 },
    { dx: 1.2, dy: -1, rot: 15, scale: 0.7, blur: 8, delay: 1200 },
    { dx: 0, dy: -2.5, rot: 0, scale: 1.5, blur: 12, delay: 1800 }
  ] };
  const ok = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true }) : reply({ text: JSON.stringify(good) }));
  const res = await ok.AI.generateWordMotion(LINE, { mood: 'uneasy' });
  assert.equal(res.error, undefined);
  assert.equal(res.words.length, 5);
  assert.equal(res.note, 'Deliberate, a little uneasy');
  /* The brief reaches the model, and the request asks for room proportional
     to the number of words. */
  const sent = JSON.parse(ok.calls.filter((c) => c.url.endsWith('/api/ai/generate'))[0].init.body);
  assert.match(sent.user, /uneasy/);
  assert.match(sent.user, /1\. Every/, 'the words are numbered for the model');
  assert.ok(sent.maxTokens > 450);

  /* Four steps for five words is not a choreography — it is four placed words
     and one that never moves. */
  const short = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ words: good.words.slice(0, 4) }) }));
  const bad = await short.AI.generateWordMotion(LINE);
  assert.match(bad.error, /4 steps for 5 words/);
});

test('the model may choose letters, and is only offered them when they fit', async () => {
  /* "Every chart is a choice" — 19 letters, under the ceiling. */
  const spell = Array.from({ length: 19 }, (_, i) => step({ dy: -0.4, blur: 3, delay: i * 90 }));
  const chose = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ note: 'Spelled out', unit: 'letter', steps: spell }) }));
  const res = await chose.AI.generateWordMotion(LINE, { mood: 'one letter at a time' });
  assert.equal(res.error, undefined);
  assert.equal(res.unit, 'letter');
  assert.equal(res.words.length, 19, 'spaces are not animated units');
  const asked = JSON.parse(chose.calls.filter((c) => c.url.endsWith('/api/ai/generate'))[0].init.body);
  assert.match(asked.user, /Letters if you choose/);
  assert.match(asked.system, /19 steps/);
  /* Budgeted for the plan it might actually get back, not the cheapest one. */
  assert.ok(asked.maxTokens > 90 * 19, 'a letter plan asked for with a word plan budget truncates');

  /* Too long for letters: the option is withheld rather than offered and then
     silently dropped by the renderer. */
  const long = 'Every single chart you will ever draw is already a choice';
  const off = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ unit: 'letter',
        steps: Array.from({ length: 11 }, () => step()) }) }));
  const back = await off.AI.generateWordMotion(long, { mood: 'one letter at a time' });
  const sys = JSON.parse(off.calls.filter((c) => c.url.endsWith('/api/ai/generate'))[0].init.body).system;
  assert.match(sys, /too long to animate letter by letter/);
  assert.equal(back.unit, 'word', 'letters were taken on a line that cannot show them');
  assert.equal(back.words.length, 11);
});

test('a count that matches the other unit is read, not rejected', async () => {
  /* A model that laid out 19 letters and left unit at "word" has still done
     the work; throwing it away costs a call and gives the author nothing. */
  const mismatch = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ unit: 'word',
        steps: Array.from({ length: 19 }, () => step({ arc: 'mist' })) }) }));
  const res = await mismatch.AI.generateWordMotion(LINE);
  assert.equal(res.error, undefined);
  assert.equal(res.unit, 'letter');
  assert.equal(res.words[0].arc, 'mist');
  /* But a count matching neither is still a failure with an honest number. */
  const nonsense = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ steps: [step(), step(), step()] }) }));
  assert.match((await nonsense.AI.generateWordMotion(LINE)).error, /3 steps for 5 words/);
});

test('an arc the renderer cannot draw never leaves the AI layer', async () => {
  const wild = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true })
    : reply({ text: JSON.stringify({ steps: [
        step({ arc: 'bounce' }), step({ arc: 'mist' }), step({ arc: 'settle' }),
        step({ arc: 'explode' }), step({ arc: null })] }) }));
  const res = await wild.AI.generateWordMotion(LINE);
  assert.deepEqual(res.words.map((w) => w.arc),
    ['bounce', 'mist', 'settle', 'settle', 'settle']);
  /* The three arcs are described to the model, not just listed — "bounce"
     with no offset to bounce against is a word that appears and twitches. */
  const sys = JSON.parse(wild.calls.filter((c) => c.url.endsWith('/api/ai/generate'))[0].init.body).system;
  assert.match(sys, /"bounce" overshoots past the resting place/);
  assert.match(sys, /"mist" arrives in place while still soft/);
  assert.match(sys, /blur of 8 or more/, 'mist without blur is not mist');
});

test('it refuses the cases it cannot do anything useful with', async () => {
  const stub = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: true }) : reply({ text: '{"words":[]}' }));
  assert.match((await stub.AI.generateWordMotion('')).error, /Write the line first/);
  assert.match((await stub.AI.generateWordMotion('a b c d e f g h i j k l m')).error,
    /Twelve words is the most/);
  /* No key: say which presets still work rather than just failing. */
  const offline = loadAI((url) => url.endsWith('/api/ai/status')
    ? reply({ available: false }) : reply({ text: '{}' }));
  const res = await offline.AI.generateWordMotion(LINE);
  assert.match(res.error, /needs the AI server key/);
  assert.match(res.error, /Rise, Fade and Reveal/);
  assert.equal(offline.calls.filter((c) => c.url.endsWith('/api/ai/generate')).length, 0,
    'nothing is attempted when the server has no key');
});
