'use strict';
/* One-way Markdown → starter deck (not a practice-notes round-trip). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('parses a simple outline into core layouts', async () => {
  const { parseMarkdownDeck } = await import('../src/deck/markdown.js');
  const md = [
    '# Climate lab',
    '',
    '## Opening',
    'Welcome to the session',
    '',
    '## Agenda',
    '- Frame the question',
    '- Build a model',
    '- Reflect',
    '',
    '## Three moves',
    '1. Observe',
    '2. Explain',
    '3. Decide',
    '',
    '## Quote',
    '> All models are wrong',
    '— Box',
    '',
    '## Photograph',
    '![sky](https://example.com/sky.jpg)',
    '',
    '## Key words',
    '- **Albedo** — reflected light',
    '- **Forcing** — a push on the system'
  ].join('\n');

  const parsed = parseMarkdownDeck(md);
  assert.equal(parsed.title, 'Climate lab');
  assert.equal(parsed.slides.length, 6);
  assert.equal(parsed.slides[0].type, 'title');
  assert.equal(parsed.slides[0].title, 'Opening');
  assert.match(parsed.slides[0].subtitle || '', /Welcome/);
  assert.equal(parsed.slides[1].type, 'content');
  assert.equal(parsed.slides[1].bullets.length, 3);
  assert.equal(parsed.slides[2].type, 'cards');
  assert.equal(parsed.slides[2].bullets[0], 'Observe');
  assert.equal(parsed.slides[3].type, 'quote');
  assert.match(parsed.slides[3].body || '', /models are wrong/);
  assert.match(parsed.slides[3].subtitle || '', /Box/);
  assert.equal(parsed.slides[4].type, 'image');
  assert.equal(parsed.slides[4].image, 'https://example.com/sky.jpg');
  assert.equal(parsed.slides[5].type, 'keywords');
  assert.match(parsed.slides[5].bullets[0], /Albedo/);
});

test('strips export numbering and skips practice-notes boilerplate', async () => {
  const { parseMarkdownDeck } = await import('../src/deck/markdown.js');
  const md = [
    '# Untitled lesson',
    '',
    '_Practice notes from SlideForge. Live polls, games and scoring stay in the classroom room._',
    '',
    '## 1. Title',
    'Your name',
    '',
    '## 2. Section',
    '',
    '---',
    '',
    '_Exported for Canvas / Colab practice. Re-open the `.sfdeck.json` in SlideForge to host live._'
  ].join('\n');
  const parsed = parseMarkdownDeck(md);
  assert.equal(parsed.slides[0].title, 'Title');
  assert.equal(parsed.slides[1].type, 'section');
  assert.equal(parsed.slides[1].title, 'Section');
  assert.ok(parsed.slides.every(function (s) {
    return !/Practice notes|Exported for Canvas/.test(JSON.stringify(s));
  }));
});

test('markdownToDeck normalizes through the model', async () => {
  /* Build first so js/model.js includes markdownToDeck. */
  const dir = path.resolve(__dirname, '..');
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const context = { window: {}, console, localStorage, Date };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/model.js'), 'utf8'), context);
  const SF = context.window.SF;
  assert.equal(typeof SF.markdownToDeck, 'function');
  const deck = SF.markdownToDeck('# Lab\n\n## Hello\n- one\n- two\n');
  assert.equal(deck.title, 'Lab');
  assert.equal(deck.slides.length, 1);
  assert.equal(deck.slides[0].type, 'content');
  assert.equal(deck.slides[0].bullets.length, 2);
  assert.ok(deck.slides[0].id);
});
