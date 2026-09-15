'use strict';
/* Two teaching moves that were not expressible before.
 *
 * A chart callout — "look at 2020 now" — as steps inside one slide, instead of
 * four cropped screenshots as four slides. And a build that takes the light
 * off everything except the point being made, which is the other half of what
 * a presenter does with their hand.
 *
 * Both are mostly browser behaviour, so what is unit-testable is the part that
 * decides: which callouts count, where they point, and what the model keeps.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
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
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/callouts.js'), 'utf8'), sandbox);
  return sandbox.SF;
}

const SF = load();
const chart = (extra) => SF.normalizeSlide(Object.assign(SF.makeSlide('chart'), Object.assign({
  chartKind: 'bar',
  body: 'Year\tHires\n2018\t10\n2019\t11\n2020\t4\n2021\t12'
}, extra)));

test('a callout names a category, and a nameless one is not a callout', () => {
  const s = chart({ callouts: [
    { label: '2020', note: 'Lockdown' },
    { label: '  ', note: 'nothing to point at' },
    { label: '2021' }
  ] });
  /* The model drops the blank on the way in; the module ignores it again at
     the point of use, because a deck edited by hand can carry anything. */
  assert.deepEqual(s.callouts.map((c) => c.label), ['2020', '2021']);
  assert.equal(SF.Callouts.list(s).length, 2);
  assert.equal(SF.Callouts.has(s), true);
  assert.equal(SF.Callouts.has(chart({})), false);
  /* Six is the cap: a chart walked through more than that wanted to be slides. */
  const many = chart({ callouts: Array.from({ length: 9 }, (_, i) => ({ label: 'c' + i, note: '' })) });
  assert.equal(many.callouts.length, 6);
});

test('the walk has a before and an after, and they are not the same state', () => {
  const s = chart({ callouts: [{ label: '2020', note: '' }, { label: '2021', note: '' }] });
  /* -1 before it starts, 0..n-1 the callouts, n the whole chart again. The two
     whole-chart states differ in what a press back does: leave the slide, or
     return to the last callout. */
  const player = { open: true, _current: null, wallSlide: () => s, calloutStates: {} };
  assert.equal(SF.Callouts.at(player, s), -1);
  assert.equal(SF.Callouts.step(player, 1), true);
  assert.equal(SF.Callouts.at(player, s), 0);
  assert.equal(SF.Callouts.step(player, 1), true);
  assert.equal(SF.Callouts.at(player, s), 1);
  assert.equal(SF.Callouts.step(player, 1), true, 'the last press puts the whole chart back');
  assert.equal(SF.Callouts.at(player, s), 2);
  assert.equal(SF.Callouts.step(player, 1), false, 'and then the press belongs to the deck');
  assert.equal(SF.Callouts.step(player, -1), true, 'back from "after" returns to the last callout');
  assert.equal(SF.Callouts.at(player, s), 1);

  /* A slide with no callouts never takes a press. */
  const plain = chart({});
  const other = { open: true, wallSlide: () => plain, calloutStates: {} };
  assert.equal(SF.Callouts.step(other, 1), false);
  assert.equal(SF.Callouts.step(other, -1), false);
});

test('a build can hide, dim, or spotlight — and nothing else', () => {
  const build = (mode) => SF.normalizeSlide(Object.assign(SF.makeSlide('content'),
    { progressive: true, buildMode: mode })).buildMode;
  assert.equal(build('hide'), 'hide');
  assert.equal(build('dim'), 'dim');
  assert.equal(build('spot'), 'spot');
  assert.equal(build('spotlight'), 'hide', 'an unknown mode is the safe one, not a broken one');
  assert.equal(build(undefined), 'hide');

  /* The live step needs a class of its own — three states were computed and
     only two were styleable. */
  const teaching = fs.readFileSync(require.resolve('../js/teaching.js'), 'utf8');
  assert.match(teaching, /step-live/, 'the live step is unnamed again');
  assert.match(teaching, /buildMode==='spot'/, 'spotlight does not reach the slide');
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  assert.match(css, /build-spot .step\.step-past/, 'the past steps are not held back');
  assert.match(css, /build-spot:has\(\.step-live\)::after/,
    'the vignette should only appear once the build has started');
  assert.match(css, /\.pdf-page \.slide\.build-spot::after \{ display: none/,
    'a handout is read, not presented — it should not be vignetted');
});

test('morph is a transition, and it says what it needs', () => {
  assert.ok(SF.TRANSITIONS.includes('morph'));
  const player = fs.readFileSync(require.resolve('../js/player.js'), 'utf8');
  /* Pairs, in order of how strongly they mean "the same thing". */
  ['sf-morph-media', 'sf-morph-chart', 'sf-morph-head'].forEach((name) => {
    assert.ok(player.includes(name), 'no morph pairing for ' + name);
  });
  assert.match(player, /startViewTransition/, 'morph no longer uses view transitions');
  assert.match(player, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/,
    'morph must not run when less motion was asked for');
  /* A name left on two elements at once makes the browser ignore both. */
  assert.match(player, /function clearMorph/, 'the transition name is never cleared');
  /* And it falls back rather than dropping the slide. */
  assert.match(player, /tr = morphing \? 'none' : 'fade'/, 'morph has no fallback');
});
