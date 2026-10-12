// The richer layouts: introduction, timeline, funnel, mind map, org chart, columns, rail, the editorial
// title and section slides, quote, closer and code.
import { createLayer, type Layer, type Slide } from '../core';
import { CONTENT_FOOT, CONTENT_TOP, after, bar, body, heading, picture, rise, rule, shape, slide, text, titleBar, titleRow, type Pair, type Triple } from './blocks';
import { GRID, cell, type LayoutStyle } from './style';

// ─── Builders: the richer layouts (timeline, funnel, mind map, people…) ─────
/** Who is at the front: a portrait on the left, the name large, the role and a short paragraph. */
export function introductionSlide(st: LayoutStyle, name: string, role: string, bio: string): Slide {
  return slide(st, 'Introduction', [
    picture({ ...cell(1, 1, 4, 16), y: GRID.top - 24, h: CONTENT_FOOT - GRID.top + 24 }, 'Portrait — drop a photo here'),
    heading(st, name, cell(6, 3, 7, 3), 110),
    text('Role', role, cell(6, 6, 7, 1), { font: st.body, weight: '600', size: 44, color: st.accent, fit: 'fill' }, after(0.2)),
    titleBar(st),
    body(st, bio, { ...cell(6, 8, 7, 1), h: CONTENT_FOOT - (GRID.top + 7 * GRID.stepY) }, 48, { color: st.ink }, 0.3),
  ].map((l) => (l.name === 'Accent bar' ? { ...l, box: { ...l.box!, x: cell(6, 1, 1, 1).x, y: GRID.top + 6 * GRID.stepY + 12 } } : l)));
}

/** Dated events along a rail: the date above each stop, the event and a line of detail below. Up to eight. */
export function timelineSlide(st: LayoutStyle, title: string, subtitle: string, events: Triple[]): Slide {
  const n = Math.max(2, Math.min(8, events.length));
  const left = GRID.left, right = 1920 - GRID.left, gap = (right - left) / n;
  const rail = CONTENT_TOP + 150, dot = 34;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  layers.push(shape('Rail', { x: left, y: rail - 2, w: right - left, h: 4, rot: 0 }, { shape: 'rect', fill: st.muted }, { type: 'wipeRight', duration: 1 }));
  events.slice(0, 8).forEach(([date, what, detail], i) => {
    const x = left + i * gap, w = gap - 36, a = after(0.2 + i * 0.1);
    layers.push(
      text('Date', date, { x, y: rail - 120, w, h: 90, rot: 0 }, { font: st.display, weight: '700', size: 64, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'dates' }, a),
      shape('Stop', { x, y: rail - dot / 2, w: dot, h: dot, rot: 0 }, { shape: 'ellipse', fill: st.accent }, a),
      text('Event', what, { x, y: rail + 40, w, h: 70, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'events' }, a),
      body(st, detail, { x, y: rail + 120, w, h: CONTENT_FOOT - rail - 120, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'event-notes' }, 0.3 + i * 0.1),
    );
  });
  return slide(st, 'Timeline', layers);
}

/** Stages that narrow. With numbers the bands follow them, so a cliff draws as a cliff; without,
 *  they narrow evenly. The stage and a note sit beside each band. */
export function funnelSlide(st: LayoutStyle, title: string, subtitle: string, stages: Triple[]): Slide {
  const shown = stages.slice(0, 6);
  const nums = shown.map(([, v]) => parseFloat(String(v).replace(/[^0-9.]/g, '')));
  const numeric = nums.every((v) => Number.isFinite(v) && v > 0);
  const max = numeric ? Math.max(...nums) : 1;
  const top = CONTENT_TOP + (subtitle ? 30 : 0), each = (CONTENT_FOOT - top) / shown.length;
  const bandMax = 900, cx = GRID.left + bandMax / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  if (subtitle) layers.push(body(st, subtitle, { ...cell(1, 3, 12, 1), y: GRID.top + 2 * GRID.stepY + 34 }, 40));
  shown.forEach(([stage, value, note], i) => {
    // Widths follow the values on a square-root scale, so a band of 1 is still visible beside 1,200.
    const k = numeric ? Math.max(0.16, Math.sqrt(nums[i] / max)) : 1 - (i / shown.length) * 0.75;
    const w = bandMax * k, y = top + i * each, h = each - 16, a = after(0.2 + i * 0.12);
    layers.push(
      shape('Band', { x: cx - w / 2, y, w, h, rot: 0 }, { shape: 'rect', radius: 10, fill: st.accent, fillOpacity: 1 - i * (0.55 / shown.length) }, a),
      text('Value', value, { x: cx - w / 2, y: y + h * 0.18, w, h: h * 0.64, rot: 0 }, { font: st.display, weight: '700', size: 56, color: st.ground, align: 'center', lineHeight: 1, fit: 'fill', fitGroup: 'values' }, a),
      text('Stage', stage, { x: GRID.left + bandMax + 60, y: y + 6, w: 1920 - GRID.left * 2 - bandMax - 60, h: h * 0.5, rot: 0 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'fill', fitGroup: 'stages' }, a),
      body(st, note, { x: GRID.left + bandMax + 60, y: y + h * 0.5 + 6, w: 1920 - GRID.left * 2 - bandMax - 60, h: h * 0.5 - 6, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'stage-notes' }, 0.3 + i * 0.12),
    );
  });
  return slide(st, 'Funnel', layers);
}

