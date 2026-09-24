/*
 * SlideForge's motion specimens (src/render/motion-lab.js and the .motion-specimen rules in
 * css/app.css), drawn by the lab: ten behaviours on one stage, in five looks.
 *
 *   mask      a photograph revealed through a growing circle          (drag, or Next in quarters)
 *   draw      nodes and the connections between them, one per Next
 *   cards     a row of cards; one opens wide, its neighbours keep context  (press a card, or Next)
 *   annotate  numbered callouts over a photograph, one per Next
 *   scrub     circles become aligned bars — area to length            (drag, or Next)
 *   cause     y = a × x: the input drives a meter and the sum          (drag, or Next)
 *   branch    choices whose consequence shows only when chosen         (press, or Next)
 *   explode   the cards of a system pulled apart                       (drag, or Next)
 *   lens      a magnifier over a photograph                            (drag)
 *   panels    story panels that give the chosen one room               (press, or Next)
 *
 * Its words are the slide's points, "label<TAB>detail". The state comes from the renderer: `_step`
 * and `_k` from the slide's clicks, and `_value`, `_x`, `_y`, `_choice` from what the room drags or
 * presses in Preview, which wins over the clicks until the next one.
 */
import type { Params } from '../model/types';
import { drawRow, row } from './controls';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const SCENES: Record<string, string> = {
  mask: 'Mask reveal', draw: 'Draw-on diagram', cards: 'Card to detail', annotate: 'Animated annotations',
  scrub: 'Scrubbable transformation', cause: 'Cause and effect', branch: 'Branching scenario',
  explode: 'Exploded diagram', lens: 'Focus lens', panels: 'Responsive story panels',
};

/** The five looks: slide ground and text, the stage's paper, the accent, the title face. */
export const LOOKS: Record<string, { name: string; bg: string; ink: string; paper: string; accent: string; serif?: boolean; mono?: boolean }> = {
  editorial: { name: 'Editorial', bg: '#0d1519', ink: '#f5f3e8', paper: '#172326', accent: '#a7ce89', serif: true },
  paper: { name: 'Layered paper', bg: '#f6f0e4', ink: '#262b24', paper: '#e7ddc9', accent: '#425e44' },
  technical: { name: 'Technical drawing', bg: '#0d1519', ink: '#f5f3e8', paper: '#11263a', accent: '#75d7f4', mono: true },
  cinema: { name: 'Cinematic depth', bg: '#0d1519', ink: '#f5f3e8', paper: '#201d35', accent: '#f7b592' },
  comic: { name: 'Comic sequence', bg: '#0d1519', ink: '#f5f3e8', paper: '#204f75', accent: '#ffdb45' },
};

const CONTINUOUS = ['mask', 'scrub', 'cause', 'explode'];
const SELECTABLE = ['cards', 'branch', 'panels'];
export const sceneIsContinuous = (mode: string) => CONTINUOUS.includes(mode);
export const sceneIsSelectable = (mode: string) => SELECTABLE.includes(mode);

export function sceneItems(p: Params) {
  const rows = String(p.items ?? '').split('\n').filter((x) => x.trim()).slice(0, 4).map((x) => {
    const [label, ...detail] = x.split('\t');
    return { label: label.trim().slice(0, 100), detail: detail.join(' ').trim().slice(0, 350) };
  });
  return rows.length ? rows : [{ label: 'Add a point', detail: 'One per line: a label, a tab, then its explanation.' }];
}

/** How many Next presses the scene takes before the show moves on. */
export function sceneSteps(p: Params): number {
  const mode = String(p.mode ?? 'cards'), n = sceneItems(p).length;
  if (mode === 'lens') return 0;
  if (CONTINUOUS.includes(mode)) return 4;
  if (SELECTABLE.includes(mode)) return n + 1;
  return n;
}

/** The scene's state at a step: value 0–100, how many items are revealed, which one is chosen. */
function stateAt(mode: string, n: number, step: number) {
  if (CONTINUOUS.includes(mode)) return { value: Math.min(100, step * 25), reveal: n, choice: -1 };
  if (SELECTABLE.includes(mode)) return { value: 100, reveal: n, choice: step >= 1 && step <= n ? step - 1 : -1 };
  return { value: 100, reveal: Math.min(n, step), choice: -1 };
}

