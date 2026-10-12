// Reading a chart's table: categories and series, points, groups, flows and bins (SlideForge's readers).

// ─── Reading the table ──────────────────────────────────────────────────────
export function rowsOf(text: string): string[][] {
  return String(text ?? '').split(/\r?\n/).filter((l) => l.trim()).slice(0, 200)
    .map((l) => (l.includes('\t') ? l.split('\t') : l.includes('|') ? l.split('|') : l.split(',')).map((c) => c.trim()));
}
function num(cell: unknown): number | null {
  const raw = String(cell ?? '').replace(/[,\s%£$€]/g, '');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
export interface Data { categories: string[]; series: { name: string; values: (number | null)[] }[] }
export function chartData(text: string): Data {
  const rows = rowsOf(text);
  if (rows.length < 2) return { categories: [], series: [] };
  const head = rows[0], body = rows.slice(1);
  const names = head.slice(1).filter((h) => h.trim());
  return { categories: body.map((r) => r[0] ?? ''), series: names.map((name, i) => ({ name, values: body.map((r) => num(r[i + 1])) })) };
}
export function chartPoints(text: string) {
  const rows = rowsOf(text);
  if (rows.length < 2) return { series: [] as { name: string; points: { x: number; y: number; label: string }[] }[], xLabel: '' };
  const head = rows[0], body = rows.slice(1);
  const labelled = body.length > 0 && num(body[0][0]) == null, xCol = labelled ? 1 : 0;
  const names = head.slice(xCol + 1).filter((h) => h.trim());
  return {
    series: names.map((name, i) => ({ name, points: body.flatMap((r) => { const x = num(r[xCol]), y = num(r[xCol + 1 + i]); return x != null && y != null ? [{ x, y, label: labelled ? r[0] ?? '' : '' }] : []; }) })),
    xLabel: head[xCol] ?? '',
  };
}
export function chartGroups(text: string) {
  const rows = rowsOf(text);
  if (!rows.length) return [];
  const body = rows.length > 1 && num(rows[0][1]) == null ? rows.slice(1) : rows;
  return body.map((r) => ({ name: r[0] ?? '', values: r.slice(1).map(num).filter((v): v is number => v != null).sort((a, b) => a - b) })).filter((g) => g.values.length);
}
export function fiveNumber(s: number[]) {
  const q = (p: number) => { const pos = (s.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo); };
  const q1 = q(0.25), median = q(0.5), q3 = q(0.75), iqr = q3 - q1, lf = q1 - 1.5 * iqr, hf = q3 + 1.5 * iqr;
  const inside = s.filter((v) => v >= lf && v <= hf);
  return { min: inside.length ? inside[0] : s[0], q1, median, q3, max: inside.length ? inside[inside.length - 1] : s[s.length - 1], outliers: s.filter((v) => v < lf || v > hf), n: s.length };
}
interface FNode { name: string; depth: number; in: number; out: number; total: number; x: number; y: number; h: number; inAt: number; outAt: number }
export function chartFlows(text: string) {
  const links = rowsOf(text).flatMap((r) => { const v = num(r[2]); return r[0] && r[1] && v != null && v > 0 ? [{ from: r[0], to: r[1], value: v }] : []; });
  const names: string[] = [];
  links.forEach((l) => { if (!names.includes(l.from)) names.push(l.from); if (!names.includes(l.to)) names.push(l.to); });
  const nodes: FNode[] = names.map((name) => ({ name, depth: 0, in: 0, out: 0, total: 0, x: 0, y: 0, h: 0, inAt: 0, outAt: 0 }));
  const idx: Record<string, number> = {};
  nodes.forEach((n, i) => { idx[n.name] = i; });
  // Longest-path layering, bounded by the node count so a cycle stops rather than spins.
  for (let pass = 0; pass < nodes.length; pass++) {
    let moved = false;
    links.forEach((l) => { const a = nodes[idx[l.from]], b = nodes[idx[l.to]]; if (b.depth < a.depth + 1) { b.depth = a.depth + 1; moved = true; } });
    if (!moved) break;
  }
  links.forEach((l) => { nodes[idx[l.from]].out += l.value; nodes[idx[l.to]].in += l.value; });
  nodes.forEach((n) => { n.total = Math.max(n.in, n.out); });
  return { nodes, links, idx, layers: links.length ? Math.max(...nodes.map((n) => n.depth)) + 1 : 0 };
}
export function chartValues(text: string) {
  return rowsOf(text).flatMap((r) => r.map(num).filter((v): v is number => v != null)).sort((a, b) => a - b);
}
export function histogramBins(values: number[]) {
  if (!values.length) return [];
  const lo = values[0], hi = values[values.length - 1];
  if (hi === lo) return [{ from: lo, to: lo, count: values.length }];
  const n = Math.max(5, Math.min(14, Math.ceil(Math.log2(values.length) + 1))), width = (hi - lo) / n;
  const bins = Array.from({ length: n }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }));
  values.forEach((v) => { bins[Math.min(n - 1, Math.floor((v - lo) / width))].count++; });
  return bins;
}
