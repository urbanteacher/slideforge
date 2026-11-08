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

test('Munzner comes back from Week 3, not redrawn: her Why? diagram, and her words on the map', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  const why = l.slides.find((s) => s.image === 'assets/lesson/ipdv/munzner-why-tasks.png');
  assert.ok(why, 'Week 3\'s Why? diagram is here');
  for (const word of ['Present', 'Discover', 'Enjoy']) assert.match(why.body, new RegExp(word), `the Why? slide names ${word}`);
  const map = fs.readFileSync(path.join(DIR, 'spectrum.svg'), 'utf8');
  assert.match(map, /MUNZNER: PRESENT/);
  assert.match(map, /MUNZNER: DISCOVER/);
  assert.match(fs.readFileSync(path.join(ROOT, 'js/lessons.js'), 'utf8'), /munzner-why-tasks\.png/, 'Week 3 still has the Why? diagram');
});

test('the theory is taught, not only shown: what a story is, why, how to judge one, how one misleads', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  const titles = l.slides.map((s) => s.title);
  const order = ['A chart, or a story?', 'What makes it a story', 'A story has a shape', 'Why tell a story with data?',
    'Who drives? The line every story sits on', 'Strong or weak? Five tests'];
  const at = order.map((t) => titles.indexOf(t));
  at.forEach((i, k) => assert.ok(i > 0, `"${order[k]}" is in the lecture`));
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'the foundation runs in order');
  assert.ok(at[0] < titles.indexOf('How do you make sure they see what you saw?'), 'the foundation comes before Part 1');
  const tricks = titles.indexOf('Same data, five tricks');
  assert.ok(tricks > titles.indexOf('Build it: one line in colour, the rest grey') && tricks < titles.indexOf('When should the reader drive?'), 'the tricks end Part 1');
  /* every reason, layer and test names its evidence */
  const why = l.slides.find((s) => s.title === 'Why tell a story with data?');
  why.figureData.rows.slice(0, 4).forEach((r) => assert.match(r.text, /\(\D+,? \d{4}\)/, `${r.name}: a source`));
  const layers = l.slides.find((s) => s.title === 'Persuade, or mislead? Where the line is');
  assert.equal(layers.figureData.rows.length, 5, 'one layer per trick');
});

test('the tricks\' numbers are the data\'s', () => {
  const air = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/data/no2.json'), 'utf8'));
  const my1 = air.sites.find((s) => s.code === 'MY1').no2;
  assert.deepEqual([my1[2018], my1[2020]], [85, 44], 'halved in two years: 85 to 44');
  assert.deepEqual([my1[2021], my1[2022], my1[2023]], [43, 42, 42], 'the flat years after');
  const fell = (my1[2010] - my1[2025]) / my1[2010], drawn = ((my1[2010] - 30) - (my1[2025] - 30)) / (my1[2010] - 30);
  assert.equal(Math.round(fell * 100), 68, 'a 68% fall');
  assert.equal(Math.round(drawn * 1000) / 10, 98.5, 'drawn from 30: a 98.5% fall');
  assert.equal(Math.round(drawn / fell * 10) / 10, 1.4, 'lie factor 1.4');
  const { lesson: l } = lesson('ipdv-story-w9');
  const t = l.slides.find((s) => s.title === 'Same data, five tricks');
  const filtered = t.figureSteps.find((st) => st.hide);
  assert.ok(filtered.hide.includes('LB4'), 'the filtered bowl leaves out Brixton Road');
  assert.ok(t.figureSteps.some((st) => st.range) && t.figureSteps.some((st) => st.yMin), 'a window and a cut axis');
});

test('a question above a chart fits on one line, so it never runs into the chart\'s frame', () => {
  const { lesson: l } = lesson('ipdv-story-w9');
  for (const sl of l.slides.filter((x) => x.figure === 'story' && x.figureCaptionTop)) {
    sl.figureSteps.forEach((st, i) => {
      /* 27px bold Avenir: about 13.5px a character (measured on the slide); the question's column runs from 84 to the story panel */
      const room = sl.figureStory.x - 28 - 84;
      assert.ok(st.caption.length * 13.5 <= room, `${sl.title} step ${i + 1}: "${st.caption}" may wrap into the chart`);
    });
  }
});


test('the review\'s facts stay fixed: Brixton Road, the monitors still running, the WHO guideline', () => {
  const air = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/data/no2.json'), 'utf8'));
  const lb4 = air.sites.find((s) => s.code === 'LB4').no2;
  assert.deepEqual([lb4[2010], lb4[2025]], [174, 48], 'Brixton Road: 174 in 2010, 48 in 2025');
  const in2025 = air.sites.filter((s) => s.no2[2025] != null);
  assert.equal(in2025.length, 59, '59 monitors reported in 2025');
  assert.deepEqual(in2025.filter((s) => s.no2[2025] > 40).map((s) => s.code), ['LB4'], 'Brixton Road is the one over the limit in 2025');
  const { lesson: l } = lesson('ipdv-story-w9');
  const words = JSON.stringify(l.slides);
  assert.doesNotMatch(words, /WHO calls safe|WHO’s safe level/, 'WHO 10 is a guideline, not a safe level');
  assert.doesNotMatch(words, /ULEZ starts in central London/, 'the 2019 zone stopped at Marylebone Road');
});

test('the Build-it code does what its slide says: layers stack the red last, tooltips have points', () => {
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/code/steps.json'), 'utf8')).steps;
  const by = (id) => steps.find((s) => s.id === id);
  assert.doesNotMatch(by('highlight').run, /alt\.Order/, 'order does not put a line on top');
  assert.match(by('highlight').code, /\(others \+ line/, 'grey first, red last');
  assert.match(by('stepper').code, /value=1,/, 'the martini glass opens on its stem');
  assert.match(by('stepper').code, /point=/, 'the bowl\'s tooltip has points to answer from');
  for (const id of ['annotate', 'highlight', 'stepper']) assert.ok(by(id).run.includes(by('headline').code.split('\n(')[0].trim()), `${id} grows from the headline step`);
});

test('the layout holds: code prints large, notes never cross, the type colours are colour-blind safe', () => {
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/ipdv-week9/code/steps.json'), 'utf8')).steps;
  for (const st of steps) for (const line of st.code.split('\n')) assert.ok(line.length <= 66, `${st.id}: "${line}" is too long to print large`);
  assert.ok(fs.existsSync(path.join(DIR, 'week9_build_its.py')), 'every Build-it, as one file for Canvas');
  const { lesson: l } = lesson('ipdv-story-w9');
  for (const s of l.slides.filter((x) => x.figure === 'story')) {
    const notes = s.figureData.notes || [];
    /* each note's rule stops at its own height and its words run right, so later notes must sit lower */
    notes.forEach((n, i) => { if (i) assert.ok(n.year > notes[i - 1].year && n.at < notes[i - 1].at, `${s.title}: notes fall from left to right`); });
    const types = s.figureData.types || {};
    assert.equal(types.Kerbside, '#d55e00', `${s.title}: Okabe-Ito colours`);
  }
});
