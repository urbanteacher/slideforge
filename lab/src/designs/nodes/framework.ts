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
export interface FrameworkStage { name: string; ask: string; task: string; outcome: string; backbone: Backbone;
  /** A model answer: a part per slot of the stage's scaffold (`slotsOf`), written into it a click at a time; or one
   *  sentence, laid over the scaffold. */
  model?: string | string[] }
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

/** What a stage's scaffold asks for, slot by slot: what a model answer fills, in order. */
export function slotsOf(s: Pick<FrameworkStage, 'name' | 'backbone'>): string[] {
  if (s.backbone === 'U') return ['Name it', 'Say what it is or does', 'Give one precise detail'];
  if (s.backbone === 'A') return ['What you are given', 'The working', 'The result'];
  if (s.backbone === 'C') return /pros|discuss/i.test(s.name) ? ['Benefits', 'Limitations'] : /compare/i.test(s.name) ? ['This one', 'The alternative'] : ['Must have', 'Can leave out'];
  if (s.backbone === 'X') return /test|refine/i.test(s.name) ? ['Normal', 'Boundary', 'Invalid'] : ['Who is affected?', 'What is assumed?', 'What could go wrong?'];
  return /review/i.test(s.name) ? ['Secure, developing or emerging?', 'because', 'my next step'] : ['My recommendation', 'because', 'the evidence that supports it'];
}

/** The model's parts when they fit the scaffold's slots; otherwise none (a sentence is laid over it instead). */
const partsOf = (s: FrameworkStage) => (Array.isArray(s.model) && s.model.length === slotsOf(s).length && s.model.every((m) => typeof m === 'string' && m.trim()) ? s.model : null);