/**
 * Siblings with no order around the idea they belong to — SlideForge's mind map: the idea in an
 * outlined oval in the middle, the branches in outlined cards alternating left and right, each joined
 * to the oval by a curve that leaves and arrives level. The branches arrive one per click, the earlier
 * ones dimming, so the room follows the one being talked about.
 */
export function mindmapSlide(st: LayoutStyle, title: string, items: Pair[]): Slide {
  const shown = items.slice(0, 8), n = shown.length, rows = Math.max(1, Math.ceil(n / 2));
  const L = GRID.left, W = 1920 - GRID.left * 2, top = GRID.top, H = CONTENT_FOOT - GRID.top;
  const cx = 960, cy = top + H / 2;
  const hubW = W * 0.27, hubH = Math.max(255, Math.min(320, H * 0.34));
  const nodeW = W * 0.29, nodeH = Math.min(230, H / rows - 36);
  const set = 'mind-' + Math.random().toString(36).slice(2, 9);
  const layers: Layer[] = [
    shape('Centre', { x: cx - hubW / 2, y: cy - hubH / 2, w: hubW, h: hubH, rot: 0 }, { shape: 'ellipse', fill: st.ground, stroke: st.accent, strokeWidth: 6 }, { type: 'zoomIn', duration: 0.7, easing: 'cubicOut' }),
    text('Heading', title, { x: cx - hubW / 2 + hubW * 0.14, y: cy - hubH * 0.3, w: hubW * 0.72, h: hubH * 0.6, rot: 0 }, { font: st.display, weight: st.displayWeight, size: 54, color: st.ink, align: 'center', lineHeight: 1.12, fit: 'fill' }, rise),
  ];
  shown.forEach(([head, words], i) => {
    const left = i % 2 === 0, y = top + (Math.floor(i / 2) + 0.5) * (H / rows);
    const nx = L + (left ? 0.17 : 0.83) * W, bx = nx - nodeW / 2, by = y - nodeH / 2;
    // The curve runs from the card's inner edge to the tip of the oval on the same side.
    const x1 = left ? bx + nodeW : cx + hubW / 2, x2 = left ? cx - hubW / 2 : bx;
    const y1 = left ? y : cy, y2 = left ? cy : y;
    const flat = Math.abs(y1 - y2) < 2;
    const curve = shape('Branch line', { x: x1, y: Math.min(y1, y2) - (flat ? 3 : 0), w: x2 - x1, h: flat ? 6 : Math.abs(y2 - y1), rot: 0 },
      { shape: 'curve', rise: y1 < y2 ? 'down' : 'up', fill: st.accent, strokeWidth: 5 }, {});
    curve.opacity = 0.55;
    const card = shape('Node', { x: bx, y: by, w: nodeW, h: nodeH, rot: 0 }, { shape: 'rect', radius: 32, fill: st.ground, stroke: st.accent, strokeWidth: 3 }, {});
    const headH = Math.min(62, nodeH * 0.32);
    const term = text('Branch', head, { x: bx + 30, y: by + 24, w: nodeW - 60, h: headH, rot: 0 }, { font: st.body, weight: '700', size: 44, color: st.ink, fit: 'fill', fitGroup: 'branches' }, {});
    const detail = body(st, words, { x: bx + 30, y: by + 24 + headH + 10, w: nodeW - 60, h: nodeH - headH - 56, rot: 0 }, 36, { color: st.muted, fit: 'shrink', fitGroup: 'branch-words' }, 0);
    // One branch per click, its curve and card together; the ones before it dim.
    [curve, card, term, detail].forEach((l, j) => {
      l.anim = { ...l.anim, type: 'fade', duration: 0.6, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set, i, mode: 'dim' } };
    });
    layers.push(curve, card, term, detail);
  });
  return slide(st, 'Mind map', layers);
}

