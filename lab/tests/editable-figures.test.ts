// Every word editable (docs/editable-figures-plan.md): a live figure's words are found and written back for every
// figure kind in the lessons that use them (core/figureWords.ts), and a revealed list comes into the studio as its own
// layers, every word a text layer, its rows on their clicks (layouts/reveal.ts), in a new copy and in an old one.
import './dom-stand-in';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import type { Deck, LiveFigure, Slide } from '../src/core';
import { figureWords, setFigureWord, svgTexts, wordFor } from '../src/core/figureWords';
import { deckFromSlideForge, type SFSlide } from '../src/decks/fromSlideForge';
import { carryDeckReveals } from '../src/decks/reveals';
import { root } from './replay-kit';

type Lesson = { key: string; title: string; theme: string; slides: (SFSlide & LiveFigure)[] };
const FILES = ['ipdv-week5', 'ipdv-week7', 'ipdv-week8', 'ipdv-week9', 'youth-charter'];
const lessons: Lesson[] = (() => {
  const SF = { LESSONS: [] as Lesson[], LIBRARY_SEED_KEYS: {} };
  for (const f of FILES) runInNewContext(readFileSync(resolve(root, `js/lessons-${f}.js`), 'utf8'), { window: { SF }, globalThis: { SF } });
  return SF.LESSONS;
})();
const figures = lessons.flatMap((l) => l.slides.filter((s) => s.type === 'figure').map((s) => ({ lesson: l.key, s })));

test('every live figure in the lessons has its words found, and none of them is markup, a colour or an id', () => {
  assert.ok(figures.length > 100, `${figures.length} figure slides`);
  const kinds = new Set(figures.map((f) => f.s.figure));
  assert.ok(kinds.size >= 13, [...kinds].join(', '));
  for (const { lesson, s } of figures) {
    const words = figureWords(s);
    assert.ok(words.length > 0, `${lesson} · ${s.title}: no words found`);
    assert.ok(words.some((w) => w.path[0] === 'title'), `${lesson} · ${s.title}: its title`);
    for (const w of words) {
      assert.doesNotMatch(w.value, /^\s*</, `${s.title} · ${w.label} is markup`);
      assert.doesNotMatch(w.value, /^#[0-9a-f]{3,8}$/i, `${s.title} · ${w.label} is a colour`);
    }
  }
});

test('a word written back is the word the figure then has, and nothing else changes', () => {
  for (const { s } of figures.slice(0, 400)) {
    const words = figureWords(s);
    for (const w of words) {
      const next = setFigureWord(s, w, 'Edited & <new>');
      const again = figureWords(next);
      assert.equal(again.length, words.length, `${s.title} · ${w.label}: the fields stay the same`);
      const same = again.find((x) => JSON.stringify(x.path) === JSON.stringify(w.path) && x.svgText === w.svgText)!;
      assert.equal(same.value, 'Edited & <new>', `${s.title} · ${w.label}`);
      assert.equal(again.filter((x) => x.value !== words[again.indexOf(x)].value).length, 1, `${s.title} · ${w.label}: only that one`);
    }
  }
  const f = figures[0].s;
  assert.notEqual(setFigureWord(f, figureWords(f)[0], 'x'), f, 'a copy, the original untouched');
});

test('the words in a drawn picture are its texts, escaped when written back', () => {
  const svg = '<svg><text x="1">Follow a path</text><text><tspan>Who &amp; why</tspan></text><rect/></svg>';
  assert.deepEqual(svgTexts(svg).map((t) => t.value), ['Follow a path', 'Who & why']);
  const fig: LiveFigure = { figure: 'panels', figureData: { svg }, title: 'T' };
  const word = figureWords(fig).find((w) => w.svgText === 1)!;
  const out = (setFigureWord(fig, word, 'A < B').figureData as { svg: string }).svg;
  assert.match(out, /<tspan>A &lt; B<\/tspan>/);
  assert.equal(wordFor(figureWords(fig), 'Follow a path')?.svgText, 0);
});

const week9 = lessons.find((l) => l.key === 'ipdv-story-w9')!;
const convert = (l: Lesson) => deckFromSlideForge({ key: l.key, title: l.title, theme: l.theme, slides: l.slides, images: {} }, 'nul');

test('a revealed list comes in as the studio\'s own layers: every word a text layer, a row per click', () => {
  const deck = convert(week9);
  const reveals = week9.slides.filter((s) => s.figure === 'reveal');
  assert.ok(reveals.length >= 8);
  for (const s of reveals) {
    const sl = deck.slides.find((x) => x.name.replace(/^\d+ · /, '') === s.title || x.name === `Live figure · ${s.title}`)!;
    assert.ok(sl, String(s.title));
    assert.ok(!sl.liveFigure && !sl.figure, `${s.title}: not a picture of a figure`);
    const words = sl.layers.filter((l) => l.kind === 'text').map((l) => String(l.params.text));
    assert.ok(words.includes(s.title!), `${s.title}: its title`);
    const rows = (s.figureData as { rows: { name?: string; text?: string; say?: string }[] }).rows;
    for (const r of rows) for (const t of [r.name, r.text, r.say].filter(Boolean)) assert.ok(words.includes(t!), `${s.title}: "${t}"`);
    const clicks = sl.layers.filter((l) => l.anim.trigger === 'onClick').length;
    assert.equal(clicks, (s.figureSteps?.length ?? 1) - 1, `${s.title}: a click per step after the first`);
  }
  // The charts and panels stay live figures (stood in for by the picture the shell draws, js/lab-engine.js), with
  // their words in the Figure tab; no list is one.
  assert.ok(!deck.slides.some((x) => x.figure?.figure === 'reveal'));
});

test('an old copy\'s revealed lists, pictures until now, are built from layers in place: same id, notes kept', () => {
  const s = week9.slides.find((x) => x.figure === 'reveal')!;
  const old = {
    id: 'kept', name: `Live figure · ${s.title}`, background: '', transition: { type: 'none', duration: 0 }, layers: [],
    notes: 'My own note.\n\nLAB — A live figure, drawn here as its last step. The show plays the real one: the room can hover it and Next steps it.',
    liveFigure: true, figure: { figure: 'reveal', figureData: s.figureData, figureSteps: s.figureSteps, title: s.title }, sourceSlideId: s.id,
  } as unknown as Slide;
  const deck = { id: 'd', title: 'D', width: 1920, height: 1080, version: 1, slides: [old] } as unknown as Deck;
  assert.equal(carryDeckReveals(deck, 'nul', undefined, { theme: 'northeastern', title: 'W9' }, week9.slides), 1);
  const sl = deck.slides[0];
  assert.equal(sl.id, 'kept');
  assert.match(sl.notes, /^My own note\.\n\nLAB — What the slide said at each click/);
  assert.doesNotMatch(sl.notes, /drawn here as its last step/);
  assert.ok(!sl.liveFigure && sl.layers.some((l) => l.kind === 'text' && l.params.text === s.title));
  assert.equal(carryDeckReveals(deck, 'nul'), 0, 'once built, left alone');
});
