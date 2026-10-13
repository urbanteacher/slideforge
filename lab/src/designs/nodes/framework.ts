import type { LayoutStyle } from '../../layouts';
import type { Layer } from '../../core';
import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, badge, barCard, card, chain, heading, label, onClick, pill, still } from './look';
import { marked } from './types';

// Framework: a whole Nodes framework on one topic, node by node, as the Nodes app lays a framework
// out. It opens on the map (every stage, in the framework's serpentine, coloured by its backbone),
// then recall (the terms to retrieve, each meaning on a click), then every stage in turn: where it
// sits on the map, its question, its task, what to aim for, and a scaffold drawn for its kind of
// thinking — Understand a define chain, Apply worked steps, Compare two sides on shared criteria,
// Challenge a challenge card, Judge a decision chain. It closes on the map again.

export type Backbone = 'U' | 'A' | 'C' | 'X' | 'J';
export interface FrameworkStage { name: string; ask: string; task: string; outcome: string; backbone: Backbone }
export interface FrameworkRun { framework: string; topic: string; recall: { term: string; meaning: string }[]; stages: FrameworkStage[] }

export const BACKBONE: Record<Backbone, { name: string; color: string }> = {
  U: { name: 'Understand', color: LINK.U },
  A: { name: 'Apply', color: LINK.A },
  C: { name: 'Compare and analyse', color: LINK.C },
  X: { name: 'Challenge', color: LINK.X },
  J: { name: 'Judge and transfer', color: LINK.J },
};
const colorOf = (b: Backbone) => BACKBONE[b]?.color ?? LINK.U;

/** The framework's map: its stages four to a row, snaking (left to right, then right to left). */
function map(st: LayoutStyle, o: FrameworkRun, top: number, bottom: number, here = -1, build = false): Layer[] {
  const n = o.stages.length, cols = 4, rows = Math.ceil(n / cols), gx = 70, gy = 44;
  const cw = Math.floor((W - LEFT * 2 - gx * (cols - 1)) / cols);
  const ch = Math.min(118, Math.floor((bottom - top - gy * (rows - 1)) / rows));
  const out: Layer[] = [];
  o.stages.forEach((s, i) => {
    const r = Math.floor(i / cols), k = i % cols, c = r % 2 ? cols - 1 - k : k;
    const x = LEFT + c * (cw + gx), y = top + r * (ch + gy), col = colorOf(s.backbone);
    const lit = i === here, done = here >= 0 && i < here;
    const anim = build ? (i === 0 ? after() : onClick()) : still;
    out.push(card(st, `Stage ${i + 1} ${s.name}`, x, y, cw, ch, { fill: lit ? col : done ? rgba(col, 0.16) : st.panel, stroke: col, sw: lit ? 0 : 3, radius: 18 }, anim));
    out.push(badge(st, x + 18, y + (ch - 54) / 2, 54, lit ? '#ffffff' : col, String(i + 1), build ? after() : still));
    if (lit) out[out.length - 1].params.labelColor = col;
    out.push(T(st, `Stage ${i + 1} name`, s.name, x + 88, y + (ch - 48) / 2, cw - 104, 50, { weight: '800', size: 36, color: lit ? '#ffffff' : st.ink, fit: 'shrink' }, build ? after() : still));
    // The track: along the row, and down at the row's end.
    if (i + 1 < n) {
      const last = k === cols - 1;
      const ax = last ? x + cw / 2 - 20 : r % 2 ? x - gx + 6 : x + cw + 6, ay = last ? y + ch + 2 : y + ch / 2 - 26;
      out.push(T(st, 'Track', last ? '↓' : r % 2 ? '←' : '→', ax, ay, last ? 40 : gx - 12, last ? gy - 4 : 52, { weight: '700', size: last ? 34 : 40, align: 'center', color: st.muted }, build ? after() : still));
    }
  });
  return out;
}

/** The backbone's five kinds, as pills: what the colours mean. */
function legend(st: LayoutStyle, y: number): Layer[] {
  let x = LEFT; const out: Layer[] = [];
  (Object.keys(BACKBONE) as Backbone[]).forEach((b) => {
    const w = Math.round(BACKBONE[b].name.length * 15 + 90);
    out.push(...pill(st, `Backbone ${b}`, `${b} · ${BACKBONE[b].name}`, x, y, { w, fill: BACKBONE[b].color, color: '#ffffff', size: 24 }, still));
    x += w + 14;
  });
  return out;
}

