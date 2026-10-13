import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, barCard, card, heading, label, onClick, still } from './look';
import { marked, type NodesFormat } from './types';

// The missing-link ladder: support is not understanding. Students attempt unaided; only when they need it do
// they take the next rung — a neutral prompt, a partial hint, a model, a new task — and then reattempt with
// the support hidden. A repair counts only later, in a new task, unasked. Drawn as the Nodes decks draw the
// ladder: rungs that widen as the support grows, each with its words.

export interface Ladder {
  question: string;
  /** The link the answer must make. */
  relation: string;
  rungs: { name: string; text: string }[];
  /** What counts as repaired, later and unasked. */
  repair: string;
  /** The task for the later check. */
  later: string;
}

// GCSE Computer Science, stage 2 (Nodes src/data/stage-ladders.ts).
const STARTER: Ladder = {
  question: 'Describe the main components of the CPU.',
  relation: 'Component → its role in running a program',
  rungs: [
    { name: 'Unaided', text: 'Have a go on your own first.' },
    { name: 'Neutral prompt', text: '“Take one component. What does it do while a program runs?”' },
    { name: 'Partial hint', text: '“The PC holds an address. The address of what?”' },
    { name: 'Model', text: 'Control unit: decodes instructions and sends control signals. ALU: performs arithmetic and logical operations.' },
    { name: 'New task', text: '“Describe the main parts of a computer around the CPU: main memory, secondary storage, input and output.”' },
  ],
  repair: 'In a later description, gives each component with its role, without being asked.',
  later: '“Describe the main parts of a school network and what each does.”',
};

const GOLD = LINK.C;

export const ladder: NodesFormat<Ladder> = {
  id: 'ladder', label: 'Missing-link ladder', part: 'Support is not understanding',
  aim: 'Attempt unaided, take the next rung only when needed, then reattempt with the support hidden. A repair counts later, in a new task, unasked.',
  howTo: ['The question, and the link it needs. Students attempt unaided.', 'On phones, “I need the next rung”: each click shows one more rung of support.', 'Then the support goes: reattempt on your own.', 'Later, in another lesson: the same link, a new task, unasked.'],
  phones: 'Attempt, then take a rung if needed',
  starter: STARTER,
  slides: (st, o) => {
    const rungs = o.rungs.slice(0, 5), n = rungs.length;
    const top = HY + 300, rh = Math.floor((FOOT - top - 18 * (n - 1)) / n);
    const head = (lbl: string) => [
      ground(st), label(st, lbl, LEFT, EY, 1300, GOLD, 30),
      ...barCard(st, 'Question', LEFT, HY, W - LEFT * 2, 120, st.accent, st.panel, still),
      T(st, 'Question — words', o.question, LEFT + 44, HY + 18, W - LEFT * 2 - 88, 84, { weight: '700', size: 42, valign: 'middle' }, still),
      T(st, 'The link', `The link to build: ${o.relation}`, LEFT, HY + 150, W - LEFT * 2, 56, { weight: '800', size: 36 }, still),
    ];
    const bars = (shown: boolean) => rungs.flatMap((r, i) => {
      const y = top + i * (rh + 18), w = 220 + i * 90, a = shown && i ? onClick() : still;
      return [
        card(st, `Rung ${i + 1}`, LEFT, y, w, rh, { fill: rgba(GOLD, 0.25 + i * 0.15), sw: 0, radius: 12 }, a),
        T(st, `Rung ${i + 1} — name`, `${i + 1}. ${r.name}`, LEFT + 20, y + (rh - 40) / 2, w - 30, 44, { weight: '800', size: 30 }, shown && i ? after() : still),
        ...(shown ? [T(st, `Rung ${i + 1} — words`, r.text, LEFT + 700, y + 4, W - LEFT * 2 - 700, rh - 8, { size: 32, lineHeight: 1.25, valign: 'middle' }, i ? after() : still)] : []),
      ];
    });
    const ask = slideOf('Missing-link ladder', [...head('The missing-link ladder'), phonesCue(st, 'attempt, then a rung if needed'), ...bars(false),
      T(st, 'Rule', 'Take the next rung only when you need it.', LEFT + 700, top + 10, W - LEFT * 2 - 700, 60, { weight: '700', size: 34, color: st.muted }, still)],
      st, `The missing-link ladder. ${o.question}\nThe link: ${o.relation}\nStudents attempt unaided first; record the rung each one reached.`);
    const rungSlide = slideOf('Missing-link ladder · the rungs', [...head('The missing-link ladder · the rungs'), ...bars(true)], st,
      rungs.map((r, i) => `${i + 1}. ${r.name}: ${r.text}`).join('\n'));
    const again = slideOf('Missing-link ladder · on your own', [
      ground(st), label(st, 'Now, with the support hidden', LEFT, EY, 1300, GOLD, 30), phonesCue(st, 'answer on your own'),
      heading(st, o.question, HY + 40, 76, W - LEFT * 2, 260),
      ...barCard(st, 'Reattempt', LEFT, FOOT - 200, W - LEFT * 2, 200, GOLD, rgba(GOLD, 0.12), still),
      T(st, 'Reattempt — words', 'Support is not understanding. Answer again, on your own: what you can do unaided is what you have learned.', LEFT + 44, FOOT - 172, W - LEFT * 2 - 88, 150, { weight: '600', size: 36, valign: 'middle' }, still),
    ], st, 'The independent reattempt: the support is hidden. Record whether each student succeeds unaided now.');
    const later = slideOf('Missing-link ladder · come back later', [
      ground(st), label(st, 'Come back later', LEFT, EY, 1300, GOLD, 30),
      heading(st, 'A new task, another day, unasked', HY, 64, W - LEFT * 2, 90),
      ...barCard(st, 'Later task', LEFT, HY + 140, W - LEFT * 2, 220, LINK.U, st.panel, still),
      T(st, 'Later task — words', o.later, LEFT + 44, HY + 170, W - LEFT * 2 - 88, 160, { weight: '700', size: 42, valign: 'middle' }, still),
      ...barCard(st, 'Repaired', LEFT, HY + 400, W - LEFT * 2, Math.min(220, FOOT - HY - 400), LINK.A, rgba(LINK.A, 0.12), still),
      T(st, 'Repaired — label', 'IT COUNTS AS REPAIRED WHEN', LEFT + 44, HY + 428, 1200, 36, { weight: '800', size: 24, color: LINK.A, tracking: 0.08 }, still),
      T(st, 'Repaired — words', o.repair, LEFT + 44, HY + 476, W - LEFT * 2 - 88, Math.min(130, FOOT - HY - 500), { size: 36 }, still),
    ], st, `The delayed check, in a later lesson: ${o.later}\nRepaired when: ${o.repair}`);
    return marked('ladder', [{ slide: ask, role: 'ask' }, { slide: rungSlide, role: 'rungs' }, { slide: again, role: 'reattempt' }, { slide: later, role: 'later' }], o);
  },
};
