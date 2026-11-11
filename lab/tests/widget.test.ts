// The live widget (BACKLOG CS-15): its page runs with scripts and nothing else, loads nothing from anywhere, and
// is 16 KB at most, said in the lesson file, the slide limits and the show.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import { webContent } from '../src/engine';
import { WIDGET_MAX, widgetDoc, widgetRuns } from '../src/engine/widget';
import { readLesson } from '../src/decks/lessonFormat';
import { limitsOf } from '../src/core/limits';
import type { Slide } from '../src/core';

test('the frame the show runs a widget in may run scripts and nothing else: never with the page\'s own origin', () => {
  const w = webContent({ id: 'w', kind: 'widget', name: 'W', visible: true, box: { x: 0, y: 0, w: 100, h: 100, rot: 0 }, params: { html: '<b>hi</b>' } } as never);
  assert.equal(w?.kind, 'page');
  const sandbox = w?.kind === 'page' ? w.sandbox.split(/\s+/) : [];
  assert.deepEqual(sandbox, ['allow-scripts'], 'the sandbox the show is handed, not only the constant');
  assert.equal(sandbox.includes('allow-same-origin'), false, 'with scripts, same origin would undo the sandbox');
});

test('the page loads nothing from anywhere, and keeps the widget\'s own HTML', () => {
  const doc = widgetDoc('<button id="b">Go</button><script>1</script>');
  const policy = /Content-Security-Policy" content="([^"]+)"/.exec(doc)?.[1] ?? '';
  assert.match(policy, /default-src 'none'/);
  assert.doesNotMatch(policy, /connect-src|https?:/, 'no network of any kind');
  assert.ok(doc.indexOf('Content-Security-Policy') < doc.indexOf('<button'), 'the policy comes before the widget');
  assert.ok(doc.includes('<button id="b">Go</button><script>1</script>'));
});

test('a widget runs when it has a page within 16 KB', () => {
  assert.equal(widgetRuns(''), false);
  assert.equal(widgetRuns('  '), false);
  assert.equal(widgetRuns('x'.repeat(WIDGET_MAX)), true);
  assert.equal(widgetRuns('x'.repeat(WIDGET_MAX + 1)), false);
  assert.equal(widgetRuns(undefined), false);
});

test('the lesson file checks a widget\'s page, and the slide limits say when it is too large', () => {
  const lesson = (html: unknown) => JSON.stringify({ format: 'slideforge-lesson/1', title: 'T', slides: [{ layout: 'widget', title: 'Try it', html }] });
  assert.deepEqual(readLesson(lesson('<b>ok</b>')).problems, []);
  assert.deepEqual(readLesson(lesson('')).problems, ['Slide 1: "html" must be the widget\'s page, as HTML.']);
  assert.match(readLesson(lesson('x'.repeat(WIDGET_MAX + 10))).problems[0], /16 KB at most/);
  const slide = { id: 's', name: 'S', background: '', notes: '', transition: { type: 'none', duration: 0 }, layers: [{ id: 'w', kind: 'widget', name: 'Dice', visible: true, params: { html: 'x'.repeat(WIDGET_MAX + 10) } }] } as unknown as Slide;
  assert.match(limitsOf(slide)[0], /^“Dice” is a widget of 16\.0 KB, over 16 KB, so the show will not run it/);
});
