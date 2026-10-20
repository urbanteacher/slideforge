// The diagram layer (kinds/diagram, diagrams/): loop, flowchart and timeline laid out from a list, held to
// diagram-design's connector rules (MIT, cathrynlavery/diagram-design, SKILL.md §6) — no diagonals but the
// loop's arcs and spokes, label masks a clear gap from their stroke, no overlapping connectors, heads on a
// box's edge — to SlideForge's 20px-on-720 floor, and to WCAG contrast on every palette's grounds. Its
// draw entrance is a pure function of the clock, and reduced motion shows it finished.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Layer } from '../src/core';
import { FLOOR, LOOP_MAX, checkDiagram, diagramBeats, drawDiagram, layoutDiagram, roughMeasure, toOutline, type Diagram } from '../src/diagrams';
import { animTotal, schedule } from '../src/engine';
import { layerState } from '../src/engine/anim';
import { DIAGRAM_SAMPLES, diagramSkin, skinPairs } from '../src/kinds/diagram';
import { diagramSlide, guideStyle, slideStyle } from '../src/layouts';
import { contrast, fromPreset, paletteGroups, resolveGround } from '../src/theme';
import { TEACHING_ROUTINE_FLOW, TEACHING_ROUTINE_LOOP } from '../src/decks';

const sound = (d: Diagram) => {
  assert.deepEqual(d.problems, [], 'it fits');
  assert.deepEqual(checkDiagram(d), [], 'it passes the connector rules');
};
const stations = (n: number, sub = true) => ['hub: Shared memory | one record, every loop', ...Array.from({ length: n }, (_, i) => `${['Capture', 'Research', 'Decide', 'Act', 'Measure', 'Learn'][i]}${sub ? ' | step ' + (i + 1) : ''}`)].join('\n');

test('a loop that says it fits passes every rule, and three to six stations fit the loop slide’s box', () => {
  for (const [w, h] of [[1600, 640], [1600, 760], [1200, 860], [1158, 832]]) for (const size of [36, 40, 46]) for (let n = 3; n <= LOOP_MAX; n++) {
    const d = layoutDiagram('loop', stations(n), w, h, size, roughMeasure);
    if (!d.problems.length) assert.deepEqual(checkDiagram(d), [], `${n} stations in ${w}×${h} at ${size}px`);
    // The box diagramSlide gives a loop (the right two thirds, full height) holds six at 40px.
    if (w === 1158 && size <= 40) assert.deepEqual(d.problems, [], `${n} stations at ${size}px should fit the loop slide`);
  }
  assert.match(layoutDiagram('loop', stations(6), 1600, 640, 46, roughMeasure).problems.join(), /does not fit/, 'and one that cannot, says so');
});

test('a loop follows type-loop §2: station 0 at the top, clockwise, ring arcs on one circle landing on edges, dashed spokes stopping short of the hub', () => {
  const d = layoutDiagram('loop', stations(6), 1158, 832, 40, roughMeasure);
  sound(d);
  const st = d.nodes.filter((n) => n.shape === 'box'), hub = d.nodes.find((n) => n.shape === 'hub')!;
  const c = (n: typeof st[0]) => ({ x: n.rect.x + n.rect.w / 2, y: n.rect.y + n.rect.h / 2 });
  // Station 0 at -90°, or — an even ring in a wide box — turned half a step, so no station sits level with the hub.
  const ang = (n: typeof st[0]) => Math.atan2(c(n).y - c(hub).y, c(n).x - c(hub).x);
  assert.ok([-90, -90 + 180 / st.length].some((a) => Math.abs((ang(st[0]) * 180) / Math.PI - a) < 1.5), 'station 0 at the top, or half a step past it');
  st.forEach((n, k) => assert.ok(Math.abs(((ang(n) - ang(st[0]) + Math.PI * 4) % (Math.PI * 2)) - (k * Math.PI * 2) / st.length) < 0.03, `station ${k} a ${360 / st.length}° step on, clockwise`));
  assert.deepEqual(layoutDiagram('loop', stations(5), 1158, 832, 40, roughMeasure).nodes.filter((n) => n.id === 's0').map((n) => Math.round(n.rect.x + n.rect.w / 2)), [579], 'an odd ring starts at the top');
  const ring = d.conns.filter((x) => x.role === 'ring'), spokes = d.conns.filter((x) => x.role === 'spoke');
  assert.equal(ring.length, 6, 'one arc per station, the last closing the ring');
  assert.equal(ring[5].to, 's0');
  for (const r of ring) {
    assert.equal(r.segs.length, 1); assert.equal(r.segs[0].k, 'arc');
    assert.ok(toOutline(r.head!.tip, d.nodes.find((n) => n.id === r.to)!) < 1, 'the head lands on the next station’s edge');
  }
  assert.equal(spokes.length, 6);
  for (const s of spokes) assert.ok(s.dashed && s.to === 'hub' && s.segs[0].k === 'line', 'write-backs are dashed straight radii');
});

