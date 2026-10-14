// The Nodes formats in the room (docs/nodes-studio-plan.md step 4): every format's slides make a lesson the
// studio's room can host; the marked ones ask the room's own question types (Multiple choice, Ranking, a
// sort into columns) with their answer slide, and the open ones carry the idea box.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import { NODES } from '../src/designs/nodes';
import { LAYOUT_STYLES } from '../src/layouts';
import { showFromDeck } from '../src/live';
import { canHostInStudio } from '../src/show/canHost';
import type { Slide } from '../src/core';

// The designs measure their words to size them: a canvas that measures each character as half its size stands in.
const g = globalThis as unknown as { document?: unknown; OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.document ??= { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };

const st = LAYOUT_STYLES[0];
const deckOf = (slides: Slide[]) => ({ id: 't', title: 'T', width: 1920, height: 1080, version: 1, slides });
const STYLE: Record<string, string> = { 'join-it-up': 'order', 'model-marks': 'order', 'label-parts': 'order', 'keep-apart': 'compare', 'same-word': 'compare', 'size-answer': 'compare', 'three-answers': 'choice', 'which-step': 'choice' };

for (const f of NODES) {
  test(`${f.label}: the room can host it, as Nodes asks`, () => {
    const slides = f.slides(st, f.starter);
    const deck = deckOf(slides);
    const can = canHostInStudio(deck as never);
    assert.equal(can.ok, true, JSON.stringify(can));
    const show = showFromDeck(deck as never);
    const asked = show.slides.filter((s) => s.quiz);
    if (STYLE[f.id]) {
      assert.equal(asked.length, 1, 'one question');
      assert.equal(asked[0].quiz!.style, STYLE[f.id]);
      assert.ok(slides.some((s) => s.game?.role === 'answer'), 'an answer slide');
    } else {
      assert.equal(asked.length, 0);
      assert.ok(slides.some((s) => s.feedback?.kind === 'brainstorm'), 'an idea box');
    }
  });
}

test('a Ranking from Join it up keeps the links in the right order', () => {
  const f = NODES.find((x) => x.id === 'join-it-up')!;
  const q = showFromDeck(deckOf(f.slides(st, f.starter)) as never).slides.find((s) => s.quiz)!.quiz!;
  assert.deepEqual(q.options, (f.starter as { links: { text: string }[] }).links.map((l) => l.text));
});

test('three formats in one lesson: each asks its own question', () => {
  const pick = (id: string) => { const f = NODES.find((x) => x.id === id)!; return f.slides(st, f.starter); };
  const show = showFromDeck(deckOf([...pick('which-step'), ...pick('join-it-up'), ...pick('keep-apart')]) as never);
  const asked = show.slides.filter((s) => s.activity === 'question').map((s) => s.quiz!.style);
  assert.deepEqual(asked, ['choice', 'order', 'compare'], JSON.stringify(show.slides.map((s) => [s.activity, s.quiz?.style, s.title])));
});

test('every asked question fits what the relay carries', () => {
  for (const f of NODES) {
    for (const s of f.slides(st, f.starter)) {
      const q = s.game?.quiz as { input?: string; options?: unknown[]; sortBins?: unknown[]; sortAnswers?: number[] } | undefined;
      if (!q) continue;
      const n = q.options?.length ?? 0;
      if (q.input === 'sort') {
        assert.equal(q.sortBins?.length, 3, `${f.id}: three columns`);
        assert.ok(n >= 2 && n <= 10, `${f.id}: 2–10 statements`);
        assert.ok(q.sortAnswers!.every((a) => a >= 0 && a <= 2), `${f.id}: answers name a column`);
      }
      if (q.input === 'order') assert.ok(n >= 3 && n <= 8, `${f.id}: 3–8 to rank`);
      if (q.input === 'choice') assert.ok(n >= 2 && n <= 6, `${f.id}: 2–6 choices`);
    }
  }
});

test('a sort too wide for the phones becomes a written answer', async () => {
  const { sortQuiz, orderQuiz } = await import('../src/designs/nodes/types');
  assert.equal(sortQuiz('q', ['a', 'b', 'c', 'd'], ['x', 'y'], [0, 3]), null);
  assert.equal(orderQuiz('q', ['a', 'b']), null);
  assert.deepEqual(sortQuiz('q', ['RAM', 'Storage'], ['x', 'y'], [0, 1])!.sortBins, ['RAM', 'Both', 'Storage']);
  assert.deepEqual(sortQuiz('q', ['RAM', 'Storage'], ['x', 'y'], [0, 1])!.sortAnswers, [0, 2]);
});
