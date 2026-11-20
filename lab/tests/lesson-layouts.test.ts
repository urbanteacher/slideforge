// The lesson file's wider reach (docs/lesson-format.md, first-run review Wave 3): more of the studio's layouts, click
// builds, and a slide past its layout's cap carried on rather than refused. A stand-in canvas measures words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const g = globalThis as unknown as { OffscreenCanvas?: unknown };
const ctx = { font: '40px Inter', measureText(t: string) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 40); return { width: t.length * px * 0.5, actualBoundingBoxAscent: px * 0.8, actualBoundingBoxDescent: px * 0.2, fontBoundingBoxAscent: px * 0.9, fontBoundingBoxDescent: px * 0.25 }; } };
g.OffscreenCanvas ??= class { getContext() { return ctx; } };
import '../src/kinds';
import { deckFromLesson, readLesson } from '../src/decks';
import type { Slide } from '../src/core';

const file = (slides: unknown[]) => ({ format: 'slideforge-lesson/1', title: 'T', slides });
const make = (slides: unknown[]) => {
  const r = readLesson(file(slides));
  assert.deepEqual(r.problems, []);
  return deckFromLesson(r.lesson!);
};
const steps = (s: Slide) => new Set(s.layers.map((l) => l.anim.step?.i).filter((i) => i !== undefined)).size;

test('each new layout reads and builds', () => {
  const d = make([
    { layout: 'picture', picture: 'a.png', title: 'Look', credit: '[source __]' },
    { layout: 'pictures', title: 'Step by step', pictures: [['1.png', 'First'], ['2.png', 'Then'], ['3.png', 'Last']] },
    { layout: 'video', title: 'Watch', url: 'https://www.youtube.com/watch?v=xxxxxxxxxxx' },
    { layout: 'chart', title: 'Numbers', chart: 'bar', data: [['A', 3], ['B', 5]], source: '[source __]' },
    { layout: 'diagram', title: 'The cycle', diagram: 'loop', steps: ['Plan', 'Do', 'Review'] },
    { layout: 'journey', title: 'Process', steps: [['Ask', 'a'], ['Try', 'b'], ['Check', 'c']] },
    { layout: 'funnel', title: 'Narrowing', stages: [['All', '[__]', 'everyone'], ['Some', '[__]', 'a few']] },
    { layout: 'mindmap', title: 'Idea', ideas: [['One', 'a'], ['Two', 'b'], ['Three', 'c']] },
    { layout: 'orgchart', title: 'Who', people: [['Lead', 'leads', ''], ['Tutor', 'teaches', 'Lead']] },
    { layout: 'columns', title: 'Three', points: ['a', 'b', 'c'] },
    { layout: 'rail', title: 'Next', points: ['a', 'b', 'c'] },
    { layout: 'introduction', name: 'Your name', role: 'Role', bio: 'A line.' },
    { layout: 'code', title: 'Code', code: 'print(1)', language: 'python' },
  ]);
  assert.equal(d.slides.length, 13);
  const chart = d.slides[3].layers.find((l) => l.kind === 'chart')!;
  assert.equal(chart.params.chart, 'bar');
  assert.equal(chart.params.data, 'A, 3\nB, 5');
  const pics = d.slides[1].layers.filter((l) => l.kind === 'image');
  assert.deepEqual(pics.map((l) => l.anim.step?.mode), ['swap', 'swap', 'swap']);
  assert.deepEqual(pics.map((l) => l.anim.trigger), ['withSlide', 'onClick', 'onClick']);
});

test('build reveals a layout\'s items a click each, along the way they run', () => {
  const d = make([
    { layout: 'cards', title: 'C', cards: [['A', 'a'], ['B', 'b'], ['C', 'c']], build: 'click' },
    { layout: 'keywords', title: 'K', terms: [['A', 'a'], ['B', 'b'], ['C', 'c'], ['D', 'd']], build: 'dim' },
    { layout: 'stats', title: 'S', stats: [['[__]', 'a'], ['[__]', 'b']], build: 'spot' },
    { layout: 'bullets', title: 'B', points: ['a', 'b'], build: 'dim' },
  ]);
  assert.equal(steps(d.slides[0]), 3);
  assert.equal(steps(d.slides[1]), 4);
  assert.equal(steps(d.slides[2]), 2);
  assert.ok(d.slides[0].layers.filter((l) => l.anim.trigger === 'onClick').length === 3);
  assert.equal(d.slides[1].layers.find((l) => l.anim.step)?.anim.step?.mode, 'dim');
  assert.equal(d.slides[3].layers.find((l) => l.params.list === 'bullets')?.anim.build, 'dim');
});

