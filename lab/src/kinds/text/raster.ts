// The text layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { DIM_TO, EASE, FRAME_K, MAX_TEX, canFilter, isWordMotion, layoutText, makeCanvas, reach, setupFont, textSize, textUnitCount, unitDelays, unitLook, unitProgress, withAlpha, type Ctx, type Raster, type UnitLook } from '../../engine';

const GLYPHS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digit: '0123456789', other: '#%&*+=?/<>$@' };
/** A stand-in letter for a scramble, of the same kind as the real one, changing eighteen times a second. */
function scrambleGlyph(ch: string, unit: number, t: number) {
  const set = /[A-Z]/.test(ch) ? GLYPHS.upper : /[a-z]/.test(ch) ? GLYPHS.lower : /\d/.test(ch) ? GLYPHS.digit : GLYPHS.other;
  const h = Math.abs(Math.sin((unit + 1) * 12.9898 + Math.floor(t * 18) * 78.233) * 43758.5453) % 1;
  return set[Math.floor(h * set.length)];
}

/** The numbers in a line counted up to a fraction of their value: "1,250 people" at 40% is "500 people". */
export function countedText(text: string, e: number) {
  return text.replace(/\d[\d,]*(?:\.\d+)?/g, (m) => {
    const dec = (m.split('.')[1] ?? '').length;
    const v = Number(m.replace(/,/g, '')) * Math.max(0, Math.min(1, e));
    return m.includes(',') ? v.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
  });
}

/** How far a text's effects and block reach past its letters, in slide px: the canvas is padded by it. */
function effectReach(p: Params, size: number) {
  const glow = Math.max(0, Number(p.glow ?? 0)) * size * 0.6;
  const shadow = String(p.shadow ?? 'none') === 'none' ? 0 : size * 0.2;
  const outline = Math.max(Number(p.outline ?? 0), p.hollow ? size * 0.03 : 0);
  const block = String(p.block ?? 'none') === 'none' ? 0 : Math.max(0, Number(p.blockPad ?? 24)) + Math.max(0, Number(p.blockBorder ?? 0));
  return Math.max(glow, shadow, outline, block);
}

