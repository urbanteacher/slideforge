// The simulated class of a rehearsal (lab-engine-plan M11b): who they are, and how each answers. Pure and seedable, so it is
// tested without a browser. A rehearsal class is built to look like a real one on the wall: most answer, most get it right but
// not all, the answers trickle in over the question's time, a few are slow, and a wrong answer on a choice question tends to be
// the same tempting lure (as classic's js/demo.js shapes it). The phone only ever sees the question frame; the simulated
// learners know the answer because they are made by the lesson that is being rehearsed.

import { styleFor, type PromptFields, type RoomQuiz } from '../live';

/** A random source: Math.random, or a seeded one in tests. */
export type Rng = () => number;

/** The names a rehearsal class is drawn from (classic's demo class). Past forty a surname initial keeps names different. */
export const NAMES = ['Ana', 'Ben', 'Priya', 'Tom', 'Maya', 'Leo', 'Sam', 'Jordan', 'Nina', 'Omar', 'Chloe', 'Kwame', 'Sofia', 'Luca', 'Aisha', 'Ethan', 'Zara', 'Noah', 'Mei', 'Adam',
  'Freya', 'Ravi', 'Isla', 'Tariq', 'Grace', 'Oscar', 'Lina', 'Jack', 'Amara', 'Finn', 'Hana', 'Kai', 'Ruby', 'Dev', 'Elif', 'Max', 'Nadia', 'Theo', 'Yusuf', 'Ella'];
/** The class sizes a rehearsal offers. */
export const SIZES = [8, 16, 24] as const;

/** A seeded generator (mulberry32), for tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export interface Profile {
  name: string;
  /** The chance this learner gets a question right, 0 to 1. A class averages about 0.65. */
  skill: number;
  /** 0 is quick and 1 is slow: where in the question's time they answer. */
  slow: number;
  /** Whether this learner answers a question at all (a few sit out each time). */
  keen: number;
}

export function pickNames(n: number, rng: Rng): string[] {
  const bag = [...NAMES];
  const out: string[] = [];
  while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  const initials = 'ABCDEFGHJKLMNPRSTW';
  for (let k = 0; out.length < n; k++) out.push(`${NAMES[k % NAMES.length]} ${initials[Math.floor(k / NAMES.length) % initials.length]}.`);
  return out;
}

export function profiles(n: number, rng: Rng = Math.random): Profile[] {
  return pickNames(n, rng).map((name) => ({ name, skill: 0.35 + 0.6 * rng(), slow: rng(), keen: 0.82 + 0.18 * rng() }));
}

/** What a phone sends to answer (join.html: `answer` with a choice, text or value). */
export type Answer = { t: 'answer'; choice: number } | { t: 'answer'; text: string } | { t: 'answer'; value: number } | { t: 'answer'; order: number[] };

/** What the relay sends a phone for a question: the part the simulated phone reads. */
export interface QuestionFrame { id: string; input?: string; options?: string[]; range?: { min: number; max: number; step: number } | null; timeLimit?: number; confidence?: boolean }

/** How long after the question is asked this learner answers: 0.7 s at the quickest, up to most of the question's time (no limit: up to 9 s). */
export function answerDelay(p: Profile, q: Pick<QuestionFrame, 'timeLimit'>, rng: Rng = Math.random): number {
  const window = q.timeLimit && q.timeLimit > 0 ? Math.max(2000, Math.min(q.timeLimit * 750, 14000)) : 9000;
  return Math.round(700 + (window - 700) * Math.min(1, p.slow * 0.8 + rng() * 0.25));
}

const WRONG_WORDS = ['not sure', 'pass', 'no idea', '???'];

