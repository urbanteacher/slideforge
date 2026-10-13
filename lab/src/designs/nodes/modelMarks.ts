import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, badge, card, heading, label, onClick, still } from './look';
import { marked, type NodesFormat } from './types';

// Model marks: the mark scheme as the Nodes decks set it — a table card, MARKS · WHAT IT NEEDS · HOW THE
// MARKS FALL — beside model answers students rank and mark against it; then the marks each one earned,
// and why; then their own answer, marked against the same rows. A planning aid: the board's own mark
// scheme overrides it.

export interface ModelMarks {
  question: string;
  scheme: { marks: string; needs: string; falls: string }[];
  answers: { label: string; text: string; marks: number; why: string }[];
  outOf: number;
}

const STARTER: ModelMarks = {
  question: 'Describe the main components of the CPU. [4 marks]',
  outOf: 4,
  scheme: [
    { marks: '1', needs: 'One precise point.', falls: 'A component named with its specific role: “ALU: performs arithmetic and logical operations”.' },
    { marks: '2', needs: 'Two points.', falls: 'Two components, each with its role. A label (“the brain”) earns nothing.' },
    { marks: '3–4', needs: 'Three or four units of substance.', falls: 'Each further component with its specific role; “stores data” could be any memory, so it earns nothing.' },
  ],
  answers: [
    { label: 'A', marks: 0, text: 'The CPU has a hard drive and RAM.', why: 'Storage and memory, not the CPU’s components.' },
    { label: 'B', marks: 1, text: 'Control unit: decodes instructions and sends control signals. ALU: the brain of the CPU. Registers: store data.', why: 'Only the control unit has its specific role.' },
    { label: 'C', marks: 4, text: 'Control unit: decodes instructions and sends control signals. ALU: performs arithmetic and logical operations. Registers: tiny, fast stores inside the CPU. Cache: fast memory for frequently used data.', why: 'Four components, each with its specific role.' },
  ],
};

function scheme(st: Parameters<NodesFormat<ModelMarks>['slides']>[0], o: ModelMarks, y: number, h: number) {
  const rows = o.scheme.slice(0, 4), rh = Math.floor((h - 70) / Math.max(1, rows.length));
  const c1 = LEFT + 40, c2 = LEFT + 230, c3 = LEFT + 760, wide = W - LEFT - 40 - c3;
  return [
    card(st, 'Mark scheme', LEFT, y, W - LEFT * 2, h, {}, still),
    T(st, 'Head marks', 'MARKS', c1, y + 24, 180, 30, { weight: '800', size: 22, color: st.muted, tracking: 0.08 }, still),
    T(st, 'Head needs', 'WHAT IT NEEDS', c2, y + 24, 500, 30, { weight: '800', size: 22, color: st.muted, tracking: 0.08 }, still),
    T(st, 'Head falls', 'HOW THE MARKS FALL', c3, y + 24, wide, 30, { weight: '800', size: 22, color: st.muted, tracking: 0.08 }, still),
    ...rows.flatMap((r, i) => {
      const ry = y + 66 + i * rh;
      return [
        ...(i ? [card(st, `Rule ${i}`, LEFT + 40, ry - 8, W - LEFT * 2 - 80, 2, { fill: rgba(st.ink, 0.12), sw: 0, radius: 0 }, still)] : []),
        T(st, `Row ${i + 1} marks`, r.marks, c1, ry, 180, 60, { weight: '800', size: 46 }, still),
        T(st, `Row ${i + 1} needs`, r.needs, c2, ry + 4, 500, rh - 16, { weight: '800', size: 32, lineHeight: 1.2 }, still),
        T(st, `Row ${i + 1} falls`, r.falls, c3, ry + 4, wide, rh - 16, { size: 28, lineHeight: 1.3 }, still),
      ];
    }),
  ];
}

export const modelMarks: NodesFormat<ModelMarks> = {
  id: 'model-marks', label: 'Model marks', part: 'How the marks fall',
  aim: 'The mark scheme beside model answers: students rank them and mark each, see the marks and why, then mark their own against the same rows.',
  howTo: ['The mark scheme, and model answers to the question.', 'On phones, rank the answers, then give each its mark.', 'Each click shows the marks one earned and why.', 'Last, students mark their own answer against the same rows.'],
  phones: 'Rank them, then mark each',
  starter: STARTER,
  slides: (st, o) => {
    const ans = o.answers.slice(0, 3), n = Math.max(1, ans.length), gap = 30;
    const sy = HY + 120, sh = 360, ay = sy + sh + 30, ah = FOOT - ay;
    const aw = Math.floor((W - LEFT * 2 - gap * (n - 1)) / n);
    const answers = (marks: boolean) => ans.flatMap((a, i) => {
      const x = LEFT + i * (aw + gap);
      const out = [
        card(st, `Answer ${a.label}`, x, ay, aw, ah, {}, marks ? still : onClick()),
        badge(st, x + 24, ay + 22, 56, st.accent, a.label, marks ? still : after()),
        T(st, `Answer ${a.label} — words`, a.text, x + 100, ay + 22, aw - 124, ah - (marks ? 110 : 44), { size: 26, lineHeight: 1.3, fitGroup: 'model' }, marks ? still : after()),
      ];
      if (marks) {
        const best = a.marks >= o.outOf;
        out.push(
          card(st, `Answer ${a.label} — mark`, x + 24, ay + ah - 78, 150, 58, { fill: best ? '#1f9d5a' : rgba(LINK.U, 0.16), sw: 0, radius: 29 }, onClick()),
          T(st, `Answer ${a.label} — mark words`, `${a.marks} / ${o.outOf}`, x + 24, ay + ah - 66, 150, 36, { weight: '800', size: 28, align: 'center', color: best ? '#ffffff' : st.ink }, after()),
          T(st, `Answer ${a.label} — why`, a.why, x + 194, ay + ah - 80, aw - 218, 66, { weight: '700', size: 24, lineHeight: 1.2 }, after()),
        );
      }
      return out;
    });
    const ask = slideOf('Model marks', [
      ground(st), label(st, 'Model marks · how the marks fall', LEFT, EY, 1300, st.accent, 30), phonesCue(st, 'rank them, then mark each'),
      heading(st, o.question, HY, 52, W - LEFT * 2, 100),
      ...scheme(st, o, sy, sh), ...answers(false),
    ], st, `Model marks. ${o.question}\nRank the answers, then mark each against the scheme.\n${ans.map((a) => `${a.label}: ${a.marks}/${o.outOf}. ${a.why}`).join('\n')}\nA planning aid: the board's own mark scheme overrides it.`);
    const reveal = slideOf('Model marks · the marks', [
      ground(st), label(st, 'Model marks · the marks', LEFT, EY, 1300, st.accent, 30),
      heading(st, o.question, HY, 52, W - LEFT * 2, 100),
      ...scheme(st, o, sy, sh), ...answers(true),
    ], st, ans.map((a) => `${a.label}: ${a.marks}/${o.outOf}. ${a.why}`).join('\n'));
    const own = slideOf('Model marks · your own', [
      ground(st), label(st, 'Model marks · your own answer', LEFT, EY, 1300, st.accent, 30), phonesCue(st, 'mark your own'),
      heading(st, 'Mark your own answer: which row is it on, and what would move it up?', HY, 52, W - LEFT * 2, 140),
      ...scheme(st, o, HY + 170, FOOT - HY - 170),
    ], st, 'Students mark their own answer against the same rows, and name what would move it up a row.');
    return marked('model-marks', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }, { slide: own, role: 'own' }], o);
  },
};
