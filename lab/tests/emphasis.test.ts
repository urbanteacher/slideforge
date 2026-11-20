// Bold or colour on some of a text's words (first-run review Wave 4): written **bold** and ==accent== in the words,
// laid out word by word with the marks taken off, and carried to PowerPoint as runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const bold = /\b[7-9]00\b/.test(this.font); const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * (bold ? 0.6 : 0.5), actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import { emphasisRuns, emphasisWords, layoutText, plainText } from '../src/engine';

test('marks are read off the words, across several words and before punctuation', () => {
  assert.deepEqual(emphasisWords('the **big idea** is ==here==, now').map((w) => [w.text, w.strong, w.accent]), [
    ['the', false, false], ['big', true, false], ['idea', true, false], ['is', false, false], ['here,', false, true], ['now', false, false],
  ]);
  assert.equal(plainText('**One** ==two==\nthree'), 'One two\nthree');
});

test('a strong word is measured in the bold face, and a styled line is drawn word by word', () => {
  const L = layoutText({ text: 'aa **bb** cc', size: 40, font: 'Inter', weight: '400' }, 2000);
  const [, bb] = L.lines[0].words;
  assert.equal(bb.text, 'bb');
  assert.equal(bb.strong, true);
  assert.equal(bb.w, 2 * 40 * 0.6);
  assert.equal(L.lines[0].plain, false);
  assert.equal(L.lines[0].text, 'aa bb cc');
});

test('PowerPoint gets runs of one emphasis each', () => {
  assert.deepEqual(emphasisRuns('a **b c** d ==e=='), [
    { text: 'a', strong: false, accent: false }, { text: ' b c', strong: true, accent: false }, { text: ' d', strong: false, accent: false }, { text: ' e', strong: false, accent: true },
  ]);
});
