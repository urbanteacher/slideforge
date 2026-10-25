// The editor's shell (keys/, shell/): one shortcut registry for the handlers, tooltips, the ? sheet and the palette;
// the place kept in the address; the palette's ranking. The React parts are checked in the browser (docs/editor-shell.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHORTCUTS, ariaKeys, is, setKeyHints, tip } from '../src/keys';
import { formatPlace, parsePlace } from '../src/shell/place';
import { rankCommands, type Command } from '../src/shell/rank';

const key = (k: Partial<KeyboardEvent>) => ({ key: '', code: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...k }) as KeyboardEvent;

test('every shortcut has a unique id, a label, and a chord', () => {
  const ids = SHORTCUTS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SHORTCUTS) assert.ok(s.label && s.chords.length, s.id);
});

test('no two shortcuts share a chord, unless one is for a selected layer and the other for nothing selected', () => {
  const seen = new Map<string, (typeof SHORTCUTS)[number]>();
  const apart = (a: (typeof SHORTCUTS)[number], b: (typeof SHORTCUTS)[number]) =>
    [a.when, b.when].sort().join('|') === 'a layer selected|nothing selected';
  for (const s of SHORTCUTS) for (const c of s.chords) {
    const k = `${c.mod ? 'M' : ''}${c.alt ? 'A' : ''}${c.shift === undefined ? '*' : c.shift ? 'S' : ''}:${c.code ?? c.key?.toLowerCase()}`;
    const other = seen.get(k);
    assert.ok(!other || apart(s, other), `${s.id} and ${other?.id} both take ${k}`);
    seen.set(k, s);
  }
});

test('the side panels take ⌘⌥1 and ⌘⌥2, not ⌘B (Bold)', () => {
  // On a Mac ⌥1 types ¡: the key is matched by its code.
  assert.ok(is('panel.left', key({ key: '¡', code: 'Digit1', metaKey: true, altKey: true })));
  assert.ok(is('panel.right', key({ key: '™', code: 'Digit2', metaKey: true, altKey: true })));
  assert.ok(is('panel.right', key({ key: '\\', ctrlKey: true })));
  assert.ok(is('text.bold', key({ key: 'b', metaKey: true })));
  assert.ok(!is('panel.left', key({ key: 'b', metaKey: true })));
  assert.ok(!is('panel.left', key({ key: '1', code: 'Digit1', metaKey: true })), '⌘1 alone is the browser’s tab switch');
});

test('undo and redo are told apart by Shift; ? counts with Shift held', () => {
  assert.ok(is('edit.undo', key({ key: 'z', metaKey: true })));
  assert.ok(!is('edit.undo', key({ key: 'Z', metaKey: true, shiftKey: true })));
  assert.ok(is('edit.redo', key({ key: 'Z', metaKey: true, shiftKey: true })));
  assert.ok(is('app.keys', key({ key: '?', shiftKey: true })));
  assert.ok(is('edit.nudge', key({ key: 'ArrowLeft', shiftKey: true })));
  assert.ok(!is('edit.nudge', key({ key: 'ArrowUp', altKey: true })), '⌥↑ reorders instead');
});

test('aria-keyshortcuts and tooltips come from the same entry', () => {
  assert.match(ariaKeys('panel.left')!, /^(Meta|Control)\+Alt\+1$/);
  assert.match(ariaKeys('panel.right')!, /Alt\+2 (Meta|Control)\+\\$/);
  assert.match(tip('Hide the inspector', 'panel.right'), /^Hide the inspector \((⌘⌥2|Ctrl\+Alt\+2)\)$/);
  setKeyHints(false);
  assert.equal(tip('Hide the inspector', 'panel.right'), 'Hide the inspector');
  setKeyHints(true);
});

test('the place round-trips through the address, and a bad tab is dropped', () => {
  const p = { deck: 'd1', slide: 's9', tab: 'animate' as const, side: 'status' as const };
  assert.deepEqual(parsePlace(`#${formatPlace(p)}`), p);
  assert.deepEqual(parsePlace('#slide=4&tab=nonsense'), { slide: '4' });
  assert.equal(formatPlace({ deck: 'd1', tab: 'design' }), 'deck=d1', 'the default tab is left out');
});

test('the palette finds a command by its words, and a bare number finds the slide', () => {
  const cmd = (id: string, label: string, words?: string): Command => ({ id, label, group: 'Panels', keys: '⌘⌥1', words, run: () => {} });
  const list = [cmd('panel.left', 'Show or hide the left panel', 'collapse sidebar'), cmd('app.keys', 'Keyboard shortcuts'),
    cmd('slide.go.a', 'Go to slide 1: Title', '1'), cmd('slide.go.b', 'Go to slide 12: End', '12')];
  assert.equal(rankCommands('left panel', list)[0].id, 'panel.left');
  assert.equal(rankCommands('sidebar', list)[0].id, 'panel.left', 'its words count too');
  assert.deepEqual(rankCommands('1', list).map((c) => c.id), ['slide.go.a']);
  assert.ok(!rankCommands('', list).some((c) => c.id.startsWith('slide.go.')), 'an empty search lists commands, not every slide');
});