// ─── Layout ────────────────────────────────────────────────────────────────────────────────────
/** The stage and the status line beneath it, in the layer's box. */
function frame(w: number, h: number, size: number) {
  const px = Math.max(26, size * 0.8), ctrlH = px * 1.75, statusH = size * 2.7;
  const ctrlY = h - ctrlH, statusY = ctrlY - statusH - size * 0.25;
  return { stage: { x: 0, y: 0, w, h: statusY - size * 0.4 }, status: { x: 0, y: statusY, w, h: statusH }, ctrl: { y: ctrlY, h: ctrlH, px } };
}
/** The cards' rectangles on the stage: the chosen one three shares wide, the rest one. */
export function cardRects(mode: string, n: number, sw: number, sh: number, weights: number[], u: number) {
  const explode = mode === 'explode';
  const pad = explode ? { x: 110 * u, y: 90 * u } : { x: 28 * u, y: 28 * u }, gap = 16 * u;
  const total = weights.reduce((a, b) => a + b, 0) || 1, inner = sw - pad.x * 2 - gap * (n - 1);
  let x = pad.x;
  return weights.map((wt) => { const r = { x, y: pad.y, w: (inner * wt) / total, h: sh - pad.y * 2 }; x += r.w + gap; return r; });
}
/** The scene's controls: Previous, Next and Reset (Overview where a card can be chosen), and for
 *  a transformation a slider across the rest of the row, its knob at the value. */
export function sceneControls(p: Params, w: number, h: number) {
  const mode = String(p.mode ?? 'cards'), n = sceneItems(p).length, size = Number(p.size ?? 36), steps = sceneSteps(p);
  const family = `"${String(p.font ?? 'Inter')}", system-ui, sans-serif`;
  const { ctrl } = frame(w, h, size);
  const step = p._step === undefined ? steps : Math.round(Number(p._step));
  const choice = p._choice !== undefined ? Math.round(Number(p._choice)) : stateAt(mode, n, step).choice;
  const labels: { label: string; action: string; on?: boolean; off?: boolean }[] = mode === 'lens'
    ? [{ label: '\u2316 Centre the lens', action: 'reset' }]
    : [{ label: '\u25c0 Previous', action: 'prev', off: step <= 0 }, { label: 'Next \u25b6', action: 'next', off: step >= steps }, { label: '\u21ba Reset', action: 'reset', off: step <= 0 && p._value === undefined && p._choice === undefined }];
  if (SELECTABLE.includes(mode)) labels.push({ label: '\u25a4 Overview', action: 'overview', off: choice < 0 });
  const r = row(labels, 0, ctrl.y, CONTINUOUS.includes(mode) ? w * 0.55 : w, ctrl.px, family);
  const last = r.buttons[r.buttons.length - 1];
  const slider = CONTINUOUS.includes(mode) ? { x: last.x + last.w + ctrl.px * 1.4, y: ctrl.y, w: w - (last.x + last.w + ctrl.px * 1.4), h: ctrl.h } : null;
  return { ...r, slider, family };
}