test('a loop past the budget is cut to six and says to split it, rather than shrinking the type', () => {
  const eight = ['hub: One real lesson | Y8 micro:bit step counter', 'Plan', 'Connect', 'Demonstrate', 'Activate', 'Facilitate', 'Collaborate', 'Consolidate', '*Reflect'].join('\n');
  const d = layoutDiagram('loop', eight, 1600, 760, 40, roughMeasure);
  assert.equal(d.nodes.filter((n) => n.shape === 'box').length, LOOP_MAX);
  assert.match(d.problems.join(' '), /Split it/);
  assert.equal(d.size, 40, 'the type stays where it was set');
  assert.equal(diagramBeats('loop', eight), 1 + LOOP_MAX);
});

test('no diagram sets text under SlideForge’s floor, however small it is asked for', () => {
  for (const type of ['loop', 'flowchart', 'timeline']) {
    const d = layoutDiagram(type, DIAGRAM_SAMPLES[type], 1600, 760, 12, roughMeasure);
    assert.ok(d.size >= FLOOR && d.sub >= FLOOR && d.label >= FLOOR, type);
  }
  assert.equal(FLOOR, 30, '20px on a 720px slide is 30 on the lab’s 1080');
});

test('a flowchart is a snake of straight arrows and r=8 elbows, its decision exits labelled on masks 6–10px clear', () => {
  const d = layoutDiagram('flowchart', DIAGRAM_SAMPLES.flowchart, 1600, 760, 40, roughMeasure);
  sound(d);
  assert.deepEqual(d.nodes.map((n) => n.shape), ['oval', 'diamond', 'box', 'oval', 'box']);
  const labelled = d.conns.filter((c) => c.label);
  assert.deepEqual(labelled.map((c) => c.label!.text).sort(), ['NO', 'YES']);
  assert.ok(d.conns.some((c) => c.segs.some((s) => s.k === 'arc')), 'a link that is not to a neighbour turns on elbows');
  for (const c of d.conns) assert.ok(toOutline(c.head!.tip, d.nodes.find((n) => n.id === c.to)!) < 1, 'heads land on edges');
});

test('the rules catch what they forbid: a diagonal, a label on its stroke, two connectors run together, a head off its box', () => {
  const d = layoutDiagram('flowchart', DIAGRAM_SAMPLES.flowchart, 1600, 760, 40, roughMeasure);
  const bad: Diagram = structuredClone(d);
  const first = bad.conns[0].segs[0];
  if (first.k === 'line') first.b = { x: first.b.x + 30, y: first.b.y + 30 };
  const lab = bad.conns.find((c) => c.label)!;
  const s = lab.segs.find((x) => x.k === 'line')!;
  if (s.k === 'line') lab.label!.rect = { ...lab.label!.rect, x: (s.a.x + s.b.x) / 2 - 10, y: (s.a.y + s.b.y) / 2 - 10 };
  bad.conns.push(structuredClone(bad.conns[1]));
  bad.conns[2].head!.tip = { x: bad.conns[2].head!.tip.x - 40, y: bad.conns[2].head!.tip.y - 40 };
  const found = checkDiagram(bad).join('\n');
  assert.match(found, /diagonal/);
  assert.match(found, /from its stroke/);
  assert.match(found, /overlap or cross/);
  assert.match(found, /misses the edge/);
});

test('a timeline is to scale when its times are numbers, and an evenly spaced order when they are not', () => {
  const d = layoutDiagram('timeline', DIAGRAM_SAMPLES.timeline, 1600, 760, 40, roughMeasure);
  sound(d);
  const xs = d.nodes.filter((n) => n.shape === 'dot').map((n) => n.rect.x + n.rect.w / 2);
  const years = [1786, 1858, 1967, 1983];
  const k = (xs[3] - xs[0]) / (years[3] - years[0]);
  years.forEach((y, i) => assert.ok(Math.abs(xs[0] + (y - years[0]) * k - xs[i]) < 0.5, `${y} on the scale`));
  const labels = d.nodes.filter((n) => n.shape === 'label');
  assert.ok(labels[0].rect.y < labels[1].rect.y, 'labels alternate above and below');
  assert.equal(d.nodes.find((n) => n.focal && n.shape === 'dot')!.rect.w > d.nodes.find((n) => !n.focal && n.shape === 'dot')!.rect.w, true, 'the milestone’s dot is the larger');
  const seq = layoutDiagram('timeline', 'Term 1 | Plan\nLater | Teach\nEnd | Review', 1600, 760, 40, roughMeasure);
  sound(seq);
  const sx = seq.nodes.filter((n) => n.shape === 'dot').map((n) => n.rect.x);
  assert.ok(Math.abs(sx[1] - sx[0] - (sx[2] - sx[1])) < 0.5, 'equal steps');
  assert.match(seq.notes.join(' '), /order, not a scale/);
});

