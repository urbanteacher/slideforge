import type { LayoutStyle } from '../../layouts';
import type { Layer } from '../../core';
import { BASE, FOOT, HY, LEFT, LIFT, PAD, W, box, eyebrow, ground, part, phonesCue, rect, rgba, slideOf, tint, txt } from '../engage/kit';
import { marked, type NodesFormat } from './types';

// Which step broke? A wrong answer, and the five operations of the Nodes answer routine under it.
// Nodes found most mistakes are not wrong ideas: the answer breaks at one step. Students tap the step;
// the reveal lights it, says why, and what to do instead.

export interface WhichStep {
  question: string;
  /** The wrong answer students diagnose. */
  answer: string;
  /** The routine's steps, each with what it asks. */
  steps: { name: string; asks: string }[];
  /** Which step broke (an index into steps). */
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

function steps(st: LayoutStyle, o: WhichStep, top: number, revealed: boolean): Layer[] {
  const list = o.steps.slice(0, 5), n = Math.max(1, list.length), colW = W / n;
  const out: Layer[] = [];
  list.forEach((s, i) => {
    const x0 = Math.round(i * colW), x1 = Math.round((i + 1) * colW);
    const col = box(x0, top, x1 - x0, BASE - top);
    const pad = i === 0 ? LEFT : PAD;
    const inner = (dy: number, h: number) => box(col.x + pad, col.y + dy, col.w - pad - PAD, h);
    const lit = revealed && i === o.broke;
    // Revealed, the other steps step back; the broken one is lit in the accent, its words in white.
    const back = revealed && !lit;
    const p = part('broke', 0, 'on', 0);
    if (lit) out.push(rect(`${s.name} — lit`, col, st.accent, p.lead('wipeUp')));
    else out.push(rect(`${s.name} — column`, col, tint(st, i)));
    out.push(
      txt(`${s.name} — number`, String(i + 1).padStart(2, '0'), inner(40, 70), { font: st.display, weight: st.displayWeight, size: 60, color: lit ? '#ffffff' : back ? rgba(st.accent, 0.55) : st.accent }),
      txt(`${s.name} — name`, s.name, inner(116, 90), { font: st.display, weight: st.displayWeight, size: n >= 5 ? 66 : 80, color: lit ? '#ffffff' : back ? rgba(st.ink, 0.55) : st.ink, lineHeight: 1, fitGroup: 'step-name' }),
    );
    if (lit) {
      // In place of what the step asks: why it broke, and what to write instead.
      out.push(txt(`${s.name} — why`, `${o.why}\n\nInstead: ${o.fix}`, inner(220, FOOT - col.y - 220), { font: st.body, weight: '600', size: 40, color: '#ffffff', lineHeight: 1.25 }, p.with(0.2)));
    } else {
      out.push(txt(`${s.name} — asks`, s.asks, inner(220, 150), { font: st.body, weight: '400', size: 36, color: back ? rgba(st.ink, 0.55) : st.muted, lineHeight: 1.25, fitGroup: 'step-asks' }));
    }
  });
  return out;
}

export const whichStep: NodesFormat<WhichStep> = {
  id: 'which-step', label: 'Which step broke?', part: 'The answer routine',
  aim: 'Most wrong answers are not wrong ideas: they break at one step. Students find the step a wrong answer broke at.',
  howTo: ['Read the question and the wrong answer.', 'On phones, tap the step that broke.', 'The click lights the step, why it broke, and what to write instead.'],
  phones: 'Tap the step that broke',
  starter: STARTER,
  slides: (st, o) => {
    const top = 600 - LIFT;
    const head = (label: string): Layer[] => [
      ground(st), eyebrow(st, label),
      txt('Question', o.question, box(LEFT, HY, W - LEFT * 2, 70), { font: st.body, weight: '600', size: 44, color: st.muted }),
      rect('Answer — panel', box(0, HY + 96, W, top - HY - 96 - 36), st.panel),
      txt('Answer', `“${o.answer}”`, box(LEFT, HY + 130, W - LEFT * 2, top - HY - 96 - 36 - 68), { font: st.display, weight: st.displayWeight, size: 76, color: st.ink, lineHeight: 1.1, balance: true }),
    ];
    const ask = slideOf('Which step broke?', [...head('Which step broke?'), phonesCue(st, 'tap the step that broke'), ...steps(st, o, top, false)], st,
      `Which step broke? ${o.question}\nThe answer: ${o.answer}\nIt broke at ${o.steps[o.broke]?.name}: ${o.why}`);
    const reveal = slideOf('Which step broke? · the step', [...head('Which step broke? · the step'), ...steps(st, o, top, true)], st,
      `It broke at ${o.steps[o.broke]?.name}. ${o.why}\nInstead: ${o.fix}`);
    return marked('which-step', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o);
  },
};