/** Which card a point on the layer (0–1 across and down) lands on, or −1. */
export function sceneHit(p: Params, bw: number, bh: number, u: number, v: number): number {
  const mode = String(p.mode ?? 'cards'), n = sceneItems(p).length, size = Number(p.size ?? 36);
  const { stage } = frame(bw, bh, size);
  const choice = Math.round(Number(p._choice ?? -1));
  const rects = cardRects(mode, n, stage.w, stage.h, Array.from({ length: n }, (_, i) => (choice === i ? 3 : 1)), bw / 1168);
  const x = u * bw, y = v * bh;
  return rects.findIndex((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

// ─── Drawing helpers ───────────────────────────────────────────────────────────────────────────
function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isFinite(n) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex;
}
function wrap(ctx: Ctx, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const wd of para.split(' ')) { const tr = line ? `${line} ${wd}` : wd; if (ctx.measureText(tr).width > width && line) { out.push(line); line = wd; } else line = tr; }
    out.push(line);
  }
  return out;
}
function words(ctx: Ctx, text: string, x: number, y: number, width: number, px: number, font: string, weight: number, colour: string, maxLines = 99, lh = 1.3) {
  ctx.font = `${weight} ${px}px ${font}`;
  ctx.fillStyle = colour; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = wrap(ctx, text, width).slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * px * lh));
  return lines.length * px * lh;
}
function cover(ctx: Ctx, img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number }, x: number, y: number, w: number, h: number, zoom = 1, fx = 0.5, fy = 0.5) {
  const iw = img.naturalWidth || w, ih = img.naturalHeight || h;
  const k = Math.max(w / iw, h / ih) * zoom, dw = iw * k, dh = ih * k;
  ctx.drawImage(img, x + w * fx - dw * fx, y + h * fy - dh * fy, dw, dh);
}