/** How a learner answers a question of the room: right with their skill, else a plausible wrong one; null for a learner who sits it out. */
export function answerFor(quiz: RoomQuiz, frame: QuestionFrame, p: Profile, rng: Rng = Math.random): Answer | null {
  if (rng() > p.keen) return null;
  const right = rng() < p.skill;
  const style = styleFor(quiz);
  const input = frame.input ?? style.input;
  if (input === 'text') {
    const accept = (Array.isArray(quiz.accept) ? quiz.accept : []).filter((a) => String(a).trim());
    const text = right ? String(quiz.answer ?? accept[0] ?? '') : WRONG_WORDS[Math.floor(rng() * WRONG_WORDS.length)];
    return { t: 'answer', text };
  }
  if (input === 'number') {
    const r = frame.range ?? { min: Number(quiz.min ?? 0), max: Number(quiz.max ?? 100), step: Number(quiz.step ?? 1) || 1 };
    const target = Number(quiz.target ?? r.min), tol = Math.max(0, Number(quiz.tolerance ?? 0)), span = Math.max(1, r.max - r.min);
    const raw = right ? target + (rng() * 2 - 1) * tol * 0.8 : target + (rng() < 0.5 ? -1 : 1) * (tol + span * (0.1 + 0.3 * rng()));
    const step = r.step > 0 ? r.step : 1;
    const value = Math.min(r.max, Math.max(r.min, Math.round(raw / step) * step));
    return { t: 'answer', value };
  }
  const n = (frame.options ?? quiz.options ?? []).filter((o) => String(o).trim()).length;
  if (n === 0) return null;
  if (input === 'order') {
    // The items are authored in the right order: a right answer is that order; a wrong one swaps two neighbours.
    const order = Array.from({ length: n }, (_, i) => i);
    if (!right && n > 1) { const i = Math.floor(rng() * (n - 1)); [order[i], order[i + 1]] = [order[i + 1], order[i]]; }
    return { t: 'answer', order };
  }
  if (right) return { t: 'answer', choice: Math.min(n - 1, Math.max(0, quiz.correct)) };
  const wrong = Array.from({ length: n }, (_, i) => i).filter((i) => i !== quiz.correct);
  if (wrong.length === 0) return { t: 'answer', choice: 0 };
  // The tempting wrong answer: most of the wrong ones go to the same lure.
  const lure = wrong.includes((quiz.correct + 1) % n) ? (quiz.correct + 1) % n : wrong[0];
  return { t: 'answer', choice: rng() < 0.65 ? lure : wrong[Math.floor(rng() * wrong.length)] };
}

/** Whether this learner says they were sure, after a locked answer: the more skilled, the more often. */
export const sureFor = (p: Profile, rng: Rng = Math.random): boolean => rng() < 0.3 + 0.6 * p.skill;

const IDEAS = ['I would test it with a smaller example first', 'Not sure why the second step works', 'It links to last week', 'Ask about the edge case', 'Could we try it with real data?', 'What happens at the boundary?'];
const WORDS = ['energy', 'cells', 'energy', 'growth', 'balance', 'energy', 'light', 'cells', 'waste'];

/** A reply to an audience feedback prompt (join.html `reply`): a choice for a poll or scale, words for a cloud or brainstorm; null for a learner who sits it out. */
export function replyFor(prompt: Pick<PromptFields, 'kind' | 'options'>, p: Profile, rng: Rng = Math.random): { t: 'reply'; choice: number } | { t: 'reply'; text: string } | null {
  if (rng() > p.keen) return null;
  if (prompt.kind === 'poll' || prompt.kind === 'scale') {
    const n = Math.max(1, (prompt.options ?? []).length);
    // A scale leans to the upper half, as a pleased class does.
    const choice = prompt.kind === 'scale' ? Math.min(n - 1, Math.floor(n * (0.35 + 0.65 * rng()))) : Math.floor(rng() * n);
    return { t: 'reply', choice };
  }
  const bank = prompt.kind === 'wordcloud' ? WORDS : IDEAS;
  return { t: 'reply', text: bank[Math.floor(rng() * bank.length)] };
}
