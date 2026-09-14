'use strict';
/* Chart slides.
 *
 * A chart reads the same tabular text a table slide does, so a range pasted
 * from a spreadsheet becomes a chart with no re-typing. Everything worth
 * testing is in that reading: what counts as a number, what happens to a gap,
 * and how the data decides what one press of Next should reveal.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
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
  return context.window.SF;
}

/* The model runs in its own vm realm, so the arrays it hands back carry that
   realm's Array.prototype and deepStrictEqual refuses them on identity alone.
   Round-tripping through JSON compares the values, which is what is at stake. */
const plain = (v) => JSON.parse(JSON.stringify(v));

test('a pasted spreadsheet range reads as series and categories', () => {
  const SF = load();
  /* Tab-separated is what the clipboard actually delivers. */
  const data = SF.chartData({ body: 'Area\tLeave\tRemain\nBoston\t75\t25\nBristol\t38\t62' });
  assert.deepEqual(plain(data.categories), ['Boston', 'Bristol']);
  assert.deepEqual(plain(data.series).map((x) => x.name), ['Leave', 'Remain']);
  assert.deepEqual(plain(data.series[0].values), [75, 38]);
  assert.deepEqual(plain(data.series[1].values), [25, 62]);

  // Pipes are the typed form and must read identically.
  const piped = SF.chartData({ body: 'Area|Leave|Remain\nBoston|75|25\nBristol|38|62' });
  assert.deepEqual(plain(piped), plain(data));
});

test('numbers survive the punctuation people actually paste', () => {
  const SF = load();
  const data = SF.chartData({ body: 'Year|Spend\n2024|£1,250\n2025|2 400\n2026|38%' });
  assert.deepEqual(plain(data.series[0].values), [1250, 2400, 38]);
});

test('a gap is a gap, not a zero', () => {
  const SF = load();
  /* Drawing a missing measurement as nought invents a data point, and on a
     line chart it invents a plunge to the axis that never happened. */
  const data = SF.chartData({ body: 'Year|Cases\n2024|10\n2025|\n2026|30' });
  assert.deepEqual(plain(data.series[0].values), [10, null, 30]);

  const words = SF.chartData({ body: 'Year|Cases\n2024|10\n2025|n/a\n2026|30' });
  assert.equal(words.series[0].values[1], null, 'unparseable text is a gap too');
});

test('data too thin to chart comes back empty rather than half-drawn', () => {
  const SF = load();
  assert.deepEqual(plain(SF.chartData({ body: '' })), { categories: [], series: [] });
  assert.deepEqual(plain(SF.chartData({ body: 'Area|Leave' })), { categories: [], series: [] },
    'a header with no rows under it is not a chart');
  assert.equal(SF.chartData({ body: 'Area|Leave|\nBoston|75|' }).series.length, 1,
    'an unnamed trailing column is not a series');
});

test('what one press reveals follows from the shape of the data', () => {
  const SF = load();
  /* Several series: the series are what is being compared, so a press lands a
     whole one. A single series: the categories are the comparison instead. */
  const many = SF.slideSteps({ type: 'chart', body: 'Area|Leave|Remain\nBoston|75|25\nBristol|38|62' });
  assert.deepEqual(plain(many), ['Leave', 'Remain']);

  const one = SF.slideSteps({ type: 'chart', body: 'Area|Leave\nBoston|75\nBristol|38\nLambeth|21' });
  assert.deepEqual(plain(one), ['Boston', 'Bristol', 'Lambeth']);

  assert.deepEqual(plain(SF.slideSteps({ type: 'chart', body: '' })), [], 'nothing to build without data');
});

test('a chart slide normalises to a drawable kind', () => {
  const SF = load();
  assert.equal(SF.normalizeSlide({ type: 'chart' }).chartKind, 'bar', 'bar is the default');
  assert.equal(SF.normalizeSlide({ type: 'chart', chartKind: 'line' }).chartKind, 'line');
  /* Every idiom the renderer can draw survives normalize. Donut used to be
     the example of an unknown kind here, which is exactly the way this test
     earns its keep: adding a kind without adding it to the whitelist would
     have silently drawn bars instead. */
  ['bar', 'stack', 'hbar', 'line', 'area', 'pie', 'donut',
   'scatter', 'histogram', 'box', 'pictogram', 'radar', 'sankey',
   'treemap', 'bullet', 'combo', 'waffle'].forEach((kind) => {
    assert.equal(SF.normalizeSlide({ type: 'chart', chartKind: kind }).chartKind, kind,
      kind + ' is drawable and must survive normalize');
  });
  assert.equal(SF.normalizeSlide({ type: 'chart', chartKind: 'sunburst' }).chartKind, 'bar',
    'an unknown kind falls back rather than rendering nothing');
  assert.ok(SF.SLIDE_TYPES.chart, 'the layout library can offer it');
});

test('a chart survives a save and reload unchanged', () => {
  const SF = load();
  const deck = SF.normalizeDeck({
    title: 'T',
    slides: [{ type: 'chart', chartKind: 'pie', body: 'Continent|Share\nAsia|46\nEurope|21' }]
  });
  const back = SF.normalizeDeck(JSON.parse(JSON.stringify(deck)));
  assert.equal(back.slides[0].chartKind, 'pie');
  assert.deepEqual(plain(SF.chartData(back.slides[0])).series[0].values, [46, 21]);
});

test('the series legend is an allowlist, not a growing exclusion list', () => {
  const SF = load();
  assert.equal(typeof SF.chartUsesSeriesLegend, 'function');
  /* Multi-series peers on the drawing. */
  assert.equal(SF.chartUsesSeriesLegend('bar', 2), true);
  assert.equal(SF.chartUsesSeriesLegend('combo', 2), true);
  assert.equal(SF.chartUsesSeriesLegend('radar', 2), true);
  assert.equal(SF.chartUsesSeriesLegend('bullet', 2), true);
  /* Two named series drawn as two coloured dots, with nothing else on the
     row saying which is which. */
  assert.equal(SF.chartUsesSeriesLegend('dumbbell', 2), true);
  /* One series: nothing to key. */
  assert.equal(SF.chartUsesSeriesLegend('bar', 1), false);
  /* Columns are not series on the drawing — pie/treemap/waffle/sankey. */
  assert.equal(SF.chartUsesSeriesLegend('pie', 2), false);
  assert.equal(SF.chartUsesSeriesLegend('treemap', 2), false);
  assert.equal(SF.chartUsesSeriesLegend('waffle', 2), false);
  assert.equal(SF.chartUsesSeriesLegend('sankey', 3), false,
    'From/To/Amount must not become a three-item legend');
  assert.equal(SF.chartUsesSeriesLegend('histogram', 2), false);
  assert.equal(SF.chartUsesSeriesLegend('box', 2), false);
  /* Small multiples name each series on its own panel; a matrix colours an
     ordinal scale, not a set of series. */
  assert.equal(SF.chartUsesSeriesLegend('multiples', 2), false);
  assert.equal(SF.chartUsesSeriesLegend('matrix', 2), false);
});