// ─── The scene ─────────────────────────────────────────────────────────────────────────────────
export function drawScene(ctx: Ctx, w: number, h: number, p: Params, image: (src: string) => (CanvasImageSource & { naturalWidth?: number; naturalHeight?: number }) | null) {
  const mode = String(p.mode ?? 'cards'), look = LOOKS[String(p.look)] ?? LOOKS.editorial;
  const rows = sceneItems(p), n = rows.length;
  const size = Number(p.size ?? 36), fam = `"${String(p.font ?? 'Inter')}", system-ui, sans-serif`;
  const monoFam = '"SF Mono", Menlo, monospace';
  const u = w / 1168;
  const ink = look.ink;
  const still = p._step === undefined;
  const step = still ? sceneSteps(p) : Math.round(Number(p._step)), k = Math.max(0, Math.min(1, Number(p._k ?? 1)));
  const ease = 1 - Math.pow(1 - k, 3);
  // The step it is moving from: the one before, or wherever a button sent it from.
  const now = stateAt(mode, n, step), was = stateAt(mode, n, p._from !== undefined ? Math.max(0, Math.round(Number(p._from))) : Math.max(0, step - 1));
  // A drag or press in the show wins over the clicks.
  const value = p._value !== undefined ? Number(p._value) : still ? 100 : was.value + (now.value - was.value) * ease;
  const choice = p._choice !== undefined ? Math.round(Number(p._choice)) : now.choice;
  const lx = p._x !== undefined ? Number(p._x) : 50, ly = p._y !== undefined ? Number(p._y) : 50;
  const t = value / 100;
  const { stage, status } = frame(w, h, size);
  // The controls under the stage: the buttons, and the slider for a transformation.
  const ctl = sceneControls(p, w, h);
  drawRow(ctx, ctl.buttons, ctl.px, ctl.family, look.ink, look.accent, look === LOOKS.paper ? '#ffffff' : look.bg);
  if (ctl.slider) {
    const sl = ctl.slider, cy = sl.y + sl.h / 2, knob = sl.x + sl.w * t;
    ctx.save();
    ctx.fillStyle = rgba(look.ink, 0.22); ctx.beginPath(); ctx.roundRect(sl.x, cy - 5 * u, sl.w, 10 * u, 5 * u); ctx.fill();
    ctx.fillStyle = look.accent; ctx.beginPath(); ctx.roundRect(sl.x, cy - 5 * u, Math.max(0, knob - sl.x), 10 * u, 5 * u); ctx.fill();
    ctx.beginPath(); ctx.arc(knob, cy, 16 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = look.bg; ctx.lineWidth = 4 * u; ctx.stroke();
    ctx.restore();
  }
  const img = mode === 'mask' || mode === 'annotate' || mode === 'lens' ? image(String(p.image ?? '')) : null;

  // The stage: the look's paper, its edge, and its texture.
  ctx.save();
  const radius = look === LOOKS.technical || look === LOOKS.comic ? 0 : 16 * u;
  ctx.beginPath(); ctx.roundRect(stage.x, stage.y, stage.w, stage.h, radius);
  if (look === LOOKS.cinema) {
    const g = ctx.createLinearGradient(0, 0, stage.w, stage.h); g.addColorStop(0, '#10101d'); g.addColorStop(1, '#393259'); ctx.fillStyle = g; ctx.fill();
    const r = ctx.createRadialGradient(stage.w * 0.2, stage.h * 0.3, 0, stage.w * 0.2, stage.h * 0.3, stage.w * 0.55); r.addColorStop(0, 'rgba(112,68,84,0.9)'); r.addColorStop(1, 'rgba(112,68,84,0)'); ctx.fillStyle = r; ctx.fill();
  } else { ctx.fillStyle = look.paper; ctx.fill(); }
  ctx.save(); ctx.clip();
  if (look === LOOKS.technical) {
    ctx.strokeStyle = rgba('#75d7f4', 0.08); ctx.lineWidth = 1;
    for (let x = 0; x < stage.w; x += 24 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, stage.h); ctx.stroke(); }
    for (let y = 0; y < stage.h; y += 24 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(stage.w, y); ctx.stroke(); }
  }
  if (look === LOOKS.comic) {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let y = 0; y < stage.h; y += 9 * u) for (let x = 0; x < stage.w; x += 9 * u) { ctx.beginPath(); ctx.arc(x, y, 1.3 * u, 0, Math.PI * 2); ctx.fill(); }
  }

  if (mode === 'mask' || mode === 'annotate' || mode === 'lens') {
    if (!img) words(ctx, 'Choose an image to try this effect.', 48 * u, 48 * u, stage.w - 96 * u, size, fam, 500, ink);
    else if (mode === 'mask') {
      // The photograph through a circle whose radius grows with the transformation.
      const r = t * 0.75 * Math.hypot(stage.w, stage.h) / Math.SQRT2;
      ctx.save(); ctx.beginPath(); ctx.arc(stage.w / 2, stage.h / 2, Math.max(0.01, r), 0, Math.PI * 2); ctx.clip();
      cover(ctx, img, 0, 0, stage.w, stage.h); ctx.restore();
    } else cover(ctx, img, 0, 0, stage.w, stage.h);
    if (mode === 'annotate' && img) rows.forEach((row, i) => {
      const a = i < now.reveal - 1 ? 1 : i === now.reveal - 1 ? (still ? 1 : ease) : 0;
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      const x = stage.w * (0.1 + (i % 2) * 0.48), y = stage.h * (0.12 + Math.floor(i / 2) * 0.44) + (1 - a) * 12 * u;
      const ring = 48 * u, px = Math.max(size, 23 * u);
      ctx.font = `600 ${px}px ${fam}`;
      const bw = Math.min(stage.w * 0.4, 12 * u * 3 + ring + ctx.measureText(row.label).width), bh = ring + 24 * u;
      ctx.fillStyle = 'rgba(17,17,17,0.93)'; ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 8 * u); ctx.fill();
      ctx.strokeStyle = look.accent; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.arc(x + 12 * u + ring / 2, y + bh / 2, ring / 2 - 2 * u, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), x + 12 * u + ring / 2, y + bh / 2 + 1);
      ctx.textAlign = 'left'; ctx.fillText(row.label, x + 24 * u + ring, y + bh / 2 + 1, bw - 36 * u - ring);
      ctx.fillStyle = look.accent; ctx.font = `700 ${48 * u}px ${fam}`; ctx.textBaseline = 'top'; ctx.fillText('↘', x + 24 * u, y + bh);
      ctx.restore();
    });
    if (mode === 'lens' && img) {
      // A 2× magnifier, centred on the pointer, showing what lies under it.
      const R = 110 * u * 1.3, cx = (lx / 100) * stage.w, cy = (ly / 100) * stage.h;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 28 * u; ctx.shadowOffsetY = 8 * u;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      cover(ctx, img, 0, 0, stage.w, stage.h, 2, lx / 100, ly / 100); ctx.restore();
      ctx.strokeStyle = look.accent; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (mode === 'draw' || mode === 'scrub') {
    // SlideForge's 1000 × 360 plan, fitted to the stage.
    const s = Math.min(stage.w / 1000, stage.h / 360), ox = (stage.w - 1000 * s) / 2, oy = (stage.h - 360 * s) / 2;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    const labelPx = Math.max(22, size / s * 0.8);
    rows.forEach((row, i) => {
      if (mode === 'draw') {
        const shown = still ? 1 : i < now.reveal - 1 ? 1 : i === now.reveal - 1 ? ease : 0;
        if (i && shown > 0) {
          // The connection draws itself along to the node it reaches.
          const x1 = 100 + (i - 1) * 250, x2 = x1 + 250 * shown;
          ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, 180); ctx.lineTo(x2, 180); ctx.stroke();
        }
        if (shown <= 0) return;
        ctx.save(); ctx.globalAlpha = shown;
        ctx.fillStyle = look.accent; ctx.beginPath(); ctx.arc(100 + i * 250, 180, 50, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ink; ctx.font = `500 ${labelPx}px ${fam}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(row.label, 100 + i * 250, 270 + labelPx * 0.3);
        ctx.restore();
      } else {
        const v = Number(row.detail), num = Number.isFinite(v) && v > 0 ? Math.min(100, v) : 25 * (i + 1);
        const d = 2 * Math.sqrt(num / Math.PI) * 8, bw = d + (num * 6 - d) * t, bh = d + (36 - d) * t, y = 40 + i * 80;
        ctx.fillStyle = look.accent; ctx.beginPath(); ctx.roundRect(250, y - bh / 2, bw, bh, Math.max(0, ((1 - t) * d) / 2)); ctx.fill();
        ctx.fillStyle = ink; ctx.font = `500 ${labelPx}px ${fam}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${row.label}: ${num}`, 30, y);
      }
    });
    ctx.restore();
  } else if (mode === 'cause') {
    const a = Number(p.factor ?? 2), factor = Number.isFinite(a) ? Math.max(-10, Math.min(10, a)) : 2;
    const out = Math.round(value * factor * 100) / 100;
    ctx.fillStyle = ink; ctx.font = `700 ${70 * u}px ${fam}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${factor} × ${Math.round(value)} = ${out}`, stage.w * 0.05, stage.h * 0.1);
    ctx.fillStyle = look.accent; ctx.fillRect(stage.w * 0.05, stage.h * 0.6, stage.w * 0.9 * t, 70 * u);
  } else {
    // Cards, branches, panels and the exploded system: a row that makes room for the chosen one.
    const target = rows.map((_, i) => (choice === i ? 3 : 1));
    const prevChoice = p._choice !== undefined ? choice : was.choice;
    const from = rows.map((_, i) => (prevChoice === i ? 3 : 1));
    const weights = target.map((v, i) => from[i] + (v - from[i]) * (p._choice !== undefined ? 1 : ease));
    const rects = cardRects(mode, n, stage.w, stage.h, weights, u);
    const anyChosen = choice >= 0, comic = look === LOOKS.comic, paperLook = look === LOOKS.paper, cinema = look === LOOKS.cinema;
    rects.forEach((r, i) => {
      const row = rows[i], chosen = choice === i;
      ctx.save();
      if (mode === 'explode') {
        const mid = (n - 1) / 2;
        ctx.translate(r.x + r.w / 2 + (i - mid) * t * 50 * u, r.y + r.h / 2 + (i % 2 ? 1 : -1) * t * 65 * u);
        ctx.rotate(((i - mid) * t * 5 * Math.PI) / 180);
        ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      }
      if (cinema) ctx.translate(0, chosen ? -8 * u : 8 * u);
      ctx.globalAlpha = anyChosen && !chosen ? 0.5 : 1;
      const rad = comic || paperLook ? (paperLook ? 2 * u : 0) : 14 * u;
      // The card's shadow, then its face and edge, in the look's manner.
      if (paperLook || comic) { ctx.fillStyle = comic ? '#080808' : '#c6baa5'; ctx.beginPath(); ctx.roundRect(r.x + 7 * u, r.y + (comic ? 7 : 9) * u, r.w, r.h, rad); ctx.fill(); }
      else if (cinema || mode === 'explode') { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30 * u; ctx.shadowOffsetY = 18 * u; ctx.fillStyle = look.paper; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad); ctx.fill(); ctx.restore(); }
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, rad);
      ctx.fillStyle = comic ? '#fff4cf' : paperLook ? '#fffbf2' : chosen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = comic ? '#101010' : paperLook ? '#bbb09b' : 'rgba(255,255,255,0.31)'; ctx.lineWidth = comic ? 4 * u : 1.5 * u; ctx.stroke();
      const cardInk = comic || paperLook ? (comic ? '#151515' : look.ink) : ink;
      const pad = 24 * u, inner = r.w - pad * 2;
      let y = r.y + pad;
      // The number, the label, then — for the chosen card, or every card when none is — the detail.
      const numPx = Math.max(size * 0.7, 15 * u);
      ctx.font = `600 ${numPx}px ${monoFam}`;
      if (comic) { const nw = ctx.measureText('00').width + 18 * u; ctx.fillStyle = '#ffdb45'; ctx.fillRect(r.x + pad, y, nw, numPx + 8 * u); ctx.fillStyle = '#121212'; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1).padStart(2, '0'), r.x + pad + 9 * u, y + 4 * u); }
      else { ctx.fillStyle = look.accent; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1).padStart(2, '0'), r.x + pad, y); }
      y += numPx + 18 * u;
      y += words(ctx, row.label, r.x + pad, y, inner, Math.max(size * 1.1, 27 * u), fam, 700, cardInk, 3, 1.15) + 16 * u;
      // Branch keeps a consequence hidden until it is chosen, in the show; the still shows them all.
      const showDetail = anyChosen ? chosen : !(mode === 'branch' && !still);
      if (showDetail && row.detail) {
        const dpx = Math.max(size, 20 * u);
        if (comic) {
          ctx.font = `400 ${dpx}px ${fam}`;
          const lines = wrap(ctx, row.detail, inner - 24 * u).slice(0, 6), bh = lines.length * dpx * 1.35 + 24 * u;
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.roundRect(r.x + pad, y, inner, bh, 18 * u); ctx.fill(); ctx.stroke();
          words(ctx, row.detail, r.x + pad + 12 * u, y + 12 * u, inner - 24 * u, dpx, fam, 400, '#151515', 6, 1.35);
        } else words(ctx, row.detail, r.x + pad, y, inner, dpx, fam, 400, cardInk, Math.max(1, Math.floor((r.y + r.h - pad - y) / (dpx * 1.4))), 1.4);
      }
      ctx.restore();
    });
  }
  ctx.restore(); // the stage clip
  ctx.beginPath(); ctx.roundRect(stage.x, stage.y, stage.w, stage.h, radius);
  ctx.strokeStyle = look === LOOKS.comic ? '#050505' : rgba(ink, 0.19); ctx.lineWidth = look === LOOKS.comic ? 4 * u : 1.5 * u; ctx.stroke();
  ctx.restore();

  // The status line: what the current state means.
  const chosenRow = rows[choice];
  const line = chosenRow ? `${chosenRow.label} — ${chosenRow.detail}`
    : mode === 'scrub' ? 'Illustrative values. Circle area and bar length encode the same quantity; intermediate shapes are transition frames.'
    : mode === 'cause' ? 'Illustrative linear model: y = ax. Drag across the stage to change x.'
    : mode === 'lens' ? 'Drag over the image to inspect a detail.'
    : mode === 'branch' ? 'Choose a response to reveal its consequence. Press it again to return to the overview.'
    : CONTINUOUS.includes(mode) ? 'Drag across the stage, or press Next, to move the transformation.'
    : rows[Math.max(0, now.reveal - 1)]?.detail || String(p.subtitle ?? '') || 'Press Next to explore.';
  let px = size;
  ctx.font = `400 ${px}px ${fam}`;
  while (wrap(ctx, line, status.w).length > 2 && px > 24) { px -= 2; ctx.font = `400 ${px}px ${fam}`; }
  words(ctx, line, status.x, status.y, status.w, px, fam, 400, ink, 2, 1.35);
}
