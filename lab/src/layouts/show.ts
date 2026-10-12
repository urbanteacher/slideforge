// Show and explore: Explore, a framed picture, chart callouts, a clip, an experiment, a motion scene, the game
// clock and a timed task, a simulation, before / after and the gallery.
import { createLayer, createSlide, type Box, type Layer, type Slide } from '../core';
import { CONTENT_FOOT, CONTENT_TOP, after, body, heading, inset, rise, shape, slide, text, titleBar, titleRow } from './blocks';
import { cell, type LayoutStyle } from './style';
import { bulletsSlide } from './system';

/** One picture explored point by point: numbered spots on it, and what each is, in a key beside it. */
/**
 * SlideForge's Explore (src/render/explore.js): the whole picture with numbered hotspots, a caption
 * under it, and Next going through the details in order. Each click zooms the picture to the next
 * detail, eased over .45s as SlideForge does, then marks that hotspot and shows its title and note.
 * The last click returns to the whole picture. One step at a time: each replaces the last.
 * `aspect` is the picture's width over height, so the frame fits it and a spot's % lands on the picture.
 */
export function exploreSlide(st: LayoutStyle, title: string, src: string, spots: { x: number; y: number; zoom?: number; title: string; body?: string }[], aspect = 16 / 9): Slide {
  const full = cell(1, 5, 12, 1), capH = 200, gap = 28;
  const maxH = CONTENT_FOOT - CONTENT_TOP - capH - gap;
  let w = full.w, h = w / aspect;
  if (h > maxH) { h = maxH; w = h * aspect; }
  const scene: Box = { x: full.x + (full.w - w) / 2, y: CONTENT_TOP, w, h, rot: 0 };
  const cap: Box = { x: scene.x, y: scene.y + h + gap, w: Math.max(w, 900), h: capH, rot: 0 };
  const list = spots.slice(0, 8);
  // Views as the picture motion resolves them: the centre kept where the frame stays filled.
  type View = [number, number, number];
  const keep = (c: number, z: number) => Math.max(0.5 / z, Math.min(1 - 0.5 / z, c));
  const whole: View = [0.5, 0.5, 1];
  const views: View[] = list.map((p) => { const z = Math.max(1, Math.min(4, p.zoom ?? 2)); return [keep(p.x / 100, z), keep(p.y / 100, z), z]; });
  const set = 'explore', dot = 64;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const stepOf = (items: Layer[], i: number, click: boolean) => items.forEach((l, j) => {
    l.anim = { ...l.anim, trigger: click && j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'swap' } };
  });
  // The hotspots where a view puts them, the live one filled; those zoomed out of the frame are left off.
  const markers = (v: View, live: number, delay: number) => list.flatMap((p, j) => {
    const sx = (p.x / 100 - v[0]) * v[2] + 0.5, sy = (p.y / 100 - v[1]) * v[2] + 0.5;
    if (sx < 0.03 || sx > 0.97 || sy < 0.05 || sy > 0.95) return [];
    const x = scene.x + sx * w - dot / 2, y = scene.y + sy * h - dot / 2, on = j === live;
    return [
      shape('Hotspot', { x, y, w: dot, h: dot, rot: 0 }, { shape: 'ellipse', fill: on ? st.accent : st.ground, stroke: st.accent, strokeWidth: 5, label: String(j + 1), labelColor: on ? st.ground : st.ink, labelSize: 34, labelFont: st.body, labelWeight: '700' }, after(delay)),
    ];
  });
  const caption = (head: string, note: string) => [
    text('Caption title', head, { ...cap, h: 60 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'shrink' }, after(0.2)),
    body(st, note, { ...cap, y: cap.y + 72, h: cap.h - 72 }, 36, { color: st.muted, fit: 'shrink' }, 0.3),
  ];
  const pic = (v: View, from: View, delay: number) => createLayer('image', {
    name: 'Picture', box: scene,
    params: { src, fit: 'contain', motion: 'detail', focus: [v[0], v[1]], zoom: v[2], fromFocus: [from[0], from[1]], fromZoom: from[2] },
    anim: { type: 'fade', duration: delay, delay: 0 },
  });
  // The whole picture, before the first click.
  const intro = [pic(whole, whole, 0.9), ...markers(whole, -1, 0.5), ...caption('Explore the image', list.length ? 'Click to go through each numbered detail in order.' : 'Add details to explore.')];
  stepOf(intro, 0, false);
  layers.push(...intro);
  // A click per detail, then one back to the whole picture.
  [...views, whole].forEach((v, k) => {
    const from = k ? views[k - 1] : whole, spot = list[k];
    const items = [pic(v, from, 0.25), ...markers(v, spot ? k : -1, 0.45),
      ...(spot ? caption(`${k + 1}  ${spot.title}`, spot.body ?? '') : caption('The whole image', 'Every detail, back in its place.'))];
    stepOf(items, k + 1, true);
    layers.push(...items);
  });
  const s = slide(st, 'Explore', layers);
  s.recipe = { kind: 'explore', args: { title, src, spots, aspect } };
  return s;
}

