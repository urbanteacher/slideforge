import type { LayoutStyle } from '../layouts';
import type { Layer, Slide } from '../types';
import { BASE, FOOT, HEAD, LEFT, PAD, W, box, clock, eyebrow, fmtMin, ground, hero, part, rect, rgba, slideOf, tint, txt } from './kit';

// Timed routines — Think · Pair · Share, Jigsaw, I do · We do · You do, a Socratic seminar — in two
// designs. The band: the question across the top half and the stages as one band of columns under it,
// flush and full-bleed, a stage per click with its time counting from when it arrives. The track,
// SlideForge's: the stages as pills across the top and one clock, a cover first, then each stage in
// the body in turn.

export interface Stage { name: string; task: string; minutes: number; job?: string }
export interface Routine { title: string; prompt: string; stages: Stage[]; notes?: string; /** What the prompt is ("Discussion prompt"), beside the title above it. */ label?: string }

/** The band: up to five stages share the width with nothing between them, and run off the foot. */
export function stageBand(st: LayoutStyle, o: Routine): Slide {
  const TOP = 500;
  const layers: Layer[] = [
    ground(st),
    eyebrow(st, o.label ? `${o.title} · ${o.label}` : o.title),
    hero(st, 'Prompt', o.prompt, box(LEFT, 206, W - LEFT * 2, TOP - 206 - 36), 120),
  ];
  const n = Math.max(1, Math.min(5, o.stages.length));
  const colW = W / n;
  const nameSize = n >= 5 ? 84 : n === 4 ? 104 : 116;
  o.stages.slice(0, n).forEach((s, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, TOP, x1 - x0, BASE - TOP);
    const pad = i === 0 ? LEFT : PAD;
    const inner = (dy: number, h: number, w = col.w - pad - PAD) => box(col.x + pad, col.y + dy, w, h);
    const p = part('stages', i, 'spot');
    layers.push(
      rect(`${s.name} — column`, col, tint(st, i), p.lead('wipeUp')),
      rect(`${s.name} — bar`, box(col.x, col.y, col.w, 12), st.accent, p.with(0.1, 'wipeRight')),
      txt(`${s.name} — number`, String(i + 1).padStart(2, '0'), inner(44, 76, 160), { font: st.display, weight: st.displayWeight, size: 68, color: st.accent }, p.with(0.15)),
      txt(`${s.name} — name`, s.name, inner(128, 104), { font: st.display, weight: st.displayWeight, size: nameSize, color: st.ink, lineHeight: 1, fitGroup: 'stage-name' }, p.with(0.2, 'rise')),
      txt(`${s.name} — task`, s.task, inner(252, FOOT - col.y - 252), { font: st.body, weight: '400', size: n >= 5 ? 46 : 54, color: st.muted, lineHeight: 1.28, fitGroup: 'stage-task' }, p.with(0.3)),
    );
    // Its clock: time only, flush with the number, counting from when its stage arrives.
    if (s.minutes > 0) layers.push(clock(st, `${s.name} — clock`, s.minutes, box(col.x + col.w - PAD - 190, col.y + 44, 190, 76), p.with(0.2)));
  });
  return slideOf(o.title, layers, st, o.notes);
}

/**
 * The track, as SlideForge draws a routine: the stages as a track of pills across the top and one
 * clock beside them. It opens on a cover — the title, how many stages and minutes, and which comes
 * first — with the clock showing the whole routine. Each click lights the next pill and puts that
 * stage in the body, in the same place: its name and job, then its task, large, and the clock
 * counting its minutes. The room's rail is SlideForge's, beside the slide in a live session.
 */