/**
 * A team, and who reports to whom — SlideForge's people layout. Each person is an outlined card with an
 * initials disc (a placeholder that says who is missing), their name and a dimmer role; each team sits
 * centred under its manager, joined by elbow connectors: a stem down, a rail across, a drop to each.
 * Reports-to is a name, so reordering lines cannot reassign anyone. With no reporting lines the people
 * are a row of equals with no connectors — a line between people who do not report to each other says
 * something untrue — and so is a cycle, which would otherwise leave nobody at the top.
 */
export function orgchartSlide(st: LayoutStyle, title: string, people: Triple[]): Slide {
  const names = new Set(people.map((p) => p[0]));
  const boss = (p: Triple) => (p[2] && p[2] !== p[0] && names.has(p[2]) ? p[2] : '');
  const kids = new Map<string, Triple[]>();
  for (const p of people) { const b = boss(p); if (b) (kids.get(b) ?? kids.set(b, []).get(b)!).push(p); }
  let roots = people.filter((p) => !boss(p));
  const flat = !roots.length || roots.length === people.length;
  if (!roots.length) roots = people;
  const depthOf = (p: Triple, d = 0): number => (flat || d > 6 ? 0 : Math.max(0, ...(kids.get(p[0]) ?? []).map((k) => 1 + depthOf(k, d + 1))));
  const levels = flat ? 1 : 1 + Math.max(...roots.map((r) => depthOf(r)));
  const leaves = (p: Triple, d = 0): number => (flat || d > 6 ? 1 : (kids.get(p[0]) ?? []).reduce((n, k) => n + leaves(k, d + 1), 0) || 1);
  const across = roots.reduce((n, r) => n + leaves(r), 0);
  const gapX = 40, avail = 1920 - GRID.left * 2;
  const cardW = Math.min(480, (avail - (across - 1) * gapX) / across);
  const top = CONTENT_TOP, H = CONTENT_FOOT - top;
  const cardH = Math.min(150, (H - (levels - 1) * 70) / levels), gapY = levels > 1 ? Math.min(110, (H - levels * cardH) / (levels - 1)) : 0;
  const blockH = levels * cardH + (levels - 1) * gapY, y0 = top + (H - blockH) / 2;
  const layers: Layer[] = [titleRow(st, title), titleBar(st)];
  const cards: Layer[] = [];
  const line = (x: number, y: number, w: number, h: number) => { const l = shape('Connector', { x, y, w: Math.max(3, w), h: Math.max(3, h), rot: 0 }, { shape: 'rect', fill: st.ink }, after(0.15)); l.opacity = 0.38; layers.push(l); };
  let order = 0;
  // Place a person over the span their team needs; return their centre x.
  const place = (p: Triple, left: number, depth: number, guard = 0): number => {
    const team = flat || guard > 6 ? [] : kids.get(p[0]) ?? [];
    const span = leaves(p) * cardW + (leaves(p) - 1) * gapX;
    let cx = left + span / 2;
    const y = y0 + depth * (cardH + gapY);
    if (team.length) {
      let x = left;
      const centres = team.map((k) => { const c = place(k, x, depth + 1, guard + 1); x += leaves(k) * (cardW + gapX); return c; });
      cx = (centres[0] + centres[centres.length - 1]) / 2;
      const railY = y + cardH + gapY / 2;
      line(cx - 1.5, y + cardH, 3, gapY / 2);
      if (centres.length > 1) line(centres[0], railY - 1.5, centres[centres.length - 1] - centres[0], 3);
      for (const c of centres) line(c - 1.5, railY, 3, gapY / 2);
    }
    const x = cx - cardW / 2, a = after(0.2 + order++ * 0.06);
    const disc = Math.min(cardH - 36, 84);
    const initials = p[0].split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    cards.push(
      shape('Person', { x, y, w: cardW, h: cardH, rot: 0 }, { shape: 'rect', radius: 20, fill: st.panel, stroke: st.ink, strokeWidth: 3 }, a),
      shape('Photo', { x: x + 18, y: y + (cardH - disc) / 2, w: disc, h: disc, rot: 0 }, { shape: 'ellipse', fill: st.ink }, a),
      text('Initials', initials, { x: x + 18 + disc * 0.14, y: y + (cardH - disc) / 2 + disc * 0.28, w: disc * 0.72, h: disc * 0.44, rot: 0 }, { font: st.body, weight: '800', size: Math.round(disc * 0.34), color: st.ground, align: 'center', lineHeight: 1, tracking: 0.02, fit: 'shrink' }, a),
      text('Name', p[0], { x: x + disc + 38, y: y + cardH * 0.16, w: cardW - disc - 56, h: cardH * 0.36, rot: 0 }, { font: st.body, weight: '700', size: 40, color: st.ink, fit: 'fill', fitGroup: 'names' }, a),
      text('Role', p[1], { x: x + disc + 38, y: y + cardH * 0.54, w: cardW - disc - 56, h: cardH * 0.3, rot: 0 }, { font: st.body, weight: '400', size: 36, color: st.muted, fit: 'fill', fitGroup: 'roles' }, a),
    );
    return cx;
  };
  const total = across * cardW + (across - 1) * gapX;
  let left = 960 - total / 2;
  for (const r of roots) { place(r, left, 0); left += leaves(r) * (cardW + gapX); }
  layers.push(...cards);
  return slide(st, 'People', layers);
}

