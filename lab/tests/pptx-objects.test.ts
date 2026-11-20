// The editable PowerPoint makes tables and the simple charts PowerPoint's own (first-run review Wave 4): they are left
// out of the slide's picture and built as a table or chart PowerPoint can edit. A chart PowerPoint has no match for
// (a scatter, a Sankey) stays in the picture, as does anything another layer covers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editableIds, slideObjects } from '../src/export/pptx';
import type { Slide } from '../src/core';

const layer = (id: string, kind: string, params: Record<string, unknown>, box = { x: 100, y: 100, w: 800, h: 400, rot: 0 }) =>
  ({ id, kind, name: id, visible: true, locked: false, opacity: 1, blend: 'normal', params, box, anim: { type: 'none' }, interact: {} });
const slide = (layers: unknown[]) => ({ id: 's', name: 'S', background: '#fff', layers, transition: { type: 'none', duration: 0 }, notes: '' }) as unknown as Slide;

test('a table and a column chart become PowerPoint\'s own; a scatter stays in the picture', () => {
  const s = slide([
    layer('t', 'table', { data: '\tA\tB\nRow\t1\t2', header: true, labels: true, font: 'Inter', size: 30, textColor: '#141414', accent: '#d94f2b' }),
    layer('c', 'chart', { chart: 'column', data: 'One, 3\nTwo, 5', color: '#14706e', textColor: '#241c18', font: 'Inter', size: 28 }, { x: 1000, y: 100, w: 800, h: 400, rot: 0 }),
    layer('x', 'chart', { chart: 'scatter', data: 'a\tb\n1\t2' }, { x: 100, y: 600, w: 800, h: 400, rot: 0 }),
  ]);
  assert.deepEqual([...editableIds(s)].sort(), ['c', 't']);
  const { tables, charts } = slideObjects(s);
  assert.deepEqual(tables[0].rows, [['', 'A', 'B'], ['Row', '1', '2']]);
  assert.deepEqual([charts[0].type, charts[0].labels, charts[0].values], ['column', ['One', 'Two'], [3, 5]]);
});

test('a chart whose data is not label-and-value lines, or one covered by a later layer, stays in the picture', () => {
  const s = slide([
    layer('c', 'chart', { chart: 'bar', data: 'not a number line' }),
    layer('t', 'table', { data: 'a\tb' }, { x: 1000, y: 100, w: 400, h: 200, rot: 0 }),
    layer('p', 'shape', { shape: 'rect' }, { x: 1100, y: 150, w: 100, h: 100, rot: 0 }),
  ]);
  assert.deepEqual([...editableIds(s)], []);
});

test('PowerPoint builds a file with the table and chart in it', async () => {
  const { buildPptx } = await import('../src/export/pptx');
  const { tables, charts } = slideObjects(slide([
    layer('t', 'table', { data: '\tA\tB\nRow\t1\t2' }),
    layer('c', 'chart', { chart: 'pie', data: 'One, 3\nTwo, 5' }, { x: 1000, y: 100, w: 800, h: 400, rot: 0 }),
  ]));
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const blob = await buildPptx({ title: 'T', width: 1920, height: 1080, slides: [] } as never, [{ image: png, notes: '', hidden: false, tables, charts }]);
  const zip = Buffer.from(await blob.arrayBuffer()).toString('latin1');
  assert.ok(blob.size > 1000);
  assert.match(zip, /ppt\/charts\/chart\d+\.xml/, 'the chart is PowerPoint\'s own');
});
