// What the wall shows of audience feedback, as data (pure; tested in lab/tests/live-feedback.test.ts): from the
// open prompt and the digest the relay sums (live/room.ts `feedback`) to the bars, the scale's spread, the sized
// words or the idea cards that WallViews.tsx paints. The same four things classic's rail and focus views show
// (src/render/live.js feedbackRail, feedbackFocus); a held poll or scale shows only how many have answered.

import type { Digest, OpenFeedback } from '../live';

/** Words on the cloud, and ideas on the wall, by where it is drawn: the rail is narrow, the focus view is the screen. */
export const CLOUD_WORDS = 30;
export const IDEAS_RAIL = 4;
export const IDEAS_FOCUS = 12;
/** A cloud word's size in pixels of a 1920-wide screen: the least is still readable from the back (wall text is 36 and up). */
export const WORD_MIN = 44;
export const WORD_MAX = 120;

export interface FbBar { index: number; label: string; count: number; pct: number; leading: boolean }
export interface FbScale { points: FbBar[]; low: string; high: string; /** The average point, one decimal; null before anyone answered. */ mean: string | null }
export interface FbWord { text: string; n: number; size: number }
export interface FbIdea { key: string; name: string; text: string }

export interface FeedbackWall {
  kind: 'poll' | 'wordcloud' | 'brainstorm' | 'scale';
  prompt: string;
  presentAs: 'rail' | 'focus';
  /** A held poll or scale: only the count of answers is up until the teacher shows the split. */
  held: boolean;
  answered: number;
  players: number;
  /** Replies in all (a word cloud or brainstorm can take several from each phone). */
  total: number;
  /** Poll: a bar per option. Scale: the spread (`scale`). */
  bars: FbBar[];
  scale: FbScale | null;
  /** Word cloud: laid out largest in the middle, so a plain wrapping row reads as a cloud. */
  words: FbWord[];
  /** Brainstorm: newest first. */
  ideas: FbIdea[];
  /** What a screen reader hears when it changes. */
  said: string;
}

const barsOf = (labels: string[], counts: number[]): FbBar[] => {
  const total = counts.reduce((a, b) => a + b, 0), top = Math.max(0, ...counts);
  return labels.map((label, index) => {
    const count = counts[index] ?? 0;
    return { index, label, count, pct: total ? Math.round((count / total) * 100) : 0, leading: top > 0 && count === top };
  });
};

/** The words, biggest first by count (ties alphabetical), sized by count and put largest-in-the-middle. Deterministic. */
export function cloudOf(words: { text: string; n: number }[]): FbWord[] {
  const sorted = [...words].sort((a, b) => b.n - a.n || a.text.localeCompare(b.text)).slice(0, CLOUD_WORDS);
  const max = Math.max(1, ...sorted.map((w) => w.n));
  const out: FbWord[] = [];
  sorted.forEach((w, i) => {
    const word = { text: w.text, n: w.n, size: Math.round(WORD_MIN + (WORD_MAX - WORD_MIN) * (w.n / max)) };
    if (i % 2 === 0) out.push(word); else out.unshift(word);
  });
  return out;
}

export function feedbackWallOf(open: OpenFeedback): FeedbackWall {
  const p = open.prompt, d: Digest | null = open.digest;
  const held = p.hold && !open.shown && (p.kind === 'poll' || p.kind === 'scale');
  const counts = d && (d.kind === 'poll' || d.kind === 'scale') ? d.counts : [];
  const total = d?.total ?? 0;
  const bars = p.kind === 'poll' && !held ? barsOf(p.options, counts) : [];
  let scale: FbScale | null = null;
  if (p.kind === 'scale' && !held) {
    const points = barsOf(p.options, counts), sum = points.reduce((a, b) => a + (b.index + 1) * b.count, 0);
    scale = { points, low: p.ends?.low ?? '', high: p.ends?.high ?? '', mean: total ? (sum / total).toFixed(1) : null };
  }
  const words = p.kind === 'wordcloud' && d?.kind === 'wordcloud' ? cloudOf(d.words) : [];
  const cap = p.presentAs === 'focus' ? IDEAS_FOCUS : IDEAS_RAIL;
  const ideas = p.kind === 'brainstorm' && d?.kind === 'brainstorm' ? d.items.slice(0, cap).map((it) => ({ key: String(it.seq ?? `${it.pid}:${it.text}`), name: it.name, text: it.text })) : [];
  const answered = `${open.answered} of ${open.players} answered`;
  const leaders = bars.filter((b) => b.leading).map((b) => b.label);
  const said = held ? `${answered}. Results are held.`
    : scale?.mean ? `${answered}. Average ${scale.mean}.`
      : leaders.length && total ? `${answered}. ${leaders.join(' and ')} ${leaders.length > 1 ? 'lead' : 'leads'}.` : answered;
  return { kind: p.kind, prompt: p.prompt, presentAs: p.presentAs, held, answered: open.answered, players: open.players, total, bars, scale, words, ideas, said };
}