/** Parallel ideas in columns, each numbered: for points that stand side by side, not in sequence. */
export function columnsSlide(st: LayoutStyle, title: string, points: string[]): Slide {
  const n = Math.max(2, Math.min(4, points.length)), span = 12 / n;
  return slide(st, 'Columns', [
    titleRow(st, title),
    titleBar(st),
    ...points.slice(0, 4).flatMap((pt, i) => {
      const b = { ...cell(1 + i * span, 5, span, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
      return [
        rule(st, { ...b, h: 4 }, st.accent, 4),
        text('Number', String(i + 1).padStart(2, '0'), { ...b, y: b.y + 30, h: 130 }, { font: st.display, weight: '700', size: 110, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'numbers' }, after(0.15 + i * 0.1)),
        body(st, pt, { ...b, y: b.y + 190, h: b.h - 190 }, 52, { color: st.ink, fitGroup: 'column-words' }, 0.25 + i * 0.1),
      ];
    }),
  ]);
}

/** A side heading: the claim held on the left, the points it rests on beside it. */
export function railSlide(st: LayoutStyle, title: string, points: string[], build?: 'on' | 'dim' | 'spot'): Slide {
  const shown = points.slice(0, 6);
  const top = GRID.top, foot = CONTENT_FOOT, each = (foot - top) / shown.length;
  const s = slide(st, 'Rail', [
    shape('Rail', { x: 0, y: 0, w: cell(1, 1, 5, 1).x + cell(1, 1, 5, 1).w + 40, h: 1080, rot: 0 }, { shape: 'rect', fill: st.panel }, { type: 'fade', duration: 0.6 }),
    heading(st, title, { ...cell(1, 4, 5, 1), h: 8 * GRID.stepY }, 100),
    bar(st, { x: GRID.left, y: GRID.top + 3 * GRID.stepY - 30, w: 132, h: 8, rot: 0 }),
    ...shown.flatMap((pt, i) => {
      const y = top + i * each;
      return [
        text('Number', String(i + 1), { ...cell(7, 1, 1, 1), y, h: each - 30 }, { font: st.display, weight: '700', size: 72, color: st.accent, lineHeight: 1, fit: 'fill', fitGroup: 'numbers' }, after(0.2 + i * 0.1)),
        body(st, pt, { ...cell(8, 1, 5, 1), y, h: each - 30 }, 52, { color: st.ink, fitGroup: 'rail-points' }, 0.25 + i * 0.1),
        rule(st, { ...cell(7, 1, 6, 1), y: y + each - 14 }, st.muted, 2),
      ];
    }),
  ]);
  // Built a point per press: its number, words and rule together; earlier points dim or spotlit.
  if (build) {
    const rows = s.layers.filter((l) => ['Number', 'Text', 'Rule'].includes(l.name) && l.box!.y >= top - 1);
    shown.forEach((_, i) => rows.slice(i * 3, i * 3 + 3).forEach((l, j) => {
      l.anim = { ...l.anim, type: 'fade', duration: 0.5, delay: 0, trigger: j === 0 ? 'onClick' : 'withSlide', step: { set: 'rail', i, mode: build } };
    }));
  }
  return s;
}

/** A cover with a side panel of the loud colour: the title on the working ground, a mark on the panel. */
export function sidecarTitleSlide(st: LayoutStyle, title: string, subtitle: string, mark?: string): Slide {
  const panelX = 1920 * 0.64;
  const layers: Layer[] = [
    shape('Side panel', { x: panelX, y: 0, w: 1920 - panelX, h: 1080, rot: 0 }, { shape: 'rect', fill: st.accent }, { type: 'slideLeft', duration: 1 }),
    bar(st, { ...cell(1, 3, 2, 1), h: 8 }),
    text('Hero', title, { ...cell(1, 4, 7, 1), h: 6 * GRID.stepY }, { font: st.hero ?? st.display, weight: st.displayWeight, size: 160, color: st.ink, lineHeight: 1.02, tracking: -0.01, fit: 'fill' }, rise),
    body(st, subtitle, cell(1, 11, 7, 2), 44),
  ];
  if (mark) layers.push(createLayer('image', { name: 'Mark', box: { x: panelX + 140, y: 360, w: 1920 - panelX - 280, h: 360, rot: 0 }, params: { src: mark, fit: 'contain', tone: 'dark' }, anim: { type: 'fade', duration: 1, delay: 0.4 } }));
  return slide(st, 'Title', layers);
}

/** Someone else's words, set large, with who said them. */
export function quoteSlide(st: LayoutStyle, quote: string, who: string): Slide {
  return slide(st, 'Quote', [
    text('Mark', '“', { ...cell(1, 1, 2, 4) }, { font: st.display, weight: '700', size: 260, color: st.accent, lineHeight: 1 }, { type: 'fade', duration: 0.6 }),
    heading(st, quote, { ...cell(2, 4, 10, 1), h: 7 * GRID.stepY }, 110),
    text('Attribution', '— ' + who, { ...cell(2, 12, 10, 1), h: 70 }, { font: st.body, weight: '600', size: 44, color: st.muted, fit: 'fill' }, after(0.4)),
  ]);
}

/** A section break with a rule across the top and the words low on the left. */
export function sectionEditorialSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    rule(st, { ...cell(1, 1, 12, 1), y: 150 }, st.accent, 4),
    heading(st, title, { ...cell(1, 5, 9, 1), h: 6 * GRID.stepY }, 150),
    body(st, subtitle, cell(1, 12, 9, 2), 48),
  ]);
}