/**
 * SlideForge's framed picture (layoutImage with design.imageFrame): the picture at a fixed ratio,
 * centred, its caption clear beneath — plain, or on an accent band the picture's width ("bar").
 * With `facts`, SlideForge's Flip to facts: a ⇄ in the picture's corner turns the slide over to the
 * facts, the picture faint behind them; pressed again, it turns back. Turning over is not a build step.
 */
export function framedPictureSlide(st: LayoutStyle, caption: string, credit: string, src: string, frame = '4:3', cap: 'bar' | 'plain' | 'none' = 'bar', facts = ''): Slide {
  const [fw, fh] = frame.split(':').map(Number), ratio = fw > 0 && fh > 0 ? fw / fh : 4 / 3;
  const padT = 84, padB = 72, padX = 138, gap = 39;
  // No caption (SlideForge's capStyle 'none'): the picture is the whole slide, as the deck drew it.
  const bare = cap === 'none';
  const capH = bare ? 0 : (cap === 'bar' ? 54 : 0) + 62 + (credit ? 50 : 0);
  let h = 1080 - padT - padB - gap - capH, w = h * ratio;
  if (w > 1920 - padX * 2) { w = 1920 - padX * 2; h = w / ratio; }
  const top = padT + (1080 - padT - padB - (h + gap + capH)) / 2;
  const pic: Box = bare ? { x: 0, y: 0, w: 1920, h: 1080, rot: 0 } : { x: (1920 - w) / 2, y: top, w, h, rot: 0 };
  if (bare) { w = 1920; h = 1080; }
  const band: Box = { x: pic.x, y: top + h + gap, w, h: capH, rot: 0 };
  const onBand = cap === 'bar';
  const layers: Layer[] = [
    createLayer('image', { name: 'Picture', box: pic, params: { src, fit: 'cover', radius: 3 }, anim: { type: 'fade', duration: 0.9 } }),
  ];
  if (onBand) layers.push(createLayer('shape', { name: 'Caption band', box: band, params: { shape: 'rect', radius: 0, fill: st.accent, strokeWidth: 0 }, anim: after(0.3) }));
  const inner = onBand ? inset(band, 45, 27) : band;
  if (!bare) layers.push(text('Caption', caption, { ...inner, h: 62 }, { font: st.body, weight: '650', size: 51, color: onBand ? '#ffffff' : st.ink, align: 'center', lineHeight: 1.15 }, after(0.4)));
  if (credit && !bare) layers.push(text('Caption credit', credit, { ...inner, y: inner.y + 70, h: 44 }, { font: st.body, weight: '400', size: 36, color: onBand ? 'rgba(255,255,255,0.85)' : st.muted, align: 'center' }, after(0.5)));
  if (facts.trim()) {
    const lines = facts.split('\n').map((l) => l.trim()).filter(Boolean);
    const back = (l: Layer) => { l.face = 'back'; l.anim = { ...l.anim, type: 'none' }; return l; };
    // The back: the slide's own ground over the picture, the heading, then the facts a paragraph each.
    const scrim = back(createLayer('shape', { name: 'Facts ground', box: { x: 0, y: 0, w: 1920, h: 1080, rot: 0 }, params: { shape: 'rect', radius: 0, fill: st.ground, strokeWidth: 0 } }));
    scrim.opacity = 0.94;
    layers.push(
      scrim,
      // Clear of the ⇄, which keeps its corner on both faces.
      back(heading(st, caption || 'Behind the image', { x: 150, y: (bare ? 84 : pic.y) + 140, w: 1620, h: 100, rot: 0 }, 66, { fit: 'shrink' })),
      back(text('Facts', lines.join('\n\n'), { x: 150, y: (bare ? 84 : pic.y) + 280, w: 1350, h: 1080 - ((bare ? 84 : pic.y) + 280) - 130, rot: 0 }, { font: st.body, weight: '400', size: 42, color: st.ink, lineHeight: 1.45, fit: 'shrink' })),
    );
    // The toggle, just outside the picture's top right corner: clear of the picture on the front and
    // of the heading and facts on the back. Quiet on the front, lit in the accent on the back.
    // On a bare, full-slide picture there is no outside: the toggle takes the top right corner.
    const at: Box = bare ? { x: 1920 - 72 - 30, y: 30, w: 72, h: 72, rot: 0 } : { x: pic.x + w + 24, y: pic.y, w: 72, h: 72, rot: 0 };
    const toggle = (lit: boolean) => {
      const disc = createLayer('shape', { name: lit ? 'Back to image' : 'Flip to facts', box: at, params: { shape: 'rect', radius: 14, fill: lit ? st.accent : st.ground, fillOpacity: lit ? 1 : 0.82, stroke: lit ? st.accent : st.ink, strokeOpacity: lit ? 1 : 0.22, strokeWidth: 2, label: '\u21c4', labelColor: lit ? '#ffffff' : st.ink, labelSize: 36, labelFont: st.body, labelWeight: '600' }, anim: after(0.6) });
      disc.interact = { ...disc.interact, click: 'flip' };
      if (lit) back(disc);
      return [disc];
    };
    layers.push(...toggle(false), ...toggle(true));
  }
  const s = slide(st, facts.trim() ? 'Flip to facts' : 'Framed picture', layers);
  s.recipe = { kind: 'flip', args: { caption, credit, src, frame, cap, facts } };
  return s;
}

