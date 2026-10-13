// Compare & contrast, the sort (style 'compare', format 'compare-contrast', question input 'sort'). Two items and a set of
// statements; each phone sorts every statement into a column: the first item only, both, or the second only (`input` 'sort':
// one column index per statement, in the statements' order). A response is right when every statement is in its column; each
// statement that is right earns its share of the points (`gains`, as classic's sortGains: round(points x the share right),
// and the sort's points are 0 unless the Game panel sets them). The question frame names the columns (`bins`). The reveal says
// no answer in words (classic's reveal has none for a sort); the wall holds how the room sorted until then, then lands each
// statement in its column with how the room sorted it and names the one the room misfiled most. The phones are given no role
// and the heading "Sort it". The game has no scores slide. The discussion mode (a proposal box, the wall leading) is not
// ported: such a question is not this entry's (`unsupported`), and its lesson is hosted by classic.
import { sortScore } from '@sf/games/compare.js';
import { gameStyle } from '@sf/games/registry.js';
import { defineStyle, type SortModel } from './types';

const ofResponse = (r: unknown, n: number): number[] | null => (Array.isArray(r) && r.length === n && r.every((b) => Number.isInteger(b)) ? (r as number[]) : null);

/** How the room sorted each statement: its right column, and how many put it in each; the statement misfiled most. */
export function sortOf(options: string[], bins: string[], sortAnswers: number[], answers: { response: unknown }[]): SortModel {
  const rows = options.map((text, i) => ({ text, right: sortAnswers[i], counts: bins.map(() => 0) }));
  let total = 0;
  for (const a of answers) {
    const r = ofResponse(a.response, options.length);
    if (!r) continue;
    total++;
    r.forEach((bin, i) => { if (bin >= 0 && bin < bins.length) rows[i].counts[bin]++; });
  }
  let misfiled: SortModel['misfiled'] = null;
  for (const row of rows) {
    const n = total - (row.counts[row.right] ?? 0);
    if (n > 0 && (!misfiled || n > misfiled.n)) misfiled = { text: row.text, n };
  }
  return { bins, rows, total, misfiled };
}

export const compare = defineStyle({
  key: 'compare', name: 'Compare & contrast', formats: ['compare-contrast'], input: 'sort',
  // The style's own normalize and compile (src/games/compare.js): the statements shuffled, their columns, the heading. A lab
  // question is already compiled (it carries `sortAnswers`): it is left as it is.
  prepare(q) {
    if (Array.isArray(q.sortAnswers) || !String(q.statements ?? '').trim()) return;
    const st = gameStyle('compare');
    st.normalize?.(q);
    st.compile?.(q, {}, q);
  },
  unsupported: (q) => (q.compareDiscuss === true || (q.input ?? 'sort') !== 'sort' ? 'its discussion mode is still SlideForge\'s to run' : ''),
  scoreSlide: false,
  companion: () => ({ role: '', participation: '', headPrompt: 'Sort it' }),
  reveal: () => ({ correct: -1, answer: '' }),
  flags: (q) => ({ bins: (Array.isArray(q.sortBins) ? q.sortBins as string[] : []).slice() }),
  gains: (q, answers) => answers.map((a) => [a.id, Math.round((Number(q.points) || 0) * sortScore(q, a.response))] as [number, number]),
  manualQuestion: (q) => ({ bins: (Array.isArray(q.sortBins) ? q.sortBins as string[] : []).slice() }),
  wall(q, answers, revealed) {
    if (!revealed) return { kind: 'sort', sort: null };
    const bins = Array.isArray(q.sortBins) ? q.sortBins as string[] : [];
    return { kind: 'sort', sort: sortOf(q.options, bins, Array.isArray(q.sortAnswers) ? q.sortAnswers as number[] : [], answers) };
  },
});
