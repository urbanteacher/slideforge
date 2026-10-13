// Draw (lab-engine-plan M11b): the ink stroke model. Pure, no canvas, no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIGHLIGHTER_WIDTH, Ink, INK_COLORS, PEN_WIDTH, strokeHit, type Pt } from '../src/show/ink';

const drag = (ink: Ink, pts: Pt[]) => { ink.begin(pts[0]); for (const p of pts.slice(1)) ink.extend(p); ink.end(); };

test('a pen stroke is kept as fractions of the stage, in the chosen colour and width; a highlighter is wider', () => {
  const ink = new Ink();
  ink.setSlide('0');
  drag(ink, [[0.1, 0.1], [0.2, 0.15], [0.3, 0.2]]);
  assert.equal(ink.count, 1);
  assert.deepEqual(ink.strokes[0], { tool: 'pen', color: INK_COLORS[0], width: PEN_WIDTH, points: [[0.1, 0.1], [0.2, 0.15], [0.3, 0.2]] });
  ink.tool = 'highlighter'; ink.color = INK_COLORS[1];
  drag(ink, [[0.5, 0.5], [0.6, 0.5]]);
  assert.deepEqual([ink.strokes[1].tool, ink.strokes[1].color, ink.strokes[1].width], ['highlighter', INK_COLORS[1], HIGHLIGHTER_WIDTH]);
});

test('points outside the stage are held to its edge, and a tiny wobble adds no points', () => {
  const ink = new Ink();
  drag(ink, [[-0.2, 0.5], [0.5, 1.4], [0.5000001, 1.4]]);
  assert.deepEqual(ink.strokes[0].points, [[0, 0.5], [0.5, 1]]);
});

test('undo takes back the last mark; a click makes a dot that is a mark too', () => {
  const ink = new Ink();
  drag(ink, [[0.1, 0.1], [0.2, 0.2]]);
  drag(ink, [[0.4, 0.4]]);
  assert.equal(ink.count, 2);
  assert.equal(ink.strokes[1].points.length, 1);
  assert.ok(ink.undo());
  assert.equal(ink.count, 1);
  assert.ok(ink.undo());
  assert.equal(ink.count, 0);
  assert.equal(ink.undo(), false);
});

test('clear wipes the slide in one step, and undo brings it all back', () => {
  const ink = new Ink();
  drag(ink, [[0.1, 0.1], [0.2, 0.2]]);
  drag(ink, [[0.5, 0.1], [0.6, 0.2]]);
  ink.clear();
  assert.equal(ink.count, 0);
  assert.ok(ink.undo());
  assert.equal(ink.count, 2);
  assert.deepEqual(ink.strokes.map((s) => s.points[0]), [[0.1, 0.1], [0.5, 0.1]]);
});

test('the eraser takes the marks it passes, only those, and undo puts them back in place', () => {
  const ink = new Ink();
  drag(ink, [[0.1, 0.1], [0.3, 0.1]]);
  drag(ink, [[0.1, 0.5], [0.3, 0.5]]);
  drag(ink, [[0.1, 0.9], [0.3, 0.9]]);
  assert.ok(strokeHit(ink.strokes[1], [0.2, 0.5]));
  assert.ok(!strokeHit(ink.strokes[1], [0.2, 0.7]));
  ink.tool = 'eraser';
  drag(ink, [[0.2, 0.45], [0.2, 0.5], [0.2, 0.55]]);
  assert.deepEqual(ink.strokes.map((s) => s.points[0][1]), [0.1, 0.9]);
  ink.undo();
  assert.deepEqual(ink.strokes.map((s) => s.points[0][1]), [0.1, 0.5, 0.9]);
});

test('marks belong to their slide: leaving a slide clears them as classic does, unless the teacher keeps them', () => {
  const ink = new Ink();
  ink.setSlide('0');
  drag(ink, [[0.1, 0.1], [0.2, 0.2]]);
  ink.setSlide('1');
  assert.equal(ink.count, 0);
  ink.setSlide('0');
  assert.equal(ink.count, 0); // gone with the leaving
  const keep = new Ink();
  keep.keep = true;
  keep.setSlide('0');
  drag(keep, [[0.1, 0.1], [0.2, 0.2]]);
  keep.setSlide('1');
  drag(keep, [[0.3, 0.3], [0.4, 0.4]]);
  keep.setSlide('0');
  assert.equal(keep.count, 1);
  assert.deepEqual(keep.strokes[0].points[0], [0.1, 0.1]);
  keep.undo();
  assert.equal(keep.count, 0);
  keep.setSlide('1');
  assert.equal(keep.count, 1); // undo is per slide
});
