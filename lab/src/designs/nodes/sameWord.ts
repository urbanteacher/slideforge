import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, badge, card, heading, label, onClick, pill, still } from './look';
import { marked, sortQuiz, type NodesFormat } from './types';

// Same word, different links: one command word, three questions, three relationships. Nodes' formula —
// linkage matched to the task — drawn as the Nodes decks draw it: a row per question, the kind of link,
// "connect", what it starts from, an arrow, and what it must reach, in the link's colour. Students match
// each question to the relationship it needs before the rows are shown.

export interface SameWord {
  command: string;
  /** `model`: the answer to that question, as its link: what it starts from, and what it reaches. */
  questions: { question: string; kind: string; from: string; to: string; model?: [string, string] }[];
}

const modelOf = (q: SameWord['questions'][number]) => (Array.isArray(q.model) && q.model.length === 2 && q.model.every((m) => typeof m === 'string' && m.trim()) ? q.model : null);

const KIND_COLOUR: Record<string, string> = { Definition: LINK.U, Description: LINK.U, Explanation: LINK.A, Evaluation: LINK.C, Judgement: LINK.C };
const colourOf = (k: string) => KIND_COLOUR[k] ?? LINK.J;

const STARTER: SameWord = {
  command: 'Explain',
  questions: [
    { question: 'Explain what cache memory is.', kind: 'Definition', from: 'a term', to: 'its precise meaning', model: ['Cache memory', 'small, fast memory beside the CPU that holds frequently used data'] },
    { question: 'Explain how cache memory improves a CPU’s performance.', kind: 'Explanation', from: 'a claim', to: 'the mechanism that explains it', model: ['Cache makes the CPU faster', 'it fetches data from cache, not slower RAM, so it waits less'] },
    { question: 'Explain whether a 5.2 GHz laptop is the right choice for a video editor.', kind: 'Evaluation', from: 'evidence and criteria', to: 'a judgement', model: ['Exports use many cores; GHz alone is not speed', 'not on GHz alone: choose by cores and measured export time'] },
  ],
};

export const sameWord: NodesFormat<SameWord> = {
  id: 'same-word', label: 'Same word, different links', part: 'Linkage matched to the task',
  aim: 'One command word, three questions, three relationships: the word alone does not say what to join. Students match each question to its link.',
  howTo: ['Three questions with the same command word.', 'On phones, match each question to the relationship it needs.', 'Then the formula: a row per question, its link drawn from what it starts with to what it must reach; a click more fills it with the answer.'],
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
          // The answer, in the same two boxes: the link's names stay as small labels beneath.
          ...(modelOf(q) ? [
            card(st, `Row ${i + 1} — model from`, LEFT + 520, y + rh / 2 - 36, 440, 90, { fill: st.panel, stroke: col, sw: 3, radius: 14 }, onClick()),
            T(st, `Row ${i + 1} — model from words`, modelOf(q)![0], LEFT + 536, y + rh / 2 - 26, 408, 76, { weight: '700', size: 26, align: 'center', valign: 'middle', fit: 'shrink' }, after()),
            card(st, `Row ${i + 1} — model to`, LEFT + 1050, y + rh / 2 - 36, W - LEFT * 2 - 1080, 90, { fill: col, sw: 0, radius: 14 }, after()),
            T(st, `Row ${i + 1} — model to words`, modelOf(q)![1], LEFT + 1066, y + rh / 2 - 26, W - LEFT * 2 - 1112, 76, { weight: '700', size: 26, align: 'center', valign: 'middle', color: '#ffffff', fit: 'shrink' }, after()),
            T(st, `Row ${i + 1} — model labels`, `${q.from}  →  ${q.to}`, LEFT + 520, y + rh / 2 + 60, W - LEFT * 2 - 550, 22, { weight: '600', size: 18, color: st.muted, align: 'center' }, after()),
          ] : []),
        ];
      }),
    ], st, qs.map((q) => `${q.kind}: connect ${q.from} → ${q.to}. (${q.question})${modelOf(q) ? ` Answer: ${modelOf(q)!.join(' → ')}` : ''}`).join('\n'));
    return marked('same-word', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o,
      { ask: 'ask', answer: 'reveal', quiz: sortQuiz(`Which link does each “${o.command}” question need?`, kinds, qs.map((q) => q.question), qs.map((q) => kinds.indexOf(q.kind))) });
  },
};
