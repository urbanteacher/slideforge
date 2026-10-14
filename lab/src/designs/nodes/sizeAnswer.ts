import { EY, FOOT, HY, LEFT, W, ground, phonesCue, rgba, slideOf } from '../engage/kit';
import { LINK, T, after, card, chain, heading, label, onClick, pill, still } from './look';
import { marked, sortQuiz, type NodesFormat } from './types';

// Size the answer: read the marks, not just the word. Command words promise less than the marks ask for —
// Identify asked for more than a bare term in 35 of 54 exam parts, Explain in 0 of 16 (Nodes). Each question
// with its command word and marks; students say what the answer needs; the reveal draws it as the join.

export interface SizeAnswer {
  /** `model`: an answer, a part per need, written into each need's box on the reveal. */
  questions: { question: string; command: string; marks: number; needs: string[]; model?: string[] }[];
}

/** The model's parts when there is one per need. */
const partsOf = (q: SizeAnswer['questions'][number]) => (Array.isArray(q.model) && q.model.length === q.needs.length && q.model.every((m) => typeof m === 'string' && m.trim()) ? q.model : null);

const STARTER: SizeAnswer = {
  questions: [
    { question: 'State one purpose of cache memory.', command: 'State', marks: 1, needs: ['one precise point'], model: ['It stores frequently used data and instructions close to the CPU'] },
    { question: 'Identify two components of the CPU and give the role of each.', command: 'Identify', marks: 2, needs: ['a component', 'its specific role'], model: ['The ALU', 'performs arithmetic and logical operations'] },
    { question: 'Explain why more cache can improve a CPU’s performance.', command: 'Explain', marks: 2, needs: ['a point', 'because…'], model: ['More data the CPU needs is held in cache', 'because cache is faster than RAM, so the CPU waits less'] },
  ],
};

export const sizeAnswer: NodesFormat<SizeAnswer> = {
  id: 'size-answer', label: 'Size the answer', part: 'Command words and marks',
  aim: 'Read the marks, not just the word: each question’s command word and marks say how big the answer must be. Students size it before they write.',
  howTo: ['Each question with its command word and marks.', 'On phones, how many points, and of what kind?', 'Each click draws what the answer needs, then an answer in those boxes.'],
  phones: 'How many points, of what kind?',
  starter: STARTER,
  slides: (st, o) => {
    const qs = o.questions.slice(0, 4), n = qs.length, gap = 24;
    const top = HY + 120, rh = Math.floor((FOOT - top - 80 - gap * (n - 1)) / n);
    // What an answer needs, as a chain; with a model, each box is then filled with its part, the need kept as its label.
    const needs = (q: SizeAnswer['questions'][number], i: number, y: number) => {
      const parts = partsOf(q), gap = 56, strokes = q.needs.map((_, k) => (k ? LINK.A : LINK.U));
      const bw = parts ? Math.floor((W - LEFT * 2 - 184 - gap * (q.needs.length - 1)) / q.needs.length) : 0;
      const box = chain(st, q.needs, LEFT + 160, y + rh - 90, { h: 64, size: 26, gap, strokes, build: 'still', name: `Q${i + 1} need`, ...(parts ? { widths: q.needs.map(() => bw) } : {}) })
        .map((l) => ({ ...l, anim: { ...l.anim, ...after() } }));
      if (!parts) return box;
      return [...box, ...parts.flatMap((m, k) => {
        const x = LEFT + 160 + k * (bw + gap), anim = k ? after() : onClick();
        return [
          card(st, `Q${i + 1} model ${k + 1}`, x, y + rh - 90, bw, 64, { fill: strokes[k], sw: 0, radius: 18 }, anim),
          T(st, `Q${i + 1} model ${k + 1} — words`, m, x + 16, y + rh - 82, bw - 32, 48, { weight: '700', size: 24, color: '#ffffff', align: 'center', valign: 'middle', fit: 'shrink' }, after()),
          T(st, `Q${i + 1} model ${k + 1} — need`, q.needs[k], x, y + rh - 22, bw, 22, { weight: '700', size: 18, color: st.muted, align: 'center' }, after()),
        ];
      })];
    };
    const rows = (sized: boolean) => qs.flatMap((q, i) => {
      const y = top + i * (rh + gap);
      return [
        card(st, `Question ${i + 1}`, LEFT, y, W - LEFT * 2, rh, {}, still),
        ...pill(st, `Q${i + 1} word`, q.command, LEFT + 24, y + 20, { w: 170, fill: rgba(LINK.U, 0.18), size: 24 }, still),
        ...pill(st, `Q${i + 1} marks`, `${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`, LEFT + 206, y + 20, { w: 150, fill: rgba(LINK.C, 0.22), size: 24 }, still),
        T(st, `Q${i + 1} question`, q.question, LEFT + 380, y + 22, W - LEFT * 2 - 410, 50, { weight: '600', size: 32 }, still),
        ...(sized ? [T(st, `Q${i + 1} needs`, 'Needs:', LEFT + 24, y + rh - 76, 130, 44, { weight: '800', size: 28 }, onClick()),
          ...needs(q, i, y)] : []),
      ];
    });
    const evidence = T(st, 'Evidence', 'Read the marks, not just the word: Identify asked for more than a bare term in 35 of 54 exam parts; Explain in 0 of 16 (Nodes, examiner reports).', LEFT, FOOT - 64, W - LEFT * 2, 60, { size: 26, color: st.muted }, still);
    const ask = slideOf('Size the answer', [ground(st), label(st, 'Size the answer', LEFT, EY, 1300, st.accent, 30), phonesCue(st, 'how many points, of what kind?'),
      heading(st, 'How big must each answer be?', HY, 56, W - LEFT * 2, 80), ...rows(false), evidence], st,
      `Size the answer. ${qs.map((q) => `${q.question} (${q.command}, ${q.marks}): ${q.needs.join(' → ')}`).join('\n')}`);
    const reveal = slideOf('Size the answer · what each needs', [ground(st), label(st, 'Size the answer · what each needs', LEFT, EY, 1300, st.accent, 30),
      heading(st, 'What each answer needs', HY, 56, W - LEFT * 2, 80), ...rows(true), evidence], st, qs.map((q) => `${q.command}, ${q.marks}: ${q.needs.join(' → ')}${partsOf(q) ? `\n  An answer: ${partsOf(q)!.join(' → ')}` : ''}`).join('\n'));
    const sizes = [...new Set(qs.map((q) => q.needs.join(' → ')))];
    return marked('size-answer', [{ slide: ask, role: 'ask' }, { slide: reveal, role: 'reveal' }], o,
      { ask: 'ask', answer: 'reveal', quiz: sortQuiz('What does each answer need?', sizes, qs.map((q) => `${q.question} (${q.marks})`), qs.map((q) => sizes.indexOf(q.needs.join(' → ')))) });
  },
};
