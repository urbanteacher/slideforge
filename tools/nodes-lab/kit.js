/* The Nodes deck kit: colours, type, motion, and the layer helpers every Nodes deck is built from.
 * tools/nodes-lab/build.mjs puts this file in front of a deck file, which sets NAV ({ tabs, label })
 * and D (its data) and calls S() for each slide. Below, the first deck's own notes.
 *
 * Critical Text Analysis, stage 3 (Abstraction: key text or what is missing), designed for the
 * Lesson studio: every tab of the Nodes stage, in the app's order, set as slides in Nodes' own look
 * (Archivo, ink on cool grey, white cards, the U A C X J colours), built from the lab's own layers.
 *
 * Runs in the page of the lab's dev server (tools/nodes-lab/build.mjs injects it), so it uses the
 * lab's real createLayer and createSlide. The words are the stage's own (tools/nodes-lab/critical-text-3.json,
 * exported from Nodes by tools/export-stage-lesson.ts, and the stage's tabs as Nodes shows them). */
import { createLayer, createSlide } from '/src/model/defaults.ts';

const W = 1920;
const C = {
  bg: '#eceef2', card: '#ffffff', ink: '#182033', muted: '#566074', line: '#bfc5d1', tint: '#dde1e8',
  U: '#0072b2', A: '#009e73', Cc: '#e69f00', X: '#d55e00', J: '#cc79a7',
  amber: '#fdf3df', green: '#eef8f4', blue: '#eaf3fa', red: '#fbeee6', deep: '#10162b',
};
const F = 'Archivo';

/* ---------------------------------------------------------------- motion
 * One grammar, the same on every slide:
 *  1. The frame is already there: the tab strip, the label and the heading arrive with the slide, still.
 *  2. What the slide shows from the start comes in together: one short fade, no delays, no stagger.
 *  3. A click is a teaching step: it brings one group in, with the same fade, in reading order.
 *     (In the lab, a layer set "with slide" after a click layer arrives with that click.)
 *  4. Every slide changes the same way: a plain fade.
 * Calls may still pass a type or a delay; they are ignored here, so nothing on a slide moves
 * differently from anything else. */
const FADE = { type: 'fade', duration: 0.45, delay: 0, easing: 'cubicOut', stagger: 0 };
const still = { type: 'none', duration: 0, delay: 0, trigger: 'withSlide' };
const enter = () => ({ ...FADE, trigger: 'withSlide' });
const fadeIn = enter;
const onClick = () => ({ ...FADE, trigger: 'onClick' });
/* Part of the group the last click opened (or of the slide's opening, before any click). */
const after = enter;
const TRANSITION = { type: 'fade', duration: 0.5 };

/* ---------------------------------------------------------------- layers */
function T(text, x, y, w, h, p = {}, anim = enter()) {
  const l = createLayer('text', {
    name: p.name || String(text).split('\n')[0].slice(0, 28), box: { x, y, w, h },
    params: { text, font: F, size: 40, weight: '400', color: C.ink, lineHeight: 1.3, align: 'left', valign: 'top', fit: 'shrink', ...p, size: (p.size ?? 40) < 50 && (p.size ?? 40) > 21 ? Math.round((p.size ?? 40) * 1.15) : (p.size ?? 40) },
    anim,
  });
  delete l.params.name;
  l.box.h = h; // the region holds the copy: it shrinks to fit, never grows past it
  return l;
}
function R(x, y, w, h, p = {}, anim = fadeIn()) {
  const l = createLayer('shape', { name: p.name || 'Panel', box: { x, y, w, h },
    params: { shape: 'rect', radius: 24, fill: C.card, fillOpacity: 1, stroke: C.line, strokeWidth: 2, strokeOpacity: 1, ...p }, anim });
  delete l.params.name;
  return l;
}
const dot = (x, y, d, fill, label = '', anim = fadeIn(), p = {}) =>
  R(x, y, d, d, { shape: 'ellipse', fill, strokeWidth: 0, label, labelColor: '#ffffff', labelFont: F, labelWeight: '800', labelSize: Math.round(d * 0.5), name: label ? `Badge ${label}` : 'Dot', ...p }, anim);
function IMG(src, x, y, w, h, p = {}, anim = fadeIn()) {
  const l = createLayer('image', { name: p.name || 'Picture', box: { x, y, w, h }, params: { src, fit: 'contain', ...p }, anim });
  delete l.params.name;
  return l;
}
const ground = (color) => createLayer('solid', { name: 'Ground', params: { color }, anim: still });