/**
 * SlideForge's chart callouts: the chart draws itself, then each Next zooms to a named category with
 * its note beneath — the axis label still in frame — and the last brings the whole chart back.
 * `data` is the lab's "label, value" lines; a callout names a category, not a position.
 */
export function chartCalloutSlide(st: LayoutStyle, title: string, data: string, source: string, callouts: { label: string; note: string }[]): Slide {
  const labels = data.split('\n').filter((l) => l.trim()).map((l) => l.split(',')[0].trim());
  const capH = 150, box: Box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP - capH - 20 };
  const cap: Box = { ...box, y: box.y + box.h + 20, h: capH };
  const params = { chart: 'column', data, color: st.accent, color2: st.muted, textColor: st.ink, font: st.body, size: 36, values: true, grid: true };
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const set = 'callouts';
  const item = (i: number, focus: [number, number], zoom: number, from: [number, number], fromZoom: number, head: string, note: string, first: boolean) => {
    const chart = createLayer('chart', { name: 'Chart', box, params: { ...params, motion: 'detail', focus, zoom, fromFocus: from, fromZoom }, anim: first ? { type: 'draw', duration: 0.9, stagger: 0.18, delay: 0.3, easing: 'cubicOut' } : { type: 'fade', duration: 0.25 } });
    const h = text('Callout', head, { ...cap, h: 56 }, { font: st.body, weight: '700', size: 44, color: st.ink }, after(first ? 1.2 : 0.3));
    const n = body(st, note, { ...cap, y: cap.y + 64, h: cap.h - 64 }, 36, { color: st.muted, fit: 'shrink' }, first ? 1.3 : 0.4);
    [chart, h, n].forEach((l, j) => { l.anim = { ...l.anim, trigger: !first && j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'swap' } }; });
    return [chart, h, n];
  };
  const whole: [number, number] = [0.5, 0.5];
  const at = (label: string): [number, number] => { const i = Math.max(0, labels.indexOf(label)); return [(i + 0.5) / Math.max(1, labels.length), 0.55]; };
  layers.push(...item(0, whole, 1, whole, 1, source ? 'The whole series' : '', source, true));
  let prev = whole, prevZoom = 1;
  callouts.forEach((c, i) => { const f = at(c.label); layers.push(...item(i + 1, f, 2.2, prev, prevZoom, c.label, c.note, false)); prev = f; prevZoom = 2.2; });
  layers.push(...item(callouts.length + 1, whole, 1, prev, prevZoom, 'The whole series', source, false));
  const s = slide(st, 'Chart callouts', layers);
  s.recipe = { kind: 'callouts', args: { title, data, source, callouts } };
  return s;
}

