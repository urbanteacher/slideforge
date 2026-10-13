import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, badge, card, heading, label, onClick, pill, still } from './look';
import { marked, type NodesFormat } from './types';

// Label the parts: a worked answer's parts, mixed up. Students tell a point from what explains it,
// what follows from it, and why — then the breakdown, in order, as the Nodes decks draw it: numbered
// rows, each with its part named in its colour.

export interface LabelParts {
  question: string;
  /** The worked answer's parts in order, each with its part of the join. */
  parts: { text: string; role: string }[];
  /** The order they are shown in, mixed up (indexes into parts); worked out when not given. */
  shown?: number[];
}

const ROLE_COLOUR: Record<string, string> = { Point: LINK.U, Explained: LINK.A, So: LINK.A, Because: LINK.A, Judgement: LINK.C };
const colourOf = (role: string) => ROLE_COLOUR[role] ?? LINK.J;

// Critical Text Analysis, stage 3 (Nodes): the worked answer's five useful elements.
const STARTER: LabelParts = {
  question: 'The advert says “5.2 GHz of pure power.” Pick the most revealing line, or what is missing, and say why.',
  parts: [
    { role: 'Point', text: '“5.2 GHz of pure power.”' },
    { role: 'Explained', text: 'a measurable number joined to an unmeasurable word' },
    { role: 'So', text: '“pure” borrows the number’s authority' },
    { role: 'Point', text: 'no cores, cache, battery life or heat' },
    { role: 'Because', text: 'it gives stronger evidence for my question' },
  ],
};

/** A fixed mix: the same every time it is drawn, never the answer's own order. */
function mixed(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.every((v, i) => v === i) && n > 1 ? [...out.slice(1), out[0]] : out;
}

export const labelParts: NodesFormat<LabelParts> = {
  id: 'label-parts', label: 'Label the parts', part: 'What a complete answer is made of',
  aim: 'A worked answer, mixed up: students tell a point from what explains it, what follows, and why. Then the breakdown, in order.',
  howTo: ['The parts of a good answer, in a mixed-up order.', 'On phones, sort each part: Point, Explained, So or Because.', 'Then the breakdown: each part in its place, a row per click.'],
  phones: 'Sort each part',
  starter: STARTER,
  slides: (st, o) => {
    const parts = o.parts.slice(0, 7), n = parts.length;
    const order = o.shown?.length === n ? o.shown : mixed(n);
    const roles = [...new Set(parts.map((p) => p.role))];
    let lx = LEFT;
    const legend = roles.flatMap((r) => { const w = r.length * 17 + 70; const l = pill(st, `Part ${r}`, r, lx, HY + 160, { w, fill: colourOf(r), color: '#ffffff', size: 26 }, still); lx += w + 14; return l; });
    const top = HY + 260, gap = 18, rh = Math.min(110, Math.floor((FOOT - top - gap * (n - 1)) / n));
    const ask = slideOf('Label the parts', [
      ground(st), label(st, 'Label the parts', LEFT, EY, 1100, st.accent, 30), phonesCue(st, 'sort each part'),
      heading(st, o.question, HY, 52, W - LEFT * 2, 140),
      ...legend,
      ...order.flatMap((pi, k) => {
        const y = top + k * (rh + gap);
        return [
          card(st, `Mixed ${k + 1}`, LEFT, y, W - LEFT * 2, rh, {}, still),
          card(st, `Mixed ${k + 1} — blank`, LEFT + 24, y + (rh - 56) / 2, 220, 56, { fill: rgba(st.ink, 0.06), sw: 0, radius: 28 }, still),
          T(st, `Mixed ${k + 1} — which`, 'which part?', LEFT + 24, y + (rh - 36) / 2, 220, 40, { weight: '700', size: 24, color: st.muted, align: 'center' }, still),
          T(st, `Mixed ${k + 1} — words`, parts[pi].text, LEFT + 280, y + (rh - 52) / 2, W - LEFT * 2 - 320, 56, { weight: '600', size: 38 }, still),
        ];
      }),
    ], st, `Label the parts. ${o.question}\nIn order: ${parts.map((p) => `${p.role}: ${p.text}`).join(' | ')}`);
    const rowH = Math.min(116, Math.floor((FOOT - (HY + 150) - 40) / n));
    const box0 = HY + 150;
    const reveal = slideOf('Label the parts · the breakdown', [
      ground(st), label(st, 'Breakdown · in the join’s terms', LEFT, EY, 1400, st.muted, 30),
      heading(st, `${n} useful elements`, HY, 72, 900, 90),
      T(st, 'Count note', 'a planning count, not marks', LEFT + 620, HY + 30, 700, 50, { size: 34, color: st.muted }, still),
      card(st, 'Breakdown', LEFT, box0, W - LEFT * 2, rowH * n + 40, {}, still),
      ...parts.flatMap((p, i) => {
        const y = box0 + 20 + i * rowH, col = colourOf(p.role), a = i ? onClick() : still, w = i ? after() : still;
        return [
          ...(i ? [card(st, `Rule ${i}`, LEFT + 40, y, W - LEFT * 2 - 80, 2, { fill: rgba(st.ink, 0.12), sw: 0, radius: 0 }, a)] : []),
          badge(st, LEFT + 50, y + (rowH - 56) / 2, 56, col, String(i + 1), i ? w : still),
          T(st, `Part ${i + 1} — role`, p.role, LEFT + 140, y + (rowH - 50) / 2, 300, 54, { weight: '800', size: 40, color: col }, i ? w : still),
          T(st, `Part ${i + 1} — words`, p.text, LEFT + 470, y + (rowH - 50) / 2, W - LEFT * 2 - 520, 56, { size: 40 }, i ? w : still),
        ];
      }),
    ], st, parts.map((p, i) => `${i + 1}. ${p.role}: ${p.text}`).join('\n'));
    return marked('label-parts', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o);
  },
};
