import { EY, FOOT, HY, LEFT, W, ground, phonesCue, slideOf } from '../engage/kit';
import { LINK, T, after, barCard, card, heading, label, onClick, still } from './look';
import { marked, type NodesFormat } from './types';

// Before, during and after the attempt: answer construction made visible, as the Nodes decks draw it —
// three cards, each with a bar of its colour along the top, the question students ask themselves at that
// point, and what Nodes makes visible there. The attempt itself sits above them, so the three questions
// are asked of a real task, and phones keep a private note at each point.

export interface BeforeDuringAfter {
  /** The task students attempt. */
  task: string;
  points: { when: string; ask: string; visible: string }[];
  quote?: string;
}

const STARTER: BeforeDuringAfter = {
  task: 'Describe the main components of the CPU.',
  points: [
    { when: 'Before', ask: 'What must I bring together?', visible: 'What the question requires, and which ideas or relationships belong in the answer.' },
    { when: 'During', ask: 'How do these parts form a complete answer?', visible: 'How to build the response, using labelled examples, contrasts and prompts.' },
    { when: 'After', ask: 'What is missing, and can I now supply it myself?', visible: 'What is accurate, missing or insufficiently connected; then a repair and an independent reattempt.' },
  ],
  quote: 'Make the construction of a complete answer visible: find the relationships it needs, express them, and check them yourself.',
};

const COLOURS = [LINK.U, LINK.A, LINK.C];

export const beforeDuringAfter: NodesFormat<BeforeDuringAfter> = {
  id: 'before-during-after', label: 'Before, during, after', part: 'Answer construction, made visible',
  aim: 'Three questions students ask themselves at each point of an attempt: what to bring together, how it forms an answer, and what is missing.',
  howTo: ['Set the task.', 'Before: what must I bring together? During: how do the parts form an answer? After: what is missing?', 'On phones, a private note at each point; each click brings in the next.'],
  phones: 'A note at each point',
  starter: STARTER,
  slides: (st, o) => {
    const pts = o.points.slice(0, 3), n = Math.max(1, pts.length), gap = 34;
    const cw = Math.floor((W - LEFT * 2 - gap * (n - 1)) / n);
    const ty = HY + 100, th = 110, cy = ty + th + 40, ch = FOOT - cy - (o.quote ? 140 : 0);
    const slide = slideOf('Before, during, after', [
      ground(st), label(st, 'Answer construction, made visible', LEFT, EY, 1300, LINK.C, 30), phonesCue(st, 'a note at each point'),
      heading(st, 'Before, during and after the attempt', HY, 64, W - LEFT * 2, 90),
      ...barCard(st, 'Task', LEFT, ty, W - LEFT * 2, th, st.accent, st.panel, still),
      T(st, 'Task — words', o.task, LEFT + 44, ty + 18, W - LEFT * 2 - 88, th - 36, { weight: '700', size: 40, valign: 'middle' }, still),
      ...pts.flatMap((p, i) => {
        const x = LEFT + i * (cw + gap), col = COLOURS[i % COLOURS.length];
        return [
          card(st, `Card ${p.when}`, x, cy, cw, ch, { radius: 22 }, onClick()),
          card(st, `Top ${p.when}`, x, cy, cw, 10, { fill: col, sw: 0, radius: 0 }, after()),
          T(st, `When ${p.when}`, p.when.toUpperCase(), x + 40, cy + 40, cw - 80, 40, { weight: '800', size: 28, color: col, tracking: 0.12 }, after()),
          T(st, `Question ${p.when}`, p.ask, x + 40, cy + 92, cw - 80, Math.min(190, ch - 270), { font: st.display, weight: st.displayWeight, size: 48, lineHeight: 1.1 }, after()),
          T(st, `Label ${p.when}`, 'Nodes makes visible', x + 40, cy + ch - 170, cw - 80, 34, { weight: '700', size: 22, color: st.muted, tracking: 0.04 }, after()),
          T(st, `What ${p.when}`, p.visible, x + 40, cy + ch - 132, cw - 80, 110, { size: 28, lineHeight: 1.3 }, after()),
        ];
      }),
      ...(o.quote ? [T(st, 'Quote', `“${o.quote}”`, LEFT, FOOT - 112, W - LEFT * 2, 100, { weight: '700', size: 34, lineHeight: 1.2 }, onClick())] : []),
    ], st, `Before, during and after the attempt. Task: ${o.task}\n${pts.map((p) => `${p.when}: ${p.ask} (${p.visible})`).join('\n')}`);
    return marked('before-during-after', [{ slide, role: 'routine' }], o, { open: { routine: `Your answer: ${o.task}` } });
  },
};