/** A YouTube or Vimeo link, understood: a Video layer holding the link, so the canvas shows the
 *  clip's own still and Preview frames the real player; the caption beneath it. */
export function youtubeSlide(st: LayoutStyle, title: string, subtitle: string, url: string): Slide {
  const capH = 150, h = CONTENT_FOOT - CONTENT_TOP - capH - 30, w = (h * 16) / 9;
  const box: Box = { x: (1920 - w) / 2, y: CONTENT_TOP - 40, w, h, rot: 0 };
  return slide(st, 'Video link', [
    createLayer('video', { name: 'Video', box, params: { src: url, fit: 'cover', radius: 18, muted: true }, anim: after(0.2) }),
    text('Caption', title, { ...cell(1, 5, 12, 1), y: box.y + h + 30, h: 60 }, { font: st.body, weight: '700', size: 48, color: st.ink, align: 'center' }, after(0.5)),
    body(st, subtitle, { ...cell(1, 5, 12, 1), y: box.y + h + 96, h: 50 }, 36, { color: st.muted, align: 'center', fit: 'shrink' }, 0.6),
  ]);
}

/**
 * SlideForge's visual experiment slide: the title, the prediction prompt, the experiment — which asks
 * for a prediction, then moves through its states a Next at a time — and the data's source.
 */
export function experimentSlide(st: LayoutStyle, title: string, prompt: string, e: { preset: string; data: string; states?: string; duration?: number; layout?: 'focus' }, source: string): Slide {
  const focused = e.layout === 'focus', top = CONTENT_TOP + (focused ? -50 : 30);
  return slide(st, 'Predict and compare', [
    titleRow(st, title),
    titleBar(st),
    ...(focused ? [] : [body(st, prompt, { ...cell(1, 5, 12, 1), y: CONTENT_TOP - 50, h: 60 }, 40, { color: st.muted, fit: 'shrink' }, 0.2)]),
    // The chart on the left, the steps and what each shows on the right, the source at the rail's foot.
    createLayer('experiment', { name: 'Predict and compare', box: { ...cell(1, 5, 12, 1), y: top, h: CONTENT_FOOT - top }, params: {
      preset: e.preset, data: e.data, states: e.states ?? '', duration: String(e.duration ?? 1600), font: st.body, size: 36, textColor: st.ink, accent: st.accent,
      source: source || 'Illustrative teaching data', layout: e.layout ?? 'rail', prompt,
    }, anim: { type: 'fade', duration: 0.6, delay: 0.3 } }),
  ]);
}

/**
 * SlideForge's motion specimen: the look's ground, the behaviour's name in small capitals over the
 * title, and the stage — driven by Next, and in Preview by dragging or pressing it.
 */
export function sceneSlide(o: { mode: string; look: string; title: string; subtitle?: string; items: string[]; image?: string; factor?: number }, looks: Record<string, { bg: string; ink: string; accent: string; serif?: boolean; mono?: boolean }>, names: Record<string, string>): Slide {
  const lk = looks[o.look] ?? looks.editorial;
  const face = lk.serif ? 'Georgia' : lk.mono ? 'JetBrains Mono' : 'Avenir Next';
  const layers: Layer[] = [
    text('Kicker', (names[o.mode] ?? o.mode).toUpperCase(), { x: 84, y: 60, w: 1752, h: 40, rot: 0 }, { font: 'Avenir Next', weight: '600', size: 28, tracking: 0.2, color: lk.accent }, after(0.1)),
    text('Heading', o.title, { x: 84, y: 106, w: 1752, h: 84, rot: 0 }, { font: face, weight: lk.serif ? '400' : '700', size: 64, color: lk.ink, lineHeight: 1.1, fit: 'shrink' }, rise),
    createLayer('scene', { name: 'Motion experiment', box: { x: 84, y: 214, w: 1752, h: 806, rot: 0 }, params: {
      mode: o.mode, look: o.look, items: o.items.join('\n'), image: o.image ?? '', factor: o.factor ?? 2, subtitle: o.subtitle ?? '', font: 'Avenir Next', size: 36,
    }, anim: { type: 'fade', duration: 0.6, delay: 0.2 } }),
  ];
  return createSlide(names[o.mode] ?? 'Motion experiment', [createLayer('solid', { name: 'Ground', params: { color: lk.bg } }), ...layers], lk.bg, { type: 'fade', duration: 0.7 });
}

