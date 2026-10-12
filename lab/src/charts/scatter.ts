// The scatter chart.
import { chartPoints } from './data';
import { H, P, W, baseline, fmt, label, line, niceRange, ticks, type Pen } from './pen';

export function scatter(p: Pen, text: string) {
  const d = chartPoints(text);
  const plotW = W - P.padL - P.padR, plotH = H - P.padT - P.padB;
  const xs = d.series.flatMap((s) => s.points.map((q) => q.x)), ys = d.series.flatMap((s) => s.points.map((q) => q.y));
  if (!xs.length) return;
  const xr = niceRange(Math.min(...xs), Math.max(...xs)), yr = niceRange(Math.min(...ys), Math.max(...ys));
  const xAt = (v: number) => P.padL + ((v - xr.lo) / (xr.hi - xr.lo || 1)) * plotW;
  const yAt = (v: number) => P.padT + plotH - ((v - yr.lo) / (yr.hi - yr.lo || 1)) * plotH;
  ticks(yr.hi - yr.lo).forEach((t) => { const y = yAt(yr.lo + t); line(p, P.padL, y, P.padL + plotW, y, p.rule); label(p, fmt(yr.lo + t), P.padL - 14, y + p.px * 0.37, 'end'); });
  ticks(xr.hi - xr.lo).forEach((t) => label(p, fmt(xr.lo + t), xAt(xr.lo + t), H - P.padB + 30, 'middle'));
  // Labels nudged up until they clear the ones placed, a leader keeping each on its dot.
  const placed: { x: number; y: number; w: number }[] = [];
  const small = 15 / 19;
  d.series.forEach((s, si) => {
    p.beat(si);
    s.points.forEach((pt) => {
      const cx = xAt(pt.x), cy = yAt(pt.y), r = 9;
      p.ctx.fillStyle = p.col(si); p.ctx.beginPath(); p.ctx.arc(cx, cy, r, 0, Math.PI * 2); p.ctx.fill();
      if (!pt.label) return;
      p.ctx.font = `600 ${p.px * small}px "${p.font}"`;
      const wide = p.ctx.measureText(pt.label).width, step = p.px * small * 1.15;
      let ly = cy - r - 9, guard = 0;
      while (guard++ < 24 && placed.some((q) => Math.abs(q.y - ly) < step && Math.abs(q.x - cx) < (q.w + wide) / 2 + 6)) ly -= step;
      placed.push({ x: cx, y: ly, w: wide });
      if (cy - r - ly > step) line(p, cx, cy - r, cx, ly + 4, p.rule);
      label(p, pt.label, cx, ly, 'middle', { size: small, weight: 600, color: p.ink });
    });
    p.settle();
  });
  if (d.xLabel) label(p, d.xLabel, P.padL + plotW / 2, H - 6, 'middle', { weight: 600 });
  baseline(p, P.padL, plotW, plotH);
  line(p, P.padL, P.padT, P.padL, P.padT + plotH, p.rule, 1.5);
}