/** The scaffold under a stage's task, drawn for its kind of thinking, with the model's parts written into it (a click each). */
function scaffold(st: LayoutStyle, s: FrameworkStage, y: number, h: number): Layer[] {
  const col = colorOf(s.backbone), full = W - LEFT * 2;
  const slots = slotsOf(s), parts = partsOf(s);
  // A chain's boxes, equal widths so each part sits under its own box.
  const chained = (title: string, strokes: string[], name: string): Layer[] => {
    const gap = 80, bw = Math.floor((full - gap * 2) / 3), bh = parts ? 110 : Math.min(130, h - 70), ay = y + 64 + bh + 22;
    return [T(st, 'Scaffold', title, LEFT, y, 900, 46, { weight: '800', size: 34 }, still),
      ...chain(st, slots, LEFT, y + 64, { h: bh, size: 32, gap, strokes, widths: [bw, bw, bw], firstOnClick: true, name }),
      ...(parts ?? []).flatMap((m, i) => [
        card(st, `Model ${i + 1}`, LEFT + i * (bw + gap), ay, bw, y + h - ay, { fill: rgba(strokes[i], 0.1), stroke: strokes[i], sw: 2, radius: 18 }, onClick()),
        T(st, `Model ${i + 1} — words`, m, LEFT + i * (bw + gap) + 24, ay + 18, bw - 48, y + h - ay - 36, { weight: '600', size: 38, lineHeight: 1.22, fit: 'shrink' }, after()),
      ])];
  };
  if (s.backbone === 'U') return chained('Build it like this:', [LINK.U, LINK.A, LINK.A], 'Define');
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
      // The working, a line per step, level with its step.
      ...(parts ?? []).flatMap((m, i) => {
        const ry = y + 80 + i * ((h - 100) / 3), rh = (h - 100) / 3 - 8;
        return [
          badge(st, LEFT + sw + 76, ry, 40, col, String(i + 1), onClick()),
          T(st, `Model ${i + 1} — words`, m, LEFT + sw + 130, ry - 4, full - sw - 196, rh, { weight: '600', size: 34, lineHeight: 1.2, fit: 'shrink' }, after()),
        ];
      }),
    ];
  }
  if (s.backbone === 'C') {
    const sides = slots;
    const cw = Math.floor((full - 260) / 2);
    return [
      ...barCard(st, sides[0], LEFT, y, cw, h, col, st.panel, still),
      T(st, `${sides[0]} — label`, sides[0].toUpperCase(), LEFT + 40, y + 26, cw - 80, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
      ...pill(st, 'Criteria', 'same criteria', LEFT + cw + 20, y + h / 2 - 30, { w: 220, fill: rgba(col, 0.18), size: 24 }, still),
      ...barCard(st, sides[1], LEFT + cw + 260, y, cw, h, col, st.panel, still),
      T(st, `${sides[1]} — label`, sides[1].toUpperCase(), LEFT + cw + 300, y + 26, cw - 80, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
      ...(parts ?? []).map((m, i) => T(st, `Model ${i + 1} — words`, m, LEFT + 40 + i * (cw + 260), y + 84, cw - 80, h - 110, { weight: '600', size: 40, lineHeight: 1.25, fit: 'shrink' }, onClick())),
    ];
  }
  if (s.backbone === 'X') {
    const asks = slots;
    const pw = Math.floor((full - 80 - 2 * 24) / 3), ph = parts ? 76 : Math.min(110, h - 130), ay = y + 96 + ph + 16;
    return [
      ...barCard(st, 'Challenge it', LEFT, y, full, h, col, rgba(col, 0.08), still),
      T(st, 'Challenge — label', 'CHALLENGE IT', LEFT + 44, y + 26, 800, 40, { weight: '800', size: 28, color: col, tracking: 0.08 }, still),
      ...asks.flatMap((a, i) => pill(st, `Challenge ${i + 1}`, a, LEFT + 44 + i * (pw + 24), y + 96, { w: pw, h: ph, fill: st.panel, size: 30 }, i ? onClick() : still)),
      ...(parts ?? []).flatMap((m, i) => [
        card(st, `Model ${i + 1}`, LEFT + 44 + i * (pw + 24), ay, pw, y + h - 24 - ay, { fill: st.panel, stroke: col, sw: 2, radius: 18 }, onClick()),
        T(st, `Model ${i + 1} — words`, m, LEFT + 64 + i * (pw + 24), ay + 16, pw - 40, y + h - 56 - ay, { weight: '600', size: 36, lineHeight: 1.22, fit: 'shrink' }, after()),
      ]),
    ];
  }
  return chained('Make the call:', [LINK.J, LINK.A, LINK.U], 'Decide');
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
      // A model written as one sentence (an older AI answer, say): one more click lays it over the scaffold.
      ...(typeof s.model === 'string' && s.model.trim() ? [
        card(st, 'Model answer', LEFT, sy, W - LEFT * 2, sh, { fill: st.panel, stroke: col }, onClick()),
        T(st, 'Model answer — label', 'A MODEL ANSWER', LEFT + 44, sy + 28, 900, 36, { weight: '800', size: 26, color: col, tracking: 0.08 }, after()),
        T(st, 'Model answer — words', s.model as string, LEFT + 44, sy + 84, W - LEFT * 2 - 88, sh - 116, { weight: '600', size: 46, lineHeight: 1.3 }, after()),
      ] : []),
    ], st, `Stage ${i + 1} of ${n}: ${s.name} (${BACKBONE[s.backbone]?.name}). ${s.ask}\nTask: ${s.task}\nAim for: ${s.outcome}${s.model ? `\nModel answer (last clicks): ${Array.isArray(s.model) ? slotsOf(s).map((k, j) => `${k}: ${s.model![j] ?? ''}`).join(' | ') : s.model}` : ''}`), role: `stage-${i + 1}` };
  });
  const close = slideOf(`${o.framework} · where did you get to?`, [
    ground(st), label(st, `${o.framework} · ${n} stages`, LEFT, EY, 1400, st.accent, 30),
    heading(st, 'Where did you get to, and where did you get stuck?', HY, 60, W - LEFT * 2, 150),
    ...map(st, o, HY + 190, FOOT - 90),
    ...legend(st, FOOT - 56),
  ], st, 'Close on the map: each student names the furthest stage they reached and the one where they got stuck. That stage is where next lesson starts.');
  return marked(format, [{ slide: cover, role: 'map' }, { slide: recall, role: 'recall' }, ...stages, { slide: close, role: 'close' }], o,
    { open: { ...Object.fromEntries(o.stages.map((s, i) => [`stage-${i + 1}`, s.task])), close: 'Which stage did you get to, and where did you get stuck?' } });
}