export function stageTrack(st: LayoutStyle, o: Routine): Slide {
  const n = Math.max(1, Math.min(5, o.stages.length));
  const stages = o.stages.slice(0, n);
  const total = stages.reduce((m, s) => m + s.minutes, 0);
  const size = 176;
  const clockBox = box(W - LEFT - size, HEAD, size, size);
  const trackY = 176, pillH = 104, gap = 20;
  const pillW = (clockBox.x - 48 - LEFT - gap * (n - 1)) / n;
  const pill = (i: number) => box(LEFT + i * (pillW + gap), trackY, pillW, pillH);
  const body = (y: number, h: number) => box(LEFT, y, W - LEFT * 2, h);
  const labelSize = n >= 5 ? 36 : 44;

  const layers: Layer[] = [ground(st)];
  stages.forEach((s, i) => {
    const b = pill(i);
    const a = { type: 'fade' as const, duration: 0.5, delay: 0.1 * i };
    layers.push(
      rect(`Track — ${s.name}`, b, st.panel, a, 20),
      txt(`Track — ${s.name} name`, `${i + 1}  ${s.name}`, box(b.x + 26, b.y + 24, b.w - 150, 56), { font: st.body, weight: '700', size: labelSize, color: st.ink }, a),
      txt(`Track — ${s.name} time`, s.minutes ? fmtMin(s.minutes) : '', box(b.x + b.w - 124, b.y + 28, 100, 48), { font: st.body, weight: '500', size: 36, color: st.muted, align: 'right' }, a),
    );
  });

  // The cover, item 0 of the one-at-a-time set: up with the slide, gone when the first stage starts.
  const cover = part('routine', 0, 'swap');
  layers.push(
    clock(st, 'Clock — whole routine', Math.max(0.5, total), clockBox, cover.lead(), true),
    txt('Cover — title', o.title, body(470, 170), { font: st.display, weight: st.displayWeight, size: 150, color: st.ink, lineHeight: 1, tracking: -0.02, fit: 'fill' }, cover.with(0.1, 'rise')),
    txt('Cover — summary', `${n} stages${total ? ` · ${Math.round(total * 10) / 10} min` : ''}`, body(660, 80), { font: st.body, size: 64, color: st.muted }, cover.with(0.2)),
    txt('Cover — first', `FIRST: ${stages[0]?.name.toUpperCase() ?? ''}`, body(770, 56), { font: st.body, weight: '600', size: 44, color: st.accent, tracking: 0.12 }, cover.with(0.35)),
  );

  // Each stage, items 1…n: a click lights its pill and swaps its words and its clock into place.
  stages.forEach((s, i) => {
    const p = part('routine', i + 1, 'swap');
    const b = pill(i);
    layers.push(
      rect(`${s.name} — live pill`, b, st.ink, p.lead(), 20),
      txt(`${s.name} — live pill name`, s.name, box(b.x + 26, b.y + 24, b.w - 150, 56), { font: st.body, weight: '700', size: labelSize, color: st.ground }, p.with(0)),
      txt(`${s.name} — live pill time`, s.minutes ? fmtMin(s.minutes) : '', box(b.x + b.w - 124, b.y + 28, 100, 48), { font: st.body, weight: '500', size: 36, color: st.ground, align: 'right' }, p.with(0)),
      txt(`${s.name} — heading`, s.name, box(LEFT, 440, 1100, 132), { font: st.display, weight: st.displayWeight, size: 120, color: st.ink, lineHeight: 1 }, p.with(0.1, 'rise')),
      txt(`${s.name} — job`, (s.job ?? '').toUpperCase(), box(LEFT + 20, 590, 1200, 52), { font: st.body, weight: '600', size: 40, color: st.accent, tracking: 0.12 }, p.with(0.2)),
      txt(`${s.name} — task`, s.task, body(660, FOOT - 660), { font: st.body, weight: '700', size: 76, color: st.ink, lineHeight: 1.15, balance: true }, p.with(0.25, 'rise')),
    );
    if (s.minutes > 0) layers.push(clock(st, `${s.name} — clock`, s.minutes, clockBox, p.with(0, 'pop'), true));
  });
  return slideOf(`${o.title} — track`, layers, st, o.notes);
}

/** A thin rule of the ink, for designs that divide flush bands. */
export const divider = (st: LayoutStyle, name: string, y: number, x = 0, w = W) => rect(name, box(x, y, w, 2), rgba(st.ink, 0.12));