test('build is refused where there is nothing to build', () => {
  assert.match(readLesson(file([{ layout: 'title', title: 'T', build: 'click' }])).problems[0], /has nothing to build/);
  assert.match(readLesson(file([{ layout: 'cards', title: 'T', cards: [['a', 'b'], ['c', 'd']], build: 'fade' }])).problems[0], /"build" must be/);
});

test('six cards make two slides of the same layout and title; their ids are taken', () => {
  const six = Array.from({ length: 6 }, (_, i) => [`H${i}`, `w${i}`]);
  const d = make([{ layout: 'cards', id: 'ideas', title: 'Ideas', cards: six }]);
  assert.equal(d.slides.length, 2);
  assert.deepEqual(d.slides.map((s) => s.id), ['ideas', 'ideas-2']);
  assert.ok(d.slides.every((s) => s.layers.some((l) => l.params.text === 'Ideas')));
  const clash = readLesson(file([{ layout: 'cards', id: 'ideas', title: 'Ideas', cards: six }, { layout: 'title', id: 'ideas-2', title: 'X' }]));
  assert.match(clash.problems[0], /"ideas-2" is taken/);
});

test('build finds one step per item on every layout that builds', () => {
  const three = {
    timeline: { events: [['[__]', 'A', 'a'], ['[__]', 'B', 'b'], ['[__]', 'C', 'c']] },
    icons: { items: [['clock', 'A', 'a'], ['user', 'B', 'b'], ['book-open', 'C', 'c']] },
    journey: { steps: [['A', 'a'], ['B', 'b'], ['C', 'c']] },
    funnel: { stages: [['A', '[__]', 'a'], ['B', '[__]', 'b'], ['C', '[__]', 'c']] },
    mindmap: { ideas: [['A', 'a'], ['B', 'b'], ['C', 'c']] },
    columns: { points: ['a', 'b', 'c'] },
    rail: { points: ['a', 'b', 'c'] },
  } as Record<string, Record<string, unknown>>;
  const found = Object.entries(three).map(([layout, fields]) => [layout, steps(make([{ layout, title: 'T', ...fields, build: 'click' }]).slides[0])]);
  assert.deepEqual(found, Object.keys(three).map((k) => [k, 3]));
});

test('a lesson may wear a palette by its id; an unknown theme is said, and built in Paper', () => {
  const nul = readLesson({ ...file([{ layout: 'title', title: 'T' }]), theme: 'nul' });
  assert.deepEqual([nul.problems, nul.warnings], [[], []]);
  const d = deckFromLesson(nul.lesson!);
  assert.equal(d.theme, 'guide');
  assert.equal(d.styleGuide?.name, 'Northeastern University London');
  const odd = readLesson({ ...file([{ layout: 'title', title: 'T' }]), theme: 'sparkly' });
  assert.deepEqual(odd.problems, []);
  assert.match(odd.warnings[0], /"theme" "sparkly" is not one of the studio's themes .* so the lesson is built in Paper/);
});

test('the reader\'s theme ids are the built-in themes', async () => {
  const { LAYOUT_STYLES } = await import('../src/layouts');
  const { LESSON_THEME_IDS } = await import('../src/decks/lessonFormat');
  assert.deepEqual(LESSON_THEME_IDS, LAYOUT_STYLES.map((s) => s.id));
});

test('the AI prompt names every layout the studio builds, and a chat reply is cleaned before it is read', async () => {
  const { lessonPrompt, cleanPasted } = await import('../src/decks');
  const { LESSON_LAYOUTS } = await import('../src/decks/lessonFormat');
  const p = lessonPrompt('Photosynthesis', 'Year 8');
  for (const k of Object.keys(LESSON_LAYOUTS)) if (k !== 'widget') assert.match(p, new RegExp(`^- ${k}:`, 'm'), k);
  assert.match(p, /Topic: Photosynthesis/);
  assert.match(p, /Never invent a fact/);
  const reply = 'Here you go!\n```json\n{ "format": "slideforge-lesson/1", "title": “T”, "slides": [ { "layout": "title", "title": "Hi", }, ], }\n```\nEnjoy.';
  assert.deepEqual(readLesson(cleanPasted(reply)).problems, []);
});
