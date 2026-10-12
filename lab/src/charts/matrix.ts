// The matrix chart.
import { rowsOf } from './data';
import { H, P, W, label, rgba, type Pen } from './pen';

const ORDINAL = ['none', 'very low', 'weak', 'low', 'l', 'medium', 'med', 'moderate', 'm', 'high', 'h', 'strong', 'very high', 'severe'];
export function matrix(p: Pen, text: string) {
  const rows = rowsOf(text);
  if (rows.length < 2) return;
  const head = rows[0], body = rows.slice(1), cols = head.slice(1).filter((h) => h.trim());
  if (!cols.length) return;
  // One scale across the matrix, ordered by the words where they are known.
  const seen: string[] = [];
  body.forEach((r) => cols.forEach((_, j) => { const v = (r[j + 1] ?? '').trim(); if (v && !seen.includes(v)) seen.push(v); }));
  const ordered = [...seen].sort((x, y) => { const ix = ORDINAL.indexOf(x.toLowerCase()), iy = ORDINAL.indexOf(y.toLowerCase()); return ix >= 0 && iy >= 0 ? ix - iy : ix >= 0 ? -1 : iy >= 0 ? 1 : seen.indexOf(x) - seen.indexOf(y); });
  const rank: Record<string, number> = {};
  ordered.forEach((v, i) => { rank[v] = ordered.length > 1 ? i / (ordered.length - 1) : 1; });
  p.ctx.font = `500 ${p.px}px "${p.font}"`;
  const padL = Math.min(380, 30 + Math.max(...body.map((r) => p.ctx.measureText(r[0] ?? '').width)));
  const plotW = W - padL - P.padR, plotH = H - P.padT - 12 - p.px * 1.6;
  const cw = plotW / cols.length, rh = Math.min(p.px * 2.2, plotH / Math.max(1, body.length));
  cols.forEach((c, j) => label(p, c, padL + cw * j + cw / 2, P.padT + p.px, 'middle'));
  body.forEach((r, i) => {
    const y = P.padT + p.px * 1.6 + rh * i;
    p.beat(i);
    label(p, r[0] ?? '', padL - 12, y + rh * 0.62, 'end');
    cols.forEach((_, j) => {
      const v = (r[j + 1] ?? '').trim();
      if (!v) return;
      const t = rank[v] ?? 0;
      p.ctx.fillStyle = rgba(p.col(0), 0.16 + t * 0.78);
      p.ctx.beginPath(); p.ctx.roundRect(padL + cw * j + 4, y, Math.max(8, cw - 8), rh - 6, 5); p.ctx.fill();
      label(p, v, padL + cw * j + cw / 2, y + rh * 0.62, 'middle', { weight: 600, color: t > 0.55 ? '#ffffff' : p.ink, size: 0.9 });
    });
    p.settle();
  });
}
