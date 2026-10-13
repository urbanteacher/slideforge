// Beat the clock on the wall, as data (classic js/live.js paintSprint and js/rounds.js). The sprint: the clock and the room's
// progress while the phones run, never a question (the phone is the stage); at time the room's right answers and the hardest
// question, with the wrong answer most of them chose. The wall-paced round: one clock for the run and its count of right
// answers. Pure, so it is tested without a browser.

import type { SpeedRound, SprintView } from '../live';

export interface SprintWall {
  /** When the clock runs out (ms), and whether it has stopped. */
  endsAt: number; seconds: number; over: boolean;
  answers: number; right: number; finished: number; playing: number;
  /** How far the room is through every phone's run (0-100). */
  pct: number;
  /** "7 answers in · 43% right · 2 of 3 finished". */
  stats: string;
  /** The line under the clock: what to do, "Counting the answers…", or the room's right answers once the result is in. */
  sub: string;
  /** The result is in: the hardest question (null: nobody got one wrong). */
  result: boolean;
  hardest: { question: string; answer: string; line: string } | null;
  notice: string;
}

/** The question most of the room got wrong (classic sprintHardest): most wrong, then the larger share wrong; null when nobody got one wrong. */
export function sprintHardest(result: NonNullable<SprintView['result']>) {
  let best: (typeof result.questions)[number] | null = null;
  for (const q of result.questions ?? []) {
    if (!q.wrong) continue;
    if (!best || q.wrong > best.wrong || (q.wrong === best.wrong && q.wrong / q.answered > best.wrong / best.answered)) best = q;
  }
  return best;
}

export function sprintWallOf(sp: SprintView, players: number, notice = ''): SprintWall {
  const pr = sp.progress ?? { answers: 0, right: 0, finished: 0, playing: players, of: sp.questions.length };
  const res = sp.result;
  const answers = res ? res.answers : pr.answers, right = res ? res.right : pr.right;
  const possible = Math.max(1, (pr.playing || 1) * (pr.of || sp.questions.length));
  const stats = `${answers} ${answers === 1 ? 'answer' : 'answers'} in` + (answers ? ` · ${Math.round((right / answers) * 100)}% right` : '') + (pr.finished ? ` · ${pr.finished} of ${pr.playing || 0} finished` : '');
  const sub = res ? `${right} ${right === 1 ? 'right answer' : 'right answers'}, as a room` : sp.over ? 'Counting the answers…' : 'The questions are on your phones. Go at your own pace.';
  let hardest: SprintWall['hardest'] = null;
  if (res) {
    const h = sprintHardest(res), q = h ? sp.questions.find((x) => x.id === h.id) : null;
    if (h && q) hardest = { question: q.question, answer: q.options[q.correct] ?? '', line: `${h.wrong} of ${h.answered} got it wrong` + (h.lure ? ` · most of them chose “${h.lure}”` : '') };
  }
  return { endsAt: sp.endsAt, seconds: sp.seconds, over: sp.over, answers, right, finished: pr.finished, playing: pr.playing, pct: Math.min(100, (answers / possible) * 100), stats, sub, result: !!res, hardest, notice };
}

/** The wall-paced round's clock: what is left, and the room's right answers so far. */
export interface RoundWall { endsAt: number; total: number; count: number; over: boolean }
export const roundWallOf = (r: SpeedRound): RoundWall => ({ endsAt: r.endsAt, total: r.total, count: r.count, over: r.over });
