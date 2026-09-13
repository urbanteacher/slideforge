'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs');
function runtime() {
  const scope = { console }; scope.window = scope;
  vm.createContext(scope);
  for (const name of ['model', 'explore']) vm.runInContext(fs.readFileSync(require.resolve('../js/' + name + '.js'), 'utf8'), scope);
  return scope.SF;
}
test('exploration settings survive save normalization and reject unsafe image schemes', () => {
  const SF = runtime();
  for (const type of ['beforeafter', 'explore', 'simulation']) {
    const slide = SF.makeSlide(type);
    slide.exploration.before = 'javascript:alert(1)'; slide.exploration.after = 'images/after.png';
    slide.exploration.spots = [{ x: 300, y: -2, zoom: 999, title: 'Nucleus', body: 'Look here' }];
    const saved = SF.normalizeSlide(JSON.parse(JSON.stringify(slide)));
    assert.equal(saved.type, type); assert.equal(saved.exploration.before, '');
    assert.equal(saved.exploration.after, 'images/after.png');
    assert.equal(saved.exploration.spots[0].x, 100); assert.equal(saved.exploration.spots[0].y, 0); assert.equal(saved.exploration.spots[0].zoom, 4);
  }
});
test('what-if functions calculate linear and quadratic values and handle malformed ranges', () => {
  const SF = runtime();
  assert.equal(SF.explorationValue({ a: 3, b: -2, min: -10, max: 10 }, 4), 10);
  assert.equal(SF.explorationValue({ model: 'quadratic', a: 2, b: 1, min: -10, max: 10 }, -3), 19);
  const c = SF.normalizeExploration({ min: 5000, max: -10, initial: Infinity, a: 'invalid', spots: [null] });
  assert.ok(c.max > c.min); assert.ok(Number.isFinite(SF.explorationValue(c, NaN))); assert.equal(c.spots.length, 1);
});
test('prediction content is withheld from learner excerpts and Next reveals before advancing', () => {
  const SF = runtime(), slide = SF.makeSlide('chart');
  slide.body = 'Year | Secret\n2026 | 42'; slide.exploration.prediction = true; slide.exploration.prompt = 'Which direction?';
  assert.equal(SF.slideExcerpt(slide), 'Which direction?');
  const player = { deck: { slides: [slide] }, idx: 0, syncPresenter() {} };
  assert.equal(SF.Explore.nextAction(player), 'prediction'); assert.equal(SF.Explore.step(player, 1), true);
  assert.equal(SF.Explore.nextAction(player), null); assert.equal(SF.Explore.step(player, 1), false);
  assert.equal(SF.Explore.step(player, -1), true); assert.equal(player.exploreStates[slide.id].revealed, false);
});
test('exploration state survives a detour without changing authored data; frozen controls do nothing', () => {
  const SF = runtime(), slide = SF.makeSlide('explore');
  slide.exploration.spots = [{ x: 25, y: 50, zoom: 2, title: 'A', body: 'B' }];
  const original = JSON.stringify(slide);
  const player = { deck: { slides: [slide, SF.makeSlide('content')] }, idx: 0, syncPresenter() {} };
  SF.Explore.step(player, 1); assert.equal(player.exploreStates[slide.id].spot, 0);
  player.idx = 1; assert.equal(SF.Explore.step(player, 1), false);
  player.idx = 0; assert.equal(SF.Explore.nextAction(player), null);
  player.frozen = true; SF.Explore.command(player, 'spot', -1); assert.equal(player.exploreStates[slide.id].spot, 0);
  assert.equal(JSON.stringify(slide), original);
});
test('comparison and input commands constrain live values and ignore commands for other layouts', () => {
  const SF = runtime(), slide = SF.makeSlide('beforeafter');
  const player = { deck: { slides: [slide] }, idx: 0, syncPresenter() {} };
  SF.Explore.command(player, 'position', 999); assert.equal(player.exploreStates[slide.id].position, 100);
  SF.Explore.command(player, 'input', 10); assert.equal(player.exploreStates[slide.id].input, 0);
  SF.Explore.command(player, 'position', NaN); assert.equal(player.exploreStates[slide.id].position, 100);
  assert.equal(SF.Explore.step(player, -1), true); assert.equal(player.exploreStates[slide.id].position, 0);
});
