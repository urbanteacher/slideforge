import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, barCard, card, label, onClick, after, still } from './look';
import { marked, type NodesFormat } from './types';

// Which step broke? A wrong answer in a quote card, and the operations of the Nodes answer routine as
// cards with ⇄ between them, as the Nodes decks draw "operations you move between, not steps in a
// fixed order". Most wrong answers are not wrong ideas: they break at one operation. The reveal marks
// it, says where the answer breaks down, and what to write instead.

export interface WhichStep {
  question: string;
  /** The wrong answer students diagnose. */
  answer: string;
  /** The routine's operations, each with what it asks. */
  steps: { name: string; asks: string }[];
  /** Which operation broke (an index into steps). */
  broke: number;
  why: string;
  fix: string;
}

export const ROUTINE = [
  { name: 'Decode', asks: 'What is the question asking for?' },
  { name: 'Retrieve', asks: 'What do I need to know?' },
  { name: 'Reason', asks: 'How do the ideas connect?' },
  { name: 'Express', asks: 'Is it said precisely?' },
  { name: 'Check', asks: 'Does it answer the question?' },
];

const STARTER: WhichStep = {
  question: 'Describe the purpose of the program counter (PC).',
  answer: 'The program counter counts how many programs are running.',
  steps: ROUTINE,
  broke: 1,
  why: 'The wrong meaning was retrieved: the name was guessed from its words.',
  fix: 'The PC holds the address of the next instruction to be fetched.',
};

export const whichStep: NodesFormat<WhichStep> = {
  id: 'which-step', label: 'Which step broke?', part: 'The answer routine',
  aim: 'Most wrong answers are not wrong ideas: they break at one operation. Students find where a wrong answer broke.',
  howTo: ['Read the question and the wrong answer.', 'On phones, tap the operation that broke.', 'The click marks it, where the answer breaks down, and what to write instead.'],
  phones: 'Tap the step that broke',
  starter: STARTER,
  slides: (st, o) => {
    const ops = o.steps.slice(0, 5), n = Math.max(1, ops.length), gap = 56;
    const cw = Math.floor((W - LEFT * 2 - gap * (n - 1)) / n);
    const qy = HY + 70, qh = 190, y0 = qy + qh + 50, ch = 300;
    const head = (lbl: string) => [
      ground(st), label(st, lbl, LEFT, EY, 1100, st.accent, 30),
      T(st, 'Question', o.question, LEFT, HY, W - LEFT * 2, 56, { weight: '600', size: 40, color: st.muted }, still),
      ...barCard(st, 'The answer', LEFT, qy, W - LEFT * 2, qh, st.accent, st.panel, still),
      txtAnswer(),
    ];
    function txtAnswer() {
      return T(st, 'The answer — words', `“${o.answer}”`, LEFT + 50, qy + 30, W - LEFT * 2 - 100, qh - 60, { font: st.display, weight: st.displayWeight, size: 60, lineHeight: 1.1, valign: 'middle' }, still);
    }
    const cards = (revealed: boolean) => ops.flatMap((s, i) => {
      const x = LEFT + i * (cw + gap), broke = revealed && i === o.broke;
      const col = broke ? LINK.X : LINK.U;
      const out = [
        card(st, `${s.name} — card`, x, y0, cw, ch, broke ? { stroke: LINK.X, sw: 5, fill: rgba(LINK.X, 0.08) } : { stroke: rgba(LINK.U, 0.55), sw: 3 }, broke ? onClick() : still),
        T(st, `${s.name} — name`, s.name, x + 28, y0 + 28, cw - 56, 56, { weight: '800', size: 42, color: col }, broke ? after() : still),
        T(st, `${s.name} — asks`, s.asks, x + 28, y0 + 96, cw - 56, broke ? 90 : 170, { size: 30, lineHeight: 1.25, fitGroup: 'asks' }, broke ? after() : still),
      ];
      if (broke) out.push(T(st, `${s.name} — breaks`, 'Where this answer breaks down', x + 28, y0 + ch - 92, cw - 56, 70, { weight: '800', size: 24, color: LINK.X, lineHeight: 1.2 }, after()));
      if (i) out.push(T(st, 'Between', '⇄', x - gap, y0 + ch / 2 - 30, gap, 60, { weight: '700', size: 40, align: 'center', color: st.muted }, still));
      return out;
    });
    const fy = y0 + ch + 36, fh = Math.max(110, FOOT - fy);
    const ask = slideOf('Which step broke?', [...head('Which step broke?'), phonesCue(st, 'tap the step that broke'), ...cards(false)], st,
      `Which step broke? ${o.question}\nThe answer: ${o.answer}\nIt broke at ${o.steps[o.broke]?.name}: ${o.why}`);
    const reveal = slideOf('Which step broke? · where it breaks', [...head('Which step broke?'), ...cards(true),
      ...barCard(st, 'Instead', LEFT, fy, W - LEFT * 2, fh, LINK.A, rgba(LINK.A, 0.12), onClick()),
      T(st, 'Instead — words', `${o.why}\nInstead: ${o.fix}`, LEFT + 44, fy + 22, W - LEFT * 2 - 88, fh - 44, { weight: '600', size: 34, valign: 'middle' }, after()),
    ], st, `It broke at ${o.steps[o.broke]?.name}. ${o.why}\nInstead: ${o.fix}`);
    return marked('which-step', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o);
  },
};
