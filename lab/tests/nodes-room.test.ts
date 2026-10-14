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

// Without phones (a show opened with no room): the cue says what to do instead, and every challenge shows its answers.
test('with no room, each Nodes phones cue says what to do without phones', async () => {
  const { withoutPhones } = await import('../src/show/steps');
  const cue = (slides: Slide[]) => slides.flatMap((s) => s.layers.filter((l) => l.name === 'Phones').map((l) => String(l.params.text)));
  for (const f of NODES) {
    const shown = withoutPhones(deckOf(f.slides(st, f.starter)));
    for (const t of cue(shown.slides)) assert.ok(!/PHONES/.test(t), `${f.id}: "${t}"`);
  }
  const three = NODES.find((f) => f.id === 'three-answers')!;
  assert.deepEqual(cue(withoutPhones(deckOf(three.slides(st, three.starter))).slides), ['HANDS UP · A, B OR C']);
  const step = NODES.find((f) => f.id === 'which-step')!;
  assert.deepEqual(cue(withoutPhones(deckOf(step.slides(st, step.starter))).slides), ['HANDS UP · WHICH STEP?']);
  const join = NODES.find((f) => f.id === 'join-it-up')!;
  assert.match(cue(withoutPhones(deckOf(join.slides(st, join.starter))).slides)[0], /^ON PAPER · /);
  // The slides themselves are not changed: a room still says phones.
  assert.match(cue(join.slides(st, join.starter))[0], /^ON PHONES · /);
});

// Every format shows its answers in its question's own layout (docs/nodes-studio-plan.md, without phones).
const words = (slides: Slide[]) => slides.flatMap((s) => s.layers.map((l) => String(l.params.text ?? '')));
const pick = (id: string) => NODES.find((x) => x.id === id)!;

test('Same link, new case: each case worked a step per link, in the link’s chain', () => {
  const f = pick('new-case');
  const slides = f.slides(st, f.starter);
  const near = slides.find((s) => s.nodes?.role === 'near')!, far = slides.find((s) => s.nodes?.role === 'far')!;
  assert.equal(near.layers.filter((l) => /^Step \d — words$/.test(l.name)).length, 3);
  assert.match(words([near]).join(' | '), /0\.4 ns/);
  assert.match(words([far]).join(' | '), /20 ms/);
  assert.ok(!slides.some((s) => s.nodes?.role === 'worked'), 'no separate worked slide');
  // An older answer as one sentence a case keeps its own slide.
  const old = f.slides(st, { ...(f.starter as object), worked: { near: '0.4 ns', far: '20 ms' } } as never);
  assert.equal(old[old.length - 1].nodes?.role, 'worked');
});

test('Size the answer and Same word fill the reveal’s own boxes with an answer', () => {
  for (const [id, n] of [['size-answer', 5], ['same-word', 6]] as const) {
    const f = pick(id), reveal = f.slides(st, f.starter).find((s) => s.nodes?.role === 'reveal')!;
    assert.equal(reveal.layers.filter((l) => /(model \d — words|model (from|to) words)$/.test(l.name)).length, n, id);
  }
});

test('the ladder and Before, during, after end on their answers, laid out as the question', () => {
  const l = pick('ladder').slides(st, pick('ladder').starter);
  assert.deepEqual(l.map((s) => s.nodes?.role), ['ask', 'rungs', 'reattempt', 'answer', 'later', 'later-answer']);
  assert.match(words(l.filter((s) => s.nodes?.role === 'answer')).join(' | '), /ALU/);
  const b = pick('before-during-after').slides(st, pick('before-during-after').starter);
  assert.deepEqual(b.map((s) => s.nodes?.role), ['routine', 'answered']);
  assert.equal(b[1].layers.filter((l2) => /^Example /.test(l2.name)).length, 3);
});

test('every Framework stage writes its model answer into its scaffold, a part per slot', async () => {
  const { slotsOf } = await import('../src/designs/nodes');
  const f = NODES.find((x) => x.id === 'framework')!;
  for (const content of [f.starter, ...(f.variants ?? []).map((v) => v.content)]) {
    const run = content as { stages: { name: string; backbone: string; model?: unknown }[] };
    const stages = f.slides(st, content as never).filter((s) => /^stage-/.test(s.nodes?.role ?? ''));
    assert.equal(stages.length, run.stages.length);
    stages.forEach((s, i) => {
      const slots = slotsOf(run.stages[i] as never);
      const parts = s.layers.filter((l) => /^Model \d — words$/.test(l.name)).map((l) => String(l.params.text));
      assert.equal(parts.length, slots.length, `${s.name}: a part for each of ${slots.join(', ')}`);
      assert.ok(parts.every((p) => p.length > 1));
      assert.ok(!s.layers.some((l) => l.name === 'Model answer'), `${s.name}: written into the scaffold, not over it`);
    });
  }
  // A model as one sentence (an older AI answer) is laid over the scaffold instead.
  const one = structuredClone(f.starter) as { stages: { model?: unknown }[] };
  one.stages[0].model = 'Clock speed is cycles per second.';
  assert.ok(f.slides(st, one as never).some((s) => s.layers.some((l) => l.name === 'Model answer')));
});

// The teacher's copy: every question slide's notes say the answer before the class sees it.
test('each Nodes question slide’s notes carry its answer for the teacher', () => {
  const ask = (id: string, role = 'ask') => { const f = NODES.find((x) => x.id === id)!; return f.slides(st, f.starter).find((s) => s.nodes?.role === role)!.notes; };
  assert.match(ask('join-it-up'), /THE ANSWER[\s\S]*means more clock cycles/);
  assert.match(ask('keep-apart'), /THE ANSWER[\s\S]*Holds the address of the next instruction/);
  assert.match(ask('which-step'), /THE ANSWER[\s\S]*It broke at Retrieve/);
  assert.match(ask('three-answers'), /THE ANSWER[\s\S]*excellent/i);
  assert.match(ask('size-answer'), /THE ANSWER[\s\S]*An answer: The ALU/);
  assert.match(ask('same-word'), /THE ANSWER[\s\S]*Answer: Cache memory/);
  assert.match(ask('ladder'), /THE ANSWER[\s\S]*Control unit → decodes/);
  assert.match(ask('ladder', 'later'), /THE ANSWER[\s\S]*Router → connects/);
  assert.match(ask('before-during-after', 'routine'), /THE ANSWER[\s\S]*Repair/);
  assert.match(ask('model-marks'), /THE ANSWER/);
  // The answer slides themselves are not given it twice.
  const f = NODES.find((x) => x.id === 'join-it-up')!;
  assert.ok(!f.slides(st, f.starter).find((s) => s.nodes?.role === 'reveal')!.notes.includes('THE ANSWER'));
});

test('a Nodes Ranking and sort tell each phone the right answer after the reveal', async () => {
  const { order } = await import('../src/live/styles/order');
  const { compare } = await import('../src/live/styles/compare');
  const q = (id: string) => { const f = NODES.find((x) => x.id === id)!; return f.slides(st, f.starter).find((s) => s.game?.quiz)!.game!.quiz as never as Record<string, unknown>; };
  const o = q('join-it-up');
  assert.equal(order.reveal(o as never).answer, 'the right order, first to last');
  assert.match(String(o.explanation), /^1\. A higher clock speed\n\n2\. /);
  const c = q('keep-apart');
  assert.equal(compare.reveal(c as never).answer, 'each in its column');
  assert.match(String(c.explanation), /^Registers[^:]*: Holds/);
  // A classic Ranking still says its first item.
  assert.equal(order.reveal({ options: ['a', 'b', 'c'], correct: 0 } as never).answer, 'a');
});
