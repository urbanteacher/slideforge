// The ⌘K palette's ranking, with no store, so it is tested on its own (shell/commands.ts gives it the list).

export interface Command { id: string; label: string; group: string; keys: string; words?: string; run: () => void; enabled?: () => boolean }

/** Rank by a plain subsequence match, words that start a label scoring highest (as SlideForge's palette does). */
function score(q: string, text: string): number {
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 100;
  const at = t.indexOf(q);
  if (at >= 0) return t[at - 1] === ' ' ? 80 : 60;
  let i = 0, run = 0;
  for (const ch of t) { if (ch === q[i]) { i++; run++; if (i === q.length) return 20 + run; } }
  return 0;
}

export function rankCommands(query: string, list: Command[]): Command[] {
  const q = query.trim().toLowerCase();
  // A bare number is a slide.
  if (/^\d+$/.test(q)) return list.filter((c) => c.id.startsWith('slide.go.') && c.words === q);
  return list
    .map((c, i) => ({ c, i, s: Math.max(score(q, c.label), score(q, c.words ?? '') * 0.6, score(q, c.group) * 0.3) }))
    .filter((x) => x.s > 0 && (q || !x.c.id.startsWith('slide.go.')))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}
