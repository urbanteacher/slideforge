'use strict';
/* The generated cover backdrop — the names only, which is all that is pure.
 *
 * A cover wants something moving behind it while a room settles. The obvious
 * way is a video file, which is megabytes per palette and wrong the moment the
 * theme changes; this draws it from the theme's own accent instead. What the
 * renderer has to guarantee is that an unknown or absent name draws nothing at
 * all — a typo in a deck must not put an unstyled div behind a title.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadRender() {
  const sandbox = {
    addEventListener: () => {}, removeEventListener: () => {},
    document: {
      addEventListener: () => {}, removeEventListener: () => {},
      createElement: () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
        setAttribute() {}, appendChild() {} }),
      body: { classList: { add() {}, remove() {}, contains() { return false; } } },
      getElementById: () => null, querySelector: () => null
    },
    location: { protocol: 'http:', origin: 'http://localhost:8787' },
    URL: URL, URLSearchParams: URLSearchParams,
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {}
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/model.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/render.js'), 'utf8'), sandbox);
  return sandbox.SF;
}

const SF = loadRender();

test('a cover asks for one of the backdrops by name, or for none', () => {
  /* Spread: the list comes out of a vm realm, so its Array is not this
     realm's Array and a strict deep-equal compares prototypes. */
  assert.deepEqual([...SF.BACKDROPS], ['drift', 'grid', 'glow']);
  SF.BACKDROPS.forEach((name) => {
    assert.equal(SF.backdropMotion({ design: { backdrop: name } }), name);
    /* Whitespace, because an author may paste the name. */
    assert.equal(SF.backdropMotion({ design: { backdrop: '  ' + name + ' ' } }), name);
  });
});

test('an unknown name draws nothing rather than an unstyled layer', () => {
  [undefined, null, '', 'none', 'DRIFT', 'sparkle', 'drift2', 0, 1, {}, []].forEach((bad) => {
    assert.equal(SF.backdropMotion({ design: { backdrop: bad } }), '',
      'expected no backdrop for ' + JSON.stringify(bad));
  });
  assert.equal(SF.backdropMotion({}), '');
  assert.equal(SF.backdropMotion({ design: null }), '');
});

test('the stylesheet paints every name the renderer will accept', () => {
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  SF.BACKDROPS.forEach((name) => {
    assert.match(css, new RegExp('\\.motion-' + name + '\\b'),
      'css/app.css has no rules for the "' + name + '" backdrop');
  });
  /* The blobs are the theme's accent at low alpha. Mixing towards --s-bg was
     the first attempt and computed to transparent on every theme whose ground
     is a gradient, which is half of them. */
  assert.doesNotMatch(css, /color-mix\(in srgb, var\(--s-accent\) \d+%, var\(--s-bg\)\)/,
    'a backdrop blob is mixing with --s-bg again, which may be a gradient');
});

