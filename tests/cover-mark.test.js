'use strict';
/* The corner mark, and a cover with nothing to illustrate it.
 *
 * Both faults showed up on the same slide. A deck that opens with a hidden
 * teacher page put its mark on that page and not on the cover behind it, so
 * the editor and Present disagreed about the same deck. And a cover whose
 * artwork was missing still reserved the column for it, leaving a third of
 * the slide empty rather than letting the headline have the room.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function load() {
  const data = {};
  const c = { window: {}, console,
    localStorage: { getItem: k => data[k] || null, setItem: (k, v) => data[k] = String(v), removeItem: k => delete data[k] } };
  vm.createContext(c);
  for (const f of ['model', 'lessons']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), c);
  return c.window.SF;
}

test('the corner mark goes on the first slide the room sees, not the first row', () => {
  const SF = load();
  const deck = {
    logo: 'assets/brand/nu-london-logo.png', logoOn: 'title',
    slides: [
      { type: 'content', title: 'Teacher preparation', hidden: true },
      { type: 'title', title: 'The cover' },
      { type: 'content', title: 'A later slide' }
    ]
  };
  assert.equal(SF.deckShowsLogo(deck, deck.slides[0], 0), false, 'a hidden page must never carry the mark');
  assert.equal(SF.deckShowsLogo(deck, deck.slides[1], 1), true, 'the cover behind it must');
  assert.equal(SF.deckShowsLogo(deck, deck.slides[2], 2), false, 'and nothing after it');

  /* The ordinary case is unchanged. */
  const plain = { logo: 'x.png', logoOn: 'title', slides: [{ type: 'title' }, { type: 'content' }] };
  assert.equal(SF.deckShowsLogo(plain, plain.slides[0], 0), true);
  assert.equal(SF.deckShowsLogo(plain, plain.slides[1], 1), false);

  /* Editor and Present must agree: the running order drops hidden slides, so
     the same cover is index 1 in one and index 0 in the other. */
  for (const key of ['aiad27-safe', 'aiad27-smart', 'aiad27-creative', 'aiad27-responsible', 'aiad27-future']) {
    const d = SF.buildLesson(key);
    const run = SF.buildRunDeck(d);
    const edited = d.slides.findIndex((s, i) => SF.deckShowsLogo(d, s, i));
    assert.equal(d.slides[edited].hidden, undefined, key + ': mark landed on a hidden slide');
    assert.equal(d.slides[edited].type, 'title', key + ': mark is not on the cover');
    assert.equal(SF.deckShowsLogo(run, run.slides[0], 0), true, key + ': Present lost the mark');
    assert.equal(d.slides[edited].title, run.slides[0].title, key + ': the two surfaces disagree');
  }

  /* 'all' and 'none' are untouched by any of this. */
  const every = { logo: 'x.png', logoOn: 'all', slides: [{ type: 'content', hidden: true }, { type: 'content' }] };
  assert.equal(SF.deckShowsLogo(every, every.slides[1], 1), true);
  assert.equal(SF.deckShowsLogo(every, every.slides[0], 0), false,
    "'all' still means every slide the room sees, not the hidden ones");
  const never = { logo: 'x.png', logoOn: 'none', slides: [{ type: 'title' }] };
  assert.equal(SF.deckShowsLogo(never, never.slides[0], 0), false);
});

test('every campaign cover still carries the artwork it was authored with', () => {
  const SF = load();
  for (const key of ['aiad27-safe', 'aiad27-smart', 'aiad27-creative', 'aiad27-responsible', 'aiad27-future']) {
    const cover = SF.buildLesson(key).slides.find(s => s.type === 'title');
    assert.match(String(cover.image || ''), /assets\/brand\/aiad27\/poster-\w+\.svg$/,
      key + ': the cover lost its poster graphic');
  }
});
