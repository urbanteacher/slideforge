import { EY, FOOT, HY, LEFT, ON_RIGHT, RIGHT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, answerTabs, badge, barCard, card, elementDots, heading, label, onClick, after, pill } from './look';
import { marked, choiceQuiz, type NodesFormat } from './types';

// Three answers: the same question answered weak, stable and excellent, as the Nodes decks show them.
// The room sees the three side by side and picks the strongest; then each answer has its own slide —
// its tab lit, its element dots, what may be missing, and the feedback for it.

export type Verdict = 'weak' | 'stable' | 'excellent';
export interface ThreeAnswers {
  question: string;
  answers: { label: string; text: string; verdict: Verdict; why: string; feedback: string; elements: number; of: number }[];
}

// The CPU stage's own three answers (Nodes, GCSE Computer Science, Describe).
const STARTER: ThreeAnswers = {
  question: 'Describe the main components of the CPU.',
  answers: [
    { label: 'A', verdict: 'weak', elements: 0, of: 6, text: 'The CPU has a hard drive and RAM.', why: 'No useful elements: names storage and memory, not the CPU’s own components.', feedback: '“Take one component. What does it do while a program runs?”' },
    { label: 'B', verdict: 'stable', elements: 1, of: 6, text: 'Control unit: decodes instructions and sends control signals. ALU: the brain of the CPU. Registers: store data. Cache: stores data. Clock: controls the speed of the computer.', why: 'Only the control unit has its exact purpose. “Stores data” could be any memory, and “the brain” is a label.', feedback: '“What exactly does it hold or do? Say it without a label.”' },
    { label: 'C', verdict: 'excellent', elements: 6, of: 6, text: 'Control unit: decodes instructions and sends control signals. ALU: performs arithmetic and logical operations. Registers: tiny, fast stores inside the CPU. The PC: holds the address of the next instruction. Cache: fast memory for frequently used data. Clock: timing signals that keep operations in step.', why: 'Every component paired with its specific role.', feedback: 'A fresh, independent task: “Describe the main parts of a computer around the CPU.”' },
  ],
};

const TABS = ['Weak answer', 'Stable answer', 'Excellent answer'];
const ORDER: Verdict[] = ['weak', 'stable', 'excellent'];

export const threeAnswers: NodesFormat<ThreeAnswers> = {
  id: 'three-answers', label: 'Three answers', part: 'Weak, stable and excellent',
  aim: 'Three answers to one question: pick the strongest and say why, then see each one’s elements and what it is missing.',
  howTo: ['Read the three answers.', 'On phones, pick the strongest, then say why.', 'Then each answer in turn: its elements, what is missing, and its feedback.'],
  phones: 'Pick the strongest, then say why',
  starter: STARTER,
  slides: (st, o) => {
    const list = o.answers.slice(0, 3), n = Math.max(1, list.length), gap = 40;
    const cw = Math.floor((W - LEFT * 2 - gap * (n - 1)) / n), y0 = HY + 170, ch = FOOT - y0;
    const ask = slideOf('Three answers', [
      ground(st), label(st, 'Three answers', LEFT, EY, 1100, st.accent, 30), phonesCue(st, 'pick the strongest'),
      heading(st, o.question, HY, 60, W - LEFT * 2, 140),
      ...list.flatMap((a, i) => {
        const x = LEFT + i * (cw + gap);
        return [
          card(st, `Answer ${a.label}`, x, y0, cw, ch, {}, onClick()),
          badge(st, x + 36, y0 + 36, 84, st.accent, a.label, after()),
          T(st, `Answer ${a.label} — words`, a.text, x + 36, y0 + 150, cw - 72, ch - 190, { weight: '500', size: 34, lineHeight: 1.3, fitGroup: 'answer' }, after()),
        ];
      }),
    ], st, `Three answers. ${o.question}\nWhich is strongest, and why? ${list.map((a) => `${a.label} is ${a.verdict}`).join('; ')}.`);
    const each = ORDER.map((v, ti) => ({ v, ti, a: list.find((x) => x.verdict === v) })).filter((e) => e.a).map(({ v, ti, a }) => {
      const best = v === 'excellent';
      const dotsColor = best ? LINK.A : LINK.U;
      const fy = FOOT - 170;
      return { slide: slideOf(`Answers: ${v}`, [
        ground(st), label(st, 'Answers', LEFT, EY, 1100, st.accent, 30),
        ...answerTabs(st, ti, HY, TABS),
        ...elementDots(st, a!.elements, a!.of, LEFT, HY + 104, dotsColor),
        ...pill(st, 'Answer', `Student ${a!.label}`, W - LEFT - 240, HY + 92, { w: 240, fill: rgba(st.ink, 0.08), size: 26 }),
        T(st, 'The answer', a!.text, LEFT, HY + 170, W - LEFT * 2, fy - HY - 170 - 150, { weight: '600', size: best ? 38 : 46, color: v === 'weak' ? st.muted : st.ink, lineHeight: 1.3 }),
        ...pill(st, 'Verdict', best ? 'Excellent' : v === 'stable' ? 'Stable' : 'Weak', LEFT, fy - 130, { w: 200, fill: best ? RIGHT : v === 'stable' ? rgba(LINK.U, 0.18) : rgba(LINK.X, 0.18), color: best ? ON_RIGHT : st.ink, size: 26 }, onClick()),
        T(st, 'What may be missing', a!.why, LEFT + 228, fy - 128, W - LEFT * 2 - 228, 110, { weight: '700', size: 32 }, after()),
        ...barCard(st, 'Feedback', LEFT, fy, W - LEFT * 2, 150, LINK.A, rgba(LINK.A, 0.12), onClick()),
        T(st, 'Feedback — words', `Feedback for this answer: ${a!.feedback}`, LEFT + 44, fy + 26, W - LEFT * 2 - 88, 100, { size: 34 }, after()),
      ], st, `The ${v} answer (${a!.label}): ${a!.text}\n${a!.elements} of ${a!.of} elements. ${a!.why}\nFeedback: ${a!.feedback}`), role: `answer-${v}` };
    });
    const best = Math.max(0, list.findIndex((a) => a.verdict === 'excellent'));
    return marked('three-answers', [{ slide: ask, role: 'ask' }, ...each], o,
      { ask: 'ask', answer: each[0]?.role, paper: `Hands up · ${list.map((a) => a.label).join(', ').replace(/, ([^,]*)$/, ' or $1')}`, quiz: choiceQuiz(`${o.question} Which answer is strongest?`, list.map((a) => `Answer ${a.label}`), best, list[best]?.why ?? '') });
  },
};