/** Where a stage sits: a dot per stage, the done ones filled, this one lit in its colour. */
function progress(st: LayoutStyle, o: FrameworkRun, here: number, y: number): Layer[] {
  const n = o.stages.length, d = 30, step = Math.min(46, Math.floor((W - LEFT * 2 - 700) / n));
  const x0 = W - LEFT - (n - 1) * step - d;
  return o.stages.map((s, i) => {
    const col = colorOf(s.backbone), lit = i === here;
    return badge(st, x0 + i * step, y + (lit ? -6 : 0), lit ? d + 12 : d, i <= here ? col : st.panel, lit ? String(i + 1) : '', still, col);
  });
}

/** The scaffold under a stage's task, drawn for its kind of thinking. */
function scaffold(st: LayoutStyle, s: FrameworkStage, y: number, h: number): Layer[] {
  const col = colorOf(s.backbone), full = W - LEFT * 2;
  if (s.backbone === 'U') {
    return [T(st, 'Scaffold', 'Build it like this:', LEFT, y, 900, 46, { weight: '800', size: 34 }, still),
      ...chain(st, ['Name it', 'Say what it is or does', 'Give one precise detail'], LEFT, y + 64, { h: Math.min(130, h - 70), size: 34, gap: 80, strokes: [LINK.U, LINK.A, LINK.A], firstOnClick: true, name: 'Define' })];
  }
  if (s.backbone === 'A') {
    const steps = ['Pick out what you are given', 'Work it through, step by step', 'State the result, with its unit or output'];
    const sw = 760;
    return [
      card(st, 'Steps', LEFT, y, sw, h, {}, still),
      ...steps.flatMap((t, i) => [
        badge(st, LEFT + 30, y + 30 + i * ((h - 60) / 3), 52, col, String(i + 1), i ? onClick() : still),
        T(st, `Step ${i + 1}`, t, LEFT + 100, y + 34 + i * ((h - 60) / 3), sw - 130, 60, { weight: '700', size: 32 }, i ? after() : still),
      ]),
      card(st, 'Working', LEFT + sw + 40, y, full - sw - 40, h, { fill: rgba(col, 0.08), stroke: rgba(col, 0.5) }, still),
      T(st, 'Working — label', 'SHOW YOUR WORKING', LEFT + sw + 76, y + 26, 600, 36, { weight: '800', size: 24, color: col, tracking: 0.08 }, still),
    ];
  }
  if (s.backbone === 'C') {
    const sides = /pros|discuss/i.test(s.name) ? ['Benefits', 'Limitations'] : /compare/i.test(s.name) ? ['This one', 'The alternative'] : ['Must have', 'Can leave out'];
    const cw = Math.floor((full - 260) / 2);
    return [
      ...barCard(st, sides[0], LEFT, y, cw, h, col, st.panel, still),
      T(st, `${sides[0]} — label`, sides[0].toUpperCase(), LEFT + 40, y + 26, cw - 80, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
      ...pill(st, 'Criteria', 'same criteria', LEFT + cw + 20, y + h / 2 - 30, { w: 220, fill: rgba(col, 0.18), size: 24 }, still),
      ...barCard(st, sides[1], LEFT + cw + 260, y, cw, h, col, st.panel, still),
      T(st, `${sides[1]} — label`, sides[1].toUpperCase(), LEFT + cw + 300, y + 26, cw - 80, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
    ];
  }
  if (s.backbone === 'X') {
    const asks = /test|refine/i.test(s.name) ? ['Normal', 'Boundary', 'Invalid'] : ['Who is affected?', 'What is assumed?', 'What could go wrong?'];
    const pw = Math.floor((full - 80 - 2 * 24) / 3);
    return [
      ...barCard(st, 'Challenge it', LEFT, y, full, h, col, rgba(col, 0.08), still),
      T(st, 'Challenge — label', 'CHALLENGE IT', LEFT + 44, y + 26, 800, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
      ...asks.flatMap((a, i) => pill(st, `Challenge ${i + 1}`, a, LEFT + 44 + i * (pw + 24), y + 96, { w: pw, h: Math.min(110, h - 130), fill: st.panel, size: 32 }, i ? onClick() : still)),
    ];
  }
  return [T(st, 'Scaffold', 'Make the call:', LEFT, y, 900, 46, { weight: '800', size: 34 }, still),
    ...chain(st, /review/i.test(s.name) ? ['Secure, developing or emerging?', 'because', 'my next step'] : ['My recommendation', 'because', 'the evidence that supports it'], LEFT, y + 64, { h: Math.min(130, h - 70), size: 34, gap: 80, strokes: [LINK.J, LINK.A, LINK.U], firstOnClick: true, name: 'Decide' })];
}

const PHONES: Record<Backbone, string> = { U: 'write it in a sentence', A: 'show your working', C: 'fill both sides', X: 'challenge it', J: 'make the call' };

/** Every slide of the run: the map, recall, each stage, the map again. */
export function frameworkSlides(st: LayoutStyle, o: FrameworkRun, format = 'framework') {
  const n = o.stages.length;
  const cover = slideOf(`${o.framework} · the map`, [
    ground(st), label(st, `${o.framework} · ${n} stages`, LEFT, EY, 1400, st.accent, 30),
    heading(st, o.topic, HY, 64, W - LEFT * 2, 150),
    ...map(st, o, HY + 190, FOOT - 90, -1, true),
    ...legend(st, FOOT - 56),
  ], st, `${o.framework}: ${n} stages on ${o.topic}. Each click brings in the next stage on the map.\n${o.stages.map((s, i) => `${i + 1}. ${s.name} (${BACKBONE[s.backbone]?.name}): ${s.ask}`).join('\n')}`);
  const items = o.recall.slice(0, 6), cols = 3, gx = 36, gy = 30;
  const rw = Math.floor((W - LEFT * 2 - gx * (cols - 1)) / cols), rtop = HY + 150, rh = Math.floor((FOOT - rtop - gy) / 2);
  const recall = slideOf('Recall first', [
    ground(st), label(st, 'Recall first', LEFT, EY, 1100, st.accent, 30), phonesCue(st, 'answer from memory'),
    heading(st, 'What must you remember before you start?', HY, 60, W - LEFT * 2, 120),
    ...items.flatMap((it, i) => {
      const x = LEFT + (i % cols) * (rw + gx), y = rtop + Math.floor(i / cols) * (rh + gy);
      return [
        ...barCard(st, `Recall ${it.term}`, x, y, rw, rh, LINK.U, st.panel, still),
        T(st, `Recall ${it.term} — term`, it.term, x + 40, y + 28, rw - 70, 52, { weight: '800', size: 40, color: LINK.U }, still),
        T(st, `Recall ${it.term} — meaning`, it.meaning, x + 40, y + 96, rw - 70, rh - 120, { size: 30, lineHeight: 1.3 }, onClick()),
      ];
    }),
  ], st, `Recall first: answer from memory, then check. Each click shows a meaning.\n${items.map((it) => `${it.term}: ${it.meaning}`).join('\n')}`);
  const stages = o.stages.map((s, i) => {
    const col = colorOf(s.backbone);
    const ty = HY + 206, th = 150, sy = ty + th + 44, sh = FOOT - sy;
    return { slide: slideOf(`${i + 1} · ${s.name}`, [
      ground(st), label(st, `Stage ${i + 1} of ${n} · ${s.name}`, LEFT, EY, 900, col, 30),
      ...progress(st, o, i, EY + 6),
      heading(st, s.ask, HY + 50, 60, W - LEFT * 2 - 640, 130),
      T(st, 'Phones', `ON PHONES · ${(PHONES[s.backbone] ?? 'answer').toUpperCase()}`, W - LEFT - 620, HY + 68, 620, 44, { weight: '600', size: 28, color: st.muted, tracking: 0.12, align: 'right' }, still),
      ...barCard(st, 'Task', LEFT, ty, W - LEFT * 2 - 420, th, col, st.panel, still),
      T(st, 'Task — words', s.task, LEFT + 44, ty + 20, W - LEFT * 2 - 508, th - 40, { weight: '600', size: 36, valign: 'middle' }, still),
      card(st, 'Aim for', W - LEFT - 390, ty, 390, th, { fill: rgba(col, 0.16), sw: 0, radius: 18 }, still),
      T(st, 'Aim for — label', `AIM FOR · ${BACKBONE[s.backbone]?.name.toUpperCase()}`, W - LEFT - 362, ty + 20, 340, 30, { weight: '800', size: 20, color: col, tracking: 0.06, fit: 'shrink' }, still),
      T(st, 'Aim for — words', s.outcome, W - LEFT - 362, ty + 56, 340, th - 70, { weight: '700', size: 30, lineHeight: 1.2 }, still),
      ...scaffold(st, s, sy, sh),
    ], st, `Stage ${i + 1} of ${n}: ${s.name} (${BACKBONE[s.backbone]?.name}). ${s.ask}\nTask: ${s.task}\nAim for: ${s.outcome}`), role: `stage-${i + 1}` };
  });
  const close = slideOf(`${o.framework} · where did you get to?`, [
    ground(st), label(st, `${o.framework} · ${n} stages`, LEFT, EY, 1400, st.accent, 30),
    heading(st, 'Where did you get to, and where did you get stuck?', HY, 60, W - LEFT * 2, 150),
    ...map(st, o, HY + 190, FOOT - 90),
    ...legend(st, FOOT - 56),
  ], st, 'Close on the map: each student names the furthest stage they reached and the one where they got stuck. That stage is where next lesson starts.');
  return marked(format, [{ slide: cover, role: 'map' }, { slide: recall, role: 'recall' }, ...stages, { slide: close, role: 'close' }], o);
}