test('the display sizes are named, and every one of them has a scale', () => {
  const src = fs.readFileSync(require.resolve('../js/customize.js'), 'utf8');
  /* The control and the maths are in different places in the same file, and
     an option with no scale behind it silently means "theme default" — which
     is exactly what "make it huge" used to do. */
  const offered = [...src.matchAll(/\['(small|medium|large|x\d)','[^']+'\]/g)].map((m) => m[1]);
  const scales = src.match(/\{small:[^}]+\}/)[0];
  assert.ok(offered.length >= 6, 'the ramp lost its display steps: ' + offered.join(','));
  offered.forEach((name) => {
    assert.match(scales, new RegExp('\\b' + name + ':'), name + ' is offered with no scale behind it');
  });
  /* And it fits what it grows: five times a 76px heading is 380px, which does
     not fit a 720px slide with a subtitle under it. */
  assert.match(src, /pad\.scrollHeight>pad\.clientHeight/, 'the size ramp no longer checks that it fits');
});

test('a statement is one line, sized by how much there is to say', () => {
  /* Bands rather than measurement, so the editor, the wall, a rail thumbnail
     and a printed page all agree — nothing in that list can be measured the
     same way, and two of them cannot be measured at all. */
  assert.equal(SF.statementBand('Every chart is a choice'), 'xs');
  assert.equal(SF.statementBand('A summary cannot tell you whether the summary is any good'), 'md');
  assert.equal(SF.statementBand('x'.repeat(200)), 'xl');
  assert.equal(SF.statementBand(''), 'xs');
  assert.equal(SF.statementBand(null), 'xs');
  /* Whitespace is not content: a padded line must not drop a band. */
  assert.equal(SF.statementBand('   Every chart is a choice   '), 'xs');

  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  ['xs', 'sm', 'md', 'lg', 'xl'].forEach((band) => {
    assert.match(css, new RegExp('\\.statement\\[data-len="' + band + '"\\]'),
      'no size for the "' + band + '" band');
  });
});

test('the statement layout is registered as a deck layout, in Introduce', () => {
  const content = fs.readFileSync(require.resolve('../src/deck/content.js'), 'utf8');
  assert.match(content, /statement:\s+\{ label: 'Statement'/, 'the type is gone from the picker');
  assert.match(content, /statement:[\s\S]{0,200}group: 'introduce'/, 'it belongs with the openers');
  const render = fs.readFileSync(require.resolve('../js/render.js'), 'utf8');
  assert.match(render, /statement: layoutStatement/, 'the renderer has no layout for it');
  /* The theme decoration is drawn for type held to one side, and ran straight
     through a centred line — Northeastern's N across the middle of the words. */
  assert.doesNotMatch(render,
    /slide\.type === 'statement'[\s\S]{0,400}THEME_ART/,
    'a statement is taking the theme art again');
});

test('the editor edits a statement, and does not call its own text hidden', () => {
  const editor = fs.readFileSync(require.resolve('../js/editor.js'), 'utf8');
  /* Registered for the picker and the renderer is not enough: with no fields
     of its own, the inspector offered a Heading the layout does not draw and
     announced the statement's own line as "extra text not shown". */
  assert.match(editor, /if \(s\.type === 'statement'\)/, 'the inspector has no statement fields');
  assert.match(editor, /'The line'/, 'there is no field for the line itself');

  const tools = fs.readFileSync(require.resolve('../js/content-tools.js'), 'utf8');
  assert.match(tools, /'quote','statement','table'/, 'body still counts as hidden on a statement');
  assert.match(tools, /'section','statement','quote'/, 'subtitle still counts as hidden on a statement');
});

test('one word is sized to the slide, not to a band', () => {
  /* A word has nothing to wrap, so its size is arithmetic: the pad is 1088px
     wide inside its padding and a bold glyph averages ~0.58em. At the 140px
     band a five-letter word covered a quarter of the slide. */
  assert.equal(SF.statementWordSize('Truth'), 320, 'a short word takes the cap');
  assert.equal(SF.statementWordSize('Why?'), 320);
  assert.equal(SF.statementWordSize('Honesty'), 267, 'a longer word steps down');
  assert.equal(SF.statementWordSize('Visualisation'), 144);
  /* Capped rather than unbounded: 320px at 1.04 line-height is 333px of a
     720px slide, which leaves the air a one-word slide needs. */
  assert.equal(SF.statementWordSize('No'), 320);
  assert.equal(SF.statementWordSize(''), 320, 'and it never divides by zero');
  /* A long word must not be sized past the slide: 0.58 × chars × size ≤ 1088. */
  ['Visualisation', 'Incomprehensible', 'Interdisciplinarity'].forEach((word) => {
    const width = 0.58 * word.length * SF.statementWordSize(word);
    assert.ok(width <= 1088, word + ' would be ' + Math.round(width) + 'px wide');
  });

  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  assert.match(css, /\.statement\.statement-word/, 'the one-word case has no rule');
  assert.match(css, /statement-word[\s\S]{0,120}max-width: none/,
    'the sentence measure would wrap a long word mid-air');
});

test('a per-word entrance is one of the named effects, or nothing', () => {
  assert.deepEqual([...SF.WORD_EFFECTS], ['rise', 'fade', 'reveal']);
  SF.WORD_EFFECTS.forEach((name) => {
    assert.equal(SF.wordEffect({ design: { words: name } }), name);
  });
  [undefined, '', 'none', 'RISE', 'bounce', 'rise ', 0, {}].forEach((bad) => {
    const got = SF.wordEffect({ design: { words: bad } });
    if (bad === 'rise ') { assert.equal(got, 'rise', 'a pasted name is trimmed'); return; }
    assert.equal(got, '', 'expected nothing for ' + JSON.stringify(bad));
  });
  assert.equal(SF.wordEffect({}), '');

  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  SF.WORD_EFFECTS.forEach((name) => {
    assert.match(css, new RegExp('words-' + name), 'no keyframes wired for ' + name);
  });
  /* After Effects' Easy Ease is 33% influence each side. */
  assert.match(css, /cubic-bezier\(\.33, 0, \.67, 1\)/, 'the easing is not Easy Ease any more');
  /* And an entrance in the editor would replay on every keystroke. */
  assert.match(css, /#player \.slide \.statement\.words \.w/,
    'the entrance is no longer scoped to the show');
  assert.match(css, /prefers-reduced-motion[\s\S]{0,400}statement\.words \.w/,
    'reduced motion no longer holds the words still');
});

test('words only cycle when there is an entrance to cycle', () => {
  assert.equal(SF.wordsLoop({ design: { words: 'rise', wordsLoop: true } }), true);
  /* A loop with no entrance is a loop of nothing: the words would blink. */
  assert.equal(SF.wordsLoop({ design: { wordsLoop: true } }), false);
  assert.equal(SF.wordsLoop({ design: { words: 'bounce', wordsLoop: true } }), false);
  assert.equal(SF.wordsLoop({ design: { words: 'rise' } }), false);
  assert.equal(SF.wordsLoop({}), false);

  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  SF.WORD_EFFECTS.forEach((name) => {
    assert.match(css, new RegExp('sf-cycle-' + name), 'no cycle keyframes for ' + name);
    assert.match(css, new RegExp('words-loop\\.words-' + name), name + ' has no cycle wired up');
  });
  assert.match(css, /words-loop[\s\S]{0,200}animation-iteration-count: infinite/,
    'the cycle does not repeat');
  /* The hold is most of the cycle: a line that is readable once is not
     readable the fifth time round if it spends half the cycle moving. */
  assert.match(css, /12%, 74%/, 'the hold is no longer the bulk of the cycle');
  assert.match(css, /prefers-reduced-motion[\s\S]{0,600}words-loop \.w[\s\S]{0,120}animation: none/,
    'a loop is the one thing reduced motion must stop');
});

test('speed and spacing are the two controls, and they compose', () => {
  /* Three speeds, each moving the word, the wave and the cycle together, so a
     quick entrance cannot end up with a four-second wave behind it. */
  assert.deepEqual(Object.keys(SF.WORD_SPEEDS).sort(), ['gentle', 'medium', 'quick']);
  const gentle = SF.WORD_SPEEDS.gentle, medium = SF.WORD_SPEEDS.medium, quick = SF.WORD_SPEEDS.quick;
  assert.ok(gentle.dur > medium.dur && medium.dur > quick.dur, 'the durations are not ordered');
  assert.ok(gentle.cycle > medium.cycle && medium.cycle > quick.cycle, 'the cycles are not ordered');
  assert.ok(gentle.span > medium.span && medium.span > quick.span, 'the waves are not ordered');

  /* Spacing is a multiplier on the wave: none, one, or double. */
  assert.equal(SF.WORD_STAGGERS.together, 0, 'together must mean no delay at all');
  assert.ok(SF.WORD_STAGGERS.one > SF.WORD_STAGGERS.wave);

  /* Unset, misspelled or nonsense falls back rather than breaking the look. */
  assert.equal(SF.wordSpeed({}), 'medium');
  assert.equal(SF.wordSpeed({ design: { wordSpeed: 'GENTLE' } }), 'medium');
  assert.equal(SF.wordSpeed({ design: { wordSpeed: 'gentle' } }), 'gentle');
  assert.equal(SF.wordStagger({}), 'wave');
  assert.equal(SF.wordStagger({ design: { wordStagger: 'sideways' } }), 'wave');
  assert.equal(SF.wordStagger({ design: { wordStagger: 'together' } }), 'together');

  /* The stylesheet has to read the slide rather than carry its own numbers,
     or the control would move the wave and leave the words at 620ms. */
  const css = fs.readFileSync(require.resolve('../css/app.css'), 'utf8');
  assert.match(css, /animation-duration: var\(--w-dur, 620ms\)/, 'an entrance ignores the speed');
  assert.match(css, /animation-duration: var\(--w-cycle, 6200ms\)/, 'a cycle ignores the speed');
});
