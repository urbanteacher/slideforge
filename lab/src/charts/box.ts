// The box chart.
import { chartGroups, fiveNumber } from './data';
import { H, P, W, baseline, fmt, label, line, niceRange, rgba, ticks, type Pen } from './pen';

export function box(p: Pen, text: string) {
  const groups = chartGroups(text);
  if (!groups.length) return;
  const all = groups.flatMap((g) => g.values), rng = niceRange(Math.min(...all), Math.max(...all));
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const yAt = (v: number) => P.padT + plotH - ((v - rng.lo) / (rng.hi - rng.lo || 1)) * plotH;
  ticks(rng.hi - rng.lo).forEach((t) => { const y = yAt(rng.lo + t); line(p, P.padL, y, P.padL + plotW, y, p.rule); label(p, fmt(rng.lo + t), P.padL - 14, y + p.px * 0.37, 'end'); });
  const band = plotW / groups.length, bw = Math.min(band * 0.5, 130);
  groups.forEach((g, i) => {
    const f = fiveNumber(g.values), cx = P.padL + band * i + band / 2, x = cx - bw / 2, col = p.col(i), { ctx } = p;
    p.beat(i);
    // Whisker, then box, then median: the median has to sit above the fill.
    line(p, cx, yAt(f.min), cx, yAt(f.max), col, 2);
    line(p, cx - bw / 4, yAt(f.min), cx + bw / 4, yAt(f.min), col, 2);
    line(p, cx - bw / 4, yAt(f.max), cx + bw / 4, yAt(f.max), col, 2);
    ctx.fillStyle = rgba(col, 0.32); ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, yAt(f.q3), bw, Math.max(1, yAt(f.q1) - yAt(f.q3)), 3); ctx.fill(); ctx.stroke();
    ctx.lineCap = 'round'; line(p, x, yAt(f.median), x + bw, yAt(f.median), col, 5); ctx.lineCap = 'butt';
    f.outliers.forEach((v) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, yAt(v), 5, 0, Math.PI * 2); ctx.stroke(); });
    p.settle();
    label(p, `${g.name} · n=${f.n}`, cx, H - P.padB + 30, 'middle');
  });
  baseline(p, P.padL, plotW, plotH);
}
