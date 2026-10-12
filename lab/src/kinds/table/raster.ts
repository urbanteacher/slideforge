// The table layer drawn into a canvas for the renderer (from engine/raster.ts, lab-engine-plan M1.5).
import type { Layer, Params } from '../../core';
import { boxCanvas, fitted, setFont, wrap, type Ctx, type Raster } from '../../engine';

// ─── Table ──────────────────────────────────────────────────────────────────
/** Rows of cells from "a\tb\tc" lines (or "a | b | c"). */
export function parseTable(text: string): string[][] {
  return String(text ?? '').split('\n').filter((r) => r.trim()).map((r) => (r.includes('\t') ? r.split('\t') : r.split(/\s+\|\s+/)).map((c) => c.trim()));
}
export function tableLayout(ctx: Ctx, p: Params, w: number) {
  const size = Number(p.size ?? 28), fam = String(p.font ?? 'Inter');
  const rows = parseTable(String(p.data ?? ''));
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const pad = size * 0.6;
  const bold = (i: number, c: number) => (p.header !== false && i === 0) || (p.labels !== false && c === 0);
  // What each column would like (its longest cell on one line) and what it must have (its longest
  // word): a table never cuts a word off, it wraps the cell instead.
  const want: number[] = [], need: number[] = [];
  for (let c = 0; c < cols; c++) {
    let m = size * 2, n = size * 2;
    rows.forEach((r, i) => {
      setFont(ctx, fam, size, bold(i, c) ? 700 : 400);
      const cell = r[c] ?? '';
      m = Math.max(m, ctx.measureText(cell).width);
      cell.split(/\s+/).forEach((wd) => { n = Math.max(n, ctx.measureText(wd).width); });
    });
    want.push(m + pad * 2); need.push(n + pad * 2);
  }
  const total = want.reduce((a, b) => a + b, 0);
  let cw: number[];
  if (total <= w) cw = want.map((x) => x * (w / total));
  else {
    // Each column gets its longest word, then the rest of the width in proportion to what it still wants.
    const base = need.reduce((a, b) => a + b, 0), spare = Math.max(0, w - base), extra = want.map((x, c) => x - need[c]);
    const ex = extra.reduce((a, b) => a + b, 0) || 1;
    cw = need.map((x, c) => x + (spare * extra[c]) / ex);
    const k = w / cw.reduce((a, b) => a + b, 0);
    cw = cw.map((x) => x * k);
  }
  const lineH = size * 1.2, padY = size * 0.75;
  const cells = rows.map((r, i) => Array.from({ length: cols }, (_, c) => {
    setFont(ctx, fam, size, bold(i, c) ? 700 : 400);
    return wrap(ctx, r[c] ?? '', Math.max(size, cw[c] - pad * 2));
  }));
  const rowHs = cells.map((row) => Math.max(size * 1.95, Math.max(...row.map((l) => l.length)) * lineH + padY));
  const rowH = size * 1.95;
  return { size, fam, rows, cols, cw, pad, rowH, rowHs, cells, lineH, height: rowHs.reduce((a, b) => a + b, 0), natural: total };
}
export function rasterTable(layer: Layer): Raster {
  const p = fitted(layer);
  const { canvas, ctx, w, rect } = boxCanvas(layer);
  const L = tableLayout(ctx, p, w);
  const ink = String(p.textColor ?? '#141414'), accent = String(p.accent ?? '#d94f2b');
  let y = 0;
  L.rows.forEach((r, i) => {
    const head = p.header !== false && i === 0, rh = L.rowHs[i];
    let x = 0;
    for (let c = 0; c < L.cols; c++) {
      const label = p.labels !== false && c === 0;
      setFont(ctx, L.fam, L.size, head || label ? 700 : 400);
      ctx.fillStyle = head ? accent : ink;
      ctx.textBaseline = 'middle';
      ctx.textAlign = c === 0 ? 'left' : 'center';
      const lines = L.cells[i][c], y0 = y + rh / 2 - ((lines.length - 1) * L.lineH) / 2;
      lines.forEach((ln, k) => ctx.fillText(ln, c === 0 ? x + (label ? 0 : L.pad) : x + L.cw[c] / 2, y0 + k * L.lineH));
      x += L.cw[c];
    }
    // A hairline under every row; the header's is the ink at full strength.
    ctx.globalAlpha = head ? 0.9 : 0.22;
    ctx.fillStyle = head ? accent : ink;
    ctx.fillRect(0, y + rh - (head ? 2 : 1), w, head ? 2 : 1);
    ctx.globalAlpha = 1;
    y += rh;
  });
  ctx.textAlign = 'left';
  return { canvas, rect };
}
