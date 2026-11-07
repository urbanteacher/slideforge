'use strict';
/* IPDV Week 9, narrative and experiential visualisation (tools/build-ipdv-week9.js), and the figure it
 * brought (src/figures/story.js): the lesson is built in, every live step explains itself, the drawings
 * are plain SVG, the numbers said out loud are the data's, and it fits the slot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets/lesson/ipdv/week9');

function lesson(key) {
  const context = { window: { SF: { LESSONS: [], LIBRARY_SEED_KEYS: {} } } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/lessons-ipdv-week9.js'), 'utf8'), context);
  return { lesson: context.window.SF.LESSONS.find((l) => l.key === key), seeds: context.window.SF.LIBRARY_SEED_KEYS };
}

test('Week 9 is built in, in the Northeastern folder, with a student copy', () => {
  const { lesson: l, seeds } = lesson('ipdv-story-w9');
  assert.ok(l, 'the lecture is built in');
  assert.equal(seeds['ipdv-story-w9'], 'nul');
  assert.equal(seeds['ipdv-story-w9-student'], 'nul');
  assert.ok(l.slides.length >= 40);
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /js\/lessons-ipdv-week9\.js/);
});

test('every live figure is one SlideForge draws, and every story step says what you see', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  const index = fs.readFileSync(path.join(ROOT, 'src/figures/index.js'), 'utf8');
  assert.match(index, /story: chartStory/);
  const figures = l.slides.filter((s) => s.type === 'figure');
  assert.ok(figures.filter((s) => s.figure === 'story').length >= 4);
  for (const s of figures) {
    s.figureSteps.forEach((st, i) => {
      assert.ok(String(st.caption || '').trim(), `${s.title} step ${i + 1} has a caption`);
      if (s.figure === 'story') assert.ok(String(st.explain || '').trim(), `${s.title} step ${i + 1} has its words`);
    });
  }
});

test('every Build-it shows the picture its code drew; statements carry their words', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/code/steps.json'), 'utf8')).steps;
  for (const st of steps) {
    assert.ok(fs.existsSync(path.join(DIR, `code-${st.id}.png`)), `code-${st.id}.png`);
    assert.ok(l.slides.some((s) => s.image === `assets/lesson/ipdv/week9/build-${st.id}.svg`), `a slide shows build-${st.id}`);
  }
  for (const s of l.slides) {
    if (s.type === 'statement') assert.ok(String(s.body || '').trim(), `${s.title}: words in body`);
    if (s.type === 'image' && /\/orig-/.test(s.image)) {
      assert.equal(s.design.capStyle, 'top', `${s.title}: the title above`);
      assert.ok(String(s.body || '').split('\n').length >= 2, `${s.title}: facts on the back`);
    }
    if (s.image) assert.ok(fs.existsSync(path.join(ROOT, s.image)), `${s.image} exists`);
  }
});

test('the drawings are plain SVG: no foreignObject, no bare &', () => {
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.ok(!/<foreignObject/i.test(svg), `${f}: foreignObject`);
    assert.ok(!/&(?![a-z]+;|#\d+;)/i.test(svg), `${f}: a bare &`);
  }
});

test('the numbers the lecture says out loud are the data\'s', () => {
  const air = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/data/no2.json'), 'utf8'));
  const site = (code) => air.sites.find((s) => s.code === code).no2;
  assert.deepEqual([site('MY1')[2010], site('MY1')[2016], site('MY1')[2025]], [98, 89, 31], 'Marylebone Road: 98, 89, 31');
  const over = Object.entries(site('MY1')).filter(([, v]) => v > 40).map(([y]) => +y);
  assert.equal(Math.max(...over), 2023, 'over the legal limit every year until 2024');
  assert.deepEqual([site('TH2')[2010], site('TH2')[2025]], [65, 20], 'Mile End Road: 65, 20');
  assert.equal(site('WA7')[2010], 168, 'Putney High Street: 168 in 2010');
  assert.equal(air.sites.length, 163, '163 monitors');
});

test('the teacher sees every slide; skipping the optional ones fits a 90-minute slot', () => {
  const minutes = (slides) => slides.reduce((t, s) => {
    const m = String(s.notes || '').match(/^(?:OPTIONAL: skip if short of time\. )?(\d+(?:\.\d+)?) ?(min|s)\b/);
    return t + (m ? (m[2] === 's' ? +m[1] / 60 : +m[1]) : 0);
  }, 0);
  const { lesson: room } = lesson('ipdv-story-w9');
  assert.equal(room.slides.filter((s) => s.hidden).length, 0);
  const core = room.slides.filter((s) => !/^OPTIONAL/.test(String(s.notes || '')));
  assert.ok(minutes(core) <= 95, `without the optional slides the lecture runs ${minutes(core).toFixed(0)} minutes`);
  assert.ok(minutes(room.slides) >= 75, `the whole lecture runs ${minutes(room.slides).toFixed(0)} minutes`);
});

test('Munzner comes back from Week 3, not redrawn: the same slides, tied to today', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  const nested = l.slides.find((s) => s.type === 'experiment' && s.experiment && s.experiment.preset === 'nested');
  assert.ok(nested, 'Week 3\'s four-level walk-through is here');
  const why = l.slides.find((s) => s.image === 'assets/lesson/ipdv/munzner-why-tasks.png');
  assert.ok(why, 'Week 3\'s Why? diagram is here');
  for (const word of ['Present', 'Discover', 'Enjoy']) assert.match(why.body, new RegExp(word), `the Why? slide names ${word}`);
  const src = fs.readFileSync(path.join(ROOT, 'js/lessons.js'), 'utf8');
  assert.match(src, /'Four levels, three questions'/, 'Week 3 still has the walk-through the lesson borrows');
  assert.match(src, /munzner-why-tasks\.png/, 'Week 3 still has the Why? diagram');
});

test('a question above a chart headline fits on one line, so the two never touch', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  for (const sl of l.slides.filter((x) => x.figure === 'story' && x.figureCaptionTop)) {
    sl.figureSteps.forEach((st, i) => {
      /* 27px bold Avenir: about 13.5px a character (measured on the slide); the question's column runs from 84 to the story panel */
      const room = sl.figureStory.x - 28 - 84;
      if (st.headline) assert.ok(st.caption.length * 13.5 <= room, `${sl.title} step ${i + 1}: "${st.caption}" may wrap into the headline`);
    });
  }
});

