const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { build } = require('esbuild');

let engine;
async function load() {
  if (!engine) engine = build({
    entryPoints: [path.join(__dirname, '../lab/src/engine/experiment.ts')],
    bundle: true, platform: 'node', format: 'esm', write: false,
  }).then((r) => import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64')));
  return engine;
}

test('focused experiment navigation reaches every state, goes back to prediction and stops at the last', async () => {
  const { experimentControls, experimentStates } = await load();
  const p = { preset: 'reshape', layout: 'focus', size: 36 };
  const n = experimentStates(p).length;
  for (let step = -1; step < n; step++) {
    const c = experimentControls({ ...p, _step: step }, 1764, 666);
    const [back, next, replay] = c.buttons;
    assert.equal(back.off, step === -1);
    assert.equal(next.off, step === n - 1);
    assert.equal(replay.off, step === -1);
    assert.equal(back.action, `state:${step - 1}`);
    assert.equal(next.action, `state:${step + 1}`);
    for (const b of c.buttons) {
      assert.ok(b.x >= 0 && b.x + b.w <= c.source.x, 'controls stay clear of the source');
      assert.ok(b.y >= c.plot.y + c.plot.h && b.y + b.h <= 666, 'controls fit below the plot');
    }
    assert.ok(c.note.y + c.note.h <= c.plot.y, 'the takeaway stays above the data');
  }
  const focused = experimentControls(p, 1764, 666).plot;
  const original = experimentControls({ ...p, layout: 'rail' }, 1764, 586).plot;
  const scale = (r) => Math.min(r.w / 1000, r.h / 370);
  assert.ok(scale(focused) > scale(original) * 1.1, 'the focused diagram draws at least 10% larger');
});

test('prediction shows the supplied data without leaking a later state or takeaway', async () => {
  const { drawExperiment, EXPERIMENTS } = await load();
  const words = [];
  const ctx = new Proxy({}, {
    get: (_, key) => key === 'measureText' ? (s) => ({ width: String(s).length * 15 })
      : key === 'fillText' ? (s) => words.push(String(s)) : () => {},
    set: () => true,
  });
  drawExperiment(ctx, 1764, 666, { preset: 'reshape', layout: 'focus', _step: -1,
    data: EXPERIMENTS.reshape.data, prompt: 'Where is Month?', size: 36 });
  assert.ok(words.includes('Where is Month?'));
  assert.ok(words.includes('Apple') && words.includes('April') && words.includes('82'));
  assert.ok(!words.includes('Total') && !words.includes('Nominal') && !words.includes('?'));
  words.length = 0;
  drawExperiment(ctx, 1764, 586, { preset: 'reshape', _step: -1, size: 36 });
  assert.ok(words.includes('?') && !words.includes('Apple'), 'other experiments keep their existing prediction screen');
});

test('saved channel presets resolve to the right demonstration in the lab', async () => {
  const { experimentPreset, experimentStates } = await load();
  const older = { preset: 'channels', data: 'Item\tValue\nA\t20\nB\t24' };
  const savedWeek3 = { preset: 'channels', data: 'Channel\tA\tB\nPosition\t80\t36' };
  assert.equal(experimentPreset(older), 'channels');
  assert.equal(experimentStates(older)[0].kind, 'dot');
  assert.equal(experimentPreset(savedWeek3), 'perception');
  assert.equal(experimentStates(savedWeek3)[0].kind, 'channels');
});