/** A quieter section break: the words centred inside a fine inset frame. */
export function sectionFrameSlide(st: LayoutStyle, title: string, subtitle: string): Slide {
  return slide(st, 'Section', [
    shape('Frame', { x: 94, y: 94, w: 1732, h: 892, rot: 0 }, { shape: 'rect', fill: st.ink, fillOpacity: 0, stroke: st.ink, strokeOpacity: 0.16, strokeWidth: 3 }, { type: 'fade', duration: 0.8 }),
    heading(st, title, { ...cell(2, 4, 10, 1), h: 6 * GRID.stepY }, 140, { align: 'center' }),
    body(st, subtitle, cell(3, 11, 8, 2), 48, { align: 'center' }),
  ]);
}

/** A closing illustration: the line set large on the working ground, the artwork along the foot. */
export function closerSlide(st: LayoutStyle, title: string, credit: string, art: string, artAspect: number): Slide {
  const h = Math.min(640, 1920 / artAspect);
  return slide(st, 'Closer', [
    createLayer('image', { name: 'Artwork', box: { x: 0, y: 1080 - h, w: 1920, h, rot: 0 }, params: { src: art, fit: 'contain' }, anim: { type: 'rise', duration: 1.2 } }),
    heading(st, title, { ...cell(1, 1, 10, 1), h: 4 * GRID.stepY }, 120),
    text('Credit', credit, { ...cell(1, 5, 10, 1), h: 54 }, { font: st.body, weight: '600', size: 40, color: st.accent, fit: 'fill' }, after(0.4)),
  ]);
}

/** Code on a dark panel in a monospaced face — typing itself out, if asked, a character at a time. */
export function codeSlide(st: LayoutStyle, title: string, code: string, language: string, typewrite: boolean): Slide {
  const box = { ...cell(1, 5, 12, 1), y: CONTENT_TOP, h: CONTENT_FOOT - CONTENT_TOP };
  return slide(st, 'Code', [
    titleRow(st, title),
    titleBar(st),
    shape('Code panel', box, { shape: 'rect', radius: 18, fill: '#11151c' }, { type: 'fade', duration: 0.5 }),
    text('Language', language.toUpperCase(), { x: box.x + box.w - 300, y: box.y + 22, w: 260, h: 36, rot: 0 }, { font: 'JetBrains Mono', weight: '600', size: 26, color: '#8b98a9', align: 'right', tracking: 0.08, fit: 'shrink' }, after(0.2)),
    text('Code', code.replace(/\s+$/, ''), { x: box.x + 48, y: box.y + 60, w: box.w - 96, h: box.h - 100, rot: 0 }, { font: 'JetBrains Mono', weight: '400', size: 40, color: '#e6edf3', lineHeight: 1.45, fit: 'shrink' },
      typewrite ? { type: 'typewriter', duration: 0.05, stagger: 0.035, delay: 0.3 } : after(0.3)),
  ]);
}