/** SlideForge's game clock in the top right corner, where its quiz and activity slides keep it —
 *  here level with the heading: centred on the heading's row, its right edge on the right margin
 *  where the heading ends, and large enough to read from the back. */
export const CLOCK_SIZE = 195;
export function clockBox(heading?: Box): Box {
  const row = heading ?? { ...cell(1, 1, 12, 2) };
  return { x: row.x + row.w - CLOCK_SIZE, y: row.y + row.h / 2 - CLOCK_SIZE / 2, w: CLOCK_SIZE, h: CLOCK_SIZE, rot: 0 };
}
export function gameClock(st: Pick<LayoutStyle, 'ink' | 'accent' | 'body'>, minutes = 5, heading?: Box): Layer {
  return createLayer('timer', { name: 'Timer', box: clockBox(heading), params: {
    minutes, style: 'game', label: '', done: '', font: st.body, size: 96, textColor: st.ink, accent: st.accent, track: rgbaOf(st.ink, 0.18),
  }, anim: { type: 'fade', duration: 0.5 } });
}
const rgbaOf = (hex: string, a: number) => { const n = parseInt(hex.replace('#', '').slice(0, 6), 16); return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex; };

/** A timed task: the title kept clear of the clock, the steps under it, and the game clock counting
 *  down in the top right from the moment the slide comes up. */
export function timedSlide(st: LayoutStyle, title: string, points: string[], minutes = 5): Slide {
  const s = bulletsSlide(st, title, points);
  const t = s.layers.find((l) => l.name === 'Heading');
  const row = t?.box ? { ...t.box } : undefined;
  if (t?.box) t.box = { ...t.box, w: t.box.w - CLOCK_SIZE - 48 };
  s.layers.push(gameClock(st, minutes, row));
  s.name = 'Timed task';
  return s;
}

/**
 * SlideForge's Simulation: a model drawn as its curve, the input on a slider under it. In Preview the
 * room drags the input and the output redraws — for when the relationship is the lesson and a static
 * chart would show only one point on it.
 */
export function simulationSlide(st: LayoutStyle, title: string, m: { model?: string; a?: number; b?: number; min?: number; max?: number; initial?: number; inputLabel?: string; outputLabel?: string }): Slide {
  const lo = Number(m.min ?? 0), hi = Math.max(lo + 1, Number(m.max ?? 10));
  return slide(st, 'Simulation', [
    titleRow(st, title),
    titleBar(st),
    createLayer('model', { name: 'Simulation', box: { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP }, params: {
      model: m.model === 'quadratic' ? 'quadratic' : 'linear', a: Number(m.a ?? 2), b: Number(m.b ?? 0), min: lo, max: hi,
      initial: Math.max(lo, Math.min(hi, Number(m.initial ?? lo + (hi - lo) / 2))), inputLabel: m.inputLabel ?? 'Input', outputLabel: m.outputLabel ?? 'Output',
      font: st.body, size: 36, accent: st.accent, textColor: st.ink,
    }, anim: after(0.2) }),
  ]);
}

/**
 * SlideForge's Before / after: two registered pictures in one frame, a handle wiping the after over
 * the before. In Preview the handle is dragged, or a press sends it there; it rests half way.
 * Only worth it when the two share their framing and scale, so the wipe compares like with like.
 */
