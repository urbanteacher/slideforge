import type { LayoutStyle } from '../../layouts';
import type { Layer } from '../../core';
import { BASE, FOOT, HY, LEFT, LIFT, ON_RIGHT, PAD, RIGHT, W, box, eyebrow, ground, hero, part, phonesCue, rect, rgba, slideOf, tint, txt } from '../engage/kit';
import { marked, type NodesFormat } from './types';

// Three answers: the same question answered weak, stable and excellent. Students pick the strongest,
// then say why; the reveal names each one and what it is missing. A misses the point, B has points
// without the links, C has the links: the method's own three levels.

export type Verdict = 'weak' | 'stable' | 'excellent';
export interface ThreeAnswers {
  question: string;
  answers: { label: string; text: string; verdict: Verdict; why: string }[];
}

// The CPU stage's own three answers (Nodes, GCSE Computer Science, Describe).
const STARTER: ThreeAnswers = {
  question: 'Describe the main components of the CPU.',
  answers: [
    { label: 'A', verdict: 'weak', text: 'The CPU has a hard drive and RAM.', why: 'Names storage and memory, not the CPU’s own components.' },
    { label: 'B', verdict: 'stable', text: 'Control unit: decodes instructions and sends control signals. ALU: the brain of the CPU. Registers: store data. Cache: stores data. Clock: controls the speed of the computer.', why: 'Only the control unit has its exact purpose. “Stores data” could be any memory, and “the brain” is a label.' },
    { label: 'C', verdict: 'excellent', text: 'Control unit: decodes instructions and sends control signals. ALU: performs arithmetic and logical operations. Registers: tiny, fast stores inside the CPU. Cache: fast memory for frequently used data. Clock: timing signals that keep operations in step.', why: 'Each component paired with its specific role.' },
  ],
};

const SAYS: Record<Verdict, string> = { weak: 'Weak', stable: 'Stable', excellent: 'Excellent' };

function columns(st: LayoutStyle, o: ThreeAnswers, top: number, judged: boolean): Layer[] {
  const list = o.answers.slice(0, 3), n = Math.max(1, list.length), colW = W / n;
  const out: Layer[] = [];
  list.forEach((a, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, top, x1 - x0, BASE - top);
    const pad = i === 0 ? LEFT : PAD;
    const inner = (dy: number, h: number) => box(col.x + pad, col.y + dy, col.w - pad - PAD, h);
    const verdictH = judged ? 250 : 0;
    out.push(
      rect(`${a.label} — column`, col, tint(st, i)),
      txt(`${a.label} — letter`, a.label, inner(36, 120), { font: st.display, weight: st.displayWeight, size: 112, color: st.accent, lineHeight: 1 }),
      txt(`${a.label} — answer`, a.text, inner(170, FOOT - col.y - 170 - verdictH), { font: st.body, weight: '400', size: 42, color: st.ink, lineHeight: 1.3, fitGroup: 'answer-text' }),
    );
    if (judged) {
      const p = part('verdicts', i, 'on', 0);
      const best = a.verdict === 'excellent';
      const band = box(col.x, BASE - verdictH, col.w, verdictH);
      out.push(
        rect(`${a.label} — verdict band`, band, best ? RIGHT : a.verdict === 'stable' ? rgba(st.accent, 0.22) : rgba(st.ink, 0.12), p.lead('wipeUp')),
        txt(`${a.label} — verdict`, SAYS[a.verdict], box(band.x + pad, band.y + 26, band.w - pad - PAD, 70), { font: st.display, weight: st.displayWeight, size: 60, color: best ? ON_RIGHT : st.ink, lineHeight: 1 }, p.with(0.1)),
        txt(`${a.label} — why`, a.why, box(band.x + pad, band.y + 104, band.w - pad - PAD, verdictH - 124), { font: st.body, weight: '500', size: 32, color: best ? ON_RIGHT : st.ink, lineHeight: 1.25, fitGroup: 'verdict-why' }, p.with(0.2)),
      );
    }
  });
  return out;
}

export const threeAnswers: NodesFormat<ThreeAnswers> = {
  id: 'three-answers', label: 'Three answers', part: 'Weak, stable and excellent',
  aim: 'Three answers to one question: pick the strongest, say why, then see what each one is missing.',
  howTo: ['Read the three answers.', 'On phones, pick the strongest, then say why.', 'Each click names one answer and what it is missing.'],
  phones: 'Pick the strongest, then say why',
  starter: STARTER,
  slides: (st, o) => {
    const top = 400 - LIFT;
    const ask = slideOf('Three answers', [
      ground(st), eyebrow(st, 'Three answers'), phonesCue(st, 'pick the strongest'),
      hero(st, 'Question', o.question, box(LEFT, HY, W - LEFT * 2, top - HY - 30), 88),
      ...columns(st, o, top, false),
    ], st, `Three answers. ${o.question}\nWhich is strongest, and why? ${o.answers.map((a) => `${a.label}: ${SAYS[a.verdict]}`).join('; ')}.`);
    const reveal = slideOf('Three answers · the verdicts', [
      ground(st), eyebrow(st, 'Three answers · the verdicts'),
      hero(st, 'Question', o.question, box(LEFT, HY, W - LEFT * 2, top - HY - 30), 72),
      ...columns(st, o, top, true),
    ], st, o.answers.map((a) => `${a.label}, ${SAYS[a.verdict]}: ${a.why}`).join('\n'));
    return marked('three-answers', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o);
  },
};
