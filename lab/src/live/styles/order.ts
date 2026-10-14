// Ranking (style 'order', format 'ranking'): the phones send an ordering (indices into the options, which are authored
// in the right order). The mark is "every item in its place" (SlideForge's markResponse); the part marks are the
// host's: the reveal carries `gains` of round(10 x the share in place) for each answer, as classic's orderGains does. A
// question with `scaled` (a Nodes challenge's, worth the same as its choices and sorts) earns its points x the share instead.
// The wall, once revealed, lists the right order with a bar for each place showing how many of the room had the right
// item there, and the pair the room swapped most often (classic's orderSlots).
import { orderPoints, orderScore } from '@sf/games/order.js';
import { gameStyle } from '@sf/games/registry.js';
import { defineStyle, type SlotsModel } from './types';

/** For each place, how many put the right item there; and the pair swapped most (items are authored in the right order, so item i belongs in place i). */
export function slotsOf(options: string[], answers: { response: unknown }[]): SlotsModel {
  const n = options.length;
  const here = new Array<number>(n).fill(0);
  const swaps = new Map<string, number>();
  let total = 0;
  for (const a of answers) {
    const r = a.response;
    if (!Array.isArray(r) || r.length !== n) continue;
    total++;
    r.forEach((item, place) => { if (item === place) here[place]++; });
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) if (r[p] === q && r[q] === p) swaps.set(`${p}:${q}`, (swaps.get(`${p}:${q}`) ?? 0) + 1);
  }
  let swap: SlotsModel['swap'] = null;
  for (const [k, c] of swaps) {
    if (swap && c <= swap.n) continue; // the first pair to reach the most, as classic's loop keeps it
    const [p, q] = k.split(':').map(Number);
    swap = { pair: [p, q], labels: [options[p], options[q]], n: c };
  }
  return { slots: options.map((label, place) => ({ place, label, here: here[place] })), total, swap };
}

export const order = defineStyle({
  key: 'order', name: 'Ranking', formats: ['ranking'], input: 'order',
  // The style's own normalize and compile (src/games/order.js): the items in their right order, the first the answer.
  prepare(q) {
    const st = gameStyle('order');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  gains: (q, answers) => answers.map((a) => [a.id, q.scaled === true ? Math.round((Number(q.points) || 0) * orderScore(q, a.response)) : orderPoints(q, a.response)] as [number, number]),
  wall: (q, answers, revealed) => ({ kind: 'slots', slots: revealed ? slotsOf(q.options.filter((o) => String(o).trim()), answers) : null }),
});
