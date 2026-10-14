import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, badge, card, heading, label, onClick, pill, still } from './look';
import { marked, sortQuiz, type NodesFormat } from './types';

// Same word, different links: one command word, three questions, three relationships. Nodes' formula —
// linkage matched to the task — drawn as the Nodes decks draw it: a row per question, the kind of link,
// "connect", what it starts from, an arrow, and what it must reach, in the link's colour. Students match
// each question to the relationship it needs before the rows are shown.

export interface SameWord {
  command: string;
  questions: { question: string; kind: string; from: string; to: string }[];
}

const KIND_COLOUR: Record<string, string> = { Definition: LINK.U, Description: LINK.U, Explanation: LINK.A, Evaluation: LINK.C, Judgement: LINK.C };
const colourOf = (k: string) => KIND_COLOUR[k] ?? LINK.J;

const STARTER: SameWord = {
  command: 'Explain',
  questions: [
    { question: 'Explain what cache memory is.', kind: 'Definition', from: 'a term', to: 'its precise meaning' },
    { question: 'Explain how cache memory improves a CPU’s performance.', kind: 'Explanation', from: 'a claim', to: 'the mechanism that explains it' },
    { question: 'Explain whether a 5.2 GHz laptop is the right choice for a video editor.', kind: 'Evaluation', from: 'evidence and criteria', to: 'a judgement' },
  ],
};

export const sameWord: NodesFormat<SameWord> = {
  id: 'same-word', label: 'Same word, different links', part: 'Linkage matched to the task',
  aim: 'One command word, three questions, three relationships: the word alone does not say what to join. Students match each question to its link.',
  howTo: ['Three questions with the same command word.', 'On phones, match each question to the relationship it needs.', 'Then the formula: a row per question, its link drawn from what it starts with to what it must reach.'],
  phones: 'Match each question to its link',
  starter: STARTER,
  slides: (st, o) => {
    const qs = o.questions.slice(0, 4), n = qs.length;
    const kinds = [...new Set(qs.map((q) => q.kind))];
    const top = HY + 170, gap = 26, ch = Math.floor((FOOT - top - 120 - gap * (n - 1)) / n);
    const ask = slideOf('Same word, different links', [
      ground(st), label(st, `Same word, different links · ${o.command}`, LEFT, EY, 1300, st.accent, 30), phonesCue(st, 'match each question'),
      heading(st, `Three questions. All say “${o.command}”. Does each want the same answer?`, HY, 52, W - LEFT * 2, 140),
      ...qs.flatMap((q, i) => {
        const y = top + i * (ch + gap);
        return [
          card(st, `Question ${i + 1}`, LEFT, y, W - LEFT * 2, ch, {}, i ? onClick() : still),
          badge(st, LEFT + 28, y + (ch - 64) / 2, 64, st.accent, String(i + 1), i ? after() : still),
          T(st, `Question ${i + 1} — words`, q.question, LEFT + 120, y + (ch - 56) / 2, W - LEFT * 2 - 160, 64, { weight: '600', size: 42 }, i ? after() : still),
        ];
      }),
      ...(() => { let x = LEFT; return kinds.flatMap((k) => { const w = k.length * 17 + 80; const l = pill(st, `Kind ${k}`, k, x, FOOT - 70, { w, fill: colourOf(k), color: '#ffffff', size: 26 }, still); x += w + 14; return l; }); })(),
    ], st, `Same word, different links: “${o.command}”.\n${qs.map((q, i) => `${i + 1}. ${q.question} — ${q.kind}: ${q.from} → ${q.to}`).join('\n')}`);
    const rh = Math.min(170, Math.floor((FOOT - (HY + 150) - gap * (n - 1)) / n));
    const reveal = slideOf('Same word, different links · the formula', [
      ground(st), label(st, `The Nodes formula · “${o.command}”`, LEFT, EY, 1300, st.accent, 30),
      heading(st, 'Linkage matched to the task', HY, 64, W - LEFT * 2, 90),
      ...qs.flatMap((q, i) => {
        const y = HY + 150 + i * (rh + gap), col = colourOf(q.kind), first = onClick();
        return [
          card(st, `Row ${i + 1}`, LEFT, y, W - LEFT * 2, rh, { fill: rgba(col, 0.08), stroke: col, sw: 3, radius: 18 }, first),
          T(st, `Row ${i + 1} — question`, q.question, LEFT + 30, y + 14, W - LEFT * 2 - 60, 40, { size: 28, color: st.muted }, after()),
          T(st, `Row ${i + 1} — kind`, q.kind, LEFT + 30, y + rh / 2 - 6, 330, 54, { weight: '800', size: 40, color: col }, after()),
          T(st, `Row ${i + 1} — connect`, 'connect', LEFT + 370, y + rh / 2 + 2, 150, 44, { size: 30, color: st.muted }, after()),
          card(st, `Row ${i + 1} — from`, LEFT + 520, y + rh / 2 - 14, 440, 72, { fill: st.panel, radius: 14 }, after()),
          T(st, `Row ${i + 1} — from words`, q.from, LEFT + 520, y + rh / 2 + 2, 440, 44, { weight: '800', size: 32, align: 'center' }, after()),
          T(st, `Row ${i + 1} — arrow`, '→', LEFT + 970, y + rh / 2 - 6, 70, 56, { weight: '800', size: 46, align: 'center', color: col }, after()),
          card(st, `Row ${i + 1} — to`, LEFT + 1050, y + rh / 2 - 14, W - LEFT * 2 - 1080, 72, { fill: col, sw: 0, radius: 14 }, after()),
          T(st, `Row ${i + 1} — to words`, q.to, LEFT + 1070, y + rh / 2 + 2, W - LEFT * 2 - 1120, 44, { weight: '800', size: 30, align: 'center', color: '#ffffff' }, after()),
        ];
      }),
    ], st, qs.map((q) => `${q.kind}: connect ${q.from} → ${q.to}. (${q.question})`).join('\n'));
    return marked('same-word', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o,
      { ask: 'ask', answer: 'reveal', quiz: sortQuiz(`Which link does each “${o.command}” question need?`, kinds, qs.map((q) => q.question), qs.map((q) => kinds.indexOf(q.kind))) });
  },
};