test('the Teaching Routine demo: an overview loop of its eight stages with Reflect focal, and the eight in order as a flow', () => {
  const st = slideStyle(guideStyle(fromPreset(paletteGroups()[0].presets.find((p) => p.id === 'nul')!)), {});
  for (const [type, data] of [['loop', TEACHING_ROUTINE_LOOP], ['flowchart', TEACHING_ROUTINE_FLOW]] as const) {
    const slide = diagramSlide(st, 'The Teaching Routine', type, data);
    const l = slide.layers.find((x) => x.kind === 'diagram')!;
    const d = layoutDiagram(type, data, l.box!.w, l.box!.h, Number(l.params.size), roughMeasure);
    sound(d);
    const words = d.nodes.flatMap((n) => [...n.name, ...n.sub]).join(' ');
    for (const stage of ['Plan', 'Connect', 'Demonstrate', 'Activate', 'Facilitate', 'Collaborate', 'Consolidate', 'Reflect']) assert.match(words, new RegExp(stage), `${type} has ${stage}`);
    assert.ok(d.nodes.find((n) => n.focal)!.name.join(' ').includes('Reflect'), `${type}: Reflect is focal`);
    assert.ok(d.size >= 40 && d.sub >= FLOOR);
  }
  const loop = layoutDiagram('loop', TEACHING_ROUTINE_LOOP, 1158, 832, 40, roughMeasure);
  assert.match(loop.nodes.find((n) => n.shape === 'hub')!.name.join(' ') + ' ' + loop.nodes.find((n) => n.shape === 'hub')!.sub.join(' '), /One real lesson.*Y8 micro:bit step counter/);
});

test('every colour passes WCAG against what it sits on, on every palette’s working, quiet and loud grounds', () => {
  let checked = 0;
  for (const group of paletteGroups()) for (const preset of group.presets) {
    const g = fromPreset(preset);
    const grounds = [{ id: 'working', ground: g.theme.ground, ink: g.theme.ink, muted: g.theme.muted, accent: g.theme.accent }, ...(g.grounds ?? []).map((gr) => resolveGround(g, gr))];
    for (const gr of grounds) {
      const skin = diagramSkin({ surface: gr.ground, textColor: gr.ink, muted: gr.muted, accent: gr.accent });
      for (const p of skinPairs(skin)) {
        assert.ok(contrast(p.fg, p.bg) >= p.min, `${preset.name} · ${gr.id}: ${p.role} ${p.fg} on ${p.bg} is ${contrast(p.fg, p.bg)}:1`);
        checked++;
      }
    }
  }
  assert.ok(checked > 100);
});

/** A canvas that writes down what is drawn on it. */
function recorder() {
  const ops: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : (...a: unknown[]) => { ops.push(`${k}(${a.map((x) => (typeof x === 'number' ? x.toFixed(2) : String(x))).join(',')})`); }),
    set: (t, k: string, v) => { t[k] = v; ops.push(`${k}=${String(v)}`); return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, ops };
}
const draw = (d: Diagram, p: (i: number) => number) => {
  const r = recorder();
  drawDiagram(r.ctx, d, diagramSkin({}), (px, w) => `${w} ${px}px Inter`, p);
  return r.ops;
};

test('the draw entrance builds a beat at a time, as a pure function of the clock', () => {
  const d = layoutDiagram('loop', stations(5), 1600, 760, 40, roughMeasure);
  assert.equal(d.beats, 6);
  const text = (ops: string[]) => ops.filter((o) => o.startsWith('fillText(')).length;
  assert.equal(text(draw(d, () => 0)), 0, 'nothing before it starts');
  const all = text(draw(d, () => 1));
  const two = text(draw(d, (i) => (i < 2 ? 1 : 0)));
  assert.ok(two > 0 && two < all, 'the hub and the first station, then the rest');
  assert.deepEqual(draw(d, (i) => (i < 3 ? 1 : i === 3 ? 0.5 : 0)), draw(d, (i) => (i < 3 ? 1 : i === 3 ? 0.5 : 0)), 'the same moment draws the same');
  const layer = { id: 'd', kind: 'diagram', name: 'Diagram', visible: true, opacity: 1, blend: 'normal', box: { x: 0, y: 0, w: 1600, h: 760, rot: 0 },
    params: { diagram: 'loop', data: stations(5) }, anim: { type: 'draw', duration: 0.9, stagger: 0.6, delay: 0, easing: 'linear', trigger: 'withSlide', loop: 'none', loopSpeed: 1, loopAmount: 1 }, interact: {} } as unknown as Layer;
  assert.ok(Math.abs(animTotal(layer) - (0.9 + 5 * 0.6)) < 1e-9, 'the entrance lasts its beats');
  const sched = schedule({ layers: [layer] } as never, []);
  assert.equal(layerState(layer, sched.start.get('d'), 1.2, 1.2).textT, 1.2, 'drawing: the diagram is told the clock');
  assert.equal(layerState(layer, sched.start.get('d'), 1.2, 1.2, true).textT, Infinity, 'reduced motion: the finished diagram');
  assert.equal(layerState(layer, sched.start.get('d'), Infinity, 0).textT, Infinity, 'a still slide: finished');
});