/* The tab strip on every slide: where we are in the stage, the same order as the app. */
function nav(current, dark = false) {
  const out = [];
  let x = 80;
  for (const t of NAV.tabs) {
    const w = Math.round(t.length * 15 + 56), on = t === current;
    out.push(R(x, 40, w, 52, { radius: 26, fill: on ? (dark ? '#ffffff' : C.ink) : 'transparent', fillOpacity: on ? 1 : 0, stroke: dark ? '#3a4566' : C.line, strokeWidth: on ? 0 : 2, name: `Tab ${t}` }, still));
    out.push(T(t, x, 51, w, 34, { size: 24, weight: '700', align: 'center', color: on ? (dark ? C.ink : '#ffffff') : (dark ? '#9aa6c4' : C.muted), name: `Tab label ${t}` }, still));
    x += w + 14;
  }
  out.push(T(NAV.label, 1240, 51, 600, 34, { size: 24, weight: '600', align: 'right', color: dark ? '#9aa6c4' : C.muted, name: 'Stage' }, still));
  return out;
}
/* A section's label and heading, as the app sets them: small capitals, then the words that matter. */
const eyebrow = (text, y = 140, color = C.muted) => T(text.toUpperCase(), 80, y, 1700, 40, { size: 26, weight: '700', color, tracking: 0.08, name: 'Eyebrow' }, still);
const heading = (text, y = 186, size = 64, w = 1760) => T(text, 80, y, w, size * 2.6, { size, weight: '800', lineHeight: 1.08, tracking: -0.01, name: 'Heading' }, still);
const note = (text, y = 990) => T(text, 80, y, 1760, 60, { size: 22, color: C.muted, name: 'Note' }, fadeIn({ delay: 0.3 }));

const slides = [];
function S(name, layers, o = {}) {
  const s = createSlide(name, [ground(o.bg || C.bg), ...layers], o.bg || C.bg, TRANSITION);
  s.notes = o.notes || '';
  slides.push(s);
  return s;
}
/* A tab's divider: the tab's own promise, on ink. */
function divider(tab, establish, caveat = NAV.caveat || '') {
  S(tab, [
    ...nav(tab, true),
    T(tab, 80, 330, 1760, 200, { size: 150, weight: '800', color: '#ffffff', tracking: -0.02, name: 'Tab' }, enter()),
    T(establish, 80, 560, 1500, 140, { size: 44, color: '#c9d1e8', name: 'What this tab does' }, enter()),
    ...(caveat ? [T(caveat, 80, 860, 1500, 110, { size: 26, color: '#e6c27a', name: 'Caveat' }, fadeIn())] : []),
  ], { bg: C.ink, notes: `${establish}${caveat ? `\n${caveat}` : ''}` });
}
/* Boxes joined by arrows, a link at a time. */
function chain(links, x, y, { h = 84, size = 34, gap = 64, fill = C.card, stroke = C.A, widths, build = 'click', joinFirst = false } = {}) {
  const out = [];
  links.forEach((t, i) => {
    const w = widths ? widths[i] : Math.round(t.length * size * 0.56 + 64);
    // One click brings the whole link in: its arrow first opens the step, the box and words join it.
    const first = build === 'click' && !(joinFirst && i === 0) ? onClick() : after(), rest = after();
    if (i) out.push(T('→', x - gap + 8, y + h / 2 - size * 0.75, gap - 16, size * 1.5, { size: size * 1.1, weight: '700', align: 'center', color: C.muted, name: 'Arrow' }, first));
    out.push(R(x, y, w, h, { radius: 18, fill, stroke, strokeWidth: 3, name: `Link ${t.slice(0, 20)}` }, i ? rest : first));
    const anim = rest;
    out.push(T(t, x + 18, y + (h - size * 1.3 * Math.ceil((t.length * size * 0.56) / (w - 36))) / 2, w - 36, h - 16, { size, weight: '700', align: 'center', name: `Link text ${t.slice(0, 20)}` }, anim));
    x += w + gap;
  });
  return out;
}
/* The element dots the app shows above an answer: filled for each useful element. */
function elementDots(n, of, x, y, color = C.U) {
  const out = [];
  for (let i = 0; i < of; i++) out.push(dot(x + i * 40, y, 30, i < n ? color : '#ffffff', '', fadeIn({ delay: 0.2 + i * 0.05 }), { stroke: color, strokeWidth: 3 }));
  out.push(T(`${n} of ${of} elements`, x + of * 40 + 16, y - 6, 400, 44, { size: 30, weight: '800', name: 'Element count' }, fadeIn()));
  out.push(T('a planning count, not marks', x + of * 40 + 316, y - 2, 500, 40, { size: 24, color: C.muted, name: 'Count note' }, fadeIn()));
  return out;
}
/* The three answers' switcher, as the app draws it, with one of them on. */
function answerTabs(on, y = 230) {
  const names = ['Student A', 'Student B', 'Student C: the worked example'];
  let x = 80; const out = [];
  names.forEach((n, i) => {
    const w = Math.round(n.length * 15 + 60), lit = i === on;
    out.push(R(x, y, w, 60, { radius: 14, fill: lit ? C.ink : '#ffffff', stroke: C.line, strokeWidth: 2, name: `Answer tab ${n}` }, still));
    out.push(T(n, x, y + 12, w, 36, { size: 26, weight: '700', align: 'center', color: lit ? '#ffffff' : C.ink, name: `Answer tab label ${n}` }, still));
    x += w + 12;
  });
  return out;
}

