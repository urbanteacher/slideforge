// A widget in the show (engine/widget.ts, CR-25, CR-26): one from someone else's lesson asks before it runs, and the
// teacher's yes is kept; the keys that move the show are passed up from inside it, and taken only from a widget frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WIDGET_STARTER } from '../src/kinds/widget/starter';
import { trustWidget, widgetDoc, widgetKey, widgetPrint, widgetTrusted } from '../src/engine/widget';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };

test('a widget from elsewhere asks first; once allowed, or Add\'s own starter, it runs', () => {
  const page = '<button>Go</button><script>1</script>';
  assert.equal(widgetTrusted(page, WIDGET_STARTER), false);
  assert.equal(widgetTrusted(WIDGET_STARTER, WIDGET_STARTER), true);
  trustWidget(page);
  assert.equal(widgetTrusted(page, WIDGET_STARTER), true);
  assert.equal(widgetTrusted(page + ' ', WIDGET_STARTER), false, 'a changed page asks again');
  assert.equal(widgetPrint(page), widgetPrint(page));
  assert.notEqual(widgetPrint('ab'), widgetPrint('ba'));
});

test('with storage blocked, a widget from elsewhere still asks, and nothing throws', () => {
  const g = globalThis as { localStorage?: unknown };
  const kept = g.localStorage;
  g.localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.doesNotThrow(() => trustWidget('<p>x</p>'));
  assert.equal(widgetTrusted('<p>x</p>'), false);
  g.localStorage = kept;
});

test('the show\'s keys are passed up from inside a widget, before its own script runs', () => {
  const doc = widgetDoc('<script>mine()</script>');
  assert.ok(doc.indexOf('sfWidgetKey') > 0 && doc.indexOf('sfWidgetKey') < doc.indexOf('mine()'));
  assert.ok(doc.indexOf('sfWidgetKey') > doc.indexOf('Content-Security-Policy'), 'after the content policy');
});

test('a key is taken only from a widget frame on the slide, and only one the show uses', () => {
  const frame = {}, other = {};
  assert.deepEqual(widgetKey({ sfWidgetKey: 'PageDown', shiftKey: false }, frame, [frame]), { key: 'PageDown', shiftKey: false });
  assert.equal(widgetKey({ sfWidgetKey: 'PageDown' }, other, [frame]), null, 'from a window that is not a widget on this slide');
  assert.equal(widgetKey({ sfWidgetKey: 'q' }, frame, [frame]), null, 'a key the show does not take');
  assert.equal(widgetKey('PageDown', frame, [frame]), null);
  assert.equal(widgetKey({ sfWidgetKey: 'ArrowRight', shiftKey: true }, frame, [frame])?.shiftKey, true);
});