export function rasterText(layer: Layer, textT: number): Raster {
  const box = layer.box!;
  const p: Params = { ...layer.params, size: textSize(layer) };
  const L = layoutText(p, box.w);
  const size = L.size;
  // Words on their way in can start well away from their place (a bounce falls from two lines up).
  const wm = isWordMotion(layer);
  const far = wm ? reach(layer.anim) * size : 0;
  const fxPad = effectReach(p, size);
  const padX = size * 0.5 + far + fxPad, padT = size * 0.35 + far + fxPad, padB = size * 0.7 + far + fxPad;
  const bodyH = Math.max(box.h, L.height);
  const rw = box.w + padX * 2, rh = bodyH + padT + padB;
  const S = Math.min(2, MAX_TEX / Math.max(rw, rh));
  const canvas = makeCanvas(rw * S, rh * S);
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.scale(S, S);
  ctx.translate(padX, padT);
  setupFont(ctx, p, size);
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText('Hg');
  const asc = m.fontBoundingBoxAscent ?? size * 0.8, desc = m.fontBoundingBoxDescent ?? size * 0.2;
  const align = String(p.align ?? 'left');
  const type = layer.anim.type;
  const animating = Number.isFinite(textT);
  // Set top to bottom in its box: at the top, or in the middle or at the foot of what is left over.
  const valign = String(p.valign ?? 'top');
  const oy = valign === 'middle' ? Math.max(0, (box.h - L.height) / 2) : valign === 'bottom' ? Math.max(0, box.h - L.height) : 0;
  const lineX = (w: number) => (align === 'center' ? (box.w - w) / 2 : align === 'right' ? box.w - w : 0);

  // ── The look of the letters ──
  const ink = String(p.color ?? '#000');
  let fill: string | CanvasGradient = ink;
  if (p.fillMode === 'gradient') {
    // CSS's convention: 0° runs bottom to top, 90° left to right; the gradient spans the words' block.
    const a = (Number(p.gradientAngle ?? 90) * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const cx = box.w / 2, cy = oy + L.height / 2;
    const len = Math.abs(dx) * box.w / 2 + Math.abs(dy) * L.height / 2;
    const g = ctx.createLinearGradient(cx - dx * len, cy - dy * len, cx + dx * len, cy + dy * len);
    g.addColorStop(0, ink);
    g.addColorStop(1, String(p.color2 ?? '#d94f2b'));
    fill = g;
  }
  const hollow = !!p.hollow;
  const outline = Math.max(0, Number(p.outline ?? 0));
  const strokeW = hollow ? Math.max(outline, size * 0.03) : outline;
  const outlineColor = String(p.outlineColor ?? '#ffffff');
  const shadow = String(p.shadow ?? 'none');
  const shadowColor = String(p.shadowColor ?? '#000000');
  const glow = Math.max(0, Math.min(1, Number(p.glow ?? 0)));
  const glowColor = String(p.glowColor ?? '#ffb347');
  const marker = p.highlight ? String(p.highlightColor ?? '#ffe066') : '';
  ctx.fillStyle = fill;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // Shadows are measured on the device canvas, not through its scale.
  const shadowOn = (colour: string, blur: number, ox: number, oy2: number) => {
    ctx.shadowColor = colour; ctx.shadowBlur = blur * S; ctx.shadowOffsetX = ox * S; ctx.shadowOffsetY = oy2 * S;
  };
  const shadowOff = () => { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
  const letters = (str: string, x: number, y: number) => {
    if (hollow) ctx.strokeText(str, x, y); else ctx.fillText(str, x, y);
  };
  /** One run of letters with every effect on it, bottom to top: glow, long shadow, outline, fill. */
  const paint = (str: string, x: number, y: number) => {
    ctx.save();
    if (hollow) { ctx.lineWidth = strokeW; ctx.strokeStyle = outline > 0 ? outlineColor : fill; }
    if (glow > 0) {
      ctx.save();
      shadowOn(withAlpha(glowColor, 0.5 + glow * 0.5), size * glow * 0.45, 0, 0);
      letters(str, x, y);
      shadowOn(glowColor, size * glow * 0.15, 0, 0);
      letters(str, x, y);
      ctx.restore();
    }
    if (shadow === 'long') {
      ctx.save();
      ctx.fillStyle = shadowColor; ctx.strokeStyle = shadowColor;
      const n = Math.max(2, Math.round(size * 0.12));
      for (let i = n; i >= 1; i--) letters(str, x + i, y + i);
      ctx.restore();
    } else if (shadow === 'soft') shadowOn(withAlpha(shadowColor, 0.35), size * 0.14, 0, size * 0.05);
    else if (shadow === 'hard') shadowOn(shadowColor, 0, size * 0.05, size * 0.05);
    if (!hollow && outline > 0) {
      // Outside the letters, as CSS's paint-order: stroke — the stroke under the fill, twice as wide.
      ctx.lineWidth = outline * 2; ctx.strokeStyle = outlineColor;
      ctx.strokeText(str, x, y);
      shadowOff();
    }
    letters(str, x, y);
    ctx.restore();
  };
  /** Letters out of focus: through ctx.filter where it works, otherwise as a shadow cast from far off the canvas. */
  const blurred = (str: string, x: number, y: number, r: number) => {
    if (canFilter()) { ctx.filter = `blur(${r.toFixed(2)}px)`; paint(str, x, y); return; }
    const D = 10000, t = ctx.getTransform();
    ctx.save();
    ctx.shadowColor = ink; ctx.shadowBlur = r * 2;
    ctx.shadowOffsetX = t.a * D; ctx.shadowOffsetY = t.b * D;
    ctx.fillText(str, x - D, y);
    ctx.restore();
  };
  const underline = (x: number, w: number, y: number) => {
    if (p.underline && w > 0) ctx.fillRect(x, y + size * 0.09, w, Math.max(1, size * 0.055));
  };
  /** A highlighter stroke across the lower part of the letters, behind them. */
  const mark = (x: number, w: number, y: number) => {
    if (!marker || w <= 0) return;
    ctx.save();
    ctx.fillStyle = marker;
    ctx.beginPath();
    ctx.roundRect(x - size * 0.06, y - size * 0.4, w + size * 0.12, size * 0.52, size * 0.08);
    ctx.fill();
    ctx.restore();
  };
  /** A run of letters with its highlighter and underline; a list's bullet or number takes neither. */
  const put = (str: string, x: number, y: number, w: number, listMark?: boolean) => {
    if (!listMark) mark(x, w, y);
    paint(str, x, y);
    if (!listMark) underline(x, w, y);
  };

  // ── The block the words sit in ──
  const block = String(p.block ?? 'none');
  const bPad = Math.max(0, Number(p.blockPad ?? 24));
  const glyphTop = (top: number) => top + L.lineH / 2 - (asc + desc) / 2;
  const drawBlock = (x: number, y: number, w: number, h: number) => {
    const border = Math.max(0, Number(p.blockBorder ?? 0));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.max(0, Math.min(Number(p.blockRadius ?? 12), w / 2, h / 2)));
    ctx.fillStyle = withAlpha(String(p.blockColor ?? '#f1ece4'), p.blockOpacity ?? 1);
    ctx.fill();
    if (border > 0) {
      ctx.lineWidth = border; ctx.strokeStyle = String(p.blockBorderColor ?? '#141414');
      ctx.stroke();
    }
    ctx.restore();
  };
  if (block === 'box') drawBlock(-bPad, -bPad, box.w + bPad * 2, bodyH + bPad * 2);
  else if (block === 'hug') {
    const set = L.lines.filter((l) => l.width > 0);
    if (set.length) {
      const x0 = Math.min(...set.map((l) => lineX(l.width))), x1 = Math.max(...set.map((l) => lineX(l.width) + l.width));
      const y0 = glyphTop(oy), y1 = glyphTop(oy + (L.lines.length - 1) * L.lineH) + asc + desc;
      drawBlock(x0 - bPad, y0 - bPad, x1 - x0 + bPad * 2, y1 - y0 + bPad * 2);
    }
  }

  let unit = 0;
  // SlideForge's word motion: each unit drawn at its own look, about its own box.
  const units = wm && animating ? textUnitCount(layer) : 0;
  const delays = units ? unitDelays(layer.anim, units) : [];
  const easeFn = EASE[layer.anim.easing] ?? EASE.easyEase;
  const drawUnit = (str: string, x: number, width: number, top: number, base: number, lk: UnitLook, letter: boolean, listMark?: boolean) => {
    if (lk.alpha <= 0.002 || (lk.clip && lk.clip[1] <= lk.clip[0])) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, lk.alpha);
    // A word turns about a point 60% down its own height; a letter, narrower, about its middle.
    const ox = x + width / 2, oy2 = top + L.lineH * (letter ? 0.5 : 0.6);
    ctx.translate(ox + lk.dx * size, oy2 + lk.dy * size);
    if (lk.rot) ctx.rotate((lk.rot * Math.PI) / 180);
    if (lk.scale !== 1) ctx.scale(lk.scale, lk.scale);
    ctx.translate(-ox, -oy2);
    if (lk.clip) {
      ctx.beginPath();
      ctx.rect(x - size, top + L.lineH * lk.clip[0], width + size * 2, L.lineH * (lk.clip[1] - lk.clip[0]));
      ctx.clip();
    }
    if (lk.blur > 0.05) blurred(str, x, base, lk.blur * FRAME_K * S);
    else put(str, x, base, width, listMark);
    ctx.restore();
  };

  // Line builds: progress per non-empty paragraph, spread over every paragraph (a blank line takes
  // the one before it), and the newest shown line when earlier ones dim.
  let built: number[] | null = null, step: number[] = [];
  const dimBefore = Number(p._dimBefore ?? -1);
  if (typeof p._lines === 'string' && p._lines) {
    const prog = p._lines.split(',').map(Number);
    let k = -1;
    step = String(p.text ?? '').split('\n').map((x) => { if (x.trim()) k++; return Math.max(0, k); });
    built = step.map((k2) => prog[k2] ?? 1);
  }
  // A typewriter's cursor follows the last letter typed.
  let caret = null as [number, number] | null;
  L.lines.forEach((line, li) => {
    const top = oy + li * L.lineH;
    const base = top + L.lineH / 2 + (asc - desc) / 2;
    const ox = lineX(line.width);
    const first = line.words.find((w) => !w.marker);
    if (li === 0) caret = [ox + (first?.x ?? 0), base];
    const band = () => {
      if (block === 'lines' && first) drawBlock(ox + first.x - bPad, glyphTop(top) - bPad / 2, line.width - first.x + bPad * 2, asc + desc + bPad);
    };
    const whole = (y: number) => {
      if (first) mark(ox + first.x, line.width - first.x, y);
      if (line.plain) paint(line.text, ox, y);
      else for (const w of line.words) paint(w.text, ox + w.x, y);
      if (first) underline(ox + first.x, line.width - first.x, y);
    };
    if (!animating || type === 'none') {
      // Built a line per click: each paragraph at its own progress, earlier ones dimmed if asked.
      if (built) {
        const b = built[line.para] ?? 1;
        if (b <= 0) return;
        ctx.globalAlpha = Math.min(1, b * 1.4) * (dimBefore >= 0 && (step[line.para] ?? 0) < dimBefore ? (p._dimTo === 'spot' ? DIM_TO.spot : DIM_TO.dim) : 1);
        band();
        // Each line rises half a line as it fades in; with reduced motion (`_still`) it only fades.
        whole(base + (p._still ? 0 : (1 - b) * size * 0.5));
        ctx.globalAlpha = 1;
        return;
      }
      band();
      whole(base);
      return;
    }
    band();
    if (type === 'count') {
      // The words stand still and their numbers run up; the line keeps to its alignment as it widens.
      const e = unitProgress(layer, 0, textT);
      for (const w of line.words) if (w.marker) paint(w.text, ox + w.x, base);
      if (!first) return;
      const str = countedText(line.words.filter((w) => !w.marker).map((w) => w.text).join(' '), e);
      const full = line.width - first.x, now = ctx.measureText(str).width;
      const shift = align === 'center' ? (full - now) / 2 : align === 'right' ? full - now : 0;
      put(str, ox + first.x + shift, base, now);
      return;
    }
    if (type === 'lines') {
      const e = unitProgress(layer, li, textT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-padX, top - L.lineH * 0.25, rw, L.lineH * 1.32);
      ctx.clip();
      whole(base + (1 - e) * L.lineH * 1.1);
      ctx.restore();
      return;
    }
    for (const w of line.words) {
      if (units && type === 'words') {
        drawUnit(w.text, ox + w.x, w.w, top, base, unitLook(layer.anim, unit, units, textT, easeFn, delays), false, w.marker);
        unit++;
        continue;
      }
      if (units) {
        for (let k = 0; k < w.text.length; k++) {
          const x = ox + w.x + (k ? ctx.measureText(w.text.slice(0, k)).width : 0);
          drawUnit(w.text[k], x, ctx.measureText(w.text[k]).width, top, base, unitLook(layer.anim, unit, units, textT, easeFn, delays), true, w.marker);
          unit++;
        }
        continue;
      }
      if (type === 'words') {
        const e = unitProgress(layer, unit++, textT);
        if (e <= 0) continue;
        ctx.globalAlpha = Math.min(1, e * 1.5);
        put(w.text, ox + w.x, base + (1 - e) * size * 0.4, w.w, w.marker);
        continue;
      }
      // letters, typewriter and scramble: kerning-aware x from prefix widths
      for (let k = 0; k < w.text.length; k++) {
        const e = unitProgress(layer, unit, textT);
        const u = unit++;
        if (e <= 0) continue;
        const x = ox + w.x + (k ? ctx.measureText(w.text.slice(0, k)).width : 0);
        const cw = ctx.measureText(w.text[k]).width;
        if (type === 'scramble') {
          // A stand-in letter until this one's time is up, then the real one.
          ctx.globalAlpha = e >= 1 ? 1 : 0.55 + e * 0.45;
          put(e >= 1 || w.marker ? w.text[k] : scrambleGlyph(w.text[k], u, textT), x, base, cw, w.marker);
          continue;
        }
        ctx.globalAlpha = type === 'typewriter' ? 1 : Math.min(1, e * 1.6);
        const y = base + (type === 'typewriter' ? 0 : (1 - e) * size * 0.45);
        put(w.text[k], x, y, cw, w.marker);
        caret = [x + cw, base];
      }
    }
    ctx.globalAlpha = 1;
  });
  if (type === 'typewriter' && layer.anim.caret && animating && caret) {
    // Solid while it types; once the line is typed it blinks on for half of each second.
    const typing = textT < layer.anim.duration + (textUnitCount(layer) - 1) * layer.anim.stagger;
    if (typing || textT % 1 < 0.5) {
      const [cx, cy] = caret as [number, number];
      ctx.fillStyle = ink;
      ctx.fillRect(cx + size * 0.05, cy - asc * 0.85, Math.max(2, size * 0.06), asc * 0.85 + desc * 0.5);
    }
  }
  return { canvas, rect: [-padX, -padT, rw, rh] };
}
