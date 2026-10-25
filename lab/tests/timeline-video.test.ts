// The timeline under the canvas and Export → Video (engine/timeline.ts, export/mp4.ts): a slide's builds are
// clicked for it a hold after each step has arrived; the bars are the layers' entrances, line builds, loops and
// exits on that clock; a reel plays slides one after another with each transition in at the start of its slide;
// and the MP4 writer lays out a file QuickTime reads: ftyp, then the index, then the pictures it points at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/kinds';
import type { Anim, Layer } from '../src/core';
import { createLayer, createSlide } from '../src/core';
import { animTotal, autoClicks, exitDuration, frameCount, reel, reelAt, schedule, slideTimeline } from '../src/engine';
import { mp4Parts } from '../src/export/mp4';

const shape = (name: string, anim: Partial<Anim> = {}): Layer => {
  const l = createLayer('shape', { name, params: { shape: 'rect' }, box: { x: 100, y: 100, w: 300, h: 200 } });
  l.anim = { ...l.anim, type: 'fade', duration: 0.8, ...anim };
  return l;
};
const near = (a: number, b: number, msg?: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} ${a} ≠ ${b}`);

test('builds are clicked a hold after the step before has arrived, and the slide ends a hold after the last', () => {
  const s = createSlide('S', [shape('a'), shape('b', { trigger: 'onClick' }), shape('c', { trigger: 'onClick', duration: 1.2 })]);
  const { clicks, length } = autoClicks(s, 1.5);
  near(clicks[0], 0.8 + 1.5, 'first click');
  near(clicks[1], clicks[0] + 0.8 + 1.5, 'second click');
  near(length, clicks[1] + 1.2 + 1.5, 'end');
  // The same clicks the show's schedule takes: everything has arrived by the end.
  const sch = schedule(s, clicks);
  for (const l of s.layers) assert.ok(sch.start.get(l.id)! + animTotal(l) <= length, l.name);
});

test('a slide with nothing to click runs its transition in and a hold', () => {
  const still = createSlide('Still', [createLayer('shape', { params: { shape: 'rect' } })], '#fff', { type: 'fade', duration: 0.9 });
  near(autoClicks(still, 2).length, 0.9 + 2);
  near(autoClicks({ ...still, transition: { type: 'none', duration: 0.9 } }, 2).length, 2);
});

test('the bars are each layer’s entrance, line steps, loop and exit, on the clicked clock', () => {
  const a = shape('a', { loop: 'float' });
  // A text layer without its measuring (that needs a canvas): the schedule reads only its words and animation.
  const lines: Layer = { ...shape('points'), kind: 'text', params: { text: 'one\ntwo\nthree' } };
  lines.anim = { ...lines.anim, type: 'rise', duration: 0.6, trigger: 'onClick', build: 'lines' };
  const gone = shape('gone', { exit: { type: 'fade', when: 'next', delay: 0 } });
  const quiet = createLayer('shape', { name: 'quiet', params: { shape: 'rect' } });
  const s = createSlide('S', [a, gone, lines, quiet], '#fff', { type: 'none', duration: 0 });
  const tl = slideTimeline(s, 1);
  assert.deepEqual(tl.tracks.map((t) => t.name), ['a', 'gone', 'points'], 'a layer that never moves has no bar');
  const [ta, tg, tp] = tl.tracks;
  near(ta.in[0][0], 0); near(ta.in[0][1], 0.8);
  assert.deepEqual(ta.loop, [0.8, tl.length], 'a loop runs from when the entrance has settled to the end');
  assert.equal(tp.step, 1, 'the line build opens the first click');
  assert.equal(tp.in.length, 3, 'one bar a line');
  // The first line waits on its click for "gone" to be most of the way out (the hand-off).
  assert.ok(tp.in[0][0] > tl.clicks[0] && tp.in[0][0] < tl.clicks[0] + exitDuration(gone), 'the first line just after its click');
  for (let i = 1; i < 3; i++) near(tp.in[i][0], tl.clicks[i], `line ${i + 1} on click ${i + 1}`);
  assert.equal(tl.clicks.length, 3);
  // "gone" leaves with the next step after its own: the first click.
  assert.ok(tg.out, 'an exit bar');
  near(tg.out![1] - tg.out![0], exitDuration(gone));
  assert.ok(tg.out![0] >= tl.clicks[0] - 1e-9);
});

test('a reel plays the shown slides in turn; each transition in runs over the start of its slide', () => {
  const one = createSlide('One', [shape('a')], '#fff', { type: 'push', duration: 0.9 });
  const two = createSlide('Two', [shape('b')], '#000', { type: 'fade', duration: 0.5 });
  const hid = { ...createSlide('Hidden', [shape('h')]), hidden: true };
  const r = reel([one, hid, two], 1);
  assert.deepEqual(r.parts.map((p) => p.slide.name), ['One', 'Two'], 'hidden slides are left out');
  assert.equal(r.parts[0].prev, null);
  near(r.parts[0].length, 0.8 + 1, 'the first slide has no transition in, so its own is not waited for');
  assert.equal(r.parts[1].prev, one);
  near(r.parts[1].start, r.parts[0].length);
  near(r.length, r.parts[0].length + r.parts[1].length);
  assert.equal(reelAt(r, 0.2)!.trans, null, 'no transition into the first slide');
  const mid = reelAt(r, r.parts[1].start + 0.25)!;
  assert.equal(mid.part.slide, two);
  near(mid.local, 0.25);
  near(mid.trans!, 0.5, 'half way through a half-second fade');
  assert.equal(reelAt(r, r.parts[1].start + 0.6)!.trans, null, 'over once it has run');
  assert.equal(reelAt(r, r.length + 5)!.part.slide, two, 'past the end holds the last slide');
  assert.equal(frameCount(r, 30), Math.round(r.length * 30));
});

// ─── MP4 ──────────────────────────────────────────────────────────────────────
interface Box { type: string; at: number; size: number; body: DataView }
function boxes(v: DataView, from = 0, to = v.byteLength): Box[] {
  const out: Box[] = [];
  for (let at = from; at < to;) {
    const size = v.getUint32(at);
    const type = String.fromCharCode(...[4, 5, 6, 7].map((i) => v.getUint8(at + i)));
    out.push({ type, at, size, body: new DataView(v.buffer, v.byteOffset + at + 8, size - 8) });
    assert.ok(size >= 8, `${type} has a size`);
    at += size;
  }
  return out;
}
const child = (b: Box, type: string, skip = 0) => {
  const c = boxes(b.body, skip).find((x) => x.type === type);
  assert.ok(c, `${b.type} has ${type}`);
  return c!;
};

test('the MP4 is ftyp, moov, mdat, and the index points at every frame', async () => {
  const frames = [new Uint8Array([1, 2, 3, 4, 5]), new Uint8Array([6, 7]), new Uint8Array([8, 9, 10])];
  const avcC = new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 0]);
  const parts = mp4Parts({ width: 1920, height: 1080, fps: 30, avcC, samples: frames.map((data, i) => ({ data, key: i === 0 })) });
  const buf = new Uint8Array(await new Blob(parts as BlobPart[]).arrayBuffer());
  const v = new DataView(buf.buffer);
  const top = boxes(v);
  assert.deepEqual(top.map((b) => b.type), ['ftyp', 'moov', 'mdat'], 'the index first, so it plays as it loads');
  const [, moov, mdat] = top;
  const mvhd = child(moov, 'mvhd');
  const timescale = mvhd.body.getUint32(12), duration = mvhd.body.getUint32(16);
  assert.equal(duration / timescale, 3 / 30, 'three frames at 30 fps');
  const trak = child(moov, 'trak');
  const tkhd = child(trak, 'tkhd');
  assert.equal(tkhd.body.getUint32(76) >>> 16, 1920);
  assert.equal(tkhd.body.getUint32(80) >>> 16, 1080);
  const stbl = child(child(child(trak, 'mdia'), 'minf'), 'stbl');
  const stsd = child(stbl, 'stsd');
  const avc1 = child(stsd, 'avc1', 8);
  assert.equal(avc1.body.getUint16(24), 1920);
  assert.equal(avc1.body.getUint16(26), 1080);
  const avcc = child(avc1, 'avcC', 78);
  assert.deepEqual([...new Uint8Array(avcc.body.buffer, avcc.body.byteOffset, avcc.body.byteLength)], [...avcC]);
  const stsz = child(stbl, 'stsz');
  assert.equal(stsz.body.getUint32(8), 3);
  assert.deepEqual([0, 1, 2].map((i) => stsz.body.getUint32(12 + i * 4)), [5, 2, 3]);
  const stss = child(stbl, 'stss');
  assert.equal(stss.body.getUint32(4), 1, 'one key frame');
  assert.equal(stss.body.getUint32(8), 1, 'the first');
  const stco = child(stbl, 'stco');
  const offset = stco.body.getUint32(8);
  assert.equal(offset, mdat.at + 8, 'the chunk starts where mdat’s pictures do');
  assert.deepEqual([...buf.slice(offset, offset + 10)], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('an MP4 must start on a key frame', () => {
  assert.throws(() => mp4Parts({ width: 2, height: 2, fps: 30, avcC: new Uint8Array(4), samples: [{ data: new Uint8Array(1), key: false }] }), /key frame/);
});
