import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, barCard, card, heading, label, onClick, pill, still } from './look';
import { marked, sortQuiz, type NodesFormat } from './types';

// Keep them apart: two ideas treated as one — 300 of 662 named wrong ideas in the examiner reports (Nodes).
// The pair side by side, the one test that tells them apart, then statements to sort to the right side.

export interface KeepApart {
  a: { term: string; is: string };
  b: { term: string; is: string };
  test: string;
  statements: { text: string; side: 'a' | 'b' }[];
}

// Nodes src/data/distinctions.ts, cpu-agency.
const STARTER: KeepApart = {
  a: { term: 'Registers (PC, MAR, MDR, CIR, ACC)', is: 'Hold one thing: an address, an instruction or a value.' },
  b: { term: 'Control unit', is: 'Directs the work: decodes instructions and sends the control signals that coordinate the other parts.' },
  test: 'Does it hold something, or do something? A register only holds.',
  statements: [
    { text: 'Holds the address of the next instruction', side: 'a' },
    { text: 'Decodes the instruction', side: 'b' },
    { text: 'Holds the value being worked on', side: 'a' },
    { text: 'Sends signals that coordinate the other parts', side: 'b' },
    { text: 'Holds the instruction being decoded', side: 'a' },
    { text: 'Tells the ALU what to do', side: 'b' },
  ],
};

export const keepApart: NodesFormat<KeepApart> = {
  id: 'keep-apart', label: 'Keep them apart', part: 'Two ideas treated as one',
  aim: 'Two ideas students treat as one, side by side, with the one test that tells them apart; then sort the statements.',
  howTo: ['The pair, and the test that tells them apart.', 'On phones, sort each statement to one side.', 'Each click puts the next statement where it belongs.'],
  phones: 'Sort each statement',
  starter: STARTER,
  slides: (st, o) => {
    const cw = Math.floor((W - LEFT * 2 - 40) / 2), xa = LEFT, xb = LEFT + cw + 40;
    const cy = HY + 110, chh = 220;
    const pair = [
      card(st, 'A', xa, cy, cw, chh, { stroke: LINK.U, sw: 3 }, still),
      T(st, 'A — term', o.a.term, xa + 36, cy + 24, cw - 72, 56, { weight: '800', size: 38, color: LINK.U }, still),
      T(st, 'A — is', o.a.is, xa + 36, cy + 92, cw - 72, chh - 110, { size: 30, lineHeight: 1.25 }, still),
      card(st, 'B', xb, cy, cw, chh, { stroke: LINK.X, sw: 3 }, still),
      T(st, 'B — term', o.b.term, xb + 36, cy + 24, cw - 72, 56, { weight: '800', size: 38, color: LINK.X }, still),
      T(st, 'B — is', o.b.is, xb + 36, cy + 92, cw - 72, chh - 110, { size: 30, lineHeight: 1.25 }, still),
      ...barCard(st, 'Test', LEFT, cy + chh + 26, W - LEFT * 2, 90, st.accent, rgba(st.accent, 0.1), still),
      T(st, 'Test — words', `The test: ${o.test}`, LEFT + 44, cy + chh + 44, W - LEFT * 2 - 88, 56, { weight: '800', size: 34 }, still),
    ];
    const sy = cy + chh + 150, list = o.statements.slice(0, 8);
    const sh = Math.min(76, Math.floor((FOOT - sy - 12 * (Math.ceil(list.length / 2) - 1)) / Math.ceil(list.length / 2)));
    const ask = slideOf('Keep them apart', [
      ground(st), label(st, 'Keep them apart', LEFT, EY, 1300, st.accent, 30), phonesCue(st, 'sort each statement'),
      heading(st, 'Two ideas, often treated as one', HY, 56, W - LEFT * 2, 80), ...pair,
      ...list.flatMap((s, i) => {
        const x = i % 2 ? xb : xa, y = sy + Math.floor(i / 2) * (sh + 12);
        return pill(st, `Statement ${i + 1}`, s.text, x, y, { w: cw, h: sh, fill: st.panel, size: 28, weight: '600' }, still);
      }),
    ], st, `Keep them apart: ${o.a.term} and ${o.b.term}. The test: ${o.test}`);
    const sorted = (side: 'a' | 'b') => list.map((s, i) => ({ s, i })).filter((x) => x.s.side === side);
    const reveal = slideOf('Keep them apart · sorted', [
      ground(st), label(st, 'Keep them apart · sorted', LEFT, EY, 1300, st.accent, 30),
      heading(st, 'Which side does each go on?', HY, 56, W - LEFT * 2, 80), ...pair,
      ...(['a', 'b'] as const).flatMap((side) => sorted(side).flatMap(({ s }, k) => {
        const x = side === 'a' ? xa : xb, y = sy + k * (sh + 12), col = side === 'a' ? LINK.U : LINK.X;
        return [card(st, `Sorted ${side} ${k + 1}`, x, y, cw, sh, { fill: rgba(col, 0.12), stroke: col, sw: 2, radius: Math.round(sh / 2) }, onClick()),
          T(st, `Sorted ${side} ${k + 1} — words`, s.text, x, y + (sh - 38) / 2, cw, 42, { weight: '600', size: 28, align: 'center' }, after())];
      })),
    ], st, `${o.a.term}: ${sorted('a').map((x) => x.s.text).join('; ')}.\n${o.b.term}: ${sorted('b').map((x) => x.s.text).join('; ')}.`);
    return marked('keep-apart', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o,
      { ask: 'ask', answer: 'reveal', quiz: sortQuiz(`Which is it? ${o.test}`, [o.a.term, o.b.term], list.map((s) => s.text), list.map((s) => (s.side === 'b' ? 1 : 0))) });
  },
};