export function beforeAfterSlide(st: LayoutStyle, title: string, before: string, after2: string, labels: [string, string], aspect = 0): Slide {
  // The frame takes the pictures' shape, so the labels sit on their corners and the handle spans them.
  const full: Box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
  let w = full.w, h = full.h;
  if (aspect > 0) { if (w / h > aspect) w = h * aspect; else h = w / aspect; }
  const box: Box = { x: full.x + (full.w - w) / 2, y: full.y + (full.h - h) / 2, w, h, rot: 0 };
  return slide(st, 'Before and after', [
    titleRow(st, title),
    titleBar(st),
    createLayer('wipe', { name: 'Before / after', box, params: { before, after: after2, beforeLabel: labels[0], afterLabel: labels[1], position: 50, fit: 'contain', font: st.body, size: 36, accent: st.accent, textColor: '#ffffff' }, anim: { type: 'fade', duration: 0.8, delay: 0.2 } }),
  ]);
}

/**
 * SlideForge's Gallery, an image stack (layoutGallery): each click lays the next picture in front of
 * the last with its own caption and source, the earlier ones stepping back at the edges — the pile
 * growing is the point. Framed at a ratio with the caption beneath (plain, or on an accent band).
 * With no pictures it offers slots to drop them on.
 */
export function gallerySlide(st: LayoutStyle, title: string, figs: (string | { src: string; caption?: string; source?: string })[], frame = '4:3', cap: 'bar' | 'plain' = 'bar', fit: 'contain' | 'cover' = 'contain'): Slide {
  const list = figs.slice(0, 8).map((f) => (typeof f === 'string' ? { src: '', caption: f, source: '' } : f));
  const [fw, fh] = frame.split(':').map(Number), ratio = fw > 0 && fh > 0 ? fw / fh : 4 / 3;
  // The picture takes the full content height, stepped in from the left so the pile has room to
  // fall back into; its caption sits on a card beside it, level with its foot.
  const room = Math.min(3, Math.max(0, list.length - 1)) * 40;
  const left = cell(1, 5, 12, 1).x + room, areaTop = CONTENT_TOP, areaH = CONTENT_FOOT - areaTop;
  let h = areaH, w = h * ratio;
  const maxW = 1920 - left - 78 - 560;
  if (w > maxW) { w = maxW; h = w / ratio; }
  const pic: Box = { x: left, y: areaTop + (areaH - h) / 2, w, h, rot: 0 };
  const onBand = cap === 'bar', anySource = list.some((f) => f.source);
  const capX = pic.x + w + 48, capW = 1920 - 78 - capX;
  const capH = (onBand ? 60 : 0) + 132 + (anySource ? 58 : 0);
  const band: Box = { x: capX, y: pic.y + h - capH, w: capW, h: capH, rot: 0 };
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  list.forEach((f, i) => {
    const inner = onBand ? inset(band, 36, 30) : band;
    const item: [Layer, boolean][] = [
      [shape('Sheet', pic, { shape: 'rect', radius: 4, fill: st.panel, stroke: st.ink, strokeOpacity: 0.18, strokeWidth: 2 }, {}), false],
      [createLayer('image', { name: f.src ? 'Picture' : 'Picture — drop one here', box: pic, params: { src: f.src, fit, radius: 3 }, anim: {} }), false],
    ];
    if (onBand) item.push([shape('Caption band', band, { shape: 'rect', radius: 4, fill: st.accent, strokeWidth: 0 }, {}), true]);
    if (f.caption) item.push([text('Caption', f.caption, { ...inner, h: 124 }, { font: st.body, weight: '650', size: 48, color: onBand ? '#ffffff' : st.ink, lineHeight: 1.22, fit: 'shrink', fitGroup: 'gallery-captions' }, {}), true]);
    if (f.source) item.push([text('Source', f.source.toUpperCase(), { ...inner, y: inner.y + 138, h: 44 }, { font: st.body, weight: '500', size: 36, tracking: 0.06, color: onBand ? 'rgba(255,255,255,0.85)' : st.muted }, {}), true]);
    // The first is down with the slide; each after it arrives on a click, rising into place.
    item.forEach(([l, caption], j) => {
      l.anim = { ...l.anim, type: i ? 'rise' : 'fade', duration: 0.5, delay: 0, easing: 'cubicOut', trigger: i && j === 0 ? 'onClick' : 'withSlide', step: { set: 'gallery', i, mode: 'pile', ...(caption ? { caption: true } : {}) } };
    });
    layers.push(...item.map(([l]) => l));
  });
  const s = slide(st, 'Gallery', layers);
  s.recipe = { kind: 'gallery', args: { title, figs: list, frame, cap, fit } };
  return s;
}
